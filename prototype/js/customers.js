/**
 * Customers List - Load and display data from API
 */

let allCustomers = [];
let filteredCustomers = [];

document.addEventListener('DOMContentLoaded', async function() {
    if (await Auth.checkAuthAndRedirect()) {
        Auth.updateUserDisplay();
        await loadCustomersData();
        setupFilters();
    }
});

async function loadCustomersData() {
    try {
        const data = await API.CustomerAPI.getAll();
        allCustomers = data.items || [];
        filteredCustomers = [...allCustomers];
        renderCustomersList();
        updateFilterCounts();
    } catch (error) {
        console.error('Failed to load customers:', error);
        showErrorMessage('Failed to load customers. Please check that the backend is running.');
    }
}

function renderCustomersList() {
    const tableBody = document.querySelector('.data-table tbody');
    if (!tableBody) return;

    if (filteredCustomers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-secondary" style="padding: 48px;">
                    No customers found matching your criteria
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredCustomers.map(customer => `
        <tr onclick="window.location.href='customer-detail.html?id=${customer.id}'" style="cursor: pointer;">
            <td>
                <div class="customer-cell">
                    <div class="customer-cell__avatar">${customer.name.charAt(0)}</div>
                    <div>
                        <div class="customer-cell__name">${customer.name}</div>
                        <div class="customer-cell__industry">${customer.industry || 'N/A'}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="health-indicator">
                    <span class="health-dot health-dot--${customer.health_status}"></span>
                    <span>${customer.health_score || 'N/A'}</span>
                </div>
            </td>
            <td><span class="tag tag--${getAdoptionStageClass(customer.adoption_stage)}">${formatAdoptionStage(customer.adoption_stage)}</span></td>
            <td>${Utils.formatCurrency(customer.arr)}</td>
            <td>${customer.renewal_date ? Utils.formatDate(customer.renewal_date) : 'N/A'}</td>
            <td>${customer.csm_owner?.full_name || customer.csm_owner?.first_name || 'Unassigned'}</td>
            <td>
                <div class="action-menu-wrapper">
                    <button class="btn btn--ghost btn--icon" onclick="event.stopPropagation(); toggleActionMenu(${customer.id}, event)">
                        <svg width="16" height="16" viewBox="0 0 32 32"><circle cx="16" cy="8" r="2"/><circle cx="16" cy="16" r="2"/><circle cx="16" cy="24" r="2"/></svg>
                    </button>
                    <div class="action-menu" id="actionMenu-${customer.id}">
                        <button class="action-menu__item" onclick="event.stopPropagation(); openEditCustomerModal(${customer.id})">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"/></svg>
                            Edit
                        </button>
                        <button class="action-menu__item" onclick="event.stopPropagation(); window.location.href='customer-detail.html?id=${customer.id}'">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M16 8a5 5 0 105 5 5 5 0 00-5-5zm0 8a3 3 0 113-3 3 3 0 01-3 3z"/><path d="M16 4C6 4 0 16 0 16s6 12 16 12 16-12 16-12-6-12-16-12zm0 22c-7.17 0-12.19-8.13-13.57-10.07A21.34 21.34 0 015.9 10.9 25.53 25.53 0 0116 6a25.53 25.53 0 0110.1 4.9 21.34 21.34 0 013.47 5.03C28.19 17.87 23.17 26 16 26z"/></svg>
                            View Details
                        </button>
                        <div class="action-menu__divider"></div>
                        <button class="action-menu__item action-menu__item--danger" onclick="event.stopPropagation(); confirmDeleteCustomer(${customer.id}, '${customer.name.replace(/'/g, "\\'")}')">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M12 12h2v12h-2zm6 0h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/></svg>
                            Delete
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    `).join('');

    // Update count
    const countEl = document.querySelector('.results-count');
    if (countEl) {
        countEl.textContent = `${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`;
    }
}

function setupFilters() {
    // Search input
    const searchInput = document.querySelector('.search-input input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterCustomers();
        });
    }

    // Health filter buttons
    const healthFilters = document.querySelectorAll('.filter-chip[data-filter="health"]');
    healthFilters.forEach(chip => {
        chip.addEventListener('click', () => {
            // Toggle active state
            if (chip.classList.contains('active')) {
                chip.classList.remove('active');
            } else {
                healthFilters.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
            }
            filterCustomers();
        });
    });
}

function filterCustomers() {
    const searchInput = document.querySelector('.search-input input');
    const searchTerm = searchInput?.value?.toLowerCase() || '';

    const activeHealthFilter = document.querySelector('.filter-chip[data-filter="health"].active');
    const healthFilter = activeHealthFilter?.dataset?.value || null;

    filteredCustomers = allCustomers.filter(customer => {
        // Search filter
        const matchesSearch = !searchTerm ||
            customer.name.toLowerCase().includes(searchTerm) ||
            (customer.industry && customer.industry.toLowerCase().includes(searchTerm));

        // Health filter
        const matchesHealth = !healthFilter || customer.health_status === healthFilter;

        return matchesSearch && matchesHealth;
    });

    renderCustomersList();
}

