document.addEventListener('DOMContentLoaded', () => {
    // Tab switching
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginTab.addEventListener('click', () => {
        loginTab.classList.add('border-b-2', 'border-blue-500');
        registerTab.classList.remove('border-b-2', 'border-blue-500');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('border-b-2', 'border-blue-500');
        loginTab.classList.remove('border-b-2', 'border-blue-500');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    });

    // Form submissions
    const loginFormElement = document.getElementById('loginFormElement');
    const registerFormElement = document.getElementById('registerFormElement');
    const loginError = document.getElementById('loginError');
    const registerError = document.getElementById('registerError');

    // Helper function to show errors
    const showError = (element, message) => {
        element.textContent = message;
        element.classList.remove('hidden');
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    };

    // Helper function to handle API requests
    const apiRequest = async (url, method, data) => {
        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Что-то пошло не так');
            }

            return result;
        } catch (error) {
            throw error;
        }
    };

    // Login form submission
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const result = await apiRequest('/api/auth/login', 'POST', { email, password });
            
            // Save token to localStorage
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));

            // Redirect to home page
            window.location.href = '/';
        } catch (error) {
            showError(loginError, error.message);
        }
    });

    // Register form submission
    registerFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const result = await apiRequest('/api/auth/register', 'POST', { name, email, password });
            
            // Save token to localStorage
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));

            // Redirect to home page
            window.location.href = '/';
        } catch (error) {
            showError(registerError, error.message);
        }
    });
}); 