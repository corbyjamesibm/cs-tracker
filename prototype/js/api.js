/**
 * Customer Status Tracker - API Client
 * Connects frontend to FastAPI backend
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Generic fetch wrapper with error handling and auth support
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    // Build headers with auth token if available
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add auth token if available
    if (window.Auth && window.Auth.getToken()) {
        headers['Authorization'] = `Bearer ${window.Auth.getToken()}`;
    }

    const requestOptions = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, requestOptions);

        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
            if (window.Auth) {
                window.Auth.clearAuth();
            }
            // Don't redirect if we're already on the login page
            if (!window.location.pathname.includes('login.html')) {
                const returnUrl = encodeURIComponent(window.location.href);
                window.location.href = `login.html?return=${returnUrl}`;
            }
            throw new Error('Authentication required');
        }

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

    async create(data) {
        return apiRequest('/roadmaps', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Roadmap Items
    async addItem(roadmapId, data) {
        return apiRequest(`/roadmaps/${roadmapId}/items`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async updateItem(itemId, data) {
        return apiRequest(`/roadmaps/items/${itemId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async deleteItem(itemId) {
        const url = `${API_BASE_URL}/roadmaps/items/${itemId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return true;
    },

    // Quarterly Updates
    async addItemUpdate(itemId, data) {
        return apiRequest(`/roadmaps/items/${itemId}/updates`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async getItemUpdates(itemId) {
        return apiRequest(`/roadmaps/items/${itemId}/updates`);
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

function getRiskSeverityClass(severity) {
    const severityMap = {
        'critical': 'tag--red',
        'high': 'tag--orange',
        'medium': 'tag--yellow',
        'low': 'tag--gray',
    };
    return severityMap[severity] || '';
}

function getRiskSeverityLabel(severity) {
    const labelMap = {
        'critical': 'Critical',
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low',
    };
    return labelMap[severity] || severity;
}

function getRiskStatusClass(status) {
    const statusMap = {
        'open': 'tag--red',
        'mitigating': 'tag--yellow',
        'resolved': 'tag--green',
        'accepted': 'tag--blue',
    };
    return statusMap[status] || '';
}

function getRiskCategoryLabel(category) {
    const labelMap = {
        'adoption': 'Adoption',
        'renewal': 'Renewal',
        'technical': 'Technical',
        'relationship': 'Relationship',
        'financial': 'Financial',
        'other': 'Other',
    };
    return labelMap[category] || category || 'Uncategorized';
}

// Risk API
const RiskAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/risks${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return apiRequest(`/risks/${id}`);
    },

    async getByCustomer(customerId) {
        return apiRequest(`/risks?customer_id=${customerId}`);
    },

    async create(data) {
        return apiRequest('/risks', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id, data) {
        return apiRequest(`/risks/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async delete(id) {
        const url = `${API_BASE_URL}/risks/${id}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return true;
    },

    async resolve(id, notes = '') {
        return apiRequest(`/risks/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ resolution_notes: notes }),
        });
    },

    async getSummary() {
        return apiRequest('/risks/summary');
    },
};

// Assessment API
const AssessmentAPI = {
    // Templates
    async getTemplates(activeOnly = false) {
        const params = activeOnly ? '?active_only=true' : '';
        return apiRequest(`/assessments/templates${params}`);
    },

    async getActiveTemplate() {
        return apiRequest('/assessments/templates/active');
    },

    async getTemplate(id) {
        return apiRequest(`/assessments/templates/${id}`);
    },

    async createTemplate(data) {
        return apiRequest('/assessments/templates', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async uploadTemplate(formData, name, version, description = '') {
        const url = `${API_BASE_URL}/assessments/templates/upload?name=${encodeURIComponent(name)}&version=${encodeURIComponent(version)}${description ? '&description=' + encodeURIComponent(description) : ''}`;
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    },

    async updateTemplate(id, data) {
        return apiRequest(`/assessments/templates/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async activateTemplate(id) {
        return apiRequest(`/assessments/templates/${id}/activate`, {
            method: 'POST',
        });
    },

    async deleteTemplate(id) {
        const url = `${API_BASE_URL}/assessments/templates/${id}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return true;
    },

    // Customer Assessments
    async getCustomerAssessments(customerId, status = null) {
        const params = status ? `?status=${status}` : '';
        return apiRequest(`/assessments/customer/${customerId}${params}`);
    },

    async getCustomerHistory(customerId) {
        return apiRequest(`/assessments/customer/${customerId}/history`);
    },

    async createAssessment(customerId, data) {
        return apiRequest(`/assessments/customer/${customerId}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async getAssessment(id) {
        return apiRequest(`/assessments/${id}`);
    },

    async updateAssessment(id, data) {
        return apiRequest(`/assessments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async deleteAssessment(id) {
        const url = `${API_BASE_URL}/assessments/${id}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return true;
    },

    // Responses
    async saveResponses(assessmentId, responses, complete = false) {
        return apiRequest(`/assessments/${assessmentId}/responses`, {
            method: 'POST',
            body: JSON.stringify({ responses, complete }),
        });
    },

    async uploadResponses(customerId, formData, templateId = null, assessmentDate = null) {
        let url = `${API_BASE_URL}/assessments/customer/${customerId}/upload`;
        const params = [];
        if (templateId) params.push(`template_id=${templateId}`);
        if (assessmentDate) params.push(`assessment_date=${assessmentDate}`);
        if (params.length) url += '?' + params.join('&');

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    },
};

// Export for use in other files
window.API = {
    CustomerAPI,
    TaskAPI,
    EngagementAPI,
    UserAPI,
    RoadmapAPI,
    RiskAPI,
    AssessmentAPI,
};

window.Utils = {
    formatCurrency,
    formatDate,
    getHealthStatusClass,
    getHealthStatusLabel,
    getPriorityClass,
    getStatusClass,
    calculateDaysUntil,
    getRiskSeverityClass,
    getRiskSeverityLabel,
    getRiskStatusClass,
    getRiskCategoryLabel,
};
