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

    const contentType = canvasResponse.headers.get("content-type");
    const responseStatus = canvasResponse.status;
    const linkHeaderFromCanvas = canvasResponse.headers.get("link");

    let workerResponseHeaders = { 
      'Content-Type': 'application/json',
      'Access-Control-Expose-Headers': 'Link' // Expose the Link header to the client
    };

    if (linkHeaderFromCanvas) {
      workerResponseHeaders['Link'] = linkHeaderFromCanvas;
    }

    if (responseStatus === 204) { // No Content
      return new Response(null, {
        status: 204,
        headers: workerResponseHeaders // Include Link header even for 204 if present
      });
    }
    
    let responseData;
    if (contentType && contentType.includes("application/json")) {
        responseData = await canvasResponse.json();
    } else {
        responseData = await canvasResponse.text();
    }

    if (!(contentType && contentType.includes("application/json")) && typeof responseData === 'string') {
        if (!canvasResponse.ok) {
            responseData = { error: "Canvas API returned non-JSON error", details: responseData.substring(0, 500) };
        } else {
             if (responseStatus === 200) { 
                return new Response(JSON.stringify({ error: "Received non-JSON success response from Canvas", data: responseData.substring(0,500)}), {
                    status: 502, 
                    headers: workerResponseHeaders 
                });
             }
             // For other non-JSON success (e.g., 201, 202 with text body), responseData is already the text.
             // It will be JSON.stringified below. The client will parse it back to a string.
             // If a different Content-Type is desired for this specific case, it could be set here.
             // For now, it defaults to application/json as per workerResponseHeaders.
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

export async function onRequest(context) {
  if (context.request.method === "POST") {
    return await onRequestPost(context);
  }
  if (context.request.method === "GET") {
    return new Response(JSON.stringify({ message: "API Proxy is active. Use POST to make requests to Canvas API."}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ error: "Method not allowed. Only POST, GET requests are accepted to this proxy endpoint." }), {
    status: 405,
    headers: { "Content-Type": "application/json", 'Allow': 'POST, GET' },
  });
}
