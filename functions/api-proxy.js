// functions/api-proxy.js

export async function onRequestPost(context) {
  try {
    const { request } = context;

    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: "Request body must be JSON." }), {
        status: 415, // Unsupported Media Type
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      canvas_domain,
      api_token,
      target_endpoint, // e.g., "/api/v1/courses"
      target_method = 'GET', // Default to GET
      target_body = null     // Body for POST/PUT requests
    } = await request.json();

    if (!canvas_domain || !api_token || !target_endpoint) {
      return new Response(JSON.stringify({ error: "Missing required parameters: canvas_domain, api_token, or target_endpoint." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let fullCanvasUrl = canvas_domain.trim();
    if (!fullCanvasUrl.startsWith('http://') && !fullCanvasUrl.startsWith('https://')) {
      fullCanvasUrl = `https://${fullCanvasUrl}`;
    }

    // Ensure target_endpoint starts with a slash
    const cleanTargetEndpoint = target_endpoint.startsWith('/') ? target_endpoint : `/${target_endpoint}`;
    const fullApiUrl = `${fullCanvasUrl}${cleanTargetEndpoint}`;

    const requestOptions = {
      method: target_method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${api_token}`,
        'Accept': 'application/json',
      },
    };

    if (target_body && (target_method.toUpperCase() === 'POST' || target_method.toUpperCase() === 'PUT' || target_method.toUpperCase() === 'PATCH')) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(target_body);
    }

    const canvasResponse = await fetch(fullApiUrl, requestOptions);

    // Handle different response types from Canvas
    const contentType = canvasResponse.headers.get("content-type");
    const responseStatus = canvasResponse.status;

    if (responseStatus === 204) { // No Content
      return new Response(null, { // Return null body but with 204 status
        status: 204
      });
    }
    
    let responseData;
    if (contentType && contentType.includes("application/json")) {
        responseData = await canvasResponse.json();
    } else {
        // If not JSON, try to read as text. This might be an HTML error page from Canvas.
        responseData = await canvasResponse.text();
    }

    // Forward the status and data from Canvas
    // Ensure the worker response also has a JSON content type if sending JSON
    let workerResponseHeaders = { 'Content-Type': 'application/json' };
    if (!(contentType && contentType.includes("application/json")) && typeof responseData === 'string') {
        // If Canvas returned non-JSON, and we're sending it as a string,
        // it's better to set content type to text/plain for the client,
        // or wrap it in a JSON object if the client always expects JSON.
        // For simplicity here, we'll still wrap it in a JSON structure if it's an error.
        if (!canvasResponse.ok) {
            responseData = { error: "Canvas API returned non-JSON error", details: responseData.substring(0, 500) };
        } else {
             // If it was a success but not JSON, this is unusual.
             // The client-side apiService expects JSON, so we should indicate an issue.
             if (responseStatus === 200) { // Successful but not JSON
                return new Response(JSON.stringify({ error: "Received non-JSON success response from Canvas", data: responseData.substring(0,500)}), {
                    status: 502, // Bad Gateway - upstream format error
                    headers: workerResponseHeaders
                });
             }
             // For other non-JSON success, just pass text
             workerResponseHeaders = { 'Content-Type': 'text/plain' };
        }
    }


    return new Response(JSON.stringify(responseData), {
      status: responseStatus,
      headers: workerResponseHeaders,
    });

  } catch (error) {
    console.error('Error in Cloudflare Worker (api-proxy):', error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred in the API proxy.", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Handle other methods if necessary, or return 405 Method Not Allowed
export async function onRequest(context) {
  if (context.request.method === "POST") {
    return await onRequestPost(context);
  }
  // Optionally handle GET for a health check or info
  if (context.request.method === "GET") {
    return new Response(JSON.stringify({ message: "API Proxy is active. Use POST to make requests to Canvas API."}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed. Only POST requests are accepted to this proxy endpoint." }), {
    status: 405,
    headers: { "Content-Type": "application/json", 'Allow': 'POST, GET' },
  });
}
