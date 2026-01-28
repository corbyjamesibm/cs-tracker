/**
 * Customers List - Load and display data from API
 */

let allCustomers = [];
let filteredCustomers = [];
let currentPage = 1;
const itemsPerPage = 8;

document.addEventListener('DOMContentLoaded', async function() {
    if (await Auth.checkAuthAndRedirect()) {
        Auth.updateUserDisplay();
        await loadCustomersData();
        await loadCSMUsersForFilter();
        setupFilters();

        // Fix overflow on table card to allow action menus to display fully
        const tableCard = document.querySelector('.data-table')?.closest('.card');
        if (tableCard) {
            tableCard.style.overflow = 'visible';
        }
    }
});

async function loadCustomersData() {
    try {
        const data = await API.CustomerAPI.getAll();
        allCustomers = data.items || [];
        filteredCustomers = [...allCustomers];
        updateCustomerCount();
        renderCustomersList();
        updateFilterCounts();
    } catch (error) {
        console.error('Failed to load customers:', error);
        showErrorMessage('Failed to load customers. Please check that the backend is running.');
    }
}

function updateCustomerCount() {
    const countElement = document.getElementById('customer-count');
    if (countElement) {
        const count = allCustomers.length;
        countElement.textContent = `${count} customer${count !== 1 ? 's' : ''} in your portfolio`;
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
        renderPagination();
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

    tableBody.innerHTML = paginatedCustomers.map(customer => `
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
                    <button class="btn btn--ghost btn--icon" onclick="event.stopPropagation(); toggleActionMenu(${customer.id}, this)">
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

    // Initialize table sorting (Customer, Health, Stage, ARR, Renewal, CSM - not Actions)
    if (window.TableSort) {
        TableSort.init('customerTable', [0, 1, 2, 3, 4, 5]);
    }

    // Update count
    const countEl = document.querySelector('.results-count');
    if (countEl) {
        countEl.textContent = `${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`;
    }

    // Render pagination
    renderPagination();
}

function renderPagination() {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredCustomers.length);

    // Update the showing text
    const showingText = filteredCustomers.length === 0
        ? 'No customers to display'
        : `Showing ${startIndex}-${endIndex} of ${filteredCustomers.length} customers`;

    paginationContainer.innerHTML = `
        <div class="text-secondary">${showingText}</div>
        <div class="flex gap-3">
            <button class="btn btn--ghost" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${currentPage - 1})">Previous</button>
            ${generatePageButtons(totalPages)}
            <button class="btn btn--ghost" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="goToPage(${currentPage + 1})">Next</button>
        </div>
    `;
}

function generatePageButtons(totalPages) {
    if (totalPages === 0) return '';

    let buttons = '';
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        buttons += `<button class="btn ${isActive ? 'btn--primary' : 'btn--ghost'}" onclick="goToPage(${i})">${i}</button>`;
    }
    return buttons;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderCustomersList();

    // Scroll to top of table
    const table = document.querySelector('.data-table');
    if (table) {
        table.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    // Reset to first page when filters change
    currentPage = 1;
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

async function loadCSMUsersForFilter() {
    try {
        const data = await API.UserAPI.getAll();
        csmUsers = (data.items || []).filter(u => u.role === 'csm' || u.role === 'admin' || u.role === 'manager');
        populateCSMFilterDropdown();
    } catch (error) {
        console.error('Failed to load CSM users for filter:', error);
    }
}

function populateCSMFilterDropdown() {
    const csmFilterSelect = document.getElementById('csmFilterDropdown');
    if (!csmFilterSelect) return;

    csmFilterSelect.innerHTML = '<option value="all" selected>All</option>' +
        csmUsers.map(user => `<option value="${user.id}">${user.full_name || user.first_name}</option>`).join('');
}

async function loadCSMUsers() {
    try {
        const data = await API.UserAPI.getAll();
        csmUsers = (data.items || []).filter(u => u.role === 'csm' || u.role === 'admin' || u.role === 'manager');
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

async function openAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        loadCSMUsers();
        await loadIndustriesForAdd();

        // Set default renewal date to 1 year from now
        const renewalInput = document.getElementById('customerRenewal');
        if (renewalInput && !renewalInput.value) {
            const nextYear = new Date();
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            renewalInput.value = nextYear.toISOString().split('T')[0];
        }
    }
}

// Load industries from lookup API for Add Customer modal
async function loadIndustriesForAdd() {
    const select = document.getElementById('customerIndustry');
    if (!select) return;

    try {
        const response = await API.LookupAPI.getCategoryValues('industry');
        const values = (response.values || []).filter(v => v.is_active);

        select.innerHTML = '<option value="">Select industry</option>' +
            values.map(v => `<option value="${v.label}">${v.label}</option>`).join('');
    } catch (error) {
        console.error('Failed to load industries:', error);
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

    // Load CSM users, partners, and industries for dropdowns
    await loadCSMUsersForEdit();
    await loadPartnersForEdit();
    await loadIndustriesForEdit();

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

// Load industries from lookup API for Edit Customer modal
async function loadIndustriesForEdit() {
    const select = document.getElementById('editCustomerIndustry');
    if (!select) return;

    try {
        const response = await API.LookupAPI.getCategoryValues('industry');
        const values = (response.values || []).filter(v => v.is_active);

        select.innerHTML = '<option value="">Select industry</option>' +
            values.map(v => `<option value="${v.label}">${v.label}</option>`).join('');
    } catch (error) {
        console.error('Failed to load industries:', error);
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

async function loadPartnersForEdit() {
    try {
        const data = await API.PartnerAPI.getAll();
        const partners = (data.items || []).filter(p => p.is_active);
        const partnerSelect = document.getElementById('editCustomerPartner');
        if (partnerSelect) {
            partnerSelect.innerHTML = '<option value="">No Partner</option>' +
                partners.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to load partners:', error);
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
    document.getElementById('editCustomerPartner').value = customer.partner_id || '';
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

        const partnerId = document.getElementById('editCustomerPartner').value;
        formData.partner_id = partnerId ? parseInt(partnerId) : null;

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

function toggleActionMenu(customerId, buttonOrEvent) {
    // Close any open menu
    closeAllActionMenus();

    const menuId = `actionMenu-${customerId}`;
    const menu = document.getElementById(menuId);

    // Handle both 'this' (button element) and 'event' as second parameter
    const button = buttonOrEvent?.tagName ? buttonOrEvent :
                   buttonOrEvent?.currentTarget || buttonOrEvent?.target?.closest('button');

    if (menu) {
        menu.classList.toggle('active');
        activeActionMenu = menu.classList.contains('active') ? menu : null;

        if (activeActionMenu && button) {
            // Position the menu using fixed positioning to escape overflow containers
            const buttonRect = button.getBoundingClientRect();
            const menuHeight = 150; // Approximate menu height
            const viewportHeight = window.innerHeight;

            // Check if menu would overflow bottom of viewport
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const openUpward = spaceBelow < menuHeight;

            menu.style.position = 'fixed';
            menu.style.right = 'auto';
            menu.style.left = (buttonRect.left - 140) + 'px'; // Align right edge with button

            if (openUpward) {
                menu.style.top = 'auto';
                menu.style.bottom = (viewportHeight - buttonRect.top) + 'px';
            } else {
                menu.style.top = buttonRect.bottom + 'px';
                menu.style.bottom = 'auto';
            }
        }
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
window.goToPage = goToPage;