function updateFilterCounts() {
    const healthCounts = {
        all: allCustomers.length,
        green: allCustomers.filter(c => c.health_status === 'green').length,
        yellow: allCustomers.filter(c => c.health_status === 'yellow').length,
        red: allCustomers.filter(c => c.health_status === 'red').length,
    };

    // Update filter chip counts if they exist
    document.querySelectorAll('.filter-chip[data-filter="health"]').forEach(chip => {
        const value = chip.dataset.value;
        const countEl = chip.querySelector('.filter-chip__count');
        if (countEl && healthCounts[value] !== undefined) {
            countEl.textContent = healthCounts[value];
        }
    });
}

function getAdoptionStageClass(stage) {
    const stageMap = {
        'onboarding': 'blue',
        'initial_setup': 'blue',
        'adoption': 'teal',
        'expansion': 'green',
        'optimization': 'purple',
    };
    return stageMap[stage?.toLowerCase()] || 'gray';
}

function formatAdoptionStage(stage) {
    if (!stage) return 'Unknown';
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function showCustomerMenu(customerId) {
    // Could show a dropdown menu with actions
    console.log('Show menu for customer:', customerId);
}

function showErrorMessage(message) {
    console.error(message);
    const tableBody = document.querySelector('.data-table tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger" style="padding: 48px;">
                    ${message}
                </td>
            </tr>
        `;
    }
}

// ========== Add Customer Modal Functions ==========

let csmUsers = [];

async function loadCSMUsers() {
    try {
        const data = await API.UserAPI.getAll();
        csmUsers = (data.items || []).filter(u => u.role === 'csm');
        populateCSMDropdown();
    } catch (error) {
        console.error('Failed to load CSM users:', error);
    }
}

function populateCSMDropdown() {
    const csmSelect = document.getElementById('customerCSM');
    if (!csmSelect) return;

    csmSelect.innerHTML = '<option value="">Select CSM</option>' +
        csmUsers.map(user => `<option value="${user.id}">${user.full_name || user.first_name}</option>`).join('');
}

function openAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        loadCSMUsers();

        // Set default renewal date to 1 year from now
        const renewalInput = document.getElementById('customerRenewal');
        if (renewalInput && !renewalInput.value) {
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            renewalInput.value = nextYear.toISOString().split('T')[0];
        }
    }
}

function closeAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Reset form
        const form = document.getElementById('addCustomerForm');
        if (form) form.reset();
    }
}

async function handleAddCustomer(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = document.getElementById('submitBtn');

    // Disable submit button
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
    }

    try {
        // Gather form data
        const formData = {
            name: form.name.value.trim(),
            industry: form.industry.value || null,
            arr: form.arr.value ? parseFloat(form.arr.value) : null,
            health_status: form.health_status.value || 'green',
            health_score: form.health_score.value ? parseInt(form.health_score.value) : null,
            adoption_stage: form.adoption_stage.value || 'onboarding',
            renewal_date: form.renewal_date.value || null,
            csm_owner_id: form.csm_owner_id.value ? parseInt(form.csm_owner_id.value) : null,
            employee_count: form.employee_count.value || null,
            website: form.website.value || null,
        };

        // Validate required fields
        if (!formData.name) {
            showToast('Customer name is required', 'error');
            return;
        }

        // Call API to create customer
        const newCustomer = await API.CustomerAPI.create(formData);

        // Close modal and show success message
        closeAddCustomerModal();
        showToast(`Customer "${newCustomer.name}" created successfully!`, 'success');

        // Reload customers list
        await loadCustomersData();

    } catch (error) {
        console.error('Failed to create customer:', error);
        showToast('Failed to create customer. Please try again.', 'error');
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Customer';
        }
    }
}

function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeAddCustomerModal();
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAddCustomerModal();
    }
});

// ========== Edit Customer Modal Functions ==========

let editingCustomerId = null;

async function openEditCustomerModal(customerId) {
    const modal = document.getElementById('editCustomerModal');
    if (!modal) return;

    editingCustomerId = customerId;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Load CSM users for dropdown
    await loadCSMUsersForEdit();

    // Load customer data and populate form
    try {
        const customer = await API.CustomerAPI.getById(customerId);
        populateEditForm(customer);
    } catch (error) {
        console.error('Failed to load customer:', error);
        showToast('Failed to load customer data', 'error');
        closeEditCustomerModal();
    }
}

async function loadCSMUsersForEdit() {
    try {
        const data = await API.UserAPI.getAll();
        const users = (data.items || []).filter(u => u.role === 'csm');
        const csmSelect = document.getElementById('editCustomerCSM');
        if (csmSelect) {
            csmSelect.innerHTML = '<option value="">Select CSM</option>' +
                users.map(user => `<option value="${user.id}">${user.full_name || user.first_name}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load CSM users:', error);
    }
}

function populateEditForm(customer) {
    document.getElementById('editCustomerId').value = customer.id;
    document.getElementById('editCustomerName').value = customer.name || '';
    document.getElementById('editCustomerIndustry').value = customer.industry || '';
    document.getElementById('editCustomerARR').value = customer.arr || '';
    document.getElementById('editCustomerHealth').value = customer.health_status || 'green';
    document.getElementById('editCustomerHealthScore').value = customer.health_score || '';
    document.getElementById('editCustomerAdoption').value = customer.adoption_stage || 'onboarding';
    document.getElementById('editCustomerRenewal').value = customer.renewal_date || '';
    document.getElementById('editCustomerCSM').value = customer.csm_owner_id || '';
    document.getElementById('editCustomerEmployees').value = customer.employee_count || '';
    document.getElementById('editCustomerWebsite').value = customer.website || '';
}

function closeEditCustomerModal() {
    const modal = document.getElementById('editCustomerModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        editingCustomerId = null;
        // Reset form
        const form = document.getElementById('editCustomerForm');
        if (form) form.reset();
    }
}

async function handleEditCustomer(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = document.getElementById('editSubmitBtn');
    const customerId = document.getElementById('editCustomerId').value;

    if (!customerId) {
        showToast('Customer ID is missing', 'error');
        return;
    }

    // Disable submit button
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    try {
        // Gather form data - only include changed fields
        const formData = {};

        const name = document.getElementById('editCustomerName').value.trim();
        if (name) formData.name = name;

        const industry = document.getElementById('editCustomerIndustry').value;
        if (industry) formData.industry = industry;

        const arr = document.getElementById('editCustomerARR').value;
        if (arr) formData.arr = parseFloat(arr);

        const healthStatus = document.getElementById('editCustomerHealth').value;
        if (healthStatus) formData.health_status = healthStatus;

        const healthScore = document.getElementById('editCustomerHealthScore').value;
        if (healthScore) formData.health_score = parseInt(healthScore);

        const adoptionStage = document.getElementById('editCustomerAdoption').value;
        if (adoptionStage) formData.adoption_stage = adoptionStage;

        const renewalDate = document.getElementById('editCustomerRenewal').value;
        if (renewalDate) formData.renewal_date = renewalDate;

        const csmOwnerId = document.getElementById('editCustomerCSM').value;
        if (csmOwnerId) formData.csm_owner_id = parseInt(csmOwnerId);

        const employeeCount = document.getElementById('editCustomerEmployees').value;
        if (employeeCount) formData.employee_count = employeeCount;

        // Validate required fields
        if (!formData.name) {
            showToast('Customer name is required', 'error');
            return;
        }

        // Call API to update customer
        const updatedCustomer = await API.CustomerAPI.update(customerId, formData);

        // Close modal and show success message
        closeEditCustomerModal();
        showToast(`Customer "${updatedCustomer.name}" updated successfully!`, 'success');

        // Reload customers list
        await loadCustomersData();

    } catch (error) {
        console.error('Failed to update customer:', error);
        showToast('Failed to update customer. Please try again.', 'error');
    } finally {
        // Re-enable submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    }
}

// ========== Action Menu Functions ==========

let activeActionMenu = null;

function toggleActionMenu(customerId, event) {
    event.stopPropagation();

    // Close any open menu
    closeAllActionMenus();

    const menuId = `actionMenu-${customerId}`;
    const menu = document.getElementById(menuId);

    if (menu) {
        menu.classList.toggle('active');
        activeActionMenu = menu.classList.contains('active') ? menu : null;
    }
}

function closeAllActionMenus() {
    document.querySelectorAll('.action-menu').forEach(menu => {
        menu.classList.remove('active');
    });
    activeActionMenu = null;
}

// Close action menus when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-menu') && !e.target.closest('.btn--icon')) {
        closeAllActionMenus();
    }
});

