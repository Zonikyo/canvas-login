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
        new URL(fullDomain);
    } catch (_) {
        return new Response(JSON.stringify({ error: "Invalid Canvas domain format." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
    
    const apiUrl = `${fullDomain}/api/v1/users/self/profile`;

    const canvasResponse = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_token}`,
        // 'Content-Type': 'application/json', // Not needed for GET request to Canvas API typically
        'Accept': 'application/json', // Tell Canvas we expect JSON back
      },
    });

    // Check for 204 No Content explicitly, as .json() will fail
    if (canvasResponse.status === 204) {
      return new Response(JSON.stringify({ message: "Request successful, no content returned from Canvas." }), {
        status: 200, // Or 204, but client expects JSON
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const contentType = canvasResponse.headers.get("content-type");

    if (!canvasResponse.ok) {
      let errorDetails = `Canvas API Error: ${canvasResponse.status} ${canvasResponse.statusText}`;
      let responseBodyForError = {};

      if (contentType && contentType.includes("application/json")) {
        try {
          responseBodyForError = await canvasResponse.json();
          errorDetails = `Canvas API Error: ${responseBodyForError.message || canvasResponse.statusText}`;
        } catch (e) {
          // If parsing JSON fails even if content-type is JSON, read as text
          const textError = await canvasResponse.text();
          errorDetails = `Canvas API Error: ${canvasResponse.status} ${canvasResponse.statusText}. Non-JSON response: ${textError.substring(0, 200)}`;
          responseBodyForError = { rawError: textError };
        }
      } else {
        // If not JSON, try to get text for more context
        try {
            const textError = await canvasResponse.text();
            errorDetails = `Canvas API Error: ${canvasResponse.status} ${canvasResponse.statusText}. Response: ${textError.substring(0,200)}`; // Limit length
            responseBodyForError = { rawError: textError };
        } catch (e) {
            // Fallback if reading text also fails
             errorDetails = `Canvas API Error: ${canvasResponse.status} ${canvasResponse.statusText}. Could not read response body.`;
        }
      }
      
      return new Response(JSON.stringify({ 
        error: errorDetails,
        details: responseBodyForError
      }), {
        status: canvasResponse.status, // Use Canvas's error status
        headers: { "Content-Type": "application/json" },
      });
    }

    // If response is OK but not JSON, it's unexpected
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await canvasResponse.text();
      return new Response(JSON.stringify({ 
          error: "Canvas API returned non-JSON response.",
          details: {
            status: canvasResponse.status,
            contentType: contentType,
            bodyPreview: responseText.substring(0, 200) // Preview first 200 chars
          }
      }), {
        status: 502, // Bad Gateway, as we expected JSON from upstream
        headers: { "Content-Type": "application/json" },
      });
    }

    // If we reach here, response should be OK and JSON
    try {
        const responseData = await canvasResponse.json();
        return new Response(JSON.stringify(responseData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
    } catch (jsonParseError) {
        console.error('Failed to parse JSON from Canvas even after checks:', jsonParseError);
        // This case should ideally be rare now, but as a fallback
        return new Response(JSON.stringify({ 
            error: "Failed to parse JSON response from Canvas.",
            details: {
                message: jsonParseError.message,
                status: canvasResponse.status,
                contentType: contentType
            }
        }), {
            status: 500, 
            headers: { "Content-Type": "application/json" },
        });
    }

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
