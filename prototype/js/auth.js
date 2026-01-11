/**
 * Customer Status Tracker - Authentication Module
 * Handles login, logout, and session management
 */

const AUTH_STORAGE_KEY = 'cst_auth';
const AUTH_API_BASE = 'http://localhost:8000/api/v1/auth';

// Default user when auth is disabled
const DEFAULT_USER = {
    id: 14,
    email: 'Corby.James@ibm.com',
    first_name: 'Corby',
    last_name: 'James',
    full_name: 'Corby James',
    role: 'csm'
};

const Auth = {
    /**
     * Get stored authentication data
     */
    getStoredAuth() {
        try {
            const data = localStorage.getItem(AUTH_STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading auth data:', e);
            return null;
        }
    },

    /**
     * Store authentication data
     */
    storeAuth(data) {
        try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error storing auth data:', e);
        }
    },

    /**
     * Clear authentication data
     */
    clearAuth() {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    },

    /**
     * Check if user is authenticated (has valid token)
     */
    isAuthenticated() {
        const auth = this.getStoredAuth();
        if (!auth || !auth.access_token) {
            return false;
        }

        // Check if token is expired (rough check based on stored expiry)
        if (auth.expires_at && Date.now() > auth.expires_at) {
            this.clearAuth();
            return false;
        }

        return true;
    },

    /**
     * Get the current access token
     */
    getToken() {
        const auth = this.getStoredAuth();
        return auth ? auth.access_token : null;
    },

    /**
     * Get current user info
     */
    getCurrentUser() {
        const auth = this.getStoredAuth();
        return auth ? auth.user : null;
    },

    /**
     * Check authentication status from backend
     */
    async getAuthStatus() {
        try {
            const response = await fetch(`${AUTH_API_BASE}/status`);
            if (!response.ok) {
                throw new Error('Failed to get auth status');
            }
            return await response.json();
        } catch (error) {
            console.error('Error getting auth status:', error);
            // Default to auth disabled if we can't reach the backend
            return { auth_enabled: false };
        }
    },

    /**
     * Check if authentication is required and redirect if needed
     * Returns true if page should continue loading, false if redirecting
     */
    async checkAuthAndRedirect() {
        // Skip check on login page
        if (window.location.pathname.includes('login.html')) {
            return true;
        }

        try {
            const status = await this.getAuthStatus();

            if (!status.auth_enabled) {
                // Auth disabled - set default user if not already set
                if (!this.getCurrentUser()) {
                    this.storeAuth({
                        access_token: 'dev-token',
                        token_type: 'bearer',
                        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
                        user: DEFAULT_USER,
                    });
                }
                return true;
            }

            if (!this.isAuthenticated()) {
                // Auth enabled but not authenticated - redirect to login
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `login.html?return=${returnUrl}`;
                return false;
            }

            // Auth enabled and authenticated - allow access
            return true;
        } catch (error) {
            console.error('Error checking auth:', error);
            // On error, set default user and allow access (fail open for development)
            if (!this.getCurrentUser()) {
                this.storeAuth({
                    access_token: 'dev-token',
                    token_type: 'bearer',
                    expires_at: Date.now() + (24 * 60 * 60 * 1000),
                    user: DEFAULT_USER,
                });
            }
            return true;
        }
    },

    /**
     * Login with email and password
     */
    async login(email, password) {
        const response = await fetch(`${AUTH_API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();

        // Store auth data with expiry timestamp
        this.storeAuth({
            access_token: data.access_token,
            token_type: data.token_type,
            expires_at: Date.now() + (data.expires_in * 1000),
            user: data.user,
        });

        return data.user;
    },

    /**
     * Initiate W3ID login flow
     */
    async loginWithW3ID() {
        try {
            const response = await fetch(`${AUTH_API_BASE}/w3id/login`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'W3ID login not available');
            }

            const data = await response.json();

            // Store state for CSRF verification
            sessionStorage.setItem('w3id_state', data.state);

            // Redirect to W3ID
            window.location.href = data.auth_url;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Handle W3ID callback (called from auth-callback.html)
     */
    async handleW3IDCallback(code, state) {
        // Verify state matches
        const storedState = sessionStorage.getItem('w3id_state');
        if (state !== storedState) {
            throw new Error('Invalid state parameter - possible CSRF attack');
        }
        sessionStorage.removeItem('w3id_state');

        const response = await fetch(`${AUTH_API_BASE}/w3id/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'W3ID callback failed');
        }

        const data = await response.json();

        // Store auth data
        this.storeAuth({
            access_token: data.access_token,
            token_type: data.token_type,
            expires_at: Date.now() + (data.expires_in * 1000),
            user: data.user,
        });

        return data.user;
    },

    /**
     * Logout
     */
    async logout() {
        try {
            // Call backend logout (optional - for token blacklisting if implemented)
            const token = this.getToken();
            if (token) {
                await fetch(`${AUTH_API_BASE}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }

        // Clear local auth data
        this.clearAuth();

        // Redirect to login
        window.location.href = 'login.html';
    },

    /**
     * Get current user from backend (validates token)
     */
    async fetchCurrentUser() {
        const token = this.getToken();
        if (!token) {
            return null;
        }

        try {
            const response = await fetch(`${AUTH_API_BASE}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.clearAuth();
                }
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching current user:', error);
            return null;
        }
    },

    /**
     * Update user display in header
     */
    updateUserDisplay() {
        const user = this.getCurrentUser();
        const userNameEl = document.querySelector('.user-name');
        const userAvatarEl = document.querySelector('.user-avatar');
        const userFirstNameEl = document.querySelector('.user-first-name');
        const logoutBtn = document.getElementById('logoutBtn');

        if (user && userNameEl) {
            userNameEl.textContent = user.full_name || `${user.first_name} ${user.last_name}`;
        }

        if (user && userAvatarEl) {
            // Set initials
            const initials = `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`;
            userAvatarEl.textContent = initials.toUpperCase();
        }

        if (user && userFirstNameEl) {
            userFirstNameEl.textContent = user.first_name;
        }

        // Add logout functionality if button exists
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    },
};

// Export for global access
window.Auth = Auth;
