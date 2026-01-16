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
    await loadAuthSettings();
    await loadAdoptionStats();
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

/**
 * Open import use cases modal
 */
function openImportUseCasesModal() {
    const modal = document.getElementById('importUseCasesModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.getElementById('importUseCasesForm').reset();
    }
}

/**
 * Close import use cases modal
 */
function closeImportUseCasesModal() {
    const modal = document.getElementById('importUseCasesModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Handle import use cases from Excel
 */
async function handleImportUseCases(event) {
    event.preventDefault();

    const btn = document.getElementById('importUseCasesBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Importing...';

    try {
        const fileInput = document.getElementById('useCaseImportFile');
        const replaceExisting = document.getElementById('useCaseReplaceExisting').checked;

        if (!fileInput.files || fileInput.files.length === 0) {
            throw new Error('Please select a file to upload');
        }

        // Confirm if replace is checked
        if (replaceExisting) {
            if (!confirm('You have selected to replace ALL existing use cases.\n\nThis will DELETE all current use cases and customer tracking!\n\nAre you sure you want to continue?')) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                return;
            }
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        const url = `${ADMIN_API_URL}/use-cases/import?replace_existing=${replaceExisting}`;

        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to import use cases');
        }

        const result = await response.json();

        closeImportUseCasesModal();

        // Build result message
        let message = `Import complete: ${result.created} created, ${result.updated} updated`;
        if (result.total_errors > 0) {
            message += `. ${result.total_errors} error(s)`;
        }
        showToast(message, result.total_errors > 0 ? 'warning' : 'success');

        // Show errors in results card if any
        if (result.errors && result.errors.length > 0) {
            const card = document.getElementById('resultsCard');
            const content = document.getElementById('resultsContent');

            content.innerHTML = `
                <div class="notification notification--warning mb-3">
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="#8e6a00"><path d="M16 2L1 29h30L16 2zm-1 10h2v8h-2v-8zm1 14c-.8 0-1.5-.7-1.5-1.5S15.2 23 16 23s1.5.7 1.5 1.5S16.8 26 16 26z"/></svg>
                    <span>Import completed with ${result.total_errors} error(s)</span>
                </div>
                <div class="text-secondary mb-2">
                    <strong>${result.created}</strong> use cases created,
                    <strong>${result.updated}</strong> updated
                </div>
                <h4 style="margin: 16px 0 8px;">Errors (showing first 10):</h4>
                <ul class="results-list">
                    ${result.errors.map(err => `<li class="text-danger">${err}</li>`).join('')}
                </ul>
            `;

            card.style.display = 'block';
        }

        // Reload use cases and stats
        await loadUseCases();
        await refreshStats();

    } catch (error) {
        console.error('Failed to import use cases:', error);
        showToast(error.message || 'Failed to import use cases', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
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

// =====================
// Authentication Settings
// =====================

/**
 * Load authentication settings
 */
async function loadAuthSettings() {
    const toggle = document.getElementById('authEnabledToggle');
    const badge = document.getElementById('authStatusBadge');

    if (!toggle || !badge) return;

    try {
        const response = await fetch(`${ADMIN_API_URL}/admin/settings/auth_enabled`);
        if (!response.ok) {
            if (response.status === 404) {
                // Setting doesn't exist yet - run migrations
                badge.textContent = 'Not configured';
                badge.className = 'tag tag--yellow';
                toggle.checked = false;
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const setting = await response.json();
        const isEnabled = setting.value === 'true';

        toggle.checked = isEnabled;
        updateAuthStatusDisplay(isEnabled);

    } catch (error) {
        console.error('Failed to load auth settings:', error);
        badge.textContent = 'Error';
        badge.className = 'tag tag--red';
    }
}

/**
 * Update auth status badge display
 */
function updateAuthStatusDisplay(isEnabled) {
    const badge = document.getElementById('authStatusBadge');
    if (!badge) return;

    if (isEnabled) {
        badge.textContent = 'Enabled';
        badge.className = 'tag tag--green';
    } else {
        badge.textContent = 'Disabled';
        badge.className = 'tag tag--gray';
    }
}

/**
 * Toggle authentication enabled/disabled
 */
async function toggleAuthEnabled() {
    const toggle = document.getElementById('authEnabledToggle');
    const newValue = toggle.checked;

    // Confirm before enabling
    if (newValue) {
        if (!confirm('Are you sure you want to enable authentication?\n\nUsers will need to log in to access the application.')) {
            toggle.checked = false;
            return;
        }
    }

    try {
        const response = await fetch(`${ADMIN_API_URL}/admin/settings/auth_enabled`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ value: newValue ? 'true' : 'false' }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update auth setting');
        }

        updateAuthStatusDisplay(newValue);
        showToast(`Authentication ${newValue ? 'enabled' : 'disabled'} successfully`, 'success');

    } catch (error) {
        console.error('Failed to toggle auth:', error);
        showToast(error.message || 'Failed to update auth setting', 'error');
        // Revert toggle
        toggle.checked = !newValue;
    }
}

// ==================== ADOPTION JOURNEY MANAGEMENT ====================

let allCustomersData = [];
let currentStageFilter = '';

const ADOPTION_STAGE_NAMES = {
    'onboarding': 'Onboarding',
    'adoption': 'Adoption',
    'value_realization': 'Value Realization',
    'expansion': 'Expansion',
    'renewal': 'Renewal'
};

/**
 * Load adoption stats and customer data
 */
async function loadAdoptionStats() {
    try {
        const response = await fetch(`${ADMIN_API_URL}/customers`);
        if (!response.ok) throw new Error('Failed to fetch customers');

        const data = await response.json();
        allCustomersData = data.items || [];

        // Calculate counts per stage
        const stageCounts = {
            onboarding: 0,
            adoption: 0,
            value_realization: 0,
            expansion: 0,
            renewal: 0
        };

        allCustomersData.forEach(customer => {
            const stage = customer.adoption_stage || 'onboarding';
            if (stageCounts.hasOwnProperty(stage)) {
                stageCounts[stage]++;
            }
        });

        // Update count displays
        Object.entries(stageCounts).forEach(([stage, count]) => {
            const countEl = document.getElementById(`adoption-count-${stage}`);
            if (countEl) {
                countEl.textContent = count;
            }
        });

        // Render initial table (all customers)
        renderAdoptionCustomersTable(allCustomersData);
        updateAdoptionFilterCount(allCustomersData.length);

    } catch (error) {
        console.error('Failed to load adoption stats:', error);
    }
}

/**
 * Refresh adoption stats
 */
function refreshAdoptionStats() {
    loadAdoptionStats();
}

/**
 * Filter customers by adoption stage
 */
function filterByStage(stage) {
    currentStageFilter = stage;

    // Update dropdown if called from card click
    const dropdown = document.getElementById('adoptionStageFilter');
    if (dropdown && dropdown.value !== stage) {
        dropdown.value = stage;
    }

    // Update card selection
    document.querySelectorAll('.adoption-stat-card').forEach(card => {
        if (card.dataset.stage === stage) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Filter and render table
    let filteredCustomers;
    if (stage) {
        filteredCustomers = allCustomersData.filter(c => c.adoption_stage === stage);
    } else {
        filteredCustomers = allCustomersData;
        // Remove selection from all cards
        document.querySelectorAll('.adoption-stat-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    renderAdoptionCustomersTable(filteredCustomers);
    updateAdoptionFilterCount(filteredCustomers.length);
}

/**
 * Update the filter count display
 */
function updateAdoptionFilterCount(count) {
    const countEl = document.getElementById('adoptionFilterCount');
    if (countEl) {
        countEl.textContent = `${count} customer${count !== 1 ? 's' : ''}`;
    }
}

/**
 * Render the customers table for adoption section
 */
function renderAdoptionCustomersTable(customers) {
    const tbody = document.getElementById('adoptionCustomersTableBody');
    if (!tbody) return;

    if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No customers found</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(customer => {
        const stageName = ADOPTION_STAGE_NAMES[customer.adoption_stage] || customer.adoption_stage || '-';
        const healthClass = {
            'green': 'tag--green',
            'yellow': 'tag--yellow',
            'red': 'tag--red'
        }[customer.health_status] || 'tag--gray';

        const arr = customer.arr ? formatCurrency(customer.arr) : '-';
        const renewalDate = customer.renewal_date ? formatDate(customer.renewal_date) : '-';

        return `
            <tr style="cursor: pointer;" onclick="window.location.href='customer-detail.html?id=${customer.id}'">
                <td>
                    <div style="font-weight: 500;">${customer.name}</div>
                    <div class="text-secondary" style="font-size: 12px;">${customer.industry || '-'}</div>
                </td>
                <td><span class="tag tag--blue">${stageName}</span></td>
                <td><span class="tag ${healthClass}">${(customer.health_status || '-').toUpperCase()}</span></td>
                <td>${arr}</td>
                <td>${renewalDate}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    if (!amount) return '-';
    const num = parseFloat(amount);
    if (num >= 1000000) {
        return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
        return `$${(num / 1000).toFixed(0)}K`;
    }
    return `$${num.toFixed(0)}`;
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ==================== SPM ASSESSMENT TEMPLATE MANAGEMENT ====================

let assessmentTemplatesCache = [];

/**
 * Load assessment templates
 */
async function loadAssessmentTemplates() {
    const tableBody = document.getElementById('assessmentTemplatesTableBody');
    if (!tableBody) return;

    try {
        const response = await window.API.AssessmentAPI.getTemplates();
        assessmentTemplatesCache = response.items || [];

        if (assessmentTemplatesCache.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary">No templates found. Upload an Excel file to create one.</td></tr>';
            return;
        }

        // For each template, we need to fetch details to get question/dimension counts
        const templateDetails = await Promise.all(
            assessmentTemplatesCache.map(async (t) => {
                try {
                    const detail = await window.API.AssessmentAPI.getTemplate(t.id);
                    return {
                        ...t,
                        questionCount: detail.questions?.length || 0,
                        dimensionCount: detail.dimensions?.length || 0
                    };
                } catch (e) {
                    return { ...t, questionCount: 0, dimensionCount: 0 };
                }
            })
        );

        tableBody.innerHTML = templateDetails.map(template => `
            <tr>
                <td>
                    <strong>${template.name}</strong>
                    ${template.description ? `<div class="text-secondary" style="font-size: 12px;">${truncateText(template.description, 50)}</div>` : ''}
                </td>
                <td><code>${template.version}</code></td>
                <td>${template.questionCount}</td>
                <td>${template.dimensionCount}</td>
                <td>
                    <span class="tag ${template.is_active ? 'tag--green' : 'tag--gray'}">
                        ${template.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="flex gap-2">
                        ${!template.is_active ? `
                            <button class="btn btn--ghost btn--small" onclick="activateTemplate(${template.id})" title="Set as Active">
                                <svg width="16" height="16" viewBox="0 0 32 32"><path d="M14 21.5l-5-4.96L7.59 18 14 24.35 25.41 13 24 11.59 14 21.5z"/><path d="M16 2C8.27 2 2 8.27 2 16s6.27 14 14 14 14-6.27 14-14S23.73 2 16 2zm0 26C9.38 28 4 22.62 4 16S9.38 4 16 4s12 5.38 12 12-5.38 12-12 12z"/></svg>
                            </button>
                        ` : ''}
                        <button class="btn btn--ghost btn--small" onclick="viewTemplateDetails(${template.id})" title="View Details">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M30.94 15.66A16.69 16.69 0 0016 5 16.69 16.69 0 001.06 15.66a1 1 0 000 .68A16.69 16.69 0 0016 27a16.69 16.69 0 0014.94-10.66 1 1 0 000-.68zM16 25c-5.3 0-10.9-3.93-12.93-9C5.1 10.93 10.7 7 16 7s10.9 3.93 12.93 9C26.9 21.07 21.3 25 16 25z"/><path d="M16 10a6 6 0 106 6 6 6 0 00-6-6zm0 10a4 4 0 114-4 4 4 0 01-4 4z"/></svg>
                        </button>
                        <button class="btn btn--ghost btn--small btn--danger" onclick="deleteTemplate(${template.id})" title="Delete">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M12 12h2v12h-2zM18 12h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6zm4 22V8h16v20zM12 2h8v2h-8z"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Failed to load assessment templates:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load templates</td></tr>';
    }
}

/**
 * Open upload template modal
 */
function openUploadTemplateModal() {
    const modal = document.getElementById('uploadTemplateModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.getElementById('uploadTemplateForm').reset();
    }
}

/**
 * Close upload template modal
 */
function closeUploadTemplateModal() {
    const modal = document.getElementById('uploadTemplateModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Handle template Excel upload
 */
async function handleTemplateUpload(event) {
    event.preventDefault();

    const btn = document.getElementById('uploadTemplateBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Uploading...';

    try {
        const name = document.getElementById('templateName').value.trim();
        const version = document.getElementById('templateVersion').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        const fileInput = document.getElementById('templateFile');

        if (!fileInput.files || fileInput.files.length === 0) {
            throw new Error('Please select a file to upload');
        }

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        const result = await window.API.AssessmentAPI.uploadTemplate(formData, name, version, description);

        if (result.success) {
            closeUploadTemplateModal();
            showToast(`Template created with ${result.dimensions_created} dimensions and ${result.questions_created} questions`, 'success');
            await loadAssessmentTemplates();
        } else {
            throw new Error(result.errors.join(', ') || 'Upload failed');
        }

    } catch (error) {
        console.error('Failed to upload template:', error);
        showToast(error.message || 'Failed to upload template', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Open create template modal
 */
function openCreateTemplateModal() {
    const modal = document.getElementById('createTemplateModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.getElementById('createTemplateForm').reset();
        document.getElementById('templateEditId').value = '';
        document.getElementById('templateModalTitle').textContent = 'Create Template';
        document.getElementById('createTemplateSubmitBtn').textContent = 'Create Template';
    }
}

/**
 * Close create template modal
 */
function closeCreateTemplateModal() {
    const modal = document.getElementById('createTemplateModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

/**
 * Handle create template form
 */
async function handleCreateTemplate(event) {
    event.preventDefault();

    const btn = document.getElementById('createTemplateSubmitBtn');
    const originalText = btn.innerHTML;
    const editId = document.getElementById('templateEditId').value;
    const isEdit = editId && editId !== '';

    btn.disabled = true;
    btn.innerHTML = `<span class="loading-spinner"></span> ${isEdit ? 'Updating...' : 'Creating...'}`;

    try {
        const data = {
            name: document.getElementById('createTemplateName').value.trim(),
            version: document.getElementById('createTemplateVersion').value.trim(),
            description: document.getElementById('createTemplateDescription').value.trim() || null,
        };

        let result;
        if (isEdit) {
            result = await window.API.AssessmentAPI.updateTemplate(parseInt(editId), data);
        } else {
            result = await window.API.AssessmentAPI.createTemplate(data);
        }

        closeCreateTemplateModal();
        showToast(`Template "${result.name}" ${isEdit ? 'updated' : 'created'} successfully`, 'success');
        await loadAssessmentTemplates();

    } catch (error) {
        console.error('Failed to save template:', error);
        showToast(error.message || 'Failed to save template', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Activate a template (set as the current active version)
 */
async function activateTemplate(templateId) {
    if (!confirm('This will set this template as the active version. Any new assessments will use this template.\n\nContinue?')) {
        return;
    }

    try {
        await window.API.AssessmentAPI.activateTemplate(templateId);
        showToast('Template activated successfully', 'success');
        await loadAssessmentTemplates();
    } catch (error) {
        console.error('Failed to activate template:', error);
        showToast(error.message || 'Failed to activate template', 'error');
    }
}

/**
 * View template details (shows questions and dimensions)
 */
async function viewTemplateDetails(templateId) {
    try {
        const template = await window.API.AssessmentAPI.getTemplate(templateId);

        // Build details HTML
        const dimensionsList = template.dimensions?.map(d => `
            <li><strong>${d.name}</strong>${d.description ? `: ${d.description}` : ''}</li>
        `).join('') || '<li>No dimensions</li>';

        const questionsList = template.questions?.map(q => `
            <li><code>${q.question_number}</code> ${truncateText(q.question_text, 80)} <span class="text-secondary">(${q.min_score}-${q.max_score})</span></li>
        `).join('') || '<li>No questions</li>';

        // Show in results card
        const card = document.getElementById('resultsCard');
        const content = document.getElementById('resultsContent');

        content.innerHTML = `
            <h3 style="margin-bottom: 8px;">${template.name} v${template.version}</h3>
            ${template.description ? `<p class="text-secondary mb-4">${template.description}</p>` : ''}

            <h4 style="margin: 16px 0 8px;">Dimensions (${template.dimensions?.length || 0})</h4>
            <ul class="results-list">${dimensionsList}</ul>

            <h4 style="margin: 16px 0 8px;">Questions (${template.questions?.length || 0})</h4>
            <ul class="results-list" style="max-height: 300px; overflow-y: auto;">${questionsList}</ul>
        `;

        card.style.display = 'block';
        card.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Failed to load template details:', error);
        showToast(error.message || 'Failed to load template details', 'error');
    }
}

/**
 * Delete a template
 */
async function deleteTemplate(templateId) {
    if (!confirm('Are you sure you want to delete this template?\n\nThis cannot be undone. Templates with existing assessments cannot be deleted.')) {
        return;
    }

    try {
        await window.API.AssessmentAPI.deleteTemplate(templateId);
        showToast('Template deleted successfully', 'success');
        await loadAssessmentTemplates();
    } catch (error) {
        console.error('Failed to delete template:', error);
        showToast(error.message || 'Failed to delete template', 'error');
    }
}

// Load templates on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Add to existing DOMContentLoaded or call separately
    await loadAssessmentTemplates();
});

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
window.openImportUseCasesModal = openImportUseCasesModal;
window.closeImportUseCasesModal = closeImportUseCasesModal;
window.handleImportUseCases = handleImportUseCases;
window.runMigrations = runMigrations;
window.loadAuthSettings = loadAuthSettings;
window.toggleAuthEnabled = toggleAuthEnabled;
window.loadAdoptionStats = loadAdoptionStats;
window.refreshAdoptionStats = refreshAdoptionStats;
window.filterByStage = filterByStage;
window.loadAssessmentTemplates = loadAssessmentTemplates;
window.openUploadTemplateModal = openUploadTemplateModal;
window.closeUploadTemplateModal = closeUploadTemplateModal;
window.handleTemplateUpload = handleTemplateUpload;
window.openCreateTemplateModal = openCreateTemplateModal;
window.closeCreateTemplateModal = closeCreateTemplateModal;
window.handleCreateTemplate = handleCreateTemplate;
window.activateTemplate = activateTemplate;
window.viewTemplateDetails = viewTemplateDetails;
window.deleteTemplate = deleteTemplate;