// Close edit modal on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.id === 'editCustomerModal') {
        closeEditCustomerModal();
    }
});

// Close edit modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEditCustomerModal();
        closeAllActionMenus();
    }
});

// Make functions globally available
window.openAddCustomerModal = openAddCustomerModal;
window.closeAddCustomerModal = closeAddCustomerModal;
window.handleAddCustomer = handleAddCustomer;
// ========== Delete Customer Functions ==========

async function confirmDeleteCustomer(customerId, customerName) {
    closeAllActionMenus();

    const confirmed = confirm(`Are you sure you want to delete "${customerName}"?\n\nThis action cannot be undone.`);

    if (confirmed) {
        try {
            await API.CustomerAPI.delete(customerId);
            showToast(`Customer "${customerName}" deleted successfully`, 'success');
            await loadCustomersData();
        } catch (error) {
            console.error('Failed to delete customer:', error);
            showToast('Failed to delete customer. Please try again.', 'error');
        }
    }
}

window.openEditCustomerModal = openEditCustomerModal;
window.closeEditCustomerModal = closeEditCustomerModal;
window.handleEditCustomer = handleEditCustomer;
window.toggleActionMenu = toggleActionMenu;
window.closeAllActionMenus = closeAllActionMenus;
window.confirmDeleteCustomer = confirmDeleteCustomer;
