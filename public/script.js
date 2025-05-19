document.addEventListener('DOMContentLoaded', () => {
    const canvasApiForm = document.getElementById('canvasApiForm');
    const canvasDomainInput = document.getElementById('canvas_domain');
    const apiTokenInput = document.getElementById('api_token');
    const submitButton = document.getElementById('submitButton');
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsTitle = document.getElementById('resultsTitle');
    const apiResponseElement = document.getElementById('apiResponse');
    const errorMessageElement = document.getElementById('errorMessage');
    const errorMessageText = document.getElementById('errorMessageText');
    const successMessageElement = document.getElementById('successMessage');
    const successMessageText = document.getElementById('successMessageText');

    const domainStorageKey = 'canvasApiDomain';
    const tokenStorageKey = 'canvasApiToken';

    if (!canvasApiForm || !canvasDomainInput || !apiTokenInput || !submitButton || !loadingIndicator || !resultsContainer || !apiResponseElement || !errorMessageElement || !successMessageElement) {
        console.error('One or more required DOM elements are missing.');
        return;
    }

    const savedDomain = localStorage.getItem(domainStorageKey);
    if (savedDomain) {
        canvasDomainInput.value = savedDomain;
    }

    const savedToken = localStorage.getItem(tokenStorageKey);
    if (savedToken) {
        apiTokenInput.value = savedToken;
    }

    canvasApiForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const domain = canvasDomainInput.value.trim();
        const token = apiTokenInput.value.trim();

        hideMessages();
        loadingIndicator.classList.remove('hidden');
        submitButton.disabled = true;
        submitButton.classList.add('opacity-50', 'cursor-not-allowed');

        if (!domain || !token) {
            showError('Canvas domain and API token are required.');
            resetButtonState();
            return;
        }
        
        if (!isValidDomain(domain)) {
            showError('Please enter a valid domain (e.g., school.instructure.com).');
            resetButtonState();
            canvasDomainInput.focus();
            return;
        }

        localStorage.setItem(domainStorageKey, domain);
        localStorage.setItem(tokenStorageKey, token);

        try {
            const response = await fetch('/canvas-api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ canvas_domain: domain, api_token: token }),
            });

            const result = await response.json();
            loadingIndicator.classList.add('hidden');
            resultsTitle.classList.remove('hidden');

            if (response.ok) {
                apiResponseElement.textContent = JSON.stringify(result, null, 2);
                apiResponseElement.classList.remove('hidden');
                showSuccess(`Successfully fetched profile: ${result.name || result.short_name || 'N/A'}`);
            } else {
                showError(result.error || `API request failed with status: ${response.status}`);
                apiResponseElement.textContent = JSON.stringify(result, null, 2); // Show error details if available
                apiResponseElement.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            showError('An unexpected error occurred. Check the console for details.');
            apiResponseElement.textContent = `Error: ${error.message}`;
            apiResponseElement.classList.remove('hidden');
        } finally {
            resetButtonState();
        }
    });

    function isValidDomain(domain) {
        if (domain.includes(' ') || !domain.includes('.')) {
            return false;
        }
        if (domain.startsWith('http://') || domain.startsWith('https://')) {
            try {
                const url = new URL(domain);
                return url.hostname.includes('.');
            } catch (e) {
                return false;
            }
        }
        // Basic check for domain-like structure if no protocol
        return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain);
    }

    function resetButtonState() {
        loadingIndicator.classList.add('hidden');
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    function hideMessages() {
        errorMessageElement.classList.add('hidden');
        successMessageElement.classList.add('hidden');
        apiResponseElement.classList.add('hidden');
        resultsTitle.classList.add('hidden');
        errorMessageText.textContent = '';
        successMessageText.textContent = '';
        apiResponseElement.textContent = '';
    }

    function showError(message) {
        hideMessages();
        errorMessageText.textContent = message;
        errorMessageElement.classList.remove('hidden');
        resultsTitle.classList.remove('hidden');
    }
    
    function showSuccess(message) {
        hideMessages();
        successMessageText.textContent = message;
        successMessageElement.classList.remove('hidden');
        resultsTitle.classList.remove('hidden');
    }
});
