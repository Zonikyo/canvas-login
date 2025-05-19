document.addEventListener('DOMContentLoaded', () => {
    const canvasDomainInput = document.getElementById('canvas_domain');
    const canvasLoginForm = document.getElementById('canvasLoginForm');
    const errorMessageElement = document.getElementById('error-message');
    const localStorageKey = 'canvasLoginDomain';

    if (!canvasDomainInput || !canvasLoginForm || !errorMessageElement) {
        console.error('Required DOM elements not found.');
        return;
    }

    const savedDomain = localStorage.getItem(localStorageKey);
    if (savedDomain) {
        canvasDomainInput.value = savedDomain;
    }

    canvasLoginForm.addEventListener('submit', (event) => {
        const domainValue = canvasDomainInput.value.trim();
        errorMessageElement.classList.add('hidden');
        errorMessageElement.textContent = '';

        if (!domainValue) {
            event.preventDefault();
            errorMessageElement.textContent = 'Canvas domain cannot be empty.';
            errorMessageElement.classList.remove('hidden');
            canvasDomainInput.focus();
            return;
        }

        if (!isValidDomain(domainValue)) {
            event.preventDefault();
            errorMessageElement.textContent = 'Please enter a valid domain (e.g., school.instructure.com).';
            errorMessageElement.classList.remove('hidden');
            canvasDomainInput.focus();
            return;
        }
        
        localStorage.setItem(localStorageKey, domainValue);
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
        return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain);
    }
});
