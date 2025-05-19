export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const canvasDomain = formData.get('canvas_domain');

    if (!canvasDomain || typeof canvasDomain !== 'string' || canvasDomain.trim() === '') {
      return new Response('Canvas domain is required.', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    let fullUrl = canvasDomain.trim();

    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }

    try {
      const urlObject = new URL(fullUrl);
      if (!urlObject.hostname || !urlObject.protocol.startsWith('http')) {
          throw new Error('Invalid URL structure');
      }
    } catch (_) {
      return new Response('Invalid Canvas domain format. Please ensure it is a valid URL (e.g., yourschool.instructure.com or https://yourschool.instructure.com).', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return Response.redirect(fullUrl, 302);

  } catch (error) {
    console.error('Error in login-redirect function:', error);
    return new Response('An unexpected error occurred.', { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' } 
    });
  }
}

export async function onRequestGet(context) {
    return new Response('This endpoint only accepts POST requests. Please submit the form from the main page.', {
        status: 405, // Method Not Allowed
        headers: { 'Content-Type': 'text/plain' }
    });
}
