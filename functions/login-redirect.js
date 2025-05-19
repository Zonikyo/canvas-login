export async function onRequestPost(context) {
  try {
    const { request } = context;
    if (request.headers.get("Content-Type") !== "application/json") {
      return new Response(JSON.stringify({ error: "Request must be JSON" }), {
        status: 415, // Unsupported Media Type
        headers: { "Content-Type": "application/json" },
      });
    }

    const { canvas_domain, api_token } = await request.json();

    if (!canvas_domain || typeof canvas_domain !== 'string' || canvas_domain.trim() === '') {
      return new Response(JSON.stringify({ error: "Canvas domain is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!api_token || typeof api_token !== 'string' || api_token.trim() === '') {
      return new Response(JSON.stringify({ error: "API token is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let fullDomain = canvas_domain.trim();
    if (!fullDomain.startsWith('http://') && !fullDomain.startsWith('https://')) {
      fullDomain = `https://${fullDomain}`;
    }

    try {
        // Validate the constructed URL
        new URL(fullDomain);
    } catch (_) {
        return new Response(JSON.stringify({ error: "Invalid Canvas domain format." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
    
    // Example API endpoint: Get user's own profile
    const apiUrl = `${fullDomain}/api/v1/users/self/profile`;

    const canvasResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_token}`,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await canvasResponse.json();

    if (!canvasResponse.ok) {
      // Forward the error from Canvas if possible, or a generic error
      return new Response(JSON.stringify({ 
        error: `Canvas API Error: ${responseData.message || canvasResponse.statusText}`,
        details: responseData 
      }), {
        status: canvasResponse.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error in canvas-api function:', error);
    return new Response(JSON.stringify({ error: "An unexpected server error occurred.", details: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Handle GET requests or other methods if needed, otherwise return 405
export async function onRequestGet(context) {
    return new Response(JSON.stringify({ error: "This endpoint only accepts POST requests with JSON data." }), {
        status: 405, // Method Not Allowed
        headers: { 'Content-Type': 'application/json', 'Allow': 'POST' }
    });
}

export async function onRequest(context) {
  if (context.request.method === "POST") {
    return await onRequestPost(context);
  }
  return onRequestGet(context); // Or handle other methods as needed
}
