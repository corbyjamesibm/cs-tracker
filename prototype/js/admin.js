/**
 * Admin - Data management functionality
 */

// Use API_BASE_URL from api.js (already loaded)
const ADMIN_API_URL = 'http://localhost:8000/api/v1';

// Store partners for dropdown
let partnersCache = [];

// Store users for editing
let usersCache = [];

document.addEventListener('DOMContentLoaded', async function() {
    await refreshStats();
    await loadPartners();
    await loadUsers();
    await loadUseCases();
});

/**
 * Fetch and display database statistics
 */
async function refreshStats() {
    try {
        const response = await fetch(`${ADMIN_API_URL}/admin/stats`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stats = await response.json();

        // Update each stat element
        Object.keys(stats).forEach(key => {
            const el = document.getElementById(`stat-${key}`);
            if (el) {
                el.textContent = stats[key];
            }
        });
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        showToast('Failed to load database statistics', 'error');
    }
}

/**
 * Clear all test data from the database
 */
async function clearTestData() {
    const keepUsers = document.getElementById('keepUsersCheckbox').checked;

    // Confirm with the user
    const message = keepUsers
        ? 'Are you sure you want to delete ALL data except user accounts?\n\nThis will remove:\n- All customers\n- All tasks\n- All engagements\n- All contacts\n- All partners\n- All use cases\n- All roadmaps\n\nThis action CANNOT be undone!'
        : 'Are you sure you want to delete ALL data INCLUDING user accounts?\n\nThis action CANNOT be undone!';

    if (!confirm(message)) {
        return;
    }

    // Double confirm for safety
    if (!confirm('Please confirm again: Delete all data?')) {
        return;
    }

    const btn = document.getElementById('clearDataBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Clearing...';

    try {
        const response = await fetch(`${ADMIN_API_URL}/admin/clear-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                confirm: true,
                keep_users: keepUsers
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to clear data');
        }

        const result = await response.json();

        // Show results
        showResults('success', 'Data Cleared Successfully', result.deleted);
        showToast(result.message, 'success');

        // Refresh stats
        await refreshStats();

    } catch (error) {
        console.error('Failed to clear data:', error);
        showToast(error.message || 'Failed to clear data', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Reseed the database with sample data
 */
async function reseedData() {
    if (!confirm('This will populate the database with sample data.\n\nNote: The database must be empty (no customers) for this to work.\n\nProceed?')) {
        return;
    }

    const btn = document.getElementById('reseedBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Seeding...';

    try {
        const response = await fetch(`${ADMIN_API_URL}/admin/reseed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to reseed data');
        }

        const result = await response.json();

        showToast(result.message, 'success');

        // Refresh stats
        await refreshStats();

    } catch (error) {
        console.error('Failed to reseed data:', error);
        showToast(error.message || 'Failed to reseed data', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Show operation results
 */
function showResults(type, title, deleted) {
    const card = document.getElementById('resultsCard');
    const content = document.getElementById('resultsContent');

    const items = Object.entries(deleted)
        .filter(([key, value]) => value > 0)
        .map(([key, value]) => `<li>${formatLabel(key)}: <strong>${value}</strong> deleted</li>`)
        .join('');

    const totalDeleted = Object.values(deleted).reduce((sum, val) => sum + val, 0);

    content.innerHTML = `
        <div class="notification notification--${type === 'success' ? 'success' : 'error'} mb-3">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="${type === 'success' ? 'var(--cds-support-success)' : 'var(--cds-support-error)'}">
                ${type === 'success'
                    ? '<path d="M14 21.414L9.293 16.707 10.707 15.293 14 18.586 21.293 11.293 22.707 12.707 14 21.414z"/><path d="M16 2C8.269 2 2 8.269 2 16s6.269 14 14 14 14-6.269 14-14S23.731 2 16 2zm0 26C9.383 28 4 22.617 4 16S9.383 4 16 4s12 5.383 12 12-5.383 12-12 12z"/>'
                    : '<path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm-1 7h2v10h-2V9zm1 16c-.8 0-1.5-.7-1.5-1.5S15.2 22 16 22s1.5.7 1.5 1.5S16.8 25 16 25z"/>'}
            </svg>
            <span>${title}</span>
        </div>
        <div class="text-secondary mb-2">Total records deleted: <strong>${totalDeleted}</strong></div>
        ${items ? `<ul class="results-list">${items}</ul>` : '<p class="text-secondary">No records were deleted.</p>'}
    `;

    card.style.display = 'block';
}

/**
 * Hide results card
 */
function hideResults() {
    document.getElementById('resultsCard').style.display = 'none';
}

/**
 * Format label from snake_case to Title Case
 */
function formatLabel(key) {
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast__close" onclick="this.parentElement.remove()">
            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z"/></svg>
        </button>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('toast--fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// =====================
// User Management
// =====================

/**
 * Load and display users
 */
async function loadUsers() {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch(`${ADMIN_API_URL}/users`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const users = data.items || [];

        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">No users found</td></tr>';
            return;
        }

        // Store users in cache for editing
        usersCache = users;

        tableBody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="flex flex-center gap-3">
                        <div class="avatar avatar--small">${getInitials(user.first_name, user.last_name)}</div>
                        <span>${user.full_name}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td><span class="tag ${getRoleClass(user.role)}">${formatRole(user.role)}</span></td>
                <td>${user.is_partner_user && user.partner ? `<span class="tag tag--blue">${user.partner.name}</span>` : '<span class="text-secondary">-</span>'}</td>
                <td><span class="tag ${user.is_active ? 'tag--green' : 'tag--gray'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn--ghost btn--small" onclick="editUser(${user.id})" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"/></svg>
                        </button>
                        <button class="btn btn--ghost btn--small" onclick="toggleUserStatus(${user.id}, ${user.is_active})" title="${user.is_active ? 'Deactivate' : 'Activate'}">
                            ${user.is_active
                                ? '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M30 28.59L3.41 2 2 3.41 28.59 30 30 28.59z"/><path d="M14 16.59L4.17 26.41 5.41 27.66 16 17.07V22a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h3.17l2-2H6a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4v-6.93l-4 4z"/><path d="M28 6v8a4 4 0 01-4 4h-3.17l-2 2H24a4 4 0 004-4V6a4 4 0 00-4-4h-8a4 4 0 00-4 4v6.93l4-4V6a2 2 0 012-2h8a2 2 0 012 2z"/></svg>'
                                : '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M14 21.5l-5-4.96L7.59 18 14 24.35 25.41 13 24 11.59 14 21.5z"/><path d="M16 2C8.27 2 2 8.27 2 16s6.27 14 14 14 14-6.27 14-14S23.73 2 16 2zm0 26C9.38 28 4 22.62 4 16S9.38 4 16 4s12 5.38 12 12-5.38 12-12 12z"/></svg>'}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load users</td></tr>';
    }
}

/**
 * Get user initials
 */
function getInitials(firstName, lastName) {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
}

/**
 * Get CSS class for role
 */
function getRoleClass(role) {
    const classes = {
        'admin': 'tag--purple',
        'manager': 'tag--blue',
        'csm': 'tag--teal',
        'read_only': 'tag--gray'
    };
    return classes[role] || 'tag--gray';
}

/**
 * Format role for display
 */
function formatRole(role) {
    const labels = {
        'admin': 'Admin',
        'manager': 'Manager',
        'csm': 'CSM',
        'read_only': 'Read Only'
    };
    return labels[role] || role;
}

/**
 * Open create user modal
 */
function openCreateUserModal() {
    const modal = document.getElementById('createUserModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Reset form
        document.getElementById('createUserForm').reset();
        document.getElementById('userEditId').value = '';
        // Reset modal title and button
        document.getElementById('userModalTitle').textContent = 'Create User';
        document.getElementById('createUserBtn').textContent = 'Create User';
        // Hide partner select
        document.getElementById('partnerSelectGroup').style.display = 'none';
        // Populate partner dropdown
        populatePartnerDropdown();
    }
}

/**
 * Edit existing user
 */
function editUser(userId) {
    const user = usersCache.find(u => u.id === userId);
    if (!user) return;

    const modal = document.getElementById('createUserModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Fill form with existing data
        document.getElementById('userEditId').value = user.id;
        document.getElementById('userFirstName').value = user.first_name || '';
        document.getElementById('userLastName').value = user.last_name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userRole').value = user.role || 'csm';
        document.getElementById('userW3id').value = user.w3id || '';
        document.getElementById('userIsPartner').checked = user.is_partner_user || false;

        // Handle partner selection
        populatePartnerDropdown();
        if (user.is_partner_user) {
            document.getElementById('partnerSelectGroup').style.display = 'block';
            document.getElementById('userPartner').required = true;
            if (user.partner_id) {
                document.getElementById('userPartner').value = user.partner_id;
            }
        } else {
            document.getElementById('partnerSelectGroup').style.display = 'none';
            document.getElementById('userPartner').required = false;
        }

        // Update modal title and button
        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('createUserBtn').textContent = 'Update User';
    }
}

/**
 * Toggle partner select visibility
 */
function togglePartnerSelect() {
    const checkbox = document.getElementById('userIsPartner');
    const partnerGroup = document.getElementById('partnerSelectGroup');
    const partnerSelect = document.getElementById('userPartner');

    if (checkbox.checked) {
        partnerGroup.style.display = 'block';
        partnerSelect.required = true;
    } else {
        partnerGroup.style.display = 'none';
        partnerSelect.required = false;
        partnerSelect.value = '';
    }
}

/**
 * Populate partner dropdown
 */
function populatePartnerDropdown() {
    const select = document.getElementById('userPartner');
    if (!select) return;

    select.innerHTML = '<option value="">Select a partner...</option>';
    partnersCache.filter(p => p.is_active).forEach(partner => {
        const option = document.createElement('option');
        option.value = partner.id;
        option.textContent = partner.name;
        select.appendChild(option);
    });
}

/**
 * Close create user modal
 */
function closeCreateUserModal() {
    const modal = document.getElementById('createUserModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Handle user form submission (create or update)
 */
async function handleUserSubmit(event) {
    event.preventDefault();

    const btn = document.getElementById('createUserBtn');
    const originalText = btn.innerHTML;
    const editId = document.getElementById('userEditId').value;
    const isEdit = editId && editId !== '';

    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> ${isEdit ? 'Updating...' : 'Creating...'}`;

    try {
        const formData = {
            first_name: document.getElementById('userFirstName').value.trim(),
            last_name: document.getElementById('userLastName').value.trim(),
            email: document.getElementById('userEmail').value.trim(),
            role: document.getElementById('userRole').value,
            is_partner_user: document.getElementById('userIsPartner').checked,
        };

        const w3id = document.getElementById('userW3id').value.trim();
        if (w3id) {
            formData.w3id = w3id;
        } else if (isEdit) {
            formData.w3id = null; // Clear w3id if empty during edit
        }

        // Add partner_id if this is a partner user
        if (formData.is_partner_user) {
            const partnerId = document.getElementById('userPartner').value;
            if (partnerId) {
                formData.partner_id = parseInt(partnerId, 10);
            }
        } else {
            formData.partner_id = null; // Clear partner_id if not a partner user
        }

        const url = isEdit ? `${ADMIN_API_URL}/users/${editId}` : `${ADMIN_API_URL}/users`;
        const method = isEdit ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Failed to ${isEdit ? 'update' : 'create'} user`);
        }

        const user = await response.json();

        closeCreateUserModal();
        showToast(`User "${user.full_name}" ${isEdit ? 'updated' : 'created'} successfully!`, 'success');

        // Reload users and stats
        await loadUsers();
        await refreshStats();

    } catch (error) {
        console.error(`Failed to ${isEdit ? 'update' : 'create'} user:`, error);
        showToast(error.message || `Failed to ${isEdit ? 'update' : 'create'} user`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Toggle user active status
 */
async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_URL}/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_active: !currentStatus }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Failed to ${action} user`);
        }

        showToast(`User ${action}d successfully`, 'success');
        await loadUsers();
        await refreshStats();

    } catch (error) {
        console.error(`Failed to ${action} user:`, error);
        showToast(error.message || `Failed to ${action} user`, 'error');
    }
}

// =====================
// Partner Management
// =====================

/**
 * Load and display partners
 */
async function loadPartners() {
    const tableBody = document.getElementById('partnersTableBody');
    if (!tableBody) return;

    try {
        // Get all partners (active and inactive) for admin view
        const response = await fetch(`${ADMIN_API_URL}/partners`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        partnersCache = data.items || [];

        if (partnersCache.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No partners found</td></tr>';
            return;
        }

        tableBody.innerHTML = partnersCache.map(partner => `
            <tr>
                <td><strong>${partner.name}</strong></td>
                <td><code>${partner.code}</code></td>
                <td>${partner.contact_email || '<span class="text-secondary">-</span>'}</td>
                <td><span class="tag ${partner.is_active ? 'tag--green' : 'tag--gray'}">${partner.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn--ghost btn--small" onclick="editPartner(${partner.id})" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"/></svg>
                        </button>
                        <button class="btn btn--ghost btn--small" onclick="togglePartnerStatus(${partner.id}, ${partner.is_active})" title="${partner.is_active ? 'Deactivate' : 'Activate'}">
                            ${partner.is_active
                                ? '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M30 28.59L3.41 2 2 3.41 28.59 30 30 28.59z"/><path d="M14 16.59L4.17 26.41 5.41 27.66 16 17.07V22a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h3.17l2-2H6a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4v-6.93l-4 4z"/><path d="M28 6v8a4 4 0 01-4 4h-3.17l-2 2H24a4 4 0 004-4V6a4 4 0 00-4-4h-8a4 4 0 00-4 4v6.93l4-4V6a2 2 0 012-2h8a2 2 0 012 2z"/></svg>'
                                : '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M14 21.5l-5-4.96L7.59 18 14 24.35 25.41 13 24 11.59 14 21.5z"/><path d="M16 2C8.27 2 2 8.27 2 16s6.27 14 14 14 14-6.27 14-14S23.73 2 16 2zm0 26C9.38 28 4 22.62 4 16S9.38 4 16 4s12 5.38 12 12-5.38 12-12 12z"/></svg>'}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load partners:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load partners</td></tr>';
    }
}

/**
 * Open create partner modal
 */
function openCreatePartnerModal() {
    const modal = document.getElementById('createPartnerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Reset form
        document.getElementById('partnerForm').reset();
        document.getElementById('partnerEditId').value = '';
        document.getElementById('partnerModalTitle').textContent = 'Create Partner';
        document.getElementById('partnerSubmitBtn').textContent = 'Create Partner';
    }
}

/**
 * Close partner modal
 */
function closePartnerModal() {
    const modal = document.getElementById('createPartnerModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Edit existing partner
 */
function editPartner(partnerId) {
    const partner = partnersCache.find(p => p.id === partnerId);
    if (!partner) return;

    const modal = document.getElementById('createPartnerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Fill form with existing data
        document.getElementById('partnerEditId').value = partner.id;
        document.getElementById('partnerName').value = partner.name;
        document.getElementById('partnerCode').value = partner.code;
        document.getElementById('partnerEmail').value = partner.contact_email || '';
        document.getElementById('partnerPhone').value = partner.contact_phone || '';
        document.getElementById('partnerWebsite').value = partner.website || '';

        document.getElementById('partnerModalTitle').textContent = 'Edit Partner';
        document.getElementById('partnerSubmitBtn').textContent = 'Update Partner';
    }
}

/**
 * Handle partner form submission (create or update)
 */
async function handlePartnerSubmit(event) {
    event.preventDefault();

    const btn = document.getElementById('partnerSubmitBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    const editId = document.getElementById('partnerEditId').value;
    const isEdit = editId && editId !== '';

    try {
        const formData = {
            name: document.getElementById('partnerName').value.trim(),
            code: document.getElementById('partnerCode').value.trim().toLowerCase().replace(/\s+/g, '_'),
        };

        const email = document.getElementById('partnerEmail').value.trim();
        if (email) formData.contact_email = email;

        const phone = document.getElementById('partnerPhone').value.trim();
        if (phone) formData.contact_phone = phone;

        const website = document.getElementById('partnerWebsite').value.trim();
        if (website) formData.website = website;

        const url = isEdit ? `${ADMIN_API_URL}/partners/${editId}` : `${ADMIN_API_URL}/partners`;
        const method = isEdit ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Failed to ${isEdit ? 'update' : 'create'} partner`);
        }

        const partner = await response.json();

        closePartnerModal();
        showToast(`Partner "${partner.name}" ${isEdit ? 'updated' : 'created'} successfully!`, 'success');

        // Reload partners and stats
        await loadPartners();
        await refreshStats();

    } catch (error) {
        console.error('Failed to save partner:', error);
        showToast(error.message || 'Failed to save partner', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Toggle partner active status
 */
async function togglePartnerStatus(partnerId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this partner?`)) {
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_URL}/partners/${partnerId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_active: !currentStatus }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Failed to ${action} partner`);
        }

        showToast(`Partner ${action}d successfully`, 'success');
        await loadPartners();
        await refreshStats();

    } catch (error) {
        console.error(`Failed to ${action} partner:`, error);
        showToast(error.message || `Failed to ${action} partner`, 'error');
    }
}

// =====================
// Use Case Management
// =====================

// Store use cases for editing
let useCasesCache = [];

/**
 * Load and display use cases
 */
async function loadUseCases() {
    const tableBody = document.getElementById('useCasesTableBody');
    if (!tableBody) return;

    try {
        const areaFilter = document.getElementById('useCaseAreaFilter')?.value || '';
        let url = `${ADMIN_API_URL}/use-cases?limit=200`;
        if (areaFilter) {
            url += `&solution_area=${areaFilter}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        useCasesCache = data.items || [];

        if (useCasesCache.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">No use cases found</td></tr>';
            return;
        }

        tableBody.innerHTML = useCasesCache.map(uc => `
            <tr>
                <td title="${uc.name}">${truncateText(uc.name, 50)}</td>
                <td><span class="tag tag--blue">${uc.solution_area || '-'}</span></td>
                <td>${uc.domain || '-'}</td>
                <td>${uc.display_order}</td>
                <td><span class="tag ${uc.is_active ? 'tag--green' : 'tag--gray'}">${uc.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="flex gap-2">
                        <button class="btn btn--ghost btn--small" onclick="editUseCase(${uc.id})" title="Edit">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"/></svg>
                        </button>
                        <button class="btn btn--ghost btn--small" onclick="toggleUseCaseStatus(${uc.id}, ${uc.is_active})" title="${uc.is_active ? 'Deactivate' : 'Activate'}">
                            ${uc.is_active
                                ? '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M30 28.59L3.41 2 2 3.41 28.59 30 30 28.59z"/><path d="M14 16.59L4.17 26.41 5.41 27.66 16 17.07V22a2 2 0 01-2 2H6a2 2 0 01-2-2v-8a2 2 0 012-2h3.17l2-2H6a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4v-6.93l-4 4z"/><path d="M28 6v8a4 4 0 01-4 4h-3.17l-2 2H24a4 4 0 004-4V6a4 4 0 00-4-4h-8a4 4 0 00-4 4v6.93l4-4V6a2 2 0 012-2h8a2 2 0 012 2z"/></svg>'
                                : '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M14 21.5l-5-4.96L7.59 18 14 24.35 25.41 13 24 11.59 14 21.5z"/><path d="M16 2C8.27 2 2 8.27 2 16s6.27 14 14 14 14-6.27 14-14S23.73 2 16 2zm0 26C9.38 28 4 22.62 4 16S9.38 4 16 4s12 5.38 12 12-5.38 12-12 12z"/></svg>'}
                        </button>
                        <button class="btn btn--ghost btn--small btn--danger" onclick="deleteUseCase(${uc.id})" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M12 12h2v12h-2zM18 12h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6zm4 22V8h16v20zM12 2h8v2h-8z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load use cases:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load use cases</td></tr>';
    }
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Filter use cases by solution area
 */
function filterUseCases() {
    loadUseCases();
}

/**
 * Open use case modal
 */
function openUseCaseModal() {
    const modal = document.getElementById('useCaseModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Reset form
        document.getElementById('useCaseForm').reset();
        document.getElementById('useCaseEditId').value = '';
        document.getElementById('useCaseModalTitle').textContent = 'Add Use Case';
        document.getElementById('useCaseSubmitBtn').textContent = 'Add Use Case';
        document.getElementById('useCaseActive').checked = true;
    }
}

/**
 * Close use case modal
 */
function closeUseCaseModal() {
    const modal = document.getElementById('useCaseModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Edit existing use case
 */
function editUseCase(useCaseId) {
    const useCase = useCasesCache.find(uc => uc.id === useCaseId);
    if (!useCase) return;

    const modal = document.getElementById('useCaseModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Fill form with existing data
        document.getElementById('useCaseEditId').value = useCase.id;
        document.getElementById('useCaseName').value = useCase.name || '';
        document.getElementById('useCaseSolutionArea').value = useCase.solution_area || '';
        document.getElementById('useCaseDomain').value = useCase.domain || '';
        document.getElementById('useCaseDescription').value = useCase.description || '';
        document.getElementById('useCaseOrder').value = useCase.display_order || 1;
        document.getElementById('useCaseActive').checked = useCase.is_active !== false;

        document.getElementById('useCaseModalTitle').textContent = 'Edit Use Case';
        document.getElementById('useCaseSubmitBtn').textContent = 'Update Use Case';
    }
}

/**
 * Handle use case form submission (create or update)
 */
async function handleUseCaseSubmit(event) {
    event.preventDefault();

    const btn = document.getElementById('useCaseSubmitBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    const editId = document.getElementById('useCaseEditId').value;
    const isEdit = editId && editId !== '';

    try {
        const formData = {
            name: document.getElementById('useCaseName').value.trim(),
            solution_area: document.getElementById('useCaseSolutionArea').value,
            domain: document.getElementById('useCaseDomain').value,
            display_order: parseInt(document.getElementById('useCaseOrder').value, 10) || 1,
        };

        const description = document.getElementById('useCaseDescription').value.trim();
        if (description) formData.description = description;

        // For updates, include is_active
        if (isEdit) {
            formData.is_active = document.getElementById('useCaseActive').checked;
        }

        const url = isEdit ? `${ADMIN_API_URL}/use-cases/${editId}` : `${ADMIN_API_URL}/use-cases`;
        const method = isEdit ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Failed to ${isEdit ? 'update' : 'create'} use case`);
        }

        const useCase = await response.json();

        closeUseCaseModal();
        showToast(`Use case "${truncateText(useCase.name, 30)}" ${isEdit ? 'updated' : 'created'} successfully!`, 'success');

        // Reload use cases and stats
        await loadUseCases();
        await refreshStats();

    } catch (error) {
        console.error('Failed to save use case:', error);
        showToast(error.message || 'Failed to save use case', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Toggle use case active status
 */
async function toggleUseCaseStatus(useCaseId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this use case?`)) {
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_URL}/use-cases/${useCaseId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_active: !currentStatus }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || `Failed to ${action} use case`);
        }

        showToast(`Use case ${action}d successfully`, 'success');
        await loadUseCases();
        await refreshStats();

    } catch (error) {
        console.error(`Failed to ${action} use case:`, error);
        showToast(error.message || `Failed to ${action} use case`, 'error');
    }
}

/**
 * Delete use case
 */
async function deleteUseCase(useCaseId) {
    if (!confirm('Are you sure you want to delete this use case?\n\nThis will also remove any customer tracking for this use case.\n\nThis action CANNOT be undone!')) {
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_URL}/use-cases/${useCaseId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete use case');
        }

        showToast('Use case deleted successfully', 'success');
        await loadUseCases();
        await refreshStats();

    } catch (error) {
        console.error('Failed to delete use case:', error);
        showToast(error.message || 'Failed to delete use case', 'error');
    }
}

// =====================
// Database Migrations
// =====================

/**
 * Run database migrations
 */
async function runMigrations() {
    const btn = document.getElementById('migrateBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Running...';

    try {
        const response = await fetch(`${ADMIN_API_URL}/admin/migrate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to run migrations');
        }

        const result = await response.json();

        if (result.migrations && result.migrations.length > 0) {
            showToast(`Migrations completed: ${result.migrations.join(', ')}`, 'success');
        } else {
            showToast(result.message, 'info');
        }

    } catch (error) {
        console.error('Failed to run migrations:', error);
        showToast(error.message || 'Failed to run migrations', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Make functions available globally
window.refreshStats = refreshStats;
window.clearTestData = clearTestData;
window.reseedData = reseedData;
window.hideResults = hideResults;
window.loadUsers = loadUsers;
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.editUser = editUser;
window.handleUserSubmit = handleUserSubmit;
window.toggleUserStatus = toggleUserStatus;
window.togglePartnerSelect = togglePartnerSelect;
window.loadPartners = loadPartners;
window.openCreatePartnerModal = openCreatePartnerModal;
window.closePartnerModal = closePartnerModal;
window.editPartner = editPartner;
window.handlePartnerSubmit = handlePartnerSubmit;
window.togglePartnerStatus = togglePartnerStatus;
window.loadUseCases = loadUseCases;
window.filterUseCases = filterUseCases;
window.openUseCaseModal = openUseCaseModal;
window.closeUseCaseModal = closeUseCaseModal;
window.editUseCase = editUseCase;
window.handleUseCaseSubmit = handleUseCaseSubmit;
window.toggleUseCaseStatus = toggleUseCaseStatus;
window.deleteUseCase = deleteUseCase;
window.runMigrations = runMigrations;
