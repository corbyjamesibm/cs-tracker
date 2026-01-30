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

        // Handle 204 No Content (e.g., successful DELETE)
        if (response.status === 204) {
            return null;
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

// Partner API
const PartnerAPI = {
    async getAll() {
        return apiRequest('/partners');
    },

    async getById(id) {
        return apiRequest(`/partners/${id}`);
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
    async saveResponses(assessmentId, responses, complete = false, completedById = null) {
        const body = { responses, complete };
        if (completedById) {
            body.completed_by_id = completedById;
        }
        return apiRequest(`/assessments/${assessmentId}/responses`, {
            method: 'POST',
            body: JSON.stringify(body),
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

// Lookup API - for managing configurable dropdown lists
const LookupAPI = {
    async getCategories() {
        return apiRequest('/lookups/categories');
    },

    async getCategoryValues(category, includeInactive = false) {
        const params = includeInactive ? '?include_inactive=true' : '';
        return apiRequest(`/lookups/category/${category}${params}`);
    },

    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/lookups${queryString ? '?' + queryString : ''}`);
    },

    async create(data) {
        return apiRequest('/lookups', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id, data) {
        return apiRequest(`/lookups/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async delete(id) {
        return apiRequest(`/lookups/${id}`, {
            method: 'DELETE',
        });
    },

    async initializeCategory(category) {
        return apiRequest(`/lookups/initialize/${category}`, {
            method: 'POST',
        });
    },
};

// Document API
const DocumentAPI = {
    async list(customerId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/customers/${customerId}/documents${queryString ? '?' + queryString : ''}`);
    },

    async getById(documentId) {
        return apiRequest(`/documents/${documentId}`);
    },

    async upload(customerId, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);
        if (options.engagementId) {
            formData.append('engagement_id', options.engagementId);
        }
        formData.append('source', options.source || 'upload');

        const url = `${API_BASE_URL}/customers/${customerId}/documents`;
        const headers = {};
        if (window.Auth && window.Auth.getToken()) {
            headers['Authorization'] = `Bearer ${window.Auth.getToken()}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || `Upload failed: ${response.status}`);
        }

        return response.json();
    },

    async parseEmail(file) {
        const formData = new FormData();
        formData.append('file', file);

        const url = `${API_BASE_URL}/documents/parse/email`;
        const headers = {};
        if (window.Auth && window.Auth.getToken()) {
            headers['Authorization'] = `Bearer ${window.Auth.getToken()}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Parse failed: ${response.status}`);
        }

        return response.json();
    },

    async parseCalendar(file) {
        const formData = new FormData();
        formData.append('file', file);

        const url = `${API_BASE_URL}/documents/parse/calendar`;
        const headers = {};
        if (window.Auth && window.Auth.getToken()) {
            headers['Authorization'] = `Bearer ${window.Auth.getToken()}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Parse failed: ${response.status}`);
        }

        return response.json();
    },

    async delete(documentId) {
        return apiRequest(`/documents/${documentId}`, {
            method: 'DELETE',
        });
    },
};

// Chat API - LLM-powered assistant
const ChatAPI = {
    async send(message, context = null, conversationId = null) {
        return apiRequest('/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: message,
                context: context,
                conversation_id: conversationId
            }),
        });
    }
};

// Meeting Note API
const MeetingNoteAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/meeting-notes${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return apiRequest(`/meeting-notes/${id}`);
    },

    async getByCustomer(customerId) {
        return apiRequest(`/meeting-notes?customer_id=${customerId}`);
    },

    async create(data) {
        return apiRequest('/meeting-notes', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    async update(id, data) {
        return apiRequest(`/meeting-notes/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    async delete(id) {
        return apiRequest(`/meeting-notes/${id}`, {
            method: 'DELETE',
        });
    },
};

// ============================================
// Mappings API
// ============================================
const MappingsAPI = {
    // Dimension -> Use Case mappings
    getDimensionUseCaseMappings: async (dimensionId = null, useCaseId = null) => {
        let url = `${API_BASE_URL}/mappings/dimension-use-case`;
        const params = new URLSearchParams();
        if (dimensionId) params.append('dimension_id', dimensionId);
        if (useCaseId) params.append('use_case_id', useCaseId);
        if (params.toString()) url += '?' + params.toString();
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },

    createDimensionUseCaseMapping: async (data) => {
        const response = await fetch(`${API_BASE_URL}/mappings/dimension-use-case`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create mapping');
        }
        return response.json();
    },

    deleteDimensionUseCaseMapping: async (id) => {
        const response = await fetch(`${API_BASE_URL}/mappings/dimension-use-case/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete mapping');
        }
    },

    // Use Case -> TP Feature mappings
    getUseCaseTPMappings: async (useCaseId = null) => {
        let url = `${API_BASE_URL}/mappings/use-case-tp`;
        if (useCaseId) url += `?use_case_id=${useCaseId}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },

    createUseCaseTPMapping: async (data) => {
        const response = await fetch(`${API_BASE_URL}/mappings/use-case-tp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create mapping');
        }
        return response.json();
    },

    deleteUseCaseTPMapping: async (id) => {
        const response = await fetch(`${API_BASE_URL}/mappings/use-case-tp/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete mapping');
        }
    },

    syncTPMapping: async (id) => {
        const response = await fetch(`${API_BASE_URL}/mappings/use-case-tp/${id}/sync`, {
            method: 'POST',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to sync mapping');
        }
        return response.json();
    },
};

// ============================================
// Recommendations API
// ============================================
const RecommendationsAPI = {
    getCustomerRecommendations: async (customerId, includeDismissed = false, includeAccepted = true) => {
        const params = new URLSearchParams({
            include_dismissed: includeDismissed,
            include_accepted: includeAccepted,
        });
        const response = await fetch(`${API_BASE_URL}/recommendations/customer/${customerId}?${params}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    },

    generate: async (customerId, threshold = 3.5, limit = 20, regenerate = false) => {
        const response = await fetch(`${API_BASE_URL}/recommendations/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: customerId,
                threshold,
                limit,
                regenerate,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate recommendations');
        }
        return response.json();
    },

    accept: async (recommendationId, targetQuarter, targetYear, notes = null) => {
        const response = await fetch(`${API_BASE_URL}/recommendations/${recommendationId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_quarter: targetQuarter,
                target_year: targetYear,
                notes,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to accept recommendation');
        }
        return response.json();
    },

    dismiss: async (recommendationId) => {
        const response = await fetch(`${API_BASE_URL}/recommendations/${recommendationId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to dismiss recommendation');
        }
        return response.json();
    },

    restore: async (recommendationId) => {
        const response = await fetch(`${API_BASE_URL}/recommendations/${recommendationId}/restore`, {
            method: 'POST',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to restore recommendation');
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
    PartnerAPI,
    RoadmapAPI,
    RiskAPI,
    AssessmentAPI,
    LookupAPI,
    MeetingNoteAPI,
    DocumentAPI,
    ChatAPI,
    MappingsAPI,
    RecommendationsAPI,
};

// Also export ChatAPI directly for chat.js
window.ChatAPI = ChatAPI;

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
