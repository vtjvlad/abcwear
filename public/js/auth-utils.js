// Auth utilities
const authUtils = {
    // Get current user
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Get token
    getToken() {
        return localStorage.getItem('token');
    },

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.getToken();
    },

    // Logout user
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
    },

    // Add auth header to fetch requests
    async fetchWithAuth(url, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired');
        }

        return response;
    },

    // Update user info in localStorage
    updateUserInfo(userInfo) {
        const currentUser = this.getCurrentUser();
        const updatedUser = { ...currentUser, ...userInfo };
        localStorage.setItem('user', JSON.stringify(updatedUser));
    }
}; 