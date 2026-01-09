/**
 * Customer Status Tracker - API Client
 * Connects frontend to FastAPI backend
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Generic fetch wrapper with error handling
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        throw error;
    }
}

// Customer API
const CustomerAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/customers${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return apiRequest(`/customers/${id}`);
    },

    async create(data) {
        return apiRequest('/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id, data) {
        return apiRequest(`/customers/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async delete(id) {
        return apiRequest(`/customers/${id}`, {
            method: 'DELETE',
        });
    },
};

// Task API
const TaskAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/tasks${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return apiRequest(`/tasks/${id}`);
    },

    async create(data) {
        return apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id, data) {
        return apiRequest(`/tasks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async complete(id) {
        return apiRequest(`/tasks/${id}/complete`, {
            method: 'POST',
        });
    },
};

// Engagement API
const EngagementAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/engagements${queryString ? '?' + queryString : ''}`);
    },

    async create(data) {
        return apiRequest('/engagements', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

// User API
const UserAPI = {
    async getAll() {
        return apiRequest('/users');
    },

    async getById(id) {
        return apiRequest(`/users/${id}`);
    },

    async create(data) {
        return apiRequest('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id, data) {
        return apiRequest(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async delete(id) {
        return apiRequest(`/users/${id}`, {
            method: 'DELETE',
        });
    },
};

// Roadmap API
const RoadmapAPI = {
    async getByCustomer(customerId) {
        return apiRequest(`/roadmaps/customer/${customerId}`);
    },

    async getById(id) {
        return apiRequest(`/roadmaps/${id}`);
    },
};

// Utility functions
function formatCurrency(amount) {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getHealthStatusClass(status) {
    const statusMap = {
        'green': 'tag--green',
        'yellow': 'tag--yellow',
        'red': 'tag--red',
    };
    return statusMap[status] || '';
}

function getHealthStatusLabel(status) {
    const labelMap = {
        'green': 'Healthy',
        'yellow': 'Needs Attention',
        'red': 'At Risk',
    };
    return labelMap[status] || status;
}

function getPriorityClass(priority) {
    const priorityMap = {
        'high': 'tag--red',
        'urgent': 'tag--red',
        'medium': 'tag--yellow',
        'low': 'tag--gray',
    };
    return priorityMap[priority] || '';
}

function getStatusClass(status) {
    const statusMap = {
        'open': 'tag--blue',
        'in_progress': 'tag--yellow',
        'completed': 'tag--green',
        'cancelled': 'tag--gray',
    };
    return statusMap[status] || '';
}

function calculateDaysUntil(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// Export for use in other files
window.API = {
    CustomerAPI,
    TaskAPI,
    EngagementAPI,
    UserAPI,
    RoadmapAPI,
};

window.Utils = {
    formatCurrency,
    formatDate,
    getHealthStatusClass,
    getHealthStatusLabel,
    getPriorityClass,
    getStatusClass,
    calculateDaysUntil,
};
