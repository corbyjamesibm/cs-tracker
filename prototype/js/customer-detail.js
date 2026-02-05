/**
 * Customer Detail - Fetches and displays customer information
 * Uses API_BASE_URL from api.js
 */

// Global customer data storage
let currentCustomer = null;

// Get customer ID from URL
function getCustomerId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Format currency
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

// Format date
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format short date (for header stats)
function formatShortDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// Get health badge class
function getHealthBadgeClass(status) {
    const classes = {
        'green': 'health-badge--green',
        'yellow': 'health-badge--yellow',
        'red': 'health-badge--red'
    };
    return classes[status] || 'health-badge--gray';
}

// Get health label
function getHealthLabel(status) {
    const labels = {
        'green': 'Healthy',
        'yellow': 'At Risk',
        'red': 'Critical'
    };
    return labels[status] || 'Unknown';
}

// Format adoption stage
function formatAdoptionStage(stage) {
    const labels = {
        'onboarding': 'Onboarding',
        'adoption': 'Adoption',
        'value_realization': 'Value Realization',
        'expansion': 'Expansion',
        'renewal': 'Renewal'
    };
    return labels[stage] || stage;
}

// Get adoption stage index (for progress display)
function getAdoptionStageIndex(stage) {
    const stages = ['onboarding', 'adoption', 'value_realization', 'expansion', 'renewal'];
    return stages.indexOf(stage);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fetch and display customer data
async function loadCustomerDetail() {
    const customerId = getCustomerId();

    if (!customerId) {
        showError('No customer ID provided');
        return;
    }

    try {
        const customer = await API.CustomerAPI.getById(customerId);
        currentCustomer = customer; // Store globally for modal access
        populateCustomerData(customer);

        // Also load CSM owner info if available
        if (customer.csm_owner_id) {
            loadCsmOwner(customer.csm_owner_id);
        }

        // Load partner info if available
        if (customer.partner_id) {
            loadPartner(customer.partner_id);
        }

        // Load open tasks for this customer
        loadOpenTasks(customerId);

        // Load recent engagements for this customer
        loadRecentEngagements(customerId);

        // Load meeting notes for this customer
        loadMeetingNotes(customerId);

        // Load use cases for this customer
        loadUseCases(customerId);

        // Load SPM assessments for summary display
        loadAssessments(customerId);

        // Load multi-assessment dashboard
        loadMultiAssessmentDashboard(customerId);

    } catch (error) {
        console.error('Failed to load customer:', error);
        if (error.message && error.message.includes('404')) {
            showError('Customer not found');
        } else {
            showError('Failed to load customer data');
        }
    }
}

// Populate the page with customer data
function populateCustomerData(customer) {
    // Update page title
    document.title = `${customer.name} - Customer Status Tracker`;

    // Header - Customer Name
    const nameEl = document.getElementById('customerName');
    if (nameEl) nameEl.textContent = customer.name;

    // Header - Meta info
    const sfIdEl = document.getElementById('customerSfId');
    if (sfIdEl) sfIdEl.textContent = customer.salesforce_id || '-';

    const productsEl = document.getElementById('customerProducts');
    if (productsEl) {
        productsEl.textContent = customer.products_owned?.length > 0
            ? customer.products_owned.join(', ')
            : '-';
    }

    const customerSinceEl = document.getElementById('customerSince');
    if (customerSinceEl) {
        customerSinceEl.textContent = customer.contract_start_date
            ? `Customer since ${formatDate(customer.contract_start_date)}`
            : '';
    }

    // Header - Health badge
    const healthBadge = document.getElementById('healthBadge');
    if (healthBadge) {
        healthBadge.className = `health-badge ${getHealthBadgeClass(customer.health_status)}`;
        healthBadge.style.cssText = 'font-size: 14px; padding: 8px 16px;';
        healthBadge.textContent = getHealthLabel(customer.health_status);
    }

    // Header - Partner badge
    const partnerBadge = document.getElementById('partnerBadge');
    if (partnerBadge) {
        if (customer.partner_id) {
            partnerBadge.style.display = 'inline-block';
        } else {
            partnerBadge.style.display = 'none';
        }
    }

    // Header Stats
    const arrEl = document.getElementById('statArr');
    if (arrEl) arrEl.textContent = formatCurrency(customer.arr);

    const renewalEl = document.getElementById('statRenewal');
    if (renewalEl) renewalEl.textContent = formatShortDate(customer.renewal_date);

    const adoptionEl = document.getElementById('statAdoption');
    if (adoptionEl) adoptionEl.textContent = customer.adoption_percentage ? `${customer.adoption_percentage}%` : '-';

    const daysToRenewalEl = document.getElementById('statDaysToRenewal');
    if (daysToRenewalEl) daysToRenewalEl.textContent = customer.days_to_renewal ?? '-';

    // Account Details
    const accountManagerEl = document.getElementById('accountManager');
    if (accountManagerEl) accountManagerEl.textContent = customer.account_manager ?
        (customer.account_manager.full_name || `${customer.account_manager.first_name} ${customer.account_manager.last_name}`) : '-';

    const industryEl = document.getElementById('customerIndustry');
    if (industryEl) industryEl.textContent = customer.industry || '-';

    const employeesEl = document.getElementById('customerEmployees');
    if (employeesEl) employeesEl.textContent = customer.employee_count || '-';

    const contractStartEl = document.getElementById('contractStart');
    if (contractStartEl) contractStartEl.textContent = formatDate(customer.contract_start_date);

    const contractEndEl = document.getElementById('contractEnd');
    if (contractEndEl) contractEndEl.textContent = formatDate(customer.contract_end_date);

    // Adoption Journey - Update stage indicators
    updateAdoptionStages(customer.adoption_stage);

    // Health Score section
    populateHealthScore(customer);

    // Contacts table (in Account Details)
    if (customer.contacts && customer.contacts.length > 0) {
        populateContacts(customer.contacts);
    }

    // Key Contacts sidebar
    populateKeyContacts(customer.contacts);
}

// Load CSM owner info
async function loadCsmOwner(userId) {
    try {
        const user = await API.UserAPI.getById(userId);
        const csmEl = document.getElementById('csmOwner');
        if (csmEl) csmEl.textContent = user.full_name || `${user.first_name} ${user.last_name}`;
    } catch (error) {
        console.error('Failed to load CSM owner:', error);
    }
}

// Load partner info
async function loadPartner(partnerId) {
    try {
        const partner = await API.PartnerAPI.getById(partnerId);
        const partnerBadge = document.getElementById('partnerBadge');
        if (partnerBadge) {
            partnerBadge.textContent = partner.name;
            partnerBadge.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Failed to load partner:', error);
    }
}

// Update adoption stage indicators
function updateAdoptionStages(currentStage) {
    const stages = ['onboarding', 'adoption', 'value_realization', 'expansion', 'renewal'];
    const currentIndex = stages.indexOf(currentStage);

    stages.forEach((stage, index) => {
        const stageEl = document.getElementById(`stage-${stage}`);
        if (stageEl) {
            stageEl.classList.remove('completed', 'current');
            if (index < currentIndex) {
                stageEl.classList.add('completed');
            } else if (index === currentIndex) {
                stageEl.classList.add('current');
            }
        }
    });
}

// Populate contacts table
function populateContacts(contacts) {
    const tbody = document.getElementById('contactsTableBody');
    if (!tbody) return;

    if (contacts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">No contacts found</td></tr>';
        return;
    }

    tbody.innerHTML = contacts.map(contact => `
        <tr>
            <td>
                <div style="font-weight: 500;">${contact.first_name} ${contact.last_name}</div>
                ${contact.is_primary ? '<span class="tag tag--blue" style="font-size: 10px;">Primary</span>' : ''}
            </td>
            <td>${contact.role || '-'}</td>
            <td>${contact.email || '-'}</td>
            <td>${contact.phone || '-'}</td>
        </tr>
    `).join('');
}

// Get initials from name
function getInitials(firstName, lastName) {
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

// Get health score color
function getHealthScoreColor(score) {
    if (score >= 70) return 'var(--health-green)';
    if (score >= 40) return 'var(--health-yellow)';
    return 'var(--health-red)';
}

// Populate health score section
function populateHealthScore(customer) {
    const score = customer.health_score || 0;
    const scoreValueEl = document.getElementById('healthScoreValue');
    const scoreCircleEl = document.getElementById('healthScoreCircle');

    if (scoreValueEl) {
        scoreValueEl.textContent = score;
        scoreValueEl.style.color = getHealthScoreColor(score);
    }

    if (scoreCircleEl) {
        const degrees = (score / 100) * 360;
        const color = getHealthScoreColor(score);
        scoreCircleEl.style.background = `conic-gradient(${color} 0deg ${degrees}deg, var(--cds-background-hover) ${degrees}deg 360deg)`;
    }

    // Update trend - placeholder since we don't have historical data yet
    const trendEl = document.getElementById('healthTrend');
    if (trendEl) {
        trendEl.textContent = '-';
        trendEl.className = 'text-secondary';
    }

    // Update product usage
    const usageEl = document.getElementById('productUsage');
    if (usageEl) usageEl.textContent = customer.adoption_percentage ? (customer.adoption_percentage >= 70 ? 'High' : customer.adoption_percentage >= 40 ? 'Medium' : 'Low') : '-';

    // Update engagement level based on health status
    const engagementEl = document.getElementById('engagementLevel');
    if (engagementEl) {
        const engagementLabels = { 'green': 'Active', 'yellow': 'Moderate', 'red': 'Low' };
        engagementEl.textContent = engagementLabels[customer.health_status] || '-';
    }

    // Support tickets placeholder
    const ticketsEl = document.getElementById('supportTickets');
    if (ticketsEl) ticketsEl.textContent = '-';
}

// Populate key contacts in sidebar
function populateKeyContacts(contacts) {
    const container = document.getElementById('keyContactsContainer');
    if (!container) return;

    if (!contacts || contacts.length === 0) {
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 16px;">No contacts found</div>';
        return;
    }

    container.innerHTML = contacts.slice(0, 5).map(contact => `
        <div class="contact-card">
            <div class="avatar avatar--large">${getInitials(contact.first_name, contact.last_name)}</div>
            <div class="contact-card__info">
                <div class="contact-card__name">${contact.first_name} ${contact.last_name}</div>
                <div class="contact-card__role">${contact.role || '-'}</div>
                <div class="text-secondary" style="font-size: 12px;">${contact.email || '-'}</div>
            </div>
            <div class="contact-card__actions">
                ${contact.email ? `
                <a href="mailto:${contact.email}" class="btn btn--ghost btn--icon" title="Send Email">
                    <svg width="16" height="16" viewBox="0 0 32 32"><path d="M28 6H4a2 2 0 00-2 2v16a2 2 0 002 2h24a2 2 0 002-2V8a2 2 0 00-2-2zm-2.2 2L16 14.78 6.2 8zM4 24V8.91l11.43 7.91a1 1 0 001.14 0L28 8.91V24z"/></svg>
                </a>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Load and display open tasks for this customer (sidebar panel)
async function loadOpenTasks(customerId) {
    const container = document.getElementById('openTasksContainer');
    const countEl = document.getElementById('openTasksCount');

    if (!container) return;

    try {
        const data = await API.TaskAPI.getAll({ customer_id: customerId });
        // Handle paginated response - filter for open tasks only (open or in_progress)
        const tasks = (data.items || data).filter(t => t.status === 'open' || t.status === 'in_progress');

        if (countEl) countEl.textContent = `${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`;

        if (tasks.length === 0) {
            container.innerHTML = '<div class="text-secondary text-center" style="padding: 16px;">No open tasks</div>';
            return;
        }

        // Sort by due date, overdue first
        const sortedTasks = tasks.sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date) - new Date(b.due_date);
        });

        container.innerHTML = sortedTasks.slice(0, 5).map(task => {
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDate && dueDate < new Date();
            const isDueSoon = dueDate && !isOverdue && dueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const borderColor = isOverdue ? 'var(--cds-support-error)' :
                               isDueSoon ? 'var(--cds-support-warning)' :
                               'var(--cds-interactive)';

            const priorityColors = { urgent: '#da1e28', high: '#ff832b', medium: '#0f62fe', low: '#697077' };
            const priorityColor = priorityColors[task.priority] || '#697077';

            return `
                <div style="border-left: 3px solid ${borderColor}; padding: 8px 12px; margin-bottom: 8px; background: var(--cds-layer-02); border-radius: 0 4px 4px 0; cursor: pointer;" onclick="switchToTasksTab()">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${task.title}</span>
                        <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: ${priorityColor}20; color: ${priorityColor}; margin-left: 8px;">${task.priority}</span>
                    </div>
                    <div class="text-secondary" style="font-size: 11px;">
                        ${dueDate ? `Due: ${formatDate(task.due_date)}` : 'No due date'}
                        ${isOverdue ? ' <span style="color: var(--cds-support-error); font-weight: 500;">(Overdue)</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Failed to load tasks:', error);
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 16px;">Could not load tasks</div>';
    }
}

// Switch to Tasks tab
function switchToTasksTab() {
    const tasksTab = Array.from(document.querySelectorAll('.tabs__tab')).find(t => t.textContent.trim() === 'Tasks');
    if (tasksTab) tasksTab.click();
}

// Load and display recent engagements for this customer
async function loadRecentEngagements(customerId) {
    const container = document.getElementById('recentEngagementsContainer');

    if (!container) return;

    try {
        const data = await API.EngagementAPI.getAll({ customer_id: customerId });
        // Handle paginated response
        const engagements = data.items || data;

        if (engagements.length === 0) {
            container.innerHTML = '<div class="text-secondary text-center" style="padding: 16px;">No recent engagements</div>';
            return;
        }

        // Sort by date descending and take last 5
        const sortedEngagements = engagements
            .sort((a, b) => new Date(b.engagement_date || b.created_at) - new Date(a.engagement_date || a.created_at))
            .slice(0, 5);

        container.innerHTML = sortedEngagements.map(engagement => `
            <div class="timeline__item">
                <div class="timeline__date">${formatDate(engagement.engagement_date || engagement.created_at)}</div>
                <div class="timeline__content">
                    <strong>${engagement.title || engagement.engagement_type || 'Engagement'}</strong>
                    ${engagement.summary ? `<div class="text-secondary" style="font-size: 12px;">${engagement.summary}</div>` : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Failed to load engagements:', error);
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 16px;">Could not load engagements</div>';
    }
}

// Show error message
function showError(message) {
    // Update page title
    document.title = 'Error - CS Tracker';

    const content = document.querySelector('.page-content');
    if (content) {
        content.innerHTML = `
            <div class="card" style="text-align: center; padding: 48px;">
                <svg width="48" height="48" viewBox="0 0 32 32" style="opacity: 0.5; margin-bottom: 16px;">
                    <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm-1 7h2v10h-2V9zm1 16c-.8 0-1.5-.7-1.5-1.5S15.2 22 16 22s1.5.7 1.5 1.5S16.8 25 16 25z"/>
                </svg>
                <h2 style="margin-bottom: 8px;">${message}</h2>
                <p class="text-secondary">Please check the URL or go back to the customers list.</p>
                <a href="customers.html" class="btn btn--primary" style="margin-top: 16px;">Back to Customers</a>
            </div>
        `;
    }
}

// Store use cases globally for tab switching
let customerUseCases = [];
let currentSolutionArea = 'WFM';

// Load and display use cases for this customer
async function loadUseCases(customerId) {
    const container = document.getElementById('useCasesContainer');
    const progressEl = document.getElementById('useCaseProgress');
    const progressBarEl = document.getElementById('useCaseProgressBar');

    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/use-cases/customer/${customerId}`);
        if (!response.ok) throw new Error('Failed to load use cases');

        customerUseCases = await response.json();

        // Calculate overall progress
        const total = customerUseCases.length;
        const completed = customerUseCases.filter(uc =>
            uc.status === 'implemented' || uc.status === 'optimized'
        ).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        if (progressEl) progressEl.textContent = `${completed}/${total} Complete`;
        if (progressBarEl) progressBarEl.style.width = `${percentage}%`;

        // Setup tab click handlers
        setupUseCaseTabs();

        // Display use cases for current solution area
        displayUseCasesForArea(currentSolutionArea);

    } catch (error) {
        console.error('Failed to load use cases:', error);
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Could not load use cases</div>';
    }
}

// Setup tab click handlers
function setupUseCaseTabs() {
    const tabs = document.querySelectorAll('#solutionAreaTabs .tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active state
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottom = 'none';
                t.style.fontWeight = 'normal';
                t.style.color = 'var(--cds-text-secondary)';
            });
            this.classList.add('active');
            this.style.borderBottom = '2px solid var(--cds-interactive)';
            this.style.fontWeight = '500';
            this.style.color = 'inherit';

            // Display use cases for selected area
            currentSolutionArea = this.dataset.area;
            displayUseCasesForArea(currentSolutionArea);
        });
    });
}

// Display use cases for a specific solution area
function displayUseCasesForArea(solutionArea) {
    const container = document.getElementById('useCasesContainer');
    if (!container) return;

    // Filter use cases for this solution area
    const areaUseCases = customerUseCases.filter(uc => uc.solution_area === solutionArea);

    if (areaUseCases.length === 0) {
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">No use cases defined for this solution area</div>';
        return;
    }

    // Group by domain
    const domains = {};
    areaUseCases.forEach(uc => {
        if (!domains[uc.domain]) domains[uc.domain] = [];
        domains[uc.domain].push(uc);
    });

    // Render grouped use cases with full descriptions
    let html = '';
    const domainOrder = ['Strategic Planning', 'Portfolio Management', 'Capacity Management', 'Resource Management', 'Financial Management'];

    domainOrder.forEach(domain => {
        if (!domains[domain]) return;

        html += `
            <div style="margin-bottom: 12px;">
                <strong style="font-size: 12px; color: var(--cds-text-secondary); text-transform: uppercase;">${domain}</strong>
            </div>
            <div style="margin-bottom: 24px;">
        `;

        domains[domain].forEach(uc => {
            const checkboxClass = getCheckboxClass(uc.status);
            const statusTag = getStatusTag(uc.status);
            const description = uc.description || '';

            html += `
                <div class="use-case-item" onclick="openUseCaseStatusModal(${uc.use_case_id})">
                    <div class="use-case-item__checkbox ${checkboxClass}">
                        ${(uc.status === 'implemented' || uc.status === 'optimized') ?
                            '<svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M13 24l-9-9 1.41-1.41L13 21.17 26.59 7.58 28 9 13 24z"/></svg>' : ''}
                    </div>
                    <div class="use-case-item__content">
                        <div class="use-case-item__name">${uc.name}</div>
                        ${description ? `<div class="use-case-item__description">${description}</div>` : ''}
                    </div>
                    <div class="use-case-item__status">
                        ${statusTag}
                    </div>
                </div>
            `;
        });

        html += '</div>';
    });

    container.innerHTML = html;
}

// Get checkbox class based on status
function getCheckboxClass(status) {
    switch (status) {
        case 'implemented':
        case 'optimized':
            return 'checked';
        case 'in_progress':
            return 'in-progress';
        default:
            return '';
    }
}

// Get status tag HTML
function getStatusTag(status) {
    switch (status) {
        case 'optimized':
            return '<span class="tag tag--blue" style="margin-left: auto; font-size: 10px;">Optimized</span>';
        case 'implemented':
            return '<span class="tag tag--blue" style="margin-left: auto; font-size: 10px;">Implemented</span>';
        case 'in_progress':
            return '<span class="tag" style="margin-left: auto; font-size: 10px; background: #fcf4d6; color: #8e6a00;">In Progress</span>';
        default:
            return '<span class="tag" style="margin-left: auto; font-size: 10px;">Not Started</span>';
    }
}

// Truncate text helper
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ==========================================
// USE CASE STATUS UPDATE FUNCTIONS
// ==========================================

let currentUseCaseId = null;
let useCaseAdoptionChart = null;

// Open use case status modal
function openUseCaseStatusModal(useCaseId) {
    currentUseCaseId = useCaseId;
    const useCase = customerUseCases.find(uc => uc.use_case_id === useCaseId);

    if (!useCase) {
        console.error('Use case not found:', useCaseId);
        return;
    }

    // Update modal content
    document.getElementById('useCaseModalName').textContent = useCase.name;
    document.getElementById('useCaseModalDescription').textContent = useCase.description || 'No description available';
    document.getElementById('useCaseNotes').value = useCase.notes || '';

    // Update status options
    const currentStatus = useCase.status || 'not_started';
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.status === currentStatus) {
            opt.classList.add('selected');
        }
    });

    // Load history chart
    loadUseCaseHistory();

    document.getElementById('useCaseStatusModal').classList.add('open');
}

// Close use case status modal
function closeUseCaseStatusModal() {
    document.getElementById('useCaseStatusModal').classList.remove('open');
    currentUseCaseId = null;
}

// Select use case status
function selectUseCaseStatus(status) {
    document.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.dataset.status === status) {
            opt.classList.add('selected');
        }
    });
}

// Get selected use case status
function getSelectedUseCaseStatus() {
    const selected = document.querySelector('.status-option.selected');
    return selected ? selected.dataset.status : 'not_started';
}

// Save use case status
async function saveUseCaseStatus() {
    if (!currentUseCaseId) return;

    const customerId = getCustomerId();
    const status = getSelectedUseCaseStatus();
    const notes = document.getElementById('useCaseNotes').value;

    const saveBtn = document.getElementById('saveUseCaseStatusBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const response = await fetch(`${API_BASE_URL}/use-cases/customer/${customerId}/${currentUseCaseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, notes })
        });

        if (!response.ok) throw new Error('Failed to save status');

        closeUseCaseStatusModal();

        // Reload use cases
        await loadUseCases(customerId);

    } catch (error) {
        console.error('Failed to save use case status:', error);
        alert('Failed to save status. Please try again.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Status';
    }
}

// Load use case adoption history for visualization
async function loadUseCaseHistory() {
    const chartContainer = document.getElementById('useCaseHistoryChart');
    if (!chartContainer) return;

    const customerId = getCustomerId();

    try {
        // Get use case history/adoption over time
        // For now, simulate with current data since history API doesn't exist yet
        const history = generateUseCaseAdoptionHistory();
        renderUseCaseAdoptionChart(history);
    } catch (error) {
        console.error('Failed to load use case history:', error);
    }
}

// Generate simulated adoption history (placeholder until backend API exists)
function generateUseCaseAdoptionHistory() {
    // Generate mock history data based on current use cases
    const now = new Date();
    const months = [];
    const adoptionData = [];
    const totalUseCases = customerUseCases.length || 1;

    for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        months.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));

        // Simulate increasing adoption over time
        const implementedCount = customerUseCases.filter(uc =>
            uc.status === 'implemented' || uc.status === 'optimized'
        ).length;
        const baseAdoption = Math.max(0, implementedCount - (5 - i) * 2);
        adoptionData.push(Math.round((baseAdoption / totalUseCases) * 100));
    }

    return { months, adoptionData };
}

// Render use case adoption chart
function renderUseCaseAdoptionChart(history) {
    const ctx = document.getElementById('useCaseHistoryChart');
    if (!ctx) return;

    // Destroy existing chart
    if (useCaseAdoptionChart) {
        useCaseAdoptionChart.destroy();
    }

    useCaseAdoptionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: history.months,
            datasets: [{
                label: 'Adoption %',
                data: history.adoptionData,
                borderColor: 'rgba(15, 98, 254, 1)',
                backgroundColor: 'rgba(15, 98, 254, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'rgba(15, 98, 254, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: value => value + '%',
                        color: '#697077'
                    },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#697077' },
                    grid: { display: false }
                }
            }
        }
    });
}

// Expose use case functions to window
window.openUseCaseStatusModal = openUseCaseStatusModal;
window.closeUseCaseStatusModal = closeUseCaseStatusModal;
window.selectUseCaseStatus = selectUseCaseStatus;
window.saveUseCaseStatus = saveUseCaseStatus;

// ==========================================
// ROADMAP MANAGEMENT
// ==========================================

let currentRoadmap = null;
let roadmapQuarters = [];
let allRoadmapQuarters = []; // All quarters from roadmap date range
let roadmapZoomLevel = loadDefaultRoadmapZoom(); // Number of quarters to display (1, 2, 4, 6, 8, 10, 12)
let roadmapViewportStart = 0; // Index of the first visible quarter

// Undo stack for roadmap operations
const roadmapUndoStack = [];
const UNDO_STACK_MAX_SIZE = 20;

// Push an action to the undo stack
function pushToUndoStack(action) {
    roadmapUndoStack.push({
        ...action,
        timestamp: Date.now()
    });
    // Limit stack size
    if (roadmapUndoStack.length > UNDO_STACK_MAX_SIZE) {
        roadmapUndoStack.shift();
    }
    updateUndoButtonState();
}

// Update undo button visibility/state
function updateUndoButtonState() {
    const undoBtn = document.getElementById('roadmapUndoBtn');
    if (undoBtn) {
        if (roadmapUndoStack.length > 0) {
            undoBtn.disabled = false;
            undoBtn.style.opacity = '1';
            const lastAction = roadmapUndoStack[roadmapUndoStack.length - 1];
            undoBtn.title = `Undo: ${lastAction.description} (Ctrl+Z)`;
        } else {
            undoBtn.disabled = true;
            undoBtn.style.opacity = '0.5';
            undoBtn.title = 'Nothing to undo';
        }
    }
}

// Undo the last roadmap action
async function undoLastRoadmapAction() {
    if (roadmapUndoStack.length === 0) {
        showToast('Nothing to undo', 'info');
        return;
    }

    const action = roadmapUndoStack.pop();
    updateUndoButtonState();

    try {
        // Restore the previous state via API
        const response = await fetch(`${API_BASE_URL}/roadmaps/items/${action.itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.previousState)
        });

        if (!response.ok) throw new Error('Failed to undo');

        // Reload roadmap to reflect changes
        await loadRoadmap(getCustomerId());

        showToast(`Undone: ${action.description}`, 'success');

    } catch (error) {
        console.error('Failed to undo:', error);
        showToast('Failed to undo. Please try again.', 'error');
        // Put the action back on the stack
        roadmapUndoStack.push(action);
        updateUndoButtonState();
    }
}

// Clear undo stack (e.g., when leaving roadmap view)
function clearUndoStack() {
    roadmapUndoStack.length = 0;
    updateUndoButtonState();
}

// Keyboard shortcut for undo
document.addEventListener('keydown', (e) => {
    // Ctrl+Z or Cmd+Z for undo (only when roadmap is visible)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        const roadmapTab = document.querySelector('.tabs__tab[data-tab="roadmap"]');
        const isRoadmapActive = roadmapTab?.classList.contains('tabs__tab--active');
        if (isRoadmapActive && roadmapUndoStack.length > 0) {
            e.preventDefault();
            undoLastRoadmapAction();
        }
    }
});

// Load default roadmap zoom from user preferences
function loadDefaultRoadmapZoom() {
    const saved = localStorage.getItem('roadmapDefaultZoom');
    if (saved) {
        const zoom = parseInt(saved, 10);
        const validZooms = [1, 2, 4, 6, 8, 10, 12];
        if (validZooms.includes(zoom)) {
            return zoom;
        }
    }
    return 8; // Default to 8 quarters
}

// Save default roadmap zoom to user preferences
function saveDefaultRoadmapZoom(quarters) {
    localStorage.setItem('roadmapDefaultZoom', quarters.toString());
    showToast(`Default view set to ${quarters} quarter${quarters === 1 ? '' : 's'}`, 'success');
}

// Set current zoom as the default preference
function setCurrentZoomAsDefault() {
    saveDefaultRoadmapZoom(roadmapZoomLevel);
}

// Load and display roadmap for this customer
async function loadRoadmap(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/roadmaps/customer/${customerId}`);

        if (!response.ok) {
            if (response.status === 404) {
                showNoRoadmapState();
                return;
            }
            throw new Error('Failed to load roadmap');
        }

        const roadmap = await response.json();

        if (!roadmap) {
            showNoRoadmapState();
            return;
        }

        currentRoadmap = roadmap;
        displayRoadmap(roadmap);

    } catch (error) {
        console.error('Failed to load roadmap:', error);
        showNoRoadmapState();
    }
}

// Show the "no roadmap" state
function showNoRoadmapState() {
    document.getElementById('noRoadmapState').style.display = 'block';
    document.getElementById('roadmapContent').style.display = 'none';
    document.getElementById('roadmapTimeframe').style.display = 'none';
    document.getElementById('addRoadmapItemBtn').style.display = 'none';
    document.getElementById('pushToTPBtn').style.display = 'none';
}

// Display roadmap timeline
function displayRoadmap(roadmap) {
    document.getElementById('noRoadmapState').style.display = 'none';
    document.getElementById('roadmapContent').style.display = 'block';
    document.getElementById('roadmapTimeframe').style.display = 'inline-block';
    document.getElementById('addRoadmapItemBtn').style.display = 'inline-flex';
    document.getElementById('pushToTPBtn').style.display = 'inline-flex';

    // Generate ALL quarters from roadmap date range
    allRoadmapQuarters = generateAllQuarters(roadmap.start_date, roadmap.end_date);

    // Reset viewport if switching roadmaps or first load
    if (roadmapViewportStart >= allRoadmapQuarters.length) {
        roadmapViewportStart = 0;
    }

    // Ensure zoom level doesn't exceed available quarters
    if (roadmapZoomLevel > allRoadmapQuarters.length) {
        roadmapZoomLevel = allRoadmapQuarters.length;
    }

    // Get visible quarters based on current viewport
    roadmapQuarters = getVisibleQuarters();

    // Update timeframe tag (shows overall roadmap range)
    const startYear = new Date(roadmap.start_date).getFullYear();
    const endYear = new Date(roadmap.end_date).getFullYear();
    document.getElementById('roadmapTimeframe').textContent = startYear === endYear ? startYear : `${startYear}-${endYear}`;

    // Update zoom controls UI
    updateRoadmapZoomUI();

    // Render quarter headers
    renderQuarterHeaders(roadmapQuarters);

    // Render roadmap items by category
    renderRoadmapItems(roadmap.items, roadmapQuarters);

    // Update last updated text
    if (roadmap.updated_at) {
        document.getElementById('roadmapLastUpdated').textContent = `Last updated: ${formatDate(roadmap.updated_at)}`;
    }
}

// Generate ALL quarters array between two dates (no limit)
function generateAllQuarters(startDate, endDate) {
    const quarters = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let year = start.getFullYear();
    let quarter = Math.floor(start.getMonth() / 3) + 1;

    while (year < end.getFullYear() || (year === end.getFullYear() && quarter <= Math.floor(end.getMonth() / 3) + 1)) {
        quarters.push(`Q${quarter} ${year}`);
        quarter++;
        if (quarter > 4) {
            quarter = 1;
            year++;
        }
        // Safety limit to prevent infinite loops
        if (quarters.length >= 20) break;
    }

    return quarters;
}

// Get visible quarters based on zoom level and viewport position
function getVisibleQuarters() {
    const endIdx = Math.min(roadmapViewportStart + roadmapZoomLevel, allRoadmapQuarters.length);
    return allRoadmapQuarters.slice(roadmapViewportStart, endIdx);
}

// Update roadmap zoom controls UI
function updateRoadmapZoomUI() {
    const zoomLabel = document.getElementById('roadmapZoomLevel');
    const timeRange = document.getElementById('roadmapTimeRange');
    const prevBtn = document.getElementById('roadmapPrevBtn');
    const nextBtn = document.getElementById('roadmapNextBtn');

    if (zoomLabel) {
        zoomLabel.textContent = `${roadmapZoomLevel} quarter${roadmapZoomLevel === 1 ? '' : 's'}`;
    }

    if (timeRange && roadmapQuarters.length > 0) {
        const first = roadmapQuarters[0];
        const last = roadmapQuarters[roadmapQuarters.length - 1];
        timeRange.textContent = `${first} - ${last}`;
    }

    // Enable/disable navigation buttons
    if (prevBtn) {
        prevBtn.disabled = roadmapViewportStart <= 0;
        prevBtn.style.opacity = roadmapViewportStart <= 0 ? '0.5' : '1';
    }
    if (nextBtn) {
        const maxStart = allRoadmapQuarters.length - roadmapZoomLevel;
        nextBtn.disabled = roadmapViewportStart >= maxStart;
        nextBtn.style.opacity = roadmapViewportStart >= maxStart ? '0.5' : '1';
    }
}

// Zoom in/out on the roadmap timeline
function zoomRoadmap(direction) {
    const zoomLevels = [1, 2, 4, 6, 8, 10, 12];
    const currentIdx = zoomLevels.indexOf(roadmapZoomLevel);
    let newIdx = currentIdx;

    if (direction > 0) {
        // Zoom in = fewer quarters
        newIdx = Math.max(0, currentIdx - 1);
    } else {
        // Zoom out = more quarters
        newIdx = Math.min(zoomLevels.length - 1, currentIdx + 1);
    }

    if (zoomLevels[newIdx] !== roadmapZoomLevel) {
        roadmapZoomLevel = zoomLevels[newIdx];

        // Ensure viewport doesn't exceed bounds
        const maxStart = Math.max(0, allRoadmapQuarters.length - roadmapZoomLevel);
        roadmapViewportStart = Math.min(roadmapViewportStart, maxStart);

        // Re-render the roadmap
        refreshRoadmapDisplay();
    }
}

// Navigate the roadmap timeline
function navigateRoadmapTime(direction) {
    const step = Math.max(1, Math.floor(roadmapZoomLevel / 2)); // Move by half the visible quarters
    const maxStart = Math.max(0, allRoadmapQuarters.length - roadmapZoomLevel);

    if (direction < 0) {
        roadmapViewportStart = Math.max(0, roadmapViewportStart - step);
    } else {
        roadmapViewportStart = Math.min(maxStart, roadmapViewportStart + step);
    }

    // Re-render the roadmap
    refreshRoadmapDisplay();
}

// Refresh the roadmap display with current zoom/viewport settings
function refreshRoadmapDisplay() {
    if (!currentRoadmap) return;

    // Get visible quarters based on current viewport
    roadmapQuarters = getVisibleQuarters();

    // Update UI controls
    updateRoadmapZoomUI();

    // Re-render
    renderQuarterHeaders(roadmapQuarters);
    renderRoadmapItems(currentRoadmap.items, roadmapQuarters);
}

// Legacy function for backward compatibility
function generateQuarters(startDate, endDate) {
    return generateAllQuarters(startDate, endDate);
}

// Render quarter headers
function renderQuarterHeaders(quarters) {
    const container = document.getElementById('quarterHeaders');
    const numQuarters = quarters.length;

    // Update grid template to match number of quarters
    container.style.gridTemplateColumns = `150px repeat(${numQuarters}, 1fr)`;

    container.innerHTML = `
        <div style="font-weight: 600; font-size: 12px; color: var(--cds-text-secondary);">Category</div>
        ${quarters.map(q => `
            <div style="text-align: center; padding: 8px; background: var(--cds-layer-02); font-weight: 600; font-size: 12px;">${q}</div>
        `).join('')}
    `;
}

// Get color for roadmap item based on status
function getRoadmapItemColor(status) {
    const colors = {
        'in_progress': 'linear-gradient(90deg, var(--cds-interactive) 0%, #4589ff 100%)',
        'planned': 'linear-gradient(90deg, #8a3ffc 0%, #a56eff 100%)',
        'completed': 'linear-gradient(90deg, var(--cds-support-success) 0%, #42be65 100%)',
        'delayed': 'linear-gradient(90deg, var(--cds-support-warning) 0%, #fdd13a 100%)',
        'cancelled': 'linear-gradient(90deg, #da1e28 0%, #fa4d56 100%)'
    };
    return colors[status] || colors.planned;
}

// Get display label for status
function getRoadmapStatusLabel(status) {
    const labels = {
        'planned': 'Planned',
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'delayed': 'Delayed',
        'cancelled': 'Cancelled'
    };
    return labels[status] || status;
}

// Get quarter index from date within the quarters array
function getQuarterIndex(date, quarters) {
    if (!date) return -1;
    const d = new Date(date);
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    const quarterStr = `Q${quarter} ${d.getFullYear()}`;
    return quarters.indexOf(quarterStr);
}

// Calculate sub-quarter position from planned_start_date
// Returns: 'early' (month 1), 'mid' (month 2), or 'late' (month 3)
function calculateSubQuarterPosition(plannedStartDate) {
    if (!plannedStartDate) return 'early';
    const d = new Date(plannedStartDate);
    const monthInQuarter = d.getMonth() % 3; // 0, 1, or 2
    if (monthInQuarter === 0) return 'early';
    if (monthInQuarter === 1) return 'mid';
    return 'late';
}

// Calculate precise percentage offset within a quarter for a date
// Returns 0-100 representing position within the quarter
function calculateQuarterOffset(date, quarterStr) {
    if (!date || !quarterStr) return 0;

    const d = new Date(date);
    const match = quarterStr.match(/Q(\d)\s+(\d{4})/);
    if (!match) return 0;

    const quarter = parseInt(match[1]);
    const year = parseInt(match[2]);
    const quarterStart = new Date(year, (quarter - 1) * 3, 1);
    const quarterEnd = new Date(year, quarter * 3, 0); // Last day of quarter

    const quarterDuration = quarterEnd.getTime() - quarterStart.getTime();
    const dateOffset = d.getTime() - quarterStart.getTime();

    return Math.max(0, Math.min(100, (dateOffset / quarterDuration) * 100));
}

// Get precise positioning style for an item based on its actual dates
function getPreciseDatePositioning(startDate, endDate, startQuarter, endQuarter, quarters) {
    if (!startDate || !endDate) return '';

    const startOffset = calculateQuarterOffset(startDate, startQuarter);
    const endOffset = calculateQuarterOffset(endDate, endQuarter);

    // Calculate margin-left based on start position within first quarter
    const marginLeft = startOffset * 0.95; // Scale to ~95% max to leave some padding

    // Calculate width reduction based on end position within last quarter
    // If item spans multiple quarters, only apply end offset if in last quarter
    const startIdx = quarters.indexOf(startQuarter);
    const endIdx = quarters.indexOf(endQuarter);
    const spanMultipleQuarters = endIdx > startIdx;

    // Width reduction: for start margin + remaining space in end quarter
    const endReduction = (100 - endOffset) * 0.95;

    let styles = '';
    if (marginLeft > 5) {
        styles += ` margin-left: ${marginLeft.toFixed(1)}%;`;
    }
    if (spanMultipleQuarters) {
        // For multi-quarter items, reduce width by start margin and end gap
        const totalReduction = marginLeft + endReduction;
        if (totalReduction > 5) {
            styles += ` width: calc(100% - ${totalReduction.toFixed(1)}%);`;
        }
    } else {
        // Single quarter: width is end% - start%
        const width = endOffset - startOffset;
        if (width < 90 && width > 0) {
            styles += ` width: ${(width * 0.95).toFixed(1)}%;`;
        }
    }

    return styles;
}

// Get margin style for sub-quarter positioning (legacy, kept for compatibility)
function getSubQuarterMargin(subQuarter) {
    if (subQuarter === 'mid') return ' margin-left: 8%; width: calc(100% - 8%);';
    if (subQuarter === 'late') return ' margin-left: 16%; width: calc(100% - 16%);';
    return '';
}

// Calculate date for sub-quarter position within a quarter
function calculateDateForSubQuarter(quarterStr, subQuarter) {
    const match = quarterStr.match(/Q(\d)\s+(\d{4})/);
    if (!match) return new Date();

    const quarter = parseInt(match[1]);
    const year = parseInt(match[2]);
    const baseMonth = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9

    let monthOffset = 0;
    if (subQuarter === 'mid') monthOffset = 1;
    if (subQuarter === 'late') monthOffset = 2;

    return new Date(year, baseMonth + monthOffset, 1);
}

// Calculate date from pixel position within the roadmap grid
function calculateDateFromPixelPosition(pixelX, containerRect, quarters) {
    const categoryColWidth = 150;
    const quarterWidth = getQuarterColumnWidth();
    const relativeX = pixelX - containerRect.left - categoryColWidth;

    // Find which quarter and position within it
    const quarterIndex = Math.floor(relativeX / quarterWidth);
    const positionInQuarter = (relativeX % quarterWidth) / quarterWidth; // 0-1

    const clampedIndex = Math.max(0, Math.min(quarterIndex, quarters.length - 1));
    const quarterStr = quarters[clampedIndex];

    const match = quarterStr.match(/Q(\d)\s+(\d{4})/);
    if (!match) return new Date();

    const quarter = parseInt(match[1]);
    const year = parseInt(match[2]);
    const quarterStart = new Date(year, (quarter - 1) * 3, 1);
    const quarterEnd = new Date(year, quarter * 3, 0);

    const quarterDuration = quarterEnd.getTime() - quarterStart.getTime();
    const dateTime = quarterStart.getTime() + (positionInQuarter * quarterDuration);

    return new Date(dateTime);
}

// Calculate required padding for dependency line routing
function calculateDependencyPadding(items) {
    let hasDependencies = false;
    let maxRoutingNeeded = 0;

    items.forEach(item => {
        if (item.depends_on_ids && item.depends_on_ids.length > 0) {
            hasDependencies = true;
            // Check if dependencies are in same category (need vertical routing)
            item.depends_on_ids.forEach(depId => {
                const depItem = items.find(i => i.id === depId);
                if (depItem && depItem.category === item.category) {
                    maxRoutingNeeded = Math.max(maxRoutingNeeded, 50);
                } else {
                    maxRoutingNeeded = Math.max(maxRoutingNeeded, 35);
                }
            });
        }
    });

    return {
        hasDependencies,
        rowGap: hasDependencies ? 24 : 8,
        containerPadding: maxRoutingNeeded,
        bottomPadding: hasDependencies ? 40 : 10
    };
}

// Render roadmap items grouped by category
function renderRoadmapItems(items, quarters) {
    const container = document.getElementById('roadmapItemsContainer');

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 32px; color: var(--cds-text-secondary);">
                No items yet. Click the + button to add roadmap items.
            </div>
        `;
        // Clear any existing dependency lines
        const existingSvg = document.getElementById('roadmapDependencySvg');
        if (existingSvg) existingSvg.remove();
        return;
    }

    // Calculate padding needed for dependency lines
    const spacing = calculateDependencyPadding(items);

    // Group items by category and sort by display_order
    const categories = {};
    items.forEach(item => {
        const cat = item.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
    });

    // Sort items within each category by display_order (ascending)
    Object.keys(categories).forEach(cat => {
        categories[cat].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    });

    // Category display order and labels
    const categoryOrder = ['feature', 'enhancement', 'integration', 'migration', 'optimization', 'other'];
    const categoryLabels = {
        'feature': 'Features',
        'enhancement': 'Enhancements',
        'integration': 'Integrations',
        'migration': 'Migration',
        'optimization': 'Optimization',
        'other': 'Other'
    };

    let html = '';
    const gridCols = quarters.length;

    // Apply container padding for dependency line routing
    container.style.paddingRight = `${spacing.containerPadding}px`;
    container.style.paddingBottom = `${spacing.bottomPadding}px`;

    categoryOrder.forEach(cat => {
        if (!categories[cat]) return;

        // Check how many items are in this category (need row-gap for multiple items)
        const itemCount = categories[cat].length;
        const rowGapStyle = itemCount > 1 ? `row-gap: 16px;` : '';

        html += `
            <div class="roadmap-category-row" data-category="${cat}" style="display: grid; grid-template-columns: 150px repeat(${gridCols}, 1fr); gap: 4px; margin-bottom: ${spacing.rowGap}px; align-items: start; ${rowGapStyle}">
                <div style="font-weight: 500; font-size: 13px; padding: 8px 0; grid-row: 1 / span ${itemCount};">${categoryLabels[cat]}</div>
        `;

        // Render each item with proper column span based on dates
        categories[cat].forEach((item, itemIndex) => {
            let colStart, colEnd;

            if (item.planned_start_date && item.planned_end_date) {
                // Calculate column span from dates
                const startIdx = getQuarterIndex(item.planned_start_date, quarters);
                const endIdx = getQuarterIndex(item.planned_end_date, quarters);

                // If start is before our range, start at first quarter
                colStart = (startIdx >= 0 ? startIdx : 0) + 2; // +2 for category column
                // If end is after our range or not found, end at last quarter
                colEnd = (endIdx >= 0 ? endIdx : quarters.length - 1) + 3; // +3 because grid-column end is exclusive

                // Ensure minimum span of 1
                if (colEnd <= colStart) colEnd = colStart + 1;
            } else {
                // Fallback to target_quarter for single quarter span
                const quarterIdx = quarters.indexOf(item.target_quarter);
                colStart = (quarterIdx >= 0 ? quarterIdx : 0) + 2;
                colEnd = colStart + 1;
            }

            const bgColor = getRoadmapItemColor(item.status);
            const textColor = item.status === 'delayed' ? '#161616' : 'white';

            // Format date range for tooltip
            const dateRange = item.planned_start_date && item.planned_end_date
                ? `${formatDate(item.planned_start_date)} - ${formatDate(item.planned_end_date)}`
                : item.target_quarter;

            // Check if item has dependencies
            const hasDeps = item.depends_on_ids && item.depends_on_ids.length > 0;
            const depIndicator = hasDeps ? `<span style="font-size: 10px; opacity: 0.8;" title="Has dependencies">🔗</span>` : '';

            // Calculate precise positioning based on actual dates
            const startQuarter = quarters[colStart - 2] || quarters[0];
            const endQuarter = quarters[colEnd - 3] || quarters[quarters.length - 1];
            const precisePositioning = getPreciseDatePositioning(
                item.planned_start_date,
                item.planned_end_date,
                startQuarter,
                endQuarter,
                quarters
            );

            // Calculate sub-quarter position for data attribute
            const subQuarter = calculateSubQuarterPosition(item.planned_start_date);

            html += `
                <div class="roadmap-item"
                     data-roadmap-item-id="${item.id}"
                     data-col-start="${colStart}"
                     data-col-end="${colEnd}"
                     data-category="${cat}"
                     data-display-order="${item.display_order || itemIndex}"
                     data-sub-quarter="${subQuarter}"
                     data-start-date="${item.planned_start_date || ''}"
                     data-end-date="${item.planned_end_date || ''}"
                     data-depends-on="${(item.depends_on_ids || []).join(',')}"
                     style="grid-column: ${colStart} / ${colEnd}; background: ${bgColor}; color: ${textColor}; padding: 8px 12px; border-radius: 4px; font-size: 12px; cursor: grab; position: relative; user-select: none;${precisePositioning}"
                     title="${item.title}\n${dateRange}\n${getRoadmapStatusLabel(item.status)}${item.progress_percent > 0 ? ' (' + item.progress_percent + '%)' : ''}${hasDeps ? '\nDepends on: ' + item.depends_on_ids.length + ' item(s)' : ''}\n\nClick to edit • Drag to move • Drag edges to resize">
                    <!-- Left resize handle -->
                    <div class="roadmap-resize-handle roadmap-resize-left"
                         onmousedown="startRoadmapResize(event, ${item.id}, 'left')"
                         title="Drag to change start date"></div>
                    <!-- Right resize handle -->
                    <div class="roadmap-resize-handle roadmap-resize-right"
                         onmousedown="startRoadmapResize(event, ${item.id}, 'right')"
                         title="Drag to change end date"></div>
                    <!-- Anchor points for dependency lines -->
                    <div class="roadmap-anchor roadmap-anchor--top" data-anchor="top" data-item-id="${item.id}" title="Drag to create dependency"></div>
                    <div class="roadmap-anchor roadmap-anchor--bottom" data-anchor="bottom" data-item-id="${item.id}" title="Drag to create dependency"></div>
                    <div class="roadmap-anchor roadmap-anchor--left" data-anchor="left" data-item-id="${item.id}" title="Drag to create dependency"></div>
                    <div class="roadmap-anchor roadmap-anchor--right" data-anchor="right" data-item-id="${item.id}" title="Drag to create dependency"></div>
                    <!-- Content (draggable area) -->
                    <div class="roadmap-item-content"
                         style="pointer-events: auto; overflow: hidden; width: 100%;"
                         onmousedown="startRoadmapDrag(event, ${item.id})">
                        <div class="roadmap-item-title" style="font-weight: 500; line-height: 1.3; position: relative;">
                            <span style="display: block; overflow-wrap: break-word; word-wrap: break-word; hyphens: auto; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding-right: ${hasDeps ? '20px' : '0'};">${item.title}</span>
                            ${hasDeps ? `<span style="position: absolute; top: 0; right: 0; font-size: 10px; opacity: 0.8;" title="Has dependencies">🔗</span>` : ''}
                        </div>
                        <div style="opacity: 0.8; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${getRoadmapStatusLabel(item.status)}${item.progress_percent > 0 ? ' - ' + item.progress_percent + '%' : ''}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
    });

    container.innerHTML = html;

    // Draw dependency lines after a short delay to ensure DOM is rendered
    setTimeout(() => drawDependencyLines(items), 100);
}

// State for anchor drag editing
let anchorDragState = null;

// State for selected dependency (for deletion)
let selectedDependency = null;

// Select a dependency line (for deletion)
function selectDependencyLine(dependentItemId, prereqItemId, fromName, toName, group) {
    // Deselect any previously selected dependency
    deselectDependency();

    // Store selection state
    selectedDependency = {
        dependentItemId,
        prereqItemId,
        fromName,
        toName,
        group
    };

    // Add selected class to the line group
    group.classList.add('dependency-line--selected');

    // Highlight connected items
    const fromEl = document.querySelector(`.roadmap-item[data-item-id="${prereqItemId}"]`);
    const toEl = document.querySelector(`.roadmap-item[data-item-id="${dependentItemId}"]`);
    if (fromEl) fromEl.classList.add('roadmap-item--dependency-selected');
    if (toEl) toEl.classList.add('roadmap-item--dependency-selected');

    // Show popover
    showDependencyPopover(fromName, toName, group);
}

// Deselect the currently selected dependency
function deselectDependency() {
    if (!selectedDependency) return;

    // Remove selected class from line
    if (selectedDependency.group) {
        selectedDependency.group.classList.remove('dependency-line--selected');
    }

    // Remove highlight from connected items
    document.querySelectorAll('.roadmap-item--dependency-selected').forEach(el => {
        el.classList.remove('roadmap-item--dependency-selected');
    });

    // Hide popover
    closeDependencyPopover();

    selectedDependency = null;
}

// Show the dependency action popover
function showDependencyPopover(fromName, toName, group) {
    const popover = document.getElementById('dependencyPopover');
    if (!popover) return;

    // Update popover content
    document.getElementById('dependencyFromName').textContent = fromName;
    document.getElementById('dependencyToName').textContent = toName;

    // Position popover near the middle of the dependency line
    const container = document.getElementById('roadmapItemsContainer');
    const containerRect = container.getBoundingClientRect();

    // Get the path element to find its bounding box
    const path = group.querySelector('path.dependency-path');
    if (path) {
        const pathRect = path.getBoundingClientRect();
        const midX = pathRect.left + pathRect.width / 2 - containerRect.left;
        const midY = pathRect.top - containerRect.top - 10; // Above the line

        // Adjust for popover size
        const popoverWidth = 300;
        let left = midX - popoverWidth / 2;
        let top = midY - 180; // Popover height estimate

        // Keep within container bounds
        left = Math.max(10, Math.min(left, containerRect.width - popoverWidth - 10));
        top = Math.max(10, top);

        // If popover would be above the container, show it below the line instead
        if (top < 10) {
            top = midY + 30;
        }

        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
    }

    popover.style.display = 'block';

    // Focus the delete button for keyboard accessibility
    setTimeout(() => {
        document.getElementById('deleteDependencyBtn')?.focus();
    }, 50);
}

// Close the dependency popover
function closeDependencyPopover() {
    const popover = document.getElementById('dependencyPopover');
    if (popover) {
        popover.style.display = 'none';
    }
}

// Delete the selected dependency
async function deleteSelectedDependency() {
    if (!selectedDependency) return;

    const { dependentItemId, prereqItemId, fromName, toName } = selectedDependency;

    // Find the dependent item in our roadmap data
    const roadmapItems = currentRoadmap?.items || [];
    const dependentItem = roadmapItems.find(item => item.id === dependentItemId);
    if (!dependentItem) {
        showToast('Error: Could not find roadmap item', 'error');
        return;
    }

    // Remove the prerequisite from depends_on_ids
    const currentDeps = dependentItem.depends_on_ids || [];
    const newDeps = currentDeps.filter(id => id !== prereqItemId);

    // Also clean up dependency_anchors if they exist
    const anchors = { ...(dependentItem.dependency_anchors || {}) };
    delete anchors[String(prereqItemId)];

    try {
        // Update via API
        const response = await fetch(`${API_BASE_URL}/roadmaps/items/${dependentItemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                depends_on_ids: newDeps,
                dependency_anchors: anchors
            })
        });

        if (!response.ok) {
            throw new Error('Failed to delete dependency');
        }

        // Update local data
        dependentItem.depends_on_ids = newDeps;
        dependentItem.dependency_anchors = anchors;

        // Clear selection and close popover
        deselectDependency();

        // Redraw dependency lines
        drawDependencyLines(roadmapItems);

        // Show success message
        showToast(`Removed dependency: ${fromName} → ${toName}`, 'success');

    } catch (error) {
        console.error('Failed to delete dependency:', error);
        showToast('Failed to delete dependency', 'error');
    }
}

// Handle keyboard events for dependency management
function handleDependencyKeyboard(event) {
    if (!selectedDependency) return;

    if (event.key === 'Escape') {
        deselectDependency();
        event.preventDefault();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only if not focused on an input
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            deleteSelectedDependency();
            event.preventDefault();
        }
    }
}

// Initialize dependency keyboard listener
document.addEventListener('keydown', handleDependencyKeyboard);

// Close popover when clicking outside
document.addEventListener('click', (event) => {
    if (!selectedDependency) return;

    const popover = document.getElementById('dependencyPopover');
    const clickedOnPopover = popover?.contains(event.target);
    const clickedOnDependencyLine = event.target.closest('.dependency-line-group');

    if (!clickedOnPopover && !clickedOnDependencyLine) {
        deselectDependency();
    }
});

// Get anchor point position on an element
function getAnchorPosition(element, anchor, containerRect) {
    const rect = element.getBoundingClientRect();
    const positions = {
        left: { x: rect.left - containerRect.left, y: rect.top + rect.height / 2 - containerRect.top },
        right: { x: rect.right - containerRect.left, y: rect.top + rect.height / 2 - containerRect.top },
        top: { x: rect.left + rect.width / 2 - containerRect.left, y: rect.top - containerRect.top },
        bottom: { x: rect.left + rect.width / 2 - containerRect.left, y: rect.bottom - containerRect.top }
    };
    return positions[anchor] || positions.right;
}

// Get all anchor positions for an element (in screen coordinates)
function getAllAnchorPositions(element) {
    const rect = element.getBoundingClientRect();
    return {
        left: { x: rect.left, y: rect.top + rect.height / 2 },
        right: { x: rect.right, y: rect.top + rect.height / 2 },
        top: { x: rect.left + rect.width / 2, y: rect.top },
        bottom: { x: rect.left + rect.width / 2, y: rect.bottom }
    };
}

// Show drop targets on all roadmap items
function showAllDropTargets(excludeItemId = null) {
    // Remove existing drop targets
    hideAllDropTargets();

    const items = document.querySelectorAll('.roadmap-item');
    const anchors = ['top', 'bottom', 'left', 'right'];

    items.forEach(itemEl => {
        const itemId = parseInt(itemEl.dataset.roadmapItemId);
        if (excludeItemId && itemId === excludeItemId) return;

        anchors.forEach(anchor => {
            createDropTarget(itemEl, itemId, anchor);
        });
    });
}

// Show drop targets only on a specific item - more prominent
function showDropTargetsOnItem(itemId) {
    hideAllDropTargets();

    const itemEl = document.querySelector(`.roadmap-item[data-roadmap-item-id="${itemId}"]`);
    if (!itemEl) return;

    const anchors = ['top', 'bottom', 'left', 'right'];
    const labels = { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' };

    anchors.forEach(anchor => {
        const target = document.createElement('div');
        target.className = 'roadmap-drop-target';
        target.dataset.anchor = anchor;
        target.dataset.itemId = itemId;

        // Position based on anchor - larger and more visible
        const posStyles = {
            top: 'top: -20px; left: 50%; transform: translateX(-50%);',
            bottom: 'bottom: -20px; left: 50%; transform: translateX(-50%);',
            left: 'left: -20px; top: 50%; transform: translateY(-50%);',
            right: 'right: -20px; top: 50%; transform: translateY(-50%);'
        };

        target.innerHTML = `
            <div class="drop-target-circle"></div>
            <span class="drop-target-label">${labels[anchor]}</span>
        `;

        target.style.cssText = `
            position: absolute;
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 100;
            pointer-events: none;
            ${posStyles[anchor]}
        `;

        // Style the inner circle
        const circle = target.querySelector('.drop-target-circle');
        circle.style.cssText = `
            width: 24px;
            height: 24px;
            background: rgba(138, 63, 252, 0.2);
            border: 3px dashed #8a3ffc;
            border-radius: 50%;
            transition: all 0.15s ease;
            animation: pulse-drop-target 1.5s ease-in-out infinite;
        `;

        // Style the label
        const label = target.querySelector('.drop-target-label');
        label.style.cssText = `
            font-size: 10px;
            font-weight: 600;
            color: #8a3ffc;
            margin-top: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        `;

        itemEl.appendChild(target);
    });

    // Add pulse animation if not exists
    if (!document.getElementById('dropTargetAnimationStyle')) {
        const style = document.createElement('style');
        style.id = 'dropTargetAnimationStyle';
        style.textContent = `
            @keyframes pulse-drop-target {
                0%, 100% { transform: scale(1); opacity: 0.7; }
                50% { transform: scale(1.15); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Create a single drop target element
function createDropTarget(itemEl, itemId, anchor) {
    const target = document.createElement('div');
    target.className = 'roadmap-drop-target';
    target.dataset.anchor = anchor;
    target.dataset.itemId = itemId;

    const posStyles = {
        top: 'top: -8px; left: 50%; transform: translateX(-50%);',
        bottom: 'bottom: -8px; left: 50%; transform: translateX(-50%);',
        left: 'left: -8px; top: 50%; transform: translateY(-50%);',
        right: 'right: -8px; top: 50%; transform: translateY(-50%);'
    };

    target.style.cssText = `
        position: absolute;
        width: 16px;
        height: 16px;
        background: rgba(138, 63, 252, 0.3);
        border: 2px dashed #8a3ffc;
        border-radius: 50%;
        z-index: 25;
        pointer-events: none;
        transition: transform 0.1s ease, background 0.1s ease, box-shadow 0.1s ease;
        ${posStyles[anchor]}
    `;

    itemEl.appendChild(target);
}

// Hide all drop targets and cleanup
function hideAllDropTargets() {
    document.querySelectorAll('.roadmap-drop-target').forEach(el => el.remove());
    // Reset any highlighted items
    document.querySelectorAll('.roadmap-item').forEach(el => {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.boxShadow = '';
    });
}

// Highlight a specific drop target (when snapping)
function highlightDropTarget(itemId, anchor) {
    // Reset all targets
    document.querySelectorAll('.roadmap-drop-target').forEach(el => {
        const circle = el.querySelector('.drop-target-circle') || el;
        circle.style.background = 'rgba(138, 63, 252, 0.2)';
        circle.style.borderStyle = 'dashed';
        circle.style.transform = '';
        circle.style.boxShadow = '';
        const label = el.querySelector('.drop-target-label');
        if (label) label.style.color = '#8a3ffc';
    });

    // Highlight the specified one with strong visual feedback
    const target = document.querySelector(`.roadmap-drop-target[data-item-id="${itemId}"][data-anchor="${anchor}"]`);
    if (target) {
        const circle = target.querySelector('.drop-target-circle') || target;
        circle.style.background = '#8a3ffc';
        circle.style.borderStyle = 'solid';
        circle.style.transform = 'scale(1.3)';
        circle.style.boxShadow = '0 0 15px rgba(138, 63, 252, 0.9)';
        circle.style.animation = 'none'; // Stop pulsing when highlighted
        const label = target.querySelector('.drop-target-label');
        if (label) {
            label.style.color = 'white';
            label.style.background = '#8a3ffc';
            label.style.padding = '2px 6px';
            label.style.borderRadius = '3px';
        }
    }
}

// Find nearest drop target to a point
function findNearestDropTarget(x, y, validItemId = null) {
    const targets = document.querySelectorAll('.roadmap-drop-target');
    let nearest = null;
    let nearestDist = Infinity;
    const snapDistance = 30; // pixels

    targets.forEach(target => {
        const itemId = parseInt(target.dataset.itemId);
        // If validItemId is specified, only consider that item
        if (validItemId !== null && itemId !== validItemId) return;

        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        if (dist < snapDistance && dist < nearestDist) {
            nearestDist = dist;
            nearest = {
                itemId: itemId,
                anchor: target.dataset.anchor,
                x: centerX,
                y: centerY
            };
        }
    });

    return nearest;
}

// Start dragging an anchor endpoint
function startAnchorDrag(event, dependentItemId, prereqItemId, editingEnd, circleElement = null) {
    event.preventDefault();
    event.stopPropagation();

    const container = document.getElementById('roadmapItemsContainer');
    const containerRect = container.getBoundingClientRect();

    // Determine which item we're editing the anchor on
    // 'from' anchor is on the dependent item, 'to' anchor is on the prerequisite item
    const targetItemId = editingEnd === 'from' ? dependentItemId : prereqItemId;
    const targetItem = container.querySelector(`[data-roadmap-item-id="${targetItemId}"]`);
    const targetItemName = targetItem?.querySelector('.roadmap-item-content div')?.textContent || 'item';

    anchorDragState = {
        dependentItemId,
        prereqItemId,
        editingEnd,
        targetItemId,
        containerRect,
        startX: event.clientX,
        startY: event.clientY,
        circleElement
    };

    // Show drop targets only on the target item (not all items)
    showDropTargetsOnItem(targetItemId);

    // Highlight the target item
    if (targetItem) {
        targetItem.style.outline = '3px solid #8a3ffc';
        targetItem.style.outlineOffset = '2px';
        targetItem.style.boxShadow = '0 0 20px rgba(138, 63, 252, 0.4)';
    }

    // Create a dragging indicator with label
    const dragIndicator = document.createElement('div');
    dragIndicator.id = 'anchorDragIndicator';
    dragIndicator.innerHTML = `
        <div style="width: 20px; height: 20px; background: #8a3ffc; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 12px rgba(0,0,0,0.4);"></div>
        <div style="margin-top: 4px; background: #8a3ffc; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
            Drag to anchor on "${targetItemName}"
        </div>
    `;
    dragIndicator.style.cssText = `
        position: fixed;
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: none;
        z-index: 1000;
        transform: translate(-50%, -50%);
        left: ${event.clientX}px;
        top: ${event.clientY}px;
    `;
    document.body.appendChild(dragIndicator);

    // Add event listeners
    document.addEventListener('mousemove', handleAnchorDrag);
    document.addEventListener('mouseup', endAnchorDrag);

    // Add visual feedback
    document.body.style.cursor = 'grabbing';
}

// Handle dragging
function handleAnchorDrag(event) {
    if (!anchorDragState) return;

    const dragIndicator = document.getElementById('anchorDragIndicator');
    if (dragIndicator) {
        dragIndicator.style.left = `${event.clientX}px`;
        dragIndicator.style.top = `${event.clientY}px`;
    }

    // Find nearest drop target (only on the valid target item)
    const nearest = findNearestDropTarget(event.clientX, event.clientY, anchorDragState.targetItemId);

    // Update the drag indicator label
    const labelEl = dragIndicator?.querySelector('div:last-child');

    if (nearest) {
        highlightDropTarget(nearest.itemId, nearest.anchor);

        // Update label to show we're snapping
        if (labelEl) {
            labelEl.textContent = `Drop on ${nearest.anchor.toUpperCase()} anchor`;
            labelEl.style.background = '#24a148'; // Green for valid
        }

        // Snap the drag indicator to the target
        if (dragIndicator) {
            dragIndicator.style.left = `${nearest.x}px`;
            dragIndicator.style.top = `${nearest.y}px`;
        }
    } else {
        // Reset highlights if not near any target
        document.querySelectorAll('.roadmap-drop-target').forEach(el => {
            const circle = el.querySelector('.drop-target-circle') || el;
            circle.style.background = 'rgba(138, 63, 252, 0.2)';
            circle.style.borderStyle = 'dashed';
            circle.style.transform = '';
            circle.style.boxShadow = '';
            circle.style.animation = 'pulse-drop-target 1.5s ease-in-out infinite';
            const label = el.querySelector('.drop-target-label');
            if (label) {
                label.style.color = '#8a3ffc';
                label.style.background = '';
                label.style.padding = '';
            }
        });

        // Update label to show we need to find a target
        if (labelEl) {
            labelEl.textContent = 'Move to an anchor point';
            labelEl.style.background = '#8a3ffc';
        }
    }
}

// End anchor drag
async function endAnchorDrag(event) {
    if (!anchorDragState) return;

    const { dependentItemId, prereqItemId, editingEnd, targetItemId, circleElement } = anchorDragState;

    // Find the drop target
    const nearest = findNearestDropTarget(event.clientX, event.clientY, targetItemId);

    // Clean up event listeners
    document.removeEventListener('mousemove', handleAnchorDrag);
    document.removeEventListener('mouseup', endAnchorDrag);
    document.body.style.cursor = '';

    // Reset the grabbed circle cursor
    if (circleElement) {
        circleElement.style.cursor = 'grab';
    }

    const dragIndicator = document.getElementById('anchorDragIndicator');
    if (dragIndicator) dragIndicator.remove();

    hideAllDropTargets();

    // If dropped on a valid target, save the anchor
    if (nearest && nearest.itemId === targetItemId) {
        await saveAnchorConfiguration(dependentItemId, prereqItemId, editingEnd, nearest.anchor);
    }

    anchorDragState = null;
}

// Save anchor configuration to API
async function saveAnchorConfiguration(dependentItemId, prereqItemId, editingEnd, newAnchor) {
    const dependentItem = currentRoadmap.items.find(i => i.id === dependentItemId);
    if (!dependentItem) return;

    // Store original anchors for undo
    const originalAnchors = JSON.parse(JSON.stringify(dependentItem.dependency_anchors || {}));

    // Update the anchor configuration
    const anchors = { ...(dependentItem.dependency_anchors || {}) };
    const depKey = String(prereqItemId);
    if (!anchors[depKey]) {
        anchors[depKey] = { from_anchor: 'right', to_anchor: 'left' };
    }

    const oldAnchor = editingEnd === 'from' ? anchors[depKey].from_anchor : anchors[depKey].to_anchor;

    if (editingEnd === 'from') {
        anchors[depKey].from_anchor = newAnchor;
    } else {
        anchors[depKey].to_anchor = newAnchor;
    }

    // Save to API
    try {
        const response = await fetch(`${API_BASE_URL}/roadmaps/items/${dependentItemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dependency_anchors: anchors })
        });

        if (response.ok) {
            // Push to undo stack
            const itemTitle = document.querySelector(`[data-roadmap-item-id="${dependentItemId}"] .roadmap-item-content div`)?.textContent || 'Item';
            pushToUndoStack({
                type: 'anchor',
                itemId: dependentItemId,
                description: `Change anchor on "${itemTitle}" (${oldAnchor} → ${newAnchor})`,
                previousState: { dependency_anchors: originalAnchors }
            });

            // Update local state
            dependentItem.dependency_anchors = anchors;
            showToast(`Anchor changed to ${newAnchor}`, 'success');

            // Redraw lines
            if (currentRoadmap && currentRoadmap.items) {
                drawDependencyLines(currentRoadmap.items);
            }
        } else {
            showToast('Failed to save anchor', 'error');
        }
    } catch (error) {
        console.error('Error saving anchor:', error);
        showToast('Error saving anchor', 'error');
    }
}

// Calculate optimal anchor points for a dependency based on relative positions
// Uses Gantt chart best practices: minimize line crossings, prefer horizontal flow
function calculateOptimalAnchors(dependentItemId, prereqItemId) {
    const container = document.getElementById('roadmapItemsContainer');
    if (!container) return { from_anchor: 'right', to_anchor: 'left' };

    const dependentEl = container.querySelector(`[data-roadmap-item-id="${dependentItemId}"]`);
    const prereqEl = container.querySelector(`[data-roadmap-item-id="${prereqItemId}"]`);

    if (!dependentEl || !prereqEl) return { from_anchor: 'right', to_anchor: 'left' };

    const depRect = dependentEl.getBoundingClientRect();
    const prereqRect = prereqEl.getBoundingClientRect();

    // Calculate relative positions
    const depCenterX = depRect.left + depRect.width / 2;
    const depCenterY = depRect.top + depRect.height / 2;
    const prereqCenterX = prereqRect.left + prereqRect.width / 2;
    const prereqCenterY = prereqRect.top + prereqRect.height / 2;

    const dx = prereqCenterX - depCenterX;
    const dy = prereqCenterY - depCenterY;

    // Determine primary direction
    const isHorizontalPrimary = Math.abs(dx) > Math.abs(dy);
    const horizontalGap = Math.abs(depRect.right < prereqRect.left ? prereqRect.left - depRect.right :
                                   prereqRect.right < depRect.left ? depRect.left - prereqRect.right : 0);
    const verticalGap = Math.abs(depRect.bottom < prereqRect.top ? prereqRect.top - depRect.bottom :
                                 prereqRect.bottom < depRect.top ? depRect.top - prereqRect.bottom : 0);

    // Default anchor configuration (for standard left-to-right flow)
    let fromAnchor = 'right';  // Exit from dependent item
    let toAnchor = 'left';     // Enter to prerequisite item

    // Case 1: Prerequisite is to the RIGHT of dependent (standard flow)
    if (prereqRect.left > depRect.right) {
        fromAnchor = 'right';
        toAnchor = 'left';
    }
    // Case 2: Prerequisite is to the LEFT of dependent (reverse flow)
    else if (prereqRect.right < depRect.left) {
        fromAnchor = 'left';
        toAnchor = 'right';
    }
    // Case 3: Items overlap horizontally - use vertical routing
    else {
        // Prerequisite is ABOVE dependent
        if (prereqRect.bottom < depRect.top) {
            fromAnchor = 'top';
            toAnchor = 'bottom';
        }
        // Prerequisite is BELOW dependent
        else if (prereqRect.top > depRect.bottom) {
            fromAnchor = 'bottom';
            toAnchor = 'top';
        }
        // Items overlap significantly - use diagonal approach
        else {
            // Choose based on which side has more room
            if (dx > 0) {
                // Prereq center is to the right
                fromAnchor = 'right';
                toAnchor = dy < 0 ? 'bottom' : 'top';
            } else {
                // Prereq center is to the left
                fromAnchor = 'left';
                toAnchor = dy < 0 ? 'bottom' : 'top';
            }
        }
    }

    return { from_anchor: fromAnchor, to_anchor: toAnchor };
}

// Calculate optimal anchors for all new dependencies after DOM is rendered
async function applySmartRoutingForNewDependencies(itemId, oldDeps, newDeps) {
    // Find truly new dependencies (not in old list)
    const addedDeps = newDeps.filter(depId => !oldDeps.includes(depId));
    if (addedDeps.length === 0) return;

    // Wait for DOM to be rendered so we can calculate positions
    await new Promise(resolve => setTimeout(resolve, 150));

    const item = currentRoadmap?.items?.find(i => i.id === parseInt(itemId));
    if (!item) return;

    const anchors = { ...(item.dependency_anchors || {}) };

    // Calculate optimal anchors for each new dependency
    addedDeps.forEach(prereqId => {
        const optimal = calculateOptimalAnchors(parseInt(itemId), prereqId);
        anchors[String(prereqId)] = optimal;
    });

    // Save to API
    try {
        const response = await fetch(`${API_BASE_URL}/roadmaps/items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dependency_anchors: anchors })
        });

        if (response.ok) {
            item.dependency_anchors = anchors;
            // Redraw lines with new anchors
            if (currentRoadmap && currentRoadmap.items) {
                drawDependencyLines(currentRoadmap.items);
            }
        }
    } catch (error) {
        console.error('Error applying smart routing:', error);
    }
}

// Draw dependency lines between roadmap items using SVG with improved routing
function drawDependencyLines(items) {
    // Clear any selected dependency before redrawing
    deselectDependency();

    // Remove existing SVG
    const existingSvg = document.getElementById('roadmapDependencySvg');
    if (existingSvg) existingSvg.remove();

    // Find items with dependencies
    const itemsWithDeps = items.filter(item => item.depends_on_ids && item.depends_on_ids.length > 0);
    if (itemsWithDeps.length === 0) return;

    // Get the container for positioning reference
    const container = document.getElementById('roadmapItemsContainer');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // Create SVG overlay
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'roadmapDependencySvg';
    svg.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; overflow: visible;`;

    // Define markers for arrows
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

    // Arrow marker
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '7');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 8 3, 0 6');
    polygon.setAttribute('fill', '#8a3ffc');
    marker.appendChild(polygon);
    defs.appendChild(marker);

    // Dot marker for start point
    const startMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    startMarker.setAttribute('id', 'startDot');
    startMarker.setAttribute('markerWidth', '6');
    startMarker.setAttribute('markerHeight', '6');
    startMarker.setAttribute('refX', '3');
    startMarker.setAttribute('refY', '3');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '3');
    circle.setAttribute('cy', '3');
    circle.setAttribute('r', '2');
    circle.setAttribute('fill', '#8a3ffc');
    startMarker.appendChild(circle);
    defs.appendChild(startMarker);

    svg.appendChild(defs);

    // Track vertical offsets for lines at same positions to avoid overlap
    const lineOffsets = {};
    let lineIndex = 0;

    // Collect all connection info first for better routing
    // Arrow points TO the prerequisite (the item that must be completed first)
    // Line goes FROM the dependent item TO the prerequisite
    const connections = [];
    itemsWithDeps.forEach(item => {
        const dependentEl = container.querySelector(`[data-roadmap-item-id="${item.id}"]`);
        if (!dependentEl) return;

        item.depends_on_ids.forEach(depId => {
            const prereqEl = container.querySelector(`[data-roadmap-item-id="${depId}"]`);
            if (!prereqEl) return;

            // Get custom anchor configuration if available
            // Note: from_anchor/to_anchor in stored config refer to prereq→dependent direction
            // We reverse it here so arrow points to prerequisite
            const anchors = item.dependency_anchors?.[String(depId)] ||
                           { from_anchor: 'right', to_anchor: 'left' };

            connections.push({
                from: dependentEl,      // Line starts at dependent item
                to: prereqEl,           // Arrow points to prerequisite
                fromId: item.id,
                toId: depId,
                fromAnchor: anchors.to_anchor || 'left',   // Swap anchors
                toAnchor: anchors.from_anchor || 'right'   // Swap anchors
            });
        });
    });

    // Sort connections by vertical distance for better layering
    connections.sort((a, b) => {
        const aFromRect = a.from.getBoundingClientRect();
        const aToRect = a.to.getBoundingClientRect();
        const bFromRect = b.from.getBoundingClientRect();
        const bToRect = b.to.getBoundingClientRect();
        return Math.abs(aFromRect.top - aToRect.top) - Math.abs(bFromRect.top - bToRect.top);
    });

    // Draw each connection with custom anchor-based routing
    connections.forEach((conn, idx) => {
        const prereqRect = conn.from.getBoundingClientRect();
        const depRect = conn.to.getBoundingClientRect();

        // Calculate positions based on custom anchors
        const startPos = getAnchorPosition(conn.from, conn.fromAnchor, containerRect);
        const endPos = getAnchorPosition(conn.to, conn.toAnchor, containerRect);

        const startX = startPos.x;
        const startY = startPos.y;
        const endX = endPos.x;
        const endY = endPos.y;

        // Create the path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

        // Offset for multiple lines at similar positions
        const offsetKey = `${Math.round(startY/20)}-${Math.round(endY/20)}`;
        if (!lineOffsets[offsetKey]) lineOffsets[offsetKey] = 0;
        const vertOffset = lineOffsets[offsetKey] * 8;
        lineOffsets[offsetKey]++;

        const cornerRadius = 10;
        const padding = 25 + vertOffset;

        // Generate path based on anchor positions
        // Direction vectors for each anchor type
        const anchorDirs = {
            left: { x: -1, y: 0 },
            right: { x: 1, y: 0 },
            top: { x: 0, y: -1 },
            bottom: { x: 0, y: 1 }
        };

        const fromDir = anchorDirs[conn.fromAnchor];
        const toDir = anchorDirs[conn.toAnchor];

        // Calculate control points for the path
        let d;
        const dx = endX - startX;
        const dy = endY - startY;

        // Simple case: horizontal anchors (right-to-left or left-to-right)
        if ((conn.fromAnchor === 'right' && conn.toAnchor === 'left') ||
            (conn.fromAnchor === 'left' && conn.toAnchor === 'right')) {
            // S-curve for horizontal connections
            const midX = (startX + endX) / 2;
            d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
        }
        // Vertical anchors (top-to-bottom or bottom-to-top)
        else if ((conn.fromAnchor === 'bottom' && conn.toAnchor === 'top') ||
                 (conn.fromAnchor === 'top' && conn.toAnchor === 'bottom')) {
            const midY = (startY + endY) / 2;
            d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
        }
        // Mixed: horizontal to vertical
        else if ((conn.fromAnchor === 'right' || conn.fromAnchor === 'left') &&
                 (conn.toAnchor === 'top' || conn.toAnchor === 'bottom')) {
            const outX = startX + (fromDir.x * padding);
            const inY = endY + (toDir.y * padding);
            d = `M ${startX} ${startY}
                 L ${outX} ${startY}
                 Q ${outX + cornerRadius * fromDir.x} ${startY}, ${outX + cornerRadius * fromDir.x} ${startY + cornerRadius * Math.sign(inY - startY)}
                 L ${outX + cornerRadius * fromDir.x} ${inY - cornerRadius * toDir.y}
                 Q ${outX + cornerRadius * fromDir.x} ${inY}, ${outX + cornerRadius * fromDir.x + cornerRadius * Math.sign(endX - startX)} ${inY}
                 L ${endX} ${inY}
                 L ${endX} ${endY}`;
        }
        // Mixed: vertical to horizontal
        else if ((conn.fromAnchor === 'top' || conn.fromAnchor === 'bottom') &&
                 (conn.toAnchor === 'left' || conn.toAnchor === 'right')) {
            const outY = startY + (fromDir.y * padding);
            const inX = endX + (toDir.x * padding);
            d = `M ${startX} ${startY}
                 L ${startX} ${outY}
                 Q ${startX} ${outY + cornerRadius * fromDir.y}, ${startX + cornerRadius * Math.sign(inX - startX)} ${outY + cornerRadius * fromDir.y}
                 L ${inX - cornerRadius * toDir.x} ${outY + cornerRadius * fromDir.y}
                 Q ${inX} ${outY + cornerRadius * fromDir.y}, ${inX} ${outY + cornerRadius * fromDir.y + cornerRadius * Math.sign(endY - startY)}
                 L ${inX} ${endY}
                 L ${endX} ${endY}`;
        }
        // Same side connections (need to route around)
        else {
            const routeOffset = padding + 30;
            if (conn.fromAnchor === 'right' && conn.toAnchor === 'right') {
                const routeX = Math.max(startX, endX) + routeOffset;
                d = `M ${startX} ${startY} L ${routeX} ${startY} L ${routeX} ${endY} L ${endX} ${endY}`;
            } else if (conn.fromAnchor === 'left' && conn.toAnchor === 'left') {
                const routeX = Math.min(startX, endX) - routeOffset;
                d = `M ${startX} ${startY} L ${routeX} ${startY} L ${routeX} ${endY} L ${endX} ${endY}`;
            } else if (conn.fromAnchor === 'top' && conn.toAnchor === 'top') {
                const routeY = Math.min(startY, endY) - routeOffset;
                d = `M ${startX} ${startY} L ${startX} ${routeY} L ${endX} ${routeY} L ${endX} ${endY}`;
            } else if (conn.fromAnchor === 'bottom' && conn.toAnchor === 'bottom') {
                const routeY = Math.max(startY, endY) + routeOffset;
                d = `M ${startX} ${startY} L ${startX} ${routeY} L ${endX} ${routeY} L ${endX} ${endY}`;
            } else {
                // Fallback: simple curved line
                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;
                d = `M ${startX} ${startY} Q ${midX} ${startY}, ${midX} ${midY} Q ${midX} ${endY}, ${endX} ${endY}`;
            }
        }

        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#8a3ffc');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        path.setAttribute('marker-start', 'url(#startDot)');
        path.setAttribute('opacity', '0.6');

        // Add hover effect group
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('dependency-line-group');
        group.style.cssText = 'cursor: pointer; pointer-events: auto;';
        group.dataset.fromId = conn.fromId;
        group.dataset.toId = conn.toId;

        // Add class to path for CSS targeting
        path.classList.add('dependency-path');

        // Invisible wider path for easier hovering/clicking (narrower to avoid overlapping cards)
        const hoverPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hoverPath.setAttribute('d', d);
        hoverPath.setAttribute('fill', 'none');
        hoverPath.setAttribute('stroke', 'transparent');
        hoverPath.setAttribute('stroke-width', '8');
        hoverPath.style.pointerEvents = 'stroke';

        group.appendChild(hoverPath);
        group.appendChild(path);

        // Get item names for popover display
        const fromTitle = conn.from.querySelector('.roadmap-item-content div')?.textContent || 'Item';
        const toTitle = conn.to.querySelector('.roadmap-item-content div')?.textContent || 'Item';

        // Draggable anchor circles at start and end points - larger and more visible
        const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startCircle.setAttribute('cx', startX);
        startCircle.setAttribute('cy', startY);
        startCircle.setAttribute('r', '8');
        startCircle.setAttribute('fill', '#8a3ffc');
        startCircle.setAttribute('stroke', 'white');
        startCircle.setAttribute('stroke-width', '3');
        startCircle.classList.add('dependency-anchor-circle');
        startCircle.style.cssText = 'cursor: grab; pointer-events: all; opacity: 0; transition: all 0.15s ease;';
        startCircle.dataset.editEnd = 'from';

        const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endCircle.setAttribute('cx', endX);
        endCircle.setAttribute('cy', endY);
        endCircle.setAttribute('r', '8');
        endCircle.setAttribute('fill', '#8a3ffc');
        endCircle.setAttribute('stroke', 'white');
        endCircle.setAttribute('stroke-width', '3');
        endCircle.classList.add('dependency-anchor-circle');
        endCircle.style.cssText = 'cursor: grab; pointer-events: all; opacity: 0; transition: all 0.15s ease;';
        endCircle.dataset.editEnd = 'to';

        group.appendChild(startCircle);
        group.appendChild(endCircle);

        // Hover effects on circles themselves - make them obvious they're draggable
        [startCircle, endCircle].forEach(circle => {
            circle.addEventListener('mouseenter', () => {
                circle.setAttribute('r', '10');
                circle.setAttribute('fill', '#6929c4');
                circle.style.cursor = 'grab';
                circle.style.filter = 'drop-shadow(0 0 6px rgba(138, 63, 252, 0.8))';
            });
            circle.addEventListener('mouseleave', () => {
                circle.setAttribute('r', '8');
                circle.setAttribute('fill', '#8a3ffc');
                circle.style.filter = '';
            });
        });

        // Hover effects on line - show edit circles
        group.addEventListener('mouseenter', () => {
            if (group.classList.contains('dependency-line--selected')) return;

            path.setAttribute('stroke-width', '3');
            path.setAttribute('opacity', '1');
            conn.from.style.outline = '2px solid #8a3ffc';
            conn.to.style.outline = '2px solid #8a3ffc';
            startCircle.style.opacity = '1';
            endCircle.style.opacity = '1';
        });
        group.addEventListener('mouseleave', () => {
            if (group.classList.contains('dependency-line--selected')) return;

            path.setAttribute('stroke-width', '2');
            path.setAttribute('opacity', '0.6');
            conn.from.style.outline = '';
            conn.to.style.outline = '';
            startCircle.style.opacity = '0';
            endCircle.style.opacity = '0';
        });

        // Drag anchor circles to reroute
        // conn.fromId = dependent item, conn.toId = prerequisite item
        startCircle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startCircle.style.cursor = 'grabbing';
            startAnchorDrag(e, conn.fromId, conn.toId, 'from', startCircle);
        });
        endCircle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            endCircle.style.cursor = 'grabbing';
            startAnchorDrag(e, conn.fromId, conn.toId, 'to', endCircle);
        });

        // Click to select dependency (for deletion)
        group.addEventListener('click', (e) => {
            // Don't select if clicking on anchor circles (for dragging)
            if (e.target === startCircle || e.target === endCircle) return;

            e.stopPropagation();
            selectDependencyLine(conn.fromId, conn.toId, fromTitle, toTitle, group);
        });

        // Add title/tooltip - shows "Dependent item → Prerequisite" matching arrow direction
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${fromTitle} depends on ${toTitle}\nClick to select • Drag circles to reroute`;
        group.appendChild(title);

        svg.appendChild(group);
    });

    // Add SVG to container
    container.style.position = 'relative';
    container.appendChild(svg);
}

// ==========================================
// ROADMAP DRAG AND DROP / RESIZE
// ==========================================

let roadmapDragState = null; // Tracks current drag operation

// Get the quarter column width from the grid
function getQuarterColumnWidth() {
    const container = document.getElementById('roadmapItemsContainer');
    if (!container) return 100;

    const firstRow = container.querySelector('[style*="grid-template-columns"]');
    if (!firstRow) return 100;

    // Calculate based on container width minus category column
    const containerWidth = container.clientWidth;
    const categoryColWidth = 150;
    const numQuarters = roadmapQuarters.length;

    return (containerWidth - categoryColWidth - (numQuarters * 4)) / numQuarters; // 4px gap
}

// Convert pixel position to quarter index
function pixelToQuarterIndex(pixelX, containerRect) {
    const categoryColWidth = 150;
    const quarterWidth = getQuarterColumnWidth();
    const relativeX = pixelX - containerRect.left - categoryColWidth;

    const quarterIndex = Math.floor(relativeX / quarterWidth);
    return Math.max(0, Math.min(quarterIndex, roadmapQuarters.length - 1));
}

// Get date from quarter string (returns first day of quarter)
function getDateFromQuarter(quarterStr) {
    const match = quarterStr.match(/Q(\d)\s+(\d{4})/);
    if (!match) return new Date();

    const quarter = parseInt(match[1]);
    const year = parseInt(match[2]);
    const month = (quarter - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9

    return new Date(year, month, 1);
}

// Get end date from quarter string (returns last day of quarter)
function getEndDateFromQuarter(quarterStr) {
    const startDate = getDateFromQuarter(quarterStr);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);
    endDate.setDate(endDate.getDate() - 1);
    return endDate;
}

// Start dragging a roadmap item
function startRoadmapDrag(event, itemId) {
    // Ignore if clicking on resize handles
    if (event.target.classList.contains('roadmap-resize-handle')) return;

    event.preventDefault();
    event.stopPropagation();

    const itemEl = document.querySelector(`[data-roadmap-item-id="${itemId}"]`);
    if (!itemEl) return;

    const container = document.getElementById('roadmapItemsContainer');
    const containerRect = container.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();

    // Find all items in the same category for vertical reordering
    const category = itemEl.dataset.category;
    const categoryRow = itemEl.closest('.roadmap-category-row');
    const categoryItems = categoryRow ? Array.from(categoryRow.querySelectorAll('.roadmap-item')) : [];

    roadmapDragState = {
        type: 'move',
        dragMode: null, // Will be determined by movement: 'horizontal', 'vertical', or 'sub-quarter'
        hasMoved: false, // Track if significant movement occurred (for click-to-edit)
        itemId: itemId,
        itemEl: itemEl,
        container: container,
        containerRect: containerRect,
        itemRect: itemRect,
        startX: event.clientX,
        startY: event.clientY,
        originalColStart: parseInt(itemEl.dataset.colStart),
        originalColEnd: parseInt(itemEl.dataset.colEnd),
        originalDisplayOrder: parseInt(itemEl.dataset.displayOrder) || 0,
        originalSubQuarter: itemEl.dataset.subQuarter || 'early',
        category: category,
        categoryRow: categoryRow,
        categoryItems: categoryItems,
        quarterWidth: getQuarterColumnWidth(),
        newDisplayOrder: null,
        newSubQuarter: null
    };

    // Add mouse move and up handlers
    document.addEventListener('mousemove', handleRoadmapDrag);
    document.addEventListener('mouseup', endRoadmapDrag);
}

// Start resizing a roadmap item
function startRoadmapResize(event, itemId, side) {
    event.preventDefault();
    event.stopPropagation();

    const itemEl = document.querySelector(`[data-roadmap-item-id="${itemId}"]`);
    if (!itemEl) return;

    const container = document.getElementById('roadmapItemsContainer');
    const containerRect = container.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();

    // Get original dates from data attributes
    const originalStartDate = itemEl.dataset.startDate || null;
    const originalEndDate = itemEl.dataset.endDate || null;

    roadmapDragState = {
        type: 'resize',
        side: side, // 'left' or 'right'
        itemId: itemId,
        itemEl: itemEl,
        container: container,
        containerRect: containerRect,
        itemRect: itemRect,
        startX: event.clientX,
        originalColStart: parseInt(itemEl.dataset.colStart),
        originalColEnd: parseInt(itemEl.dataset.colEnd),
        originalStartDate: originalStartDate,
        originalEndDate: originalEndDate,
        quarterWidth: getQuarterColumnWidth(),
        // Track precise dates during resize
        newStartDate: originalStartDate ? new Date(originalStartDate) : null,
        newEndDate: originalEndDate ? new Date(originalEndDate) : null
    };

    // Add visual feedback
    itemEl.style.opacity = '0.9';
    itemEl.style.zIndex = '100';

    // Show quarter drop zones
    showQuarterDropZones();

    // Add mouse move and up handlers
    document.addEventListener('mousemove', handleRoadmapDrag);
    document.addEventListener('mouseup', endRoadmapDrag);
}

// Handle mouse move during drag/resize
function handleRoadmapDrag(event) {
    if (!roadmapDragState) return;

    const { type, side, itemEl, containerRect, startX, startY, originalColStart, originalColEnd, quarterWidth } = roadmapDragState;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // For move operations, determine drag mode based on movement direction
    if (type === 'move') {
        // Mark as moved if we've moved more than a threshold (for click-to-edit detection)
        if (absDeltaX > 5 || absDeltaY > 5) {
            roadmapDragState.hasMoved = true;

            // Apply visual feedback once drag starts
            if (!itemEl.classList.contains('dragging')) {
                itemEl.classList.add('dragging');
                showQuarterDropZones();
            }
        }

        // Determine drag mode if not yet set and we've moved enough
        if (!roadmapDragState.dragMode && roadmapDragState.hasMoved) {
            const movementThreshold = 10;
            if (absDeltaX > movementThreshold || absDeltaY > movementThreshold) {
                // Vertical movement is primary → reorder mode
                if (absDeltaY > absDeltaX * 1.5) {
                    roadmapDragState.dragMode = 'vertical';
                }
                // Large horizontal movement → cross-quarter move
                else if (absDeltaX > quarterWidth * 0.3) {
                    roadmapDragState.dragMode = 'horizontal';
                }
                // Small horizontal within quarter → sub-quarter timing
                else if (absDeltaX > movementThreshold) {
                    roadmapDragState.dragMode = 'sub-quarter';
                }
            }
        }

        // Handle based on drag mode
        if (roadmapDragState.dragMode === 'vertical') {
            handleVerticalReorder(event);
            return;
        } else if (roadmapDragState.dragMode === 'sub-quarter') {
            handleSubQuarterDrag(event);
            return;
        } else if (roadmapDragState.dragMode === 'horizontal' || (roadmapDragState.hasMoved && !roadmapDragState.dragMode)) {
            // Default horizontal movement (cross-quarter)
            handleHorizontalDrag(event);
            return;
        }
        return;
    }

    // Handle resize operations with sub-quarter precision
    if (type === 'resize') {
        handlePreciseResize(event);
    }
}

// Handle precise resize with sub-quarter granularity
function handlePreciseResize(event) {
    const {
        side, itemEl, containerRect, startX, itemRect,
        originalColStart, originalColEnd, quarterWidth,
        originalStartDate, originalEndDate
    } = roadmapDragState;

    const deltaX = event.clientX - startX;

    // Calculate the new date based on pixel position
    let newDate;
    if (side === 'left') {
        // Resizing from left - calculate new start date
        const newPixelX = itemRect.left + deltaX;
        newDate = calculateDateFromPixelPosition(newPixelX, containerRect, roadmapQuarters);

        // Ensure start date doesn't go past end date (minimum 1 week gap)
        const endDate = originalEndDate ? new Date(originalEndDate) : null;
        if (endDate) {
            const minEndDate = new Date(endDate);
            minEndDate.setDate(minEndDate.getDate() - 7);
            if (newDate > minEndDate) {
                newDate = minEndDate;
            }
        }

        // Ensure start date doesn't go before first visible quarter
        const firstQuarter = roadmapQuarters[0];
        const firstQuarterDate = getDateFromQuarter(firstQuarter);
        if (newDate < firstQuarterDate) {
            newDate = firstQuarterDate;
        }

        roadmapDragState.newStartDate = newDate;

        // Calculate new column start based on which quarter the date falls in
        const newColStart = getQuarterIndex(newDate.toISOString().split('T')[0], roadmapQuarters) + 2;
        roadmapDragState.newColStart = Math.max(2, newColStart);
        roadmapDragState.newColEnd = originalColEnd;

    } else {
        // Resizing from right - calculate new end date
        const newPixelX = itemRect.right + deltaX;
        newDate = calculateDateFromPixelPosition(newPixelX, containerRect, roadmapQuarters);

        // Ensure end date doesn't go before start date (minimum 1 week gap)
        const startDate = originalStartDate ? new Date(originalStartDate) : null;
        if (startDate) {
            const minStartDate = new Date(startDate);
            minStartDate.setDate(minStartDate.getDate() + 7);
            if (newDate < minStartDate) {
                newDate = minStartDate;
            }
        }

        // Ensure end date doesn't go past last visible quarter
        const lastQuarter = roadmapQuarters[roadmapQuarters.length - 1];
        const lastQuarterEndDate = getEndDateFromQuarter(lastQuarter);
        if (newDate > lastQuarterEndDate) {
            newDate = lastQuarterEndDate;
        }

        roadmapDragState.newEndDate = newDate;

        // Calculate new column end based on which quarter the date falls in
        const newColEnd = getQuarterIndex(newDate.toISOString().split('T')[0], roadmapQuarters) + 3;
        roadmapDragState.newColStart = originalColStart;
        roadmapDragState.newColEnd = Math.min(roadmapQuarters.length + 2, Math.max(originalColStart + 1, newColEnd));
    }

    // Update visual position (grid columns)
    const { newColStart, newColEnd } = roadmapDragState;
    itemEl.style.gridColumn = `${newColStart} / ${newColEnd}`;

    // Update visual width/margin for precise positioning
    const startDate = roadmapDragState.newStartDate || (originalStartDate ? new Date(originalStartDate) : null);
    const endDate = roadmapDragState.newEndDate || (originalEndDate ? new Date(originalEndDate) : null);

    if (startDate && endDate) {
        const startQuarter = roadmapQuarters[newColStart - 2] || roadmapQuarters[0];
        const endQuarter = roadmapQuarters[newColEnd - 3] || roadmapQuarters[roadmapQuarters.length - 1];
        const preciseStyles = getPreciseDatePositioning(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            startQuarter,
            endQuarter,
            roadmapQuarters
        );

        // Apply precise positioning
        if (preciseStyles) {
            const marginMatch = preciseStyles.match(/margin-left:\s*([\d.]+)%/);
            const widthMatch = preciseStyles.match(/width:\s*calc\(100%\s*-\s*([\d.]+)%\)/);

            if (marginMatch) {
                itemEl.style.marginLeft = marginMatch[1] + '%';
            } else {
                itemEl.style.marginLeft = '';
            }

            if (widthMatch) {
                itemEl.style.width = `calc(100% - ${widthMatch[1]}%)`;
            } else {
                itemEl.style.width = '';
            }
        }
    }

    // Highlight target quarters
    highlightTargetQuarters(newColStart - 2, newColEnd - 2);

    // Show date preview in a tooltip or status area
    showResizeDatePreview(roadmapDragState.newStartDate, roadmapDragState.newEndDate, originalStartDate, originalEndDate);
}

// Show date preview during resize
function showResizeDatePreview(newStartDate, newEndDate, originalStartDate, originalEndDate) {
    // Create or update preview element
    let preview = document.getElementById('resizeDatePreview');
    if (!preview) {
        preview = document.createElement('div');
        preview.id = 'resizeDatePreview';
        preview.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #161616;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 13px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(preview);
    }

    const startStr = newStartDate ? formatDate(newStartDate.toISOString().split('T')[0]) :
                     (originalStartDate ? formatDate(originalStartDate) : '-');
    const endStr = newEndDate ? formatDate(newEndDate.toISOString().split('T')[0]) :
                   (originalEndDate ? formatDate(originalEndDate) : '-');

    preview.textContent = `${startStr} - ${endStr}`;
    preview.style.display = 'block';
}

// Hide resize date preview
function hideResizeDatePreview() {
    const preview = document.getElementById('resizeDatePreview');
    if (preview) {
        preview.style.display = 'none';
    }
}

// Handle horizontal drag (cross-quarter movement)
function handleHorizontalDrag(event) {
    const { itemEl, startX, originalColStart, originalColEnd, quarterWidth } = roadmapDragState;

    const deltaX = event.clientX - startX;
    const quartersDelta = Math.round(deltaX / quarterWidth);

    let newColStart = originalColStart + quartersDelta;
    let newColEnd = originalColEnd + quartersDelta;

    // Constrain to valid range (col 2 is first quarter, considering category column)
    const minCol = 2;
    const maxCol = roadmapQuarters.length + 2;

    if (newColStart < minCol) {
        newColStart = minCol;
        newColEnd = originalColEnd - originalColStart + minCol;
    }
    if (newColEnd > maxCol) {
        newColEnd = maxCol;
        newColStart = newColEnd - (originalColEnd - originalColStart);
    }

    // Update visual position
    itemEl.style.gridColumn = `${newColStart} / ${newColEnd}`;

    // Update stored values for final save
    roadmapDragState.newColStart = newColStart;
    roadmapDragState.newColEnd = newColEnd;

    // Highlight target quarters
    highlightTargetQuarters(newColStart - 2, newColEnd - 2);
}

// Handle vertical drag (reordering within category)
function handleVerticalReorder(event) {
    const { itemEl, categoryRow, categoryItems, originalDisplayOrder, startY } = roadmapDragState;

    if (!categoryRow || categoryItems.length <= 1) return;

    const deltaY = event.clientY - startY;

    // Find where the item should be inserted based on Y position
    let targetIndex = originalDisplayOrder;
    const itemHeight = itemEl.offsetHeight + 16; // item height + gap

    // Calculate new index based on movement
    const indexDelta = Math.round(deltaY / itemHeight);
    targetIndex = Math.max(0, Math.min(categoryItems.length - 1, originalDisplayOrder + indexDelta));

    // Show insertion indicator
    showInsertionIndicator(categoryRow, categoryItems, targetIndex, originalDisplayOrder);

    roadmapDragState.newDisplayOrder = targetIndex;
}

// Handle sub-quarter positioning drag
function handleSubQuarterDrag(event) {
    const { itemEl, startX, quarterWidth, originalSubQuarter } = roadmapDragState;

    const deltaX = event.clientX - startX;

    // Calculate sub-quarter position based on movement
    // Each sub-quarter is ~1/3 of a quarter
    const subQuarterWidth = quarterWidth / 3;
    const subQuarterDelta = Math.round(deltaX / subQuarterWidth);

    // Convert current sub-quarter to index
    const subQuarterOrder = ['early', 'mid', 'late'];
    const currentIdx = subQuarterOrder.indexOf(originalSubQuarter);
    const newIdx = Math.max(0, Math.min(2, currentIdx + subQuarterDelta));
    const newSubQuarter = subQuarterOrder[newIdx];

    // Update visual preview
    const margin = getSubQuarterMargin(newSubQuarter);
    if (margin) {
        itemEl.style.marginLeft = newSubQuarter === 'mid' ? '8%' : '16%';
        itemEl.style.width = newSubQuarter === 'mid' ? 'calc(100% - 8%)' : 'calc(100% - 16%)';
    } else {
        itemEl.style.marginLeft = '';
        itemEl.style.width = '';
    }

    // Show sub-quarter zone indicator
    showSubQuarterZone(itemEl, newSubQuarter);

    roadmapDragState.newSubQuarter = newSubQuarter;
}

// Show insertion indicator for vertical reordering
function showInsertionIndicator(categoryRow, items, targetIndex, currentIndex) {
    // Remove existing indicator
    hideInsertionIndicator();

    if (targetIndex === currentIndex) return;

    const indicator = document.createElement('div');
    indicator.className = 'roadmap-insertion-indicator';
    indicator.id = 'roadmapInsertionIndicator';

    // Position indicator
    let topPosition;
    if (targetIndex <= currentIndex) {
        // Moving up - show indicator above the target
        const targetItem = items[targetIndex];
        if (targetItem) {
            const itemRect = targetItem.getBoundingClientRect();
            const rowRect = categoryRow.getBoundingClientRect();
            topPosition = itemRect.top - rowRect.top - 8;
        }
    } else {
        // Moving down - show indicator below the target
        const targetItem = items[targetIndex];
        if (targetItem) {
            const itemRect = targetItem.getBoundingClientRect();
            const rowRect = categoryRow.getBoundingClientRect();
            topPosition = itemRect.bottom - rowRect.top + 4;
        }
    }

    if (topPosition !== undefined) {
        indicator.style.top = `${topPosition}px`;
        categoryRow.style.position = 'relative';
        categoryRow.appendChild(indicator);
    }
}

// Hide insertion indicator
function hideInsertionIndicator() {
    const indicator = document.getElementById('roadmapInsertionIndicator');
    if (indicator) indicator.remove();
}

// Show sub-quarter zone indicator
function showSubQuarterZone(itemEl, subQuarter) {
    // For now, just update the data attribute - CSS handles visual feedback
    itemEl.dataset.subQuarter = subQuarter;
}

// End drag/resize operation
async function endRoadmapDrag(event) {
    if (!roadmapDragState) return;

    const {
        type, itemId, itemEl,
        originalColStart, originalColEnd, newColStart, newColEnd,
        dragMode, hasMoved, originalDisplayOrder, newDisplayOrder,
        originalSubQuarter, newSubQuarter,
        originalStartDate, originalEndDate,
        newStartDate: preciseStartDate, newEndDate: preciseEndDate
    } = roadmapDragState;

    // Remove event listeners
    document.removeEventListener('mousemove', handleRoadmapDrag);
    document.removeEventListener('mouseup', endRoadmapDrag);

    // Reset visual feedback
    itemEl.classList.remove('dragging');
    itemEl.style.opacity = '1';
    itemEl.style.cursor = 'grab';
    itemEl.style.zIndex = '';
    itemEl.style.boxShadow = '';
    itemEl.style.marginLeft = '';
    itemEl.style.width = '';

    // Hide drop zones and indicators
    hideQuarterDropZones();
    hideInsertionIndicator();
    hideResizeDatePreview();

    // Click-to-edit: If no significant movement, open edit modal
    if (type === 'move' && !hasMoved) {
        roadmapDragState = null;
        editRoadmapItem(itemId);
        return;
    }

    // Handle based on drag mode
    if (type === 'move') {
        if (dragMode === 'vertical') {
            // Vertical reorder - update display_order
            if (newDisplayOrder !== null && newDisplayOrder !== originalDisplayOrder) {
                await saveVerticalReorder(itemId, itemEl, newDisplayOrder);
            }
            roadmapDragState = null;
            return;
        }

        if (dragMode === 'sub-quarter') {
            // Sub-quarter positioning - update planned_start_date
            if (newSubQuarter !== null && newSubQuarter !== originalSubQuarter) {
                await saveSubQuarterPosition(itemId, itemEl, newSubQuarter);
            } else {
                // Revert visual if no change
                itemEl.style.marginLeft = '';
                itemEl.style.width = '';
            }
            roadmapDragState = null;
            return;
        }

        // Horizontal move (default) - check if position changed
        if (newColStart === originalColStart && newColEnd === originalColEnd) {
            roadmapDragState = null;
            return;
        }
    }

    // Handle resize with precise dates
    if (type === 'resize') {
        const { side } = roadmapDragState;

        // For resize, we need to preserve the unchanged date
        // Left resize: change start, keep original end
        // Right resize: keep original start, change end
        let finalStartDate, finalEndDate;

        if (side === 'left') {
            // Left resize: use new start date, keep ORIGINAL end date (not the initialized Date object)
            finalStartDate = preciseStartDate || (originalStartDate ? new Date(originalStartDate) : null);
            finalEndDate = originalEndDate ? new Date(originalEndDate) : null;
        } else {
            // Right resize: keep ORIGINAL start date, use new end date
            finalStartDate = originalStartDate ? new Date(originalStartDate) : null;
            finalEndDate = preciseEndDate || (originalEndDate ? new Date(originalEndDate) : null);
        }

        // Check if the relevant date actually changed
        const startChanged = side === 'left' && preciseStartDate && originalStartDate &&
            preciseStartDate.toISOString().split('T')[0] !== originalStartDate;
        const endChanged = side === 'right' && preciseEndDate && originalEndDate &&
            preciseEndDate.toISOString().split('T')[0] !== originalEndDate;

        if (!startChanged && !endChanged) {
            roadmapDragState = null;
            return;
        }

        // Calculate target quarter from start date
        const startQuarterIdx = getQuarterIndex(
            finalStartDate.toISOString().split('T')[0],
            roadmapQuarters
        );
        const startQuarter = roadmapQuarters[Math.max(0, startQuarterIdx)] || roadmapQuarters[0];

        // Get item title and original state for undo
        const currentItem = currentRoadmap?.items?.find(i => i.id === itemId);
        const itemTitle = itemEl.querySelector('.roadmap-item-content div')?.textContent || 'Item';

        // Update the item via API with precise dates
        try {
            const response = await fetch(`${API_BASE_URL}/roadmaps/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_quarter: startQuarter,
                    target_year: finalStartDate.getFullYear(),
                    planned_start_date: finalStartDate.toISOString().split('T')[0],
                    planned_end_date: finalEndDate.toISOString().split('T')[0]
                })
            });

            if (!response.ok) throw new Error('Failed to update item');

            // Push to undo stack
            pushToUndoStack({
                type: 'resize',
                itemId: itemId,
                description: `Resize "${itemTitle}"`,
                previousState: {
                    target_quarter: currentItem?.target_quarter,
                    target_year: currentItem?.target_year,
                    planned_start_date: originalStartDate,
                    planned_end_date: originalEndDate
                }
            });

            // Reload roadmap to get updated data
            await loadRoadmap(getCustomerId());

            const startStr = formatDate(finalStartDate.toISOString().split('T')[0]);
            const endStr = formatDate(finalEndDate.toISOString().split('T')[0]);
            showToast(`Updated to ${startStr} - ${endStr}`, 'success');

        } catch (error) {
            console.error('Failed to update roadmap item:', error);
            showToast('Failed to update item. Please try again.', 'error');
        }

        roadmapDragState = null;
        return;
    }

    // Handle horizontal move - update dates (preserve duration)
    if (type === 'move' && (dragMode === 'horizontal' || !dragMode)) {
        // Check if position actually changed
        if ((newColStart === undefined || newColStart === originalColStart) &&
            (newColEnd === undefined || newColEnd === originalColEnd)) {
            roadmapDragState = null;
            return;
        }

        // Get item title and original state for undo
        const currentItem = currentRoadmap?.items?.find(i => i.id === itemId);
        const itemTitle = itemEl.querySelector('.roadmap-item-content div')?.textContent || 'Item';

        // Calculate original duration to preserve it
        const origStart = new Date(originalStartDate);
        const origEnd = new Date(originalEndDate);
        const durationMs = origEnd.getTime() - origStart.getTime();

        // Calculate quarters moved
        const oldStartQuarterIdx = originalColStart - 2;
        const newStartQuarterIdx = (newColStart || originalColStart) - 2;
        const quartersDelta = newStartQuarterIdx - oldStartQuarterIdx;

        // Shift the start date by the quarter delta (3 months per quarter)
        const newStartDate = new Date(origStart);
        newStartDate.setMonth(newStartDate.getMonth() + (quartersDelta * 3));

        // End date = start date + original duration (preserves exact duration)
        const newEndDate = new Date(newStartDate.getTime() + durationMs);

        // Get the target quarter string for the new start date
        const startQuarter = getQuarterFromDate(newStartDate);

        // Update the item via API
        try {
            const response = await fetch(`${API_BASE_URL}/roadmaps/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_quarter: startQuarter,
                    target_year: newStartDate.getFullYear(),
                    planned_start_date: newStartDate.toISOString().split('T')[0],
                    planned_end_date: newEndDate.toISOString().split('T')[0]
                })
            });

            if (!response.ok) throw new Error('Failed to update item');

            // Push to undo stack
            pushToUndoStack({
                type: 'move',
                itemId: itemId,
                description: `Move "${itemTitle}"`,
                previousState: {
                    target_quarter: currentItem?.target_quarter,
                    target_year: currentItem?.target_year,
                    planned_start_date: originalStartDate,
                    planned_end_date: originalEndDate
                }
            });

            // Reload roadmap to get updated data
            await loadRoadmap(getCustomerId());

            showToast(`Updated "${itemTitle}" schedule`, 'success');

        } catch (error) {
            console.error('Failed to update roadmap item:', error);
            showToast('Failed to update item. Please try again.', 'error');

            // Revert visual position
            itemEl.style.gridColumn = `${originalColStart} / ${originalColEnd}`;
        }
    }

    roadmapDragState = null;
}

// Save vertical reorder (display_order change)
async function saveVerticalReorder(itemId, itemEl, newDisplayOrder) {
    // Get current item for undo
    const currentItem = currentRoadmap?.items?.find(i => i.id === itemId);
    const originalDisplayOrder = currentItem?.display_order;
    const itemTitle = itemEl.querySelector('.roadmap-item-content div')?.textContent || 'Item';

    try {
        const response = await fetch(`${API_BASE_URL}/roadmaps/items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                display_order: newDisplayOrder
            })
        });

        if (!response.ok) throw new Error('Failed to update item order');

        // Push to undo stack before reloading
        pushToUndoStack({
            type: 'reorder',
            itemId: itemId,
            description: `Reorder "${itemTitle}"`,
            previousState: { display_order: originalDisplayOrder }
        });

        // Reload roadmap to get updated data
        await loadRoadmap(getCustomerId());

        showToast(`Reordered "${itemTitle}"`, 'success');

    } catch (error) {
        console.error('Failed to update roadmap item order:', error);
        showToast('Failed to reorder item. Please try again.', 'error');
    }
}

// Save sub-quarter position (shifts both start and end dates to preserve duration)
async function saveSubQuarterPosition(itemId, itemEl, newSubQuarter) {
    // Get current item for undo
    const currentItem = currentRoadmap?.items?.find(i => i.id === itemId);
    const originalStartDate = currentItem?.planned_start_date;
    const originalEndDate = currentItem?.planned_end_date;
    const itemTitle = itemEl.querySelector('.roadmap-item-content div')?.textContent || 'Item';

    try {
        // Get the current item's start quarter to calculate new date
        const startQuarterIdx = parseInt(itemEl.dataset.colStart) - 2;
        const startQuarter = roadmapQuarters[Math.max(0, startQuarterIdx)];

        // Calculate new start date based on sub-quarter position
        const newStartDate = calculateDateForSubQuarter(startQuarter, newSubQuarter);

        // Calculate how much the start date shifted
        const origStart = new Date(originalStartDate);
        const shiftMs = newStartDate.getTime() - origStart.getTime();

        // Shift end date by the same amount to preserve duration
        const origEnd = new Date(originalEndDate);
        const newEndDate = new Date(origEnd.getTime() + shiftMs);

        const response = await fetch(`${API_BASE_URL}/roadmaps/items/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planned_start_date: newStartDate.toISOString().split('T')[0],
                planned_end_date: newEndDate.toISOString().split('T')[0]
            })
        });

        if (!response.ok) throw new Error('Failed to update item timing');

        // Push to undo stack
        const positionLabel = newSubQuarter === 'early' ? 'Early' : newSubQuarter === 'mid' ? 'Mid' : 'Late';
        pushToUndoStack({
            type: 'sub-quarter',
            itemId: itemId,
            description: `Move "${itemTitle}" to ${positionLabel}`,
            previousState: {
                planned_start_date: originalStartDate,
                planned_end_date: originalEndDate
            }
        });

        // Reload roadmap to get updated data
        await loadRoadmap(getCustomerId());

        showToast(`Moved "${itemTitle}" to ${positionLabel} ${startQuarter}`, 'success');

    } catch (error) {
        console.error('Failed to update roadmap item timing:', error);
        showToast('Failed to update item timing. Please try again.', 'error');

        // Revert visual position
        itemEl.style.marginLeft = '';
        itemEl.style.width = '';
    }
}

// Show visual indicators for quarter drop zones
function showQuarterDropZones() {
    const headerContainer = document.getElementById('quarterHeaders');
    if (!headerContainer) return;

    // Add highlight class to quarter headers
    const quarterDivs = headerContainer.querySelectorAll('div:not(:first-child)');
    quarterDivs.forEach((div, idx) => {
        div.dataset.quarterIdx = idx;
        div.style.transition = 'background 0.15s ease';
    });
}

// Hide quarter drop zones
function hideQuarterDropZones() {
    const headerContainer = document.getElementById('quarterHeaders');
    if (!headerContainer) return;

    const quarterDivs = headerContainer.querySelectorAll('div:not(:first-child)');
    quarterDivs.forEach(div => {
        div.style.background = 'var(--cds-layer-02)';
    });
}

// Highlight target quarters during drag
function highlightTargetQuarters(startIdx, endIdx) {
    const headerContainer = document.getElementById('quarterHeaders');
    if (!headerContainer) return;

    const quarterDivs = headerContainer.querySelectorAll('div:not(:first-child)');
    quarterDivs.forEach((div, idx) => {
        if (idx >= startIdx && idx < endIdx) {
            div.style.background = 'rgba(138, 63, 252, 0.2)';
        } else {
            div.style.background = 'var(--cds-layer-02)';
        }
    });
}

// Calculate end date from duration
function updateEndDateFromDuration() {
    const startDateStr = document.getElementById('roadmapItemStartDate').value;
    const duration = document.getElementById('roadmapItemDuration').value;

    if (startDateStr && duration) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + parseInt(duration));
        endDate.setDate(endDate.getDate() - 1); // End on last day of period
        document.getElementById('roadmapItemEndDate').value = endDate.toISOString().split('T')[0];
    }
}

// Get quarter string from date
function getQuarterFromDate(date) {
    const d = new Date(date);
    const quarter = Math.floor(d.getMonth() / 3) + 1;
    return `Q${quarter} ${d.getFullYear()}`;
}

// Populate dependency checkboxes in the roadmap item modal
function populateDependencyCheckboxes(excludeItemId = null, selectedIds = []) {
    const container = document.getElementById('roadmapItemDependencies');
    if (!container || !currentRoadmap || !currentRoadmap.items) {
        container.innerHTML = '<div style="color: var(--cds-text-secondary); font-size: 13px;">No other roadmap items available</div>';
        return;
    }

    // Filter out the current item being edited
    const availableItems = currentRoadmap.items.filter(item => item.id !== excludeItemId);

    if (availableItems.length === 0) {
        container.innerHTML = '<div style="color: var(--cds-text-secondary); font-size: 13px;">No other roadmap items available</div>';
        return;
    }

    container.innerHTML = availableItems.map(item => {
        const isChecked = selectedIds.includes(item.id) ? 'checked' : '';
        const statusBadge = getRoadmapStatusLabel(item.status);
        return `
            <label style="display: flex; align-items: center; gap: 8px; padding: 6px 4px; cursor: pointer; border-radius: 4px;"
                   onmouseover="this.style.background='var(--cds-layer-hover-01)'"
                   onmouseout="this.style.background='transparent'">
                <input type="checkbox" name="roadmapItemDeps" value="${item.id}" ${isChecked} style="margin: 0;">
                <span style="flex: 1; font-size: 13px;">${escapeHtml(item.title)}</span>
                <span style="font-size: 11px; color: var(--cds-text-secondary);">${statusBadge}</span>
            </label>
        `;
    }).join('');
}

// Open roadmap item modal for creating
function openRoadmapItemModal() {
    if (!currentRoadmap) {
        alert('Please create a roadmap first');
        return;
    }

    document.getElementById('roadmapItemModalTitle').textContent = 'Add Roadmap Item';
    document.getElementById('roadmapItemSubmitBtn').textContent = 'Add Item';
    document.getElementById('roadmapItemId').value = '';
    document.getElementById('roadmapItemForm').reset();
    document.getElementById('roadmapItemStatus').value = 'planned';
    document.getElementById('roadmapItemProgress').value = '0';

    // Set default dates (start of next month, 3 months duration)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);
    endDate.setDate(endDate.getDate() - 1);

    document.getElementById('roadmapItemStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('roadmapItemEndDate').value = endDate.toISOString().split('T')[0];
    document.getElementById('roadmapItemDuration').value = '3';

    // Populate dependency checkboxes (no item excluded, none selected)
    populateDependencyCheckboxes(null, []);

    // Hide delete button for new items
    document.getElementById('roadmapItemDeleteBtn').style.display = 'none';

    document.getElementById('roadmapItemModal').classList.add('open');
}

// Close roadmap item modal
function closeRoadmapItemModal() {
    document.getElementById('roadmapItemModal').classList.remove('open');
}

// Update quarter dropdown options based on roadmap dates
function updateQuarterOptions() {
    const select = document.getElementById('roadmapItemQuarter');
    select.innerHTML = roadmapQuarters.map(q => `<option value="${q}">${q}</option>`).join('');
}

// Edit existing roadmap item
function editRoadmapItem(itemId) {
    const item = currentRoadmap.items.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('roadmapItemModalTitle').textContent = 'Edit Roadmap Item';
    document.getElementById('roadmapItemSubmitBtn').textContent = 'Update Item';
    document.getElementById('roadmapItemId').value = itemId;

    document.getElementById('roadmapItemTitle').value = item.title;
    document.getElementById('roadmapItemDescription').value = item.description || '';
    document.getElementById('roadmapItemCategory').value = item.category;
    document.getElementById('roadmapItemStatus').value = item.status;
    document.getElementById('roadmapItemProgress').value = item.progress_percent || 0;
    document.getElementById('roadmapItemNotes').value = item.notes || '';

    // Set dates
    if (item.planned_start_date) {
        document.getElementById('roadmapItemStartDate').value = item.planned_start_date;
    }
    if (item.planned_end_date) {
        document.getElementById('roadmapItemEndDate').value = item.planned_end_date;
    }
    document.getElementById('roadmapItemDuration').value = ''; // Custom

    // Populate dependency checkboxes (exclude current item, select existing dependencies)
    const existingDeps = item.depends_on_ids || [];
    populateDependencyCheckboxes(itemId, existingDeps);

    // Show delete button for existing items
    document.getElementById('roadmapItemDeleteBtn').style.display = 'block';

    document.getElementById('roadmapItemModal').classList.add('open');
}

// Handle roadmap item form submit
async function handleRoadmapItemSubmit(event) {
    event.preventDefault();

    const itemId = document.getElementById('roadmapItemId').value;
    const isEdit = !!itemId;

    const startDate = document.getElementById('roadmapItemStartDate').value;
    const endDate = document.getElementById('roadmapItemEndDate').value;

    // Calculate target quarter from start date
    const quarter = getQuarterFromDate(startDate);
    const targetYear = new Date(startDate).getFullYear();

    // Collect selected dependencies
    const selectedDeps = Array.from(document.querySelectorAll('input[name="roadmapItemDeps"]:checked'))
        .map(cb => parseInt(cb.value));

    // Track existing dependencies for smart routing (only for existing items)
    const existingItem = isEdit ? currentRoadmap?.items?.find(i => i.id === parseInt(itemId)) : null;
    const oldDeps = existingItem?.depends_on_ids || [];

    const data = {
        title: document.getElementById('roadmapItemTitle').value,
        description: document.getElementById('roadmapItemDescription').value || null,
        category: document.getElementById('roadmapItemCategory').value,
        status: document.getElementById('roadmapItemStatus').value,
        target_quarter: quarter,
        target_year: targetYear,
        planned_start_date: startDate,
        planned_end_date: endDate,
        progress_percent: parseInt(document.getElementById('roadmapItemProgress').value) || 0,
        notes: document.getElementById('roadmapItemNotes').value || null,
        depends_on_ids: selectedDeps
    };

    try {
        let response;
        let savedItemId = itemId;
        if (isEdit) {
            response = await fetch(`${API_BASE_URL}/roadmaps/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(`${API_BASE_URL}/roadmaps/${currentRoadmap.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            // Get the new item ID from response for smart routing
            if (response.ok) {
                const newItem = await response.json();
                savedItemId = newItem.id;
            }
        }

        if (!response.ok) throw new Error('Failed to save roadmap item');

        closeRoadmapItemModal();

        // Reload roadmap to refresh display
        const customerId = getCustomerId();
        await loadRoadmap(customerId);

        // Apply smart routing for any new dependencies
        if (selectedDeps.length > 0) {
            applySmartRoutingForNewDependencies(savedItemId, oldDeps, selectedDeps);
        }

    } catch (error) {
        console.error('Failed to save roadmap item:', error);
        alert('Failed to save roadmap item. Please try again.');
    }
}

// Delete roadmap item
async function deleteRoadmapItem(itemId) {
    if (!confirm('Are you sure you want to delete this roadmap item?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/roadmaps/items/${itemId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Failed to delete roadmap item');

        closeRoadmapItemModal();

        // Reload roadmap to refresh display
        const customerId = getCustomerId();
        await loadRoadmap(customerId);

    } catch (error) {
        console.error('Failed to delete roadmap item:', error);
        alert('Failed to delete roadmap item. Please try again.');
    }
}

// Open create roadmap modal
function openCreateRoadmapModal() {
    // Set default dates (current quarter start to 2 years out)
    const today = new Date();
    const startDate = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    const endDate = new Date(today.getFullYear() + 2, Math.floor(today.getMonth() / 3) * 3, 0);

    document.getElementById('roadmapStartDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('roadmapEndDate').value = endDate.toISOString().split('T')[0];
    document.getElementById('roadmapName').value = 'Product Roadmap';
    document.getElementById('roadmapDescription').value = '';

    document.getElementById('createRoadmapModal').classList.add('open');
}

// Close create roadmap modal
function closeCreateRoadmapModal() {
    document.getElementById('createRoadmapModal').classList.remove('open');
}

// Handle create roadmap form submit
async function handleCreateRoadmap(event) {
    event.preventDefault();

    const customerId = getCustomerId();

    const data = {
        customer_id: parseInt(customerId),
        name: document.getElementById('roadmapName').value || 'Product Roadmap',
        description: document.getElementById('roadmapDescription').value || null,
        start_date: document.getElementById('roadmapStartDate').value,
        end_date: document.getElementById('roadmapEndDate').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/roadmaps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to create roadmap');

        closeCreateRoadmapModal();
        await loadRoadmap(customerId);

    } catch (error) {
        console.error('Failed to create roadmap:', error);
        alert('Failed to create roadmap. Please try again.');
    }
}

// ==========================================
// Push to TargetProcess Functions
// ==========================================

function openPushToTPModal() {
    const modal = document.getElementById('pushToTPModal');
    modal.classList.add('open');

    // Reset status
    const statusEl = document.getElementById('tpPushStatus');
    statusEl.style.display = 'none';
    statusEl.textContent = '';

    // Enable the push button
    const pushBtn = document.getElementById('tpPushBtn');
    pushBtn.disabled = false;
    pushBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 32 32" style="margin-right: 8px;"><path d="M12 10H6v2h6v6h2v-6h6v-2h-6V4h-2v6z"/><path d="M28 18v8H4V6h10V4H4a2 2 0 00-2 2v20a2 2 0 002 2h24a2 2 0 002-2v-8z"/></svg>
        Push to TargetProcess
    `;

    // Populate the items list
    populatePushItemsList();
}

function closePushToTPModal() {
    const modal = document.getElementById('pushToTPModal');
    modal.classList.remove('open');
}

function populatePushItemsList() {
    const container = document.getElementById('tpPushItemsList');

    if (!currentRoadmap || !currentRoadmap.items || currentRoadmap.items.length === 0) {
        container.innerHTML = `
            <div style="padding: 24px; text-align: center; color: var(--cds-text-secondary);">
                No roadmap items to push.
            </div>
        `;
        return;
    }

    const itemsHtml = currentRoadmap.items.map(item => {
        const statusColors = {
            'planned': '#0043ce',
            'in_progress': '#f1c21b',
            'completed': '#24a148',
            'delayed': '#ff832b',
            'cancelled': '#697077'
        };
        const statusColor = statusColors[item.status] || '#697077';

        const dateRange = item.planned_start_date && item.planned_end_date
            ? `${formatDate(item.planned_start_date)} - ${formatDate(item.planned_end_date)}`
            : item.target_quarter || 'No date';

        return `
            <div style="display: flex; align-items: center; padding: 12px; border: 1px solid var(--cds-border-subtle-01); border-radius: 4px; margin-bottom: 8px;">
                <input type="checkbox" class="tp-push-item-checkbox" data-item-id="${item.id}" checked style="margin-right: 12px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${item.title}</div>
                    <div style="font-size: 12px; color: var(--cds-text-secondary);">
                        ${item.category || 'Feature'} • ${dateRange}
                    </div>
                </div>
                <span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; background: ${statusColor}20; color: ${statusColor}; text-transform: capitalize;">
                    ${item.status.replace('_', ' ')}
                </span>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 12px; color: var(--cds-text-secondary);">${currentRoadmap.items.length} items</span>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12px;">
                <input type="checkbox" id="tpSelectAll" checked onchange="toggleAllPushItems(this.checked)">
                <span>Select all</span>
            </label>
        </div>
        ${itemsHtml}
    `;
}

function toggleAllPushItems(checked) {
    const checkboxes = document.querySelectorAll('.tp-push-item-checkbox');
    checkboxes.forEach(cb => cb.checked = checked);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

async function handlePushToTP() {
    const projectSelect = document.getElementById('tpProjectSelect');
    const statusEl = document.getElementById('tpPushStatus');
    const pushBtn = document.getElementById('tpPushBtn');

    // Validate project selection
    if (!projectSelect.value) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#fff1f1';
        statusEl.style.color = '#da1e28';
        statusEl.textContent = 'Please select a target project.';
        return;
    }

    // Get selected items
    const selectedItems = [];
    document.querySelectorAll('.tp-push-item-checkbox:checked').forEach(cb => {
        selectedItems.push(cb.dataset.itemId);
    });

    if (selectedItems.length === 0) {
        statusEl.style.display = 'block';
        statusEl.style.background = '#fff1f1';
        statusEl.style.color = '#da1e28';
        statusEl.textContent = 'Please select at least one item to push.';
        return;
    }

    // Get options
    const options = {
        project: projectSelect.value,
        linkToCustomer: document.getElementById('tpLinkToCustomer').checked,
        includeDates: document.getElementById('tpIncludeDates').checked,
        skipExisting: document.getElementById('tpSkipExisting').checked,
        itemIds: selectedItems
    };

    // Show loading state
    pushBtn.disabled = true;
    pushBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 32 32" class="spin" style="margin-right: 8px; animation: spin 1s linear infinite;">
            <path d="M16 4v4a8 8 0 018 8h4a12 12 0 00-12-12z"/>
        </svg>
        Pushing...
    `;

    statusEl.style.display = 'block';
    statusEl.style.background = '#e5f6ff';
    statusEl.style.color = '#0043ce';
    statusEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 32 32" style="animation: spin 1s linear infinite;"><path d="M16 4v4a8 8 0 018 8h4a12 12 0 00-12-12z"/></svg>
            Pushing ${selectedItems.length} items to TargetProcess...
        </div>
    `;

    // Simulate API call delay (since backend not implemented yet)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show success (simulated)
    statusEl.style.background = '#defbe6';
    statusEl.style.color = '#24a148';
    statusEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M14 21.414l-5-5L10.414 15 14 18.586 21.586 11 23 12.414l-9 9z"/><path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 26a12 12 0 1112-12 12 12 0 01-12 12z"/></svg>
            Successfully pushed ${selectedItems.length} items to TargetProcess!
        </div>
        <div style="margin-top: 8px; font-size: 12px;">
            Items have been created in the "${projectSelect.options[projectSelect.selectedIndex].text}" project.
            <br><em style="opacity: 0.8;">(Note: Backend integration not yet implemented)</em>
        </div>
    `;

    pushBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 32 32" style="margin-right: 8px;"><path d="M14 21.414l-5-5L10.414 15 14 18.586 21.586 11 23 12.414l-9 9z"/><path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 26a12 12 0 1112-12 12 12 0 01-12 12z"/></svg>
        Done
    `;

    // Log what would be sent to the API
    console.log('Push to TargetProcess payload:', {
        customerId: customerId,
        roadmapId: currentRoadmap.id,
        options: options,
        items: currentRoadmap.items.filter(item => selectedItems.includes(String(item.id)))
    });
}

// ==================== RISKS MANAGEMENT ====================

let customerRisks = [];

// Load risks for the customer
async function loadRisks(customerId) {
    try {
        const data = await API.RiskAPI.getByCustomer(customerId);
        customerRisks = data.items || [];
        renderOpenRisks();
        renderRisksTab();
    } catch (error) {
        console.error('Failed to load risks:', error);
    }
}

// Render open risks in the Overview sidebar
function renderOpenRisks() {
    const container = document.getElementById('openRisksContainer');
    const countEl = document.getElementById('openRisksCount');
    if (!container) return;

    const openRisks = customerRisks.filter(r => r.status === 'open' || r.status === 'mitigating');

    if (countEl) {
        countEl.textContent = `${openRisks.length} Risk${openRisks.length !== 1 ? 's' : ''}`;
        // Color code based on severity
        const hasCritical = openRisks.some(r => r.severity === 'critical');
        const hasHigh = openRisks.some(r => r.severity === 'high');
        countEl.className = 'tag';
        if (hasCritical) countEl.classList.add('tag--red');
        else if (hasHigh) countEl.classList.add('tag--orange');
        else if (openRisks.length > 0) countEl.classList.add('tag--yellow');
    }

    if (openRisks.length === 0) {
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 16px;">No open risks</div>';
        return;
    }

    container.innerHTML = openRisks.slice(0, 5).map(risk => {
        const severityColor = {
            'critical': 'var(--cds-support-error)',
            'high': '#ff832b',
            'medium': '#f1c21b',
            'low': 'var(--cds-text-secondary)'
        }[risk.severity] || 'var(--cds-text-secondary)';

        return `
            <div style="border-left: 3px solid ${severityColor}; padding: 8px 12px; margin-bottom: 8px; background: var(--cds-layer-02); border-radius: 0 4px 4px 0; cursor: pointer;" onclick="switchToRisksTab()">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="tag tag--${risk.severity === 'critical' ? 'red' : risk.severity === 'high' ? 'orange' : risk.severity === 'medium' ? 'yellow' : 'gray'}" style="font-size: 10px; text-transform: uppercase;">${risk.severity}</span>
                    ${risk.risk_score ? `<span style="font-size: 10px; font-weight: 600; color: ${risk.risk_score >= 15 ? 'var(--cds-support-error)' : risk.risk_score >= 10 ? '#ff832b' : 'var(--cds-text-secondary)'};">[${risk.risk_score}]</span>` : ''}
                    <span style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${risk.title}</span>
                </div>
                ${risk.category ? `<div class="text-secondary" style="font-size: 11px; margin-top: 4px;">${Utils.getRiskCategoryLabel ? Utils.getRiskCategoryLabel(risk.category) : risk.category}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Switch to Risks tab
function switchToRisksTab() {
    const risksTab = Array.from(document.querySelectorAll('.tabs__tab')).find(t => t.textContent.trim() === 'Risks');
    if (risksTab) risksTab.click();
}

// Render full risks list in Risks tab
function renderRisksTab() {
    const container = document.getElementById('risksTabContainer');
    const countEl = document.getElementById('risksTabCount');
    if (!container) return;

    const openRisks = customerRisks.filter(r => r.status === 'open' || r.status === 'mitigating');

    if (countEl) {
        countEl.textContent = `${customerRisks.length} Risk${customerRisks.length !== 1 ? 's' : ''} (${openRisks.length} open)`;
    }

    if (customerRisks.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 48px 24px;">
                <svg width="48" height="48" viewBox="0 0 32 32" style="color: var(--cds-text-secondary); margin-bottom: 16px;"><path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 26a12 12 0 1112-12 12 12 0 01-12 12z"/><path d="M15 8h2v11h-2zm1 14a1.5 1.5 0 101.5 1.5A1.5 1.5 0 0016 22z"/></svg>
                <h3 style="margin-bottom: 8px; font-size: 16px;">No Risks Tracked</h3>
                <p class="text-secondary" style="margin-bottom: 16px;">Track potential risks to proactively manage this customer relationship.</p>
                <button class="btn btn--primary" onclick="openRiskModal()">Add Risk</button>
            </div>
        `;
        return;
    }

    container.innerHTML = customerRisks.map(risk => {
        const severityColor = {
            'critical': 'var(--cds-support-error)',
            'high': '#ff832b',
            'medium': '#f1c21b',
            'low': 'var(--cds-text-secondary)'
        }[risk.severity] || 'var(--cds-text-secondary)';

        const statusBadge = {
            'open': '<span class="tag tag--red">Open</span>',
            'mitigating': '<span class="tag tag--yellow">Mitigating</span>',
            'resolved': '<span class="tag tag--green">Resolved</span>',
            'accepted': '<span class="tag tag--blue">Accepted</span>'
        }[risk.status] || '';

        const isOverdue = risk.is_overdue;
        const dueDateStr = risk.due_date ? Utils.formatDate(risk.due_date) : '';

        return `
            <div class="card" style="border-left: 4px solid ${severityColor}; margin-bottom: 12px;">
                <div style="padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="tag tag--${risk.severity === 'critical' ? 'red' : risk.severity === 'high' ? 'orange' : risk.severity === 'medium' ? 'yellow' : 'gray'}" style="text-transform: uppercase; font-size: 10px;">${risk.severity}</span>
                            ${statusBadge}
                            ${risk.category ? `<span class="tag">${Utils.getRiskCategoryLabel(risk.category)}</span>` : ''}
                            ${risk.risk_score ? `<span class="tag" style="background: ${risk.risk_score >= 15 ? 'var(--cds-support-error)' : risk.risk_score >= 10 ? '#ff832b' : risk.risk_score >= 5 ? '#f1c21b' : 'var(--cds-layer-accent-01)'}; color: ${risk.risk_score >= 10 ? 'white' : 'inherit'};" title="Risk Score: P(${risk.probability_rating}) × I(${risk.impact_rating})">${risk.risk_score}</span>` : ''}
                        </div>
                        <div style="display: flex; gap: 8px;">
                            ${risk.status === 'open' || risk.status === 'mitigating' ? `<button class="btn btn--ghost btn--sm" onclick="openResolveRiskModal(${risk.id}, '${risk.title.replace(/'/g, "\\'")}')">Resolve</button>` : ''}
                            <button class="btn btn--ghost btn--sm" onclick="editRisk(${risk.id})">Edit</button>
                        </div>
                    </div>
                    <h3 style="font-size: 15px; font-weight: 600; margin-bottom: 8px;">${risk.title}</h3>
                    ${risk.description ? `<p class="text-secondary" style="font-size: 13px; margin-bottom: 12px;">${risk.description}</p>` : ''}
                    <div style="display: flex; gap: 24px; font-size: 12px; color: var(--cds-text-secondary); flex-wrap: wrap;">
                        ${risk.owner ? `<span>Owner: ${risk.owner.first_name} ${risk.owner.last_name}</span>` : '<span>Unassigned</span>'}
                        ${risk.probability_rating && risk.impact_rating ? `<span>P: ${risk.probability_rating} × I: ${risk.impact_rating}</span>` : ''}
                        ${dueDateStr ? `<span style="${isOverdue ? 'color: var(--cds-support-error); font-weight: 500;' : ''}">Due: ${dueDateStr}${isOverdue ? ' (Overdue)' : ''}</span>` : ''}
                        <span>Created: ${Utils.formatDate(risk.created_at)}</span>
                    </div>
                    ${risk.mitigation_plan ? `
                        <div style="margin-top: 12px; padding: 12px; background: var(--cds-layer-02); border-radius: 4px;">
                            <strong style="font-size: 11px; text-transform: uppercase; color: var(--cds-text-secondary);">Mitigation Plan</strong>
                            <p style="font-size: 13px; margin-top: 4px;">${risk.mitigation_plan}</p>
                        </div>
                    ` : ''}
                    ${risk.resolution_notes && (risk.status === 'resolved' || risk.status === 'accepted') ? `
                        <div style="margin-top: 12px; padding: 12px; background: var(--cds-support-success-subtle); border-radius: 4px;">
                            <strong style="font-size: 11px; text-transform: uppercase; color: var(--cds-support-success);">Resolution</strong>
                            <p style="font-size: 13px; margin-top: 4px;">${risk.resolution_notes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Open risk modal for creating
async function openRiskModal() {
    document.getElementById('riskModalTitle').textContent = 'Add Risk';
    document.getElementById('riskSubmitBtn').textContent = 'Add Risk';
    document.getElementById('riskId').value = '';
    document.getElementById('riskForm').reset();
    document.getElementById('riskSeverity').value = 'medium';
    document.getElementById('riskStatusGroup').style.display = 'none';
    document.getElementById('riskDeleteBtn').style.display = 'none';

    // Load users for owner dropdown
    await loadUsersForRiskOwner();

    document.getElementById('riskModal').classList.add('open');
}

// Close risk modal
function closeRiskModal() {
    document.getElementById('riskModal').classList.remove('open');
}

// Edit existing risk
async function editRisk(riskId) {
    const risk = customerRisks.find(r => r.id === riskId);
    if (!risk) return;

    document.getElementById('riskModalTitle').textContent = 'Edit Risk';
    document.getElementById('riskSubmitBtn').textContent = 'Save Changes';
    document.getElementById('riskId').value = riskId;

    document.getElementById('riskTitle').value = risk.title;
    document.getElementById('riskSeverity').value = risk.severity;
    document.getElementById('riskCategory').value = risk.category || '';
    document.getElementById('riskProbability').value = risk.probability_rating || '';
    document.getElementById('riskImpactRating').value = risk.impact_rating || '';
    document.getElementById('riskDescription').value = risk.description || '';
    document.getElementById('riskImpact').value = risk.impact || '';
    document.getElementById('riskMitigation').value = risk.mitigation_plan || '';
    document.getElementById('riskDueDate').value = risk.due_date ? risk.due_date.split('T')[0] : '';
    document.getElementById('riskStatus').value = risk.status;

    document.getElementById('riskStatusGroup').style.display = 'block';
    document.getElementById('riskDeleteBtn').style.display = 'block';

    // Load users for owner dropdown
    await loadUsersForRiskOwner();
    document.getElementById('riskOwner').value = risk.owner_id || '';

    document.getElementById('riskModal').classList.add('open');
}

// Load users for the owner dropdown
async function loadUsersForRiskOwner() {
    try {
        const data = await API.UserAPI.getAll();
        const select = document.getElementById('riskOwner');
        select.innerHTML = '<option value="">Unassigned</option>' +
            (data.items || []).map(u => `<option value="${u.id}">${u.first_name} ${u.last_name}</option>`).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Handle risk form submission
async function handleRiskSubmit(event) {
    event.preventDefault();

    const riskId = document.getElementById('riskId').value;
    const customerId = getCustomerId();

    const data = {
        title: document.getElementById('riskTitle').value,
        severity: document.getElementById('riskSeverity').value,
        category: document.getElementById('riskCategory').value || null,
        probability_rating: document.getElementById('riskProbability').value ? parseInt(document.getElementById('riskProbability').value) : null,
        impact_rating: document.getElementById('riskImpactRating').value ? parseInt(document.getElementById('riskImpactRating').value) : null,
        description: document.getElementById('riskDescription').value || null,
        impact: document.getElementById('riskImpact').value || null,
        mitigation_plan: document.getElementById('riskMitigation').value || null,
        owner_id: document.getElementById('riskOwner').value ? parseInt(document.getElementById('riskOwner').value) : null,
        due_date: document.getElementById('riskDueDate').value ? new Date(document.getElementById('riskDueDate').value).toISOString() : null,
    };

    if (riskId) {
        data.status = document.getElementById('riskStatus').value;
    } else {
        data.customer_id = parseInt(customerId);
    }

    try {
        if (riskId) {
            await API.RiskAPI.update(riskId, data);
        } else {
            await API.RiskAPI.create(data);
        }
        closeRiskModal();
        await loadRisks(customerId);
    } catch (error) {
        console.error('Failed to save risk:', error);
        alert('Failed to save risk. Please try again.');
    }
}

// Delete risk
async function deleteRisk() {
    const riskId = document.getElementById('riskId').value;
    if (!riskId) return;

    if (!confirm('Are you sure you want to delete this risk?')) return;

    try {
        await API.RiskAPI.delete(riskId);
        closeRiskModal();
        await loadRisks(getCustomerId());
    } catch (error) {
        console.error('Failed to delete risk:', error);
        alert('Failed to delete risk. Please try again.');
    }
}

// Open resolve risk modal
function openResolveRiskModal(riskId, title) {
    document.getElementById('resolveRiskId').value = riskId;
    document.getElementById('resolveRiskTitle').textContent = title;
    document.getElementById('resolutionNotes').value = '';
    document.getElementById('resolveRiskModal').classList.add('open');
}

// Close resolve risk modal
function closeResolveRiskModal() {
    document.getElementById('resolveRiskModal').classList.remove('open');
}

// Handle resolve risk form submission
async function handleResolveRisk(event) {
    event.preventDefault();

    const riskId = document.getElementById('resolveRiskId').value;
    const notes = document.getElementById('resolutionNotes').value;

    try {
        await API.RiskAPI.resolve(riskId, notes);
        closeResolveRiskModal();
        await loadRisks(getCustomerId());
    } catch (error) {
        console.error('Failed to resolve risk:', error);
        alert('Failed to resolve risk. Please try again.');
    }
}

// ==========================================
// TASK MODAL FUNCTIONS
// ==========================================

// Store current customer data for task modal
let currentCustomerData = null;

// Open task modal for creating
async function openTaskModal() {
    document.getElementById('taskModalTitle').textContent = 'Add Task';
    document.getElementById('taskSubmitBtn').textContent = 'Add Task';
    document.getElementById('taskId').value = '';
    document.getElementById('taskForm').reset();
    document.getElementById('taskPriority').value = 'medium';
    document.getElementById('taskStatusGroup').style.display = 'none';
    document.getElementById('taskDeleteBtn').style.display = 'none';

    // Load users for assignee dropdown
    await loadUsersForTaskAssignee();

    // Load customers for customer dropdown
    await loadCustomersForTaskModal();

    // Default to current customer
    const customerId = getCustomerId();
    if (customerId) {
        document.getElementById('taskCustomer').value = customerId;
    }

    document.getElementById('taskModal').classList.add('open');
}

// Close task modal
function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('open');
}

// Edit existing task
async function editTask(taskId) {
    try {
        const task = await API.TaskAPI.getById(taskId);

        document.getElementById('taskModalTitle').textContent = 'Edit Task';
        document.getElementById('taskSubmitBtn').textContent = 'Save Changes';
        document.getElementById('taskId').value = taskId;

        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.due_date ? task.due_date.split('T')[0] : '';
        document.getElementById('taskStatus').value = task.status;

        document.getElementById('taskStatusGroup').style.display = 'block';
        document.getElementById('taskDeleteBtn').style.display = 'block';

        // Load users for assignee dropdown
        await loadUsersForTaskAssignee();
        document.getElementById('taskAssignee').value = task.assignee_id || '';

        // Load customers for customer dropdown
        await loadCustomersForTaskModal();
        document.getElementById('taskCustomer').value = task.customer_id || '';

        document.getElementById('taskModal').classList.add('open');
    } catch (error) {
        console.error('Failed to load task:', error);
        alert('Failed to load task. Please try again.');
    }
}

// Load users for the assignee dropdown
async function loadUsersForTaskAssignee() {
    try {
        const data = await API.UserAPI.getAll();
        const select = document.getElementById('taskAssignee');
        select.innerHTML = '<option value="">Unassigned</option>' +
            (data.items || []).map(u => `<option value="${u.id}">${u.first_name} ${u.last_name}</option>`).join('');
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Load customers for the customer dropdown
async function loadCustomersForTaskModal() {
    try {
        const data = await API.CustomerAPI.getAll();
        const select = document.getElementById('taskCustomer');
        const customerId = getCustomerId();

        select.innerHTML = '<option value="">No customer</option>' +
            (data.items || []).map(c => {
                const selected = c.id == customerId ? 'selected' : '';
                return `<option value="${c.id}" ${selected}>${c.name}</option>`;
            }).join('');
    } catch (error) {
        console.error('Failed to load customers:', error);
    }
}

// Handle task form submission
async function handleTaskSubmit(event) {
    event.preventDefault();

    const taskId = document.getElementById('taskId').value;
    const dueDateValue = document.getElementById('taskDueDate').value;
    const assigneeValue = document.getElementById('taskAssignee').value;
    const customerValue = document.getElementById('taskCustomer').value;

    const data = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value || null,
        priority: document.getElementById('taskPriority').value,
        // Convert date to datetime format (add time component)
        due_date: dueDateValue ? `${dueDateValue}T17:00:00` : null,
        // Convert IDs to integers
        assignee_id: assigneeValue ? parseInt(assigneeValue) : null,
        customer_id: customerValue ? parseInt(customerValue) : null,
    };

    if (taskId) {
        data.status = document.getElementById('taskStatus').value;
    }

    try {
        if (taskId) {
            await API.TaskAPI.update(taskId, data);
        } else {
            await API.TaskAPI.create(data);
        }
        closeTaskModal();

        // Reload tasks to show updated list
        await loadTasks(getCustomerId());
    } catch (error) {
        console.error('Failed to save task:', error);
        alert('Failed to save task. Please try again.');
    }
}

// Delete task
async function deleteTask() {
    const taskId = document.getElementById('taskId').value;
    if (!taskId) return;

    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        // Note: TaskAPI doesn't have delete method yet, would need to add it
        await fetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });
        closeTaskModal();
        alert('Task deleted successfully!');
    } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task. Please try again.');
    }
}

// ==========================================
// TASKS TAB FUNCTIONS
// ==========================================

// Store customer tasks
let customerTasks = [];

// Load tasks for customer
async function loadTasks(customerId) {
    try {
        const data = await API.TaskAPI.getAll({ customer_id: customerId });
        customerTasks = data.items || [];
        renderTasksTab();
        updateOpenTasksCount();
    } catch (error) {
        console.error('Failed to load tasks:', error);
        const container = document.getElementById('tasksTabContainer');
        if (container) {
            container.innerHTML = '<div class="text-secondary text-center">Failed to load tasks</div>';
        }
    }
}

// Update open tasks count in sidebar
function updateOpenTasksCount() {
    const openTasks = customerTasks.filter(t => t.status === 'open' || t.status === 'in_progress');

    // Update sidebar card if exists
    const openTasksCard = document.getElementById('openTasksCount');
    if (openTasksCard) {
        openTasksCard.textContent = openTasks.length;
    }

    // Update tab count
    const tabCount = document.getElementById('tasksTabCount');
    if (tabCount) {
        tabCount.textContent = `${customerTasks.length} Task${customerTasks.length !== 1 ? 's' : ''}`;
    }
}

// Render tasks tab
function renderTasksTab() {
    const container = document.getElementById('tasksTabContainer');
    if (!container) return;

    if (customerTasks.length === 0) {
        container.innerHTML = `
            <div class="text-secondary text-center" style="padding: 32px;">
                <svg width="48" height="48" viewBox="0 0 32 32" fill="currentColor" style="opacity: 0.5; margin-bottom: 16px;">
                    <path d="M14 21.5l-5-4.96L7.59 18 14 24.35 25.41 13 24 11.59 14 21.5z"/>
                    <path d="M16 2C8.27 2 2 8.27 2 16s6.27 14 14 14 14-6.27 14-14S23.73 2 16 2zm0 26C9.38 28 4 22.62 4 16S9.38 4 16 4s12 5.38 12 12-5.38 12-12 12z"/>
                </svg>
                <p style="margin: 0;">No tasks for this customer</p>
                <button class="btn btn--primary mt-3" onclick="openTaskModal()">Create First Task</button>
            </div>
        `;
        return;
    }

    // Sort tasks: open first, then by due date
    const sortedTasks = [...customerTasks].sort((a, b) => {
        const statusOrder = { open: 0, in_progress: 1, completed: 2, cancelled: 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
    });

    container.innerHTML = `
        <div class="flex flex-column gap-3">
            ${sortedTasks.map(task => renderTaskCard(task)).join('')}
        </div>
    `;
}

// Render individual task card
function renderTaskCard(task) {
    const priorityClass = getPriorityClass(task.priority);
    const statusClass = getTaskStatusClass(task.status);
    const statusLabel = getTaskStatusLabel(task.status);

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() &&
                      (task.status === 'open' || task.status === 'in_progress');

    let dueDateText = '';
    if (task.due_date) {
        const dueDate = new Date(task.due_date);
        dueDateText = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (isOverdue) {
            dueDateText = `<span style="color: var(--cds-support-error);">Overdue: ${dueDateText}</span>`;
        }
    }

    return `
        <div class="card" style="padding: 16px; border-left: 4px solid var(${getPriorityColor(task.priority)});">
            <div class="flex flex-between flex-center mb-2">
                <div class="flex gap-2 flex-center">
                    <span class="tag ${statusClass}">${statusLabel}</span>
                    <span class="tag ${priorityClass}">${task.priority}</span>
                </div>
                <div class="flex gap-2">
                    ${task.status !== 'completed' && task.status !== 'cancelled' ? `
                        <button class="btn btn--ghost btn--sm" onclick="completeTaskFromDetail(${task.id})" title="Mark Complete">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M14 21.5l-5-4.96L7.59 18 14 24.35 25.41 13 24 11.59 14 21.5z"/></svg>
                        </button>
                    ` : ''}
                    <button class="btn btn--ghost btn--sm" onclick="editTask(${task.id})" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"/></svg>
                    </button>
                </div>
            </div>
            <h4 style="margin: 0 0 8px 0; font-size: 16px; ${task.status === 'completed' ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${task.title}</h4>
            ${task.description ? `<p class="text-secondary" style="margin: 0 0 8px 0; font-size: 13px;">${task.description}</p>` : ''}
            <div class="flex gap-4 text-secondary" style="font-size: 12px;">
                ${dueDateText ? `<span>Due: ${dueDateText}</span>` : ''}
            </div>
        </div>
    `;
}

// Get priority color for border
function getPriorityColor(priority) {
    const colors = {
        urgent: '--cds-support-error',
        high: '--cds-support-warning',
        medium: '--cds-support-info',
        low: '--cds-text-secondary'
    };
    return colors[priority] || '--cds-text-secondary';
}

// Get priority class
function getPriorityClass(priority) {
    const classes = {
        urgent: 'tag--red',
        high: 'tag--orange',
        medium: 'tag--blue',
        low: 'tag--gray'
    };
    return classes[priority] || 'tag--gray';
}

// Get task status class
function getTaskStatusClass(status) {
    const classes = {
        open: 'tag--blue',
        in_progress: 'tag--yellow',
        completed: 'tag--green',
        cancelled: 'tag--gray'
    };
    return classes[status] || 'tag--gray';
}

// Get task status label
function getTaskStatusLabel(status) {
    const labels = {
        open: 'Open',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled'
    };
    return labels[status] || status;
}

// Complete task from detail view
async function completeTaskFromDetail(taskId) {
    try {
        await API.TaskAPI.complete(taskId);
        await loadTasks(getCustomerId());
    } catch (error) {
        console.error('Failed to complete task:', error);
        alert('Failed to complete task. Please try again.');
    }
}

// Expose task tab functions to window
window.completeTaskFromDetail = completeTaskFromDetail;

// Expose task functions to window
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.editTask = editTask;
window.handleTaskSubmit = handleTaskSubmit;
window.deleteTask = deleteTask;
window.switchToTasksTab = switchToTasksTab;

// Expose risk functions to window
window.openRiskModal = openRiskModal;
window.closeRiskModal = closeRiskModal;
window.editRisk = editRisk;
window.handleRiskSubmit = handleRiskSubmit;
window.deleteRisk = deleteRisk;
window.openResolveRiskModal = openResolveRiskModal;
window.closeResolveRiskModal = closeResolveRiskModal;
window.handleResolveRisk = handleResolveRisk;
window.switchToRisksTab = switchToRisksTab;

// Expose functions to window for onclick handlers
window.openRoadmapItemModal = openRoadmapItemModal;
window.closeRoadmapItemModal = closeRoadmapItemModal;
window.editRoadmapItem = editRoadmapItem;
window.handleRoadmapItemSubmit = handleRoadmapItemSubmit;
window.deleteRoadmapItem = deleteRoadmapItem;
window.closeDependencyPopover = closeDependencyPopover;
window.deleteSelectedDependency = deleteSelectedDependency;
window.openCreateRoadmapModal = openCreateRoadmapModal;
window.closeCreateRoadmapModal = closeCreateRoadmapModal;
window.handleCreateRoadmap = handleCreateRoadmap;
window.updateEndDateFromDuration = updateEndDateFromDuration;
window.openPushToTPModal = openPushToTPModal;
window.closePushToTPModal = closePushToTPModal;
window.handlePushToTP = handlePushToTP;
window.toggleAllPushItems = toggleAllPushItems;
window.zoomRoadmap = zoomRoadmap;
window.navigateRoadmapTime = navigateRoadmapTime;
window.populateDependencyCheckboxes = populateDependencyCheckboxes;
window.startRoadmapDrag = startRoadmapDrag;
window.startRoadmapResize = startRoadmapResize;

// Redraw dependency lines on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (currentRoadmap && currentRoadmap.items) {
            drawDependencyLines(currentRoadmap.items);
        }
    }, 250);
});

// ============================================
// ENGAGEMENTS TAB FUNCTIONS
// ============================================

let customerEngagements = [];

async function loadEngagements(customerId) {
    const container = document.getElementById('engagementsTabContainer');
    if (!container) return;

    container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Loading engagements...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/engagements?customer_id=${customerId}`);
        if (!response.ok) throw new Error('Failed to load engagements');

        const data = await response.json();
        customerEngagements = data.items || data || [];
        renderEngagementsTab();
    } catch (error) {
        console.error('Error loading engagements:', error);
        // Show sample data for demo
        customerEngagements = generateSampleEngagements();
        renderEngagementsTab();
    }
}

function generateSampleEngagements() {
    const types = ['meeting', 'call', 'email', 'qbr', 'training', 'support'];
    const outcomes = ['positive', 'neutral', 'negative', 'follow_up_required'];
    const subjects = [
        'Quarterly Business Review',
        'Product roadmap discussion',
        'Support escalation follow-up',
        'Training session - Advanced features',
        'Contract renewal discussion',
        'Implementation kickoff',
        'Executive sponsor check-in',
        'Feature request discussion'
    ];

    return Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        type: types[i % types.length],
        subject: subjects[i],
        date: new Date(Date.now() - (i * 7 + Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
        duration: [15, 30, 45, 60][Math.floor(Math.random() * 4)],
        attendees: ['John Smith', 'Jane Doe', 'Mike Johnson'].slice(0, Math.floor(Math.random() * 3) + 1).join(', '),
        notes: 'Discussion notes and key outcomes from the engagement.',
        outcome: outcomes[Math.floor(Math.random() * outcomes.length)]
    }));
}

function renderEngagementsTab() {
    const container = document.getElementById('engagementsTabContainer');
    const filterValue = document.getElementById('engagementFilter')?.value || 'all';

    const filtered = filterValue === 'all'
        ? customerEngagements
        : customerEngagements.filter(e => e.type === filterValue);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">No engagements found</div>';
        return;
    }

    // Sort by date descending
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sorted.map(engagement => {
        const typeIcons = {
            meeting: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M16 4a5 5 0 11-5 5 5 5 0 015-5m0-2a7 7 0 107 7 7 7 0 00-7-7zM26 30h-2v-5a5 5 0 00-5-5h-6a5 5 0 00-5 5v5H6v-5a7 7 0 017-7h6a7 7 0 017 7z"/></svg>',
            call: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M26 29h-.17C6.18 27.87 3.39 11.29 3 6.23A3 3 0 015.76 3h5.51a2 2 0 011.86 1.26L14.65 8a2 2 0 01-.44 2.16l-2.13 2.15a9.37 9.37 0 007.58 7.6l2.17-2.15a2 2 0 012.16-.44l3.77 1.51A2 2 0 0129 20.72V26a3 3 0 01-3 3z"/></svg>',
            email: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M28 6H4a2 2 0 00-2 2v16a2 2 0 002 2h24a2 2 0 002-2V8a2 2 0 00-2-2zm-2.2 2L16 14.78 6.2 8zM4 24V8.91l11.43 7.91a1 1 0 001.14 0L28 8.91V24z"/></svg>',
            qbr: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M10 18H6v8h4v-8zm12-8h-4v16h4V10zm-6 6h-4v10h4V16z"/></svg>',
            training: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M26 4H6a2 2 0 00-2 2v20a2 2 0 002 2h20a2 2 0 002-2V6a2 2 0 00-2-2zM6 26V6h20v20z"/><path d="M12 10v12l10-6z"/></svg>',
            support: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 26a12 12 0 1112-12 12 12 0 01-12 12z"/><path d="M17.5 23h-3v-8h3zm0-10h-3v-3h3z"/></svg>',
            other: '<svg width="16" height="16" viewBox="0 0 32 32"><path d="M17.74 30L16 29l4-7h6a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h9v2H6a4 4 0 01-4-4V8a4 4 0 014-4h20a4 4 0 014 4v12a4 4 0 01-4 4h-4.84z"/></svg>'
        };

        const outcomeColors = {
            positive: 'tag--green',
            neutral: 'tag--gray',
            negative: 'tag--red',
            follow_up_required: 'tag--yellow'
        };

        const outcomeLabels = {
            positive: 'Positive',
            neutral: 'Neutral',
            negative: 'Negative',
            follow_up_required: 'Follow-up Required'
        };

        return `
            <div style="padding: 16px; border: 1px solid var(--cds-border-subtle-01); border-radius: 4px; margin-bottom: 12px; cursor: pointer;" onclick="editEngagement(${engagement.id})">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="color: var(--cds-icon-secondary);">${typeIcons[engagement.type] || typeIcons.other}</div>
                        <div>
                            <div style="font-weight: 500;">${engagement.subject}</div>
                            <div class="text-secondary" style="font-size: 12px;">${formatDate(engagement.date)}${engagement.duration ? ` · ${engagement.duration} min` : ''}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="tag" style="text-transform: capitalize;">${engagement.type}</span>
                        ${engagement.outcome ? `<span class="tag ${outcomeColors[engagement.outcome] || ''}">${outcomeLabels[engagement.outcome] || engagement.outcome}</span>` : ''}
                    </div>
                </div>
                ${engagement.attendees ? `<div class="text-secondary" style="font-size: 12px; margin-bottom: 4px;">Attendees: ${engagement.attendees}</div>` : ''}
                ${engagement.notes ? `<div style="font-size: 13px; color: var(--cds-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${engagement.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}

function filterEngagements() {
    renderEngagementsTab();
}

function openEngagementModal() {
    const modal = document.getElementById('engagementModal');
    const form = document.getElementById('engagementForm');
    const title = document.getElementById('engagementModalTitle');
    const submitBtn = document.getElementById('engagementSubmitBtn');
    const deleteBtn = document.getElementById('engagementDeleteBtn');

    form.reset();
    document.getElementById('engagementId').value = '';
    document.getElementById('engagementDate').value = new Date().toISOString().split('T')[0];
    title.textContent = 'Log Engagement';
    submitBtn.textContent = 'Log Engagement';
    deleteBtn.style.display = 'none';

    modal.classList.add('open');
}

function closeEngagementModal() {
    document.getElementById('engagementModal').classList.remove('open');
}

function editEngagement(id) {
    const engagement = customerEngagements.find(e => e.id === id);
    if (!engagement) return;

    const modal = document.getElementById('engagementModal');
    const title = document.getElementById('engagementModalTitle');
    const submitBtn = document.getElementById('engagementSubmitBtn');
    const deleteBtn = document.getElementById('engagementDeleteBtn');

    document.getElementById('engagementId').value = engagement.id;
    document.getElementById('engagementType').value = engagement.type || 'meeting';
    document.getElementById('engagementSubject').value = engagement.subject || '';
    document.getElementById('engagementDate').value = engagement.date ? engagement.date.split('T')[0] : '';
    document.getElementById('engagementDuration').value = engagement.duration || '';
    document.getElementById('engagementAttendees').value = engagement.attendees || '';
    document.getElementById('engagementNotes').value = engagement.notes || '';
    document.getElementById('engagementOutcome').value = engagement.outcome || '';

    title.textContent = 'Edit Engagement';
    submitBtn.textContent = 'Save Changes';
    deleteBtn.style.display = 'block';

    modal.classList.add('open');
}

async function handleEngagementSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('engagementId').value;
    const customerId = getCustomerId();

    const data = {
        customer_id: parseInt(customerId),
        type: document.getElementById('engagementType').value,
        subject: document.getElementById('engagementSubject').value,
        date: document.getElementById('engagementDate').value ? `${document.getElementById('engagementDate').value}T12:00:00` : null,
        duration: document.getElementById('engagementDuration').value ? parseInt(document.getElementById('engagementDuration').value) : null,
        attendees: document.getElementById('engagementAttendees').value,
        notes: document.getElementById('engagementNotes').value,
        outcome: document.getElementById('engagementOutcome').value || null
    };

    try {
        const url = id ? `${API_BASE_URL}/engagements/${id}` : `${API_BASE_URL}/engagements`;
        const method = id ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to save engagement');

        closeEngagementModal();
        await loadEngagements(customerId);
        loadRecentEngagements(customerId); // Update sidebar
    } catch (error) {
        console.error('Error saving engagement:', error);
        // For demo, just update locally
        if (id) {
            const idx = customerEngagements.findIndex(e => e.id === parseInt(id));
            if (idx >= 0) customerEngagements[idx] = { ...customerEngagements[idx], ...data };
        } else {
            customerEngagements.unshift({ id: Date.now(), ...data });
        }
        closeEngagementModal();
        renderEngagementsTab();
    }
}

async function deleteEngagement() {
    const id = document.getElementById('engagementId').value;
    if (!id || !confirm('Are you sure you want to delete this engagement?')) return;

    try {
        await fetch(`${API_BASE_URL}/engagements/${id}`, { method: 'DELETE' });
        closeEngagementModal();
        await loadEngagements(getCustomerId());
    } catch (error) {
        console.error('Error deleting engagement:', error);
        customerEngagements = customerEngagements.filter(e => e.id !== parseInt(id));
        closeEngagementModal();
        renderEngagementsTab();
    }
}

// ============================================
// TARGETPROCESS TAB FUNCTIONS
// ============================================

async function loadTargetProcessData(customerId) {
    const container = document.getElementById('tpItemsList');
    if (!container) return;

    container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Loading TargetProcess data...</div>';

    // For demo, show sample TP data
    const tpData = generateSampleTPData();
    renderTPData(tpData);
}

function generateSampleTPData() {
    return {
        userStories: 12,
        features: 5,
        bugs: 3,
        inProgress: 4,
        items: [
            { id: 1, type: 'Feature', name: 'Executive Dashboard', state: 'In Progress', effort: 13, assignedTo: 'Team Alpha' },
            { id: 2, type: 'UserStory', name: 'User can export reports to PDF', state: 'Done', effort: 5, assignedTo: 'Jane Smith' },
            { id: 3, type: 'Bug', name: 'Login timeout too short', state: 'Open', effort: 2, assignedTo: 'John Doe' },
            { id: 4, type: 'Feature', name: 'API Integration v2', state: 'In Progress', effort: 21, assignedTo: 'Team Beta' },
            { id: 5, type: 'UserStory', name: 'Admin can manage user roles', state: 'Open', effort: 8, assignedTo: 'Unassigned' },
            { id: 6, type: 'Bug', name: 'Chart rendering issue on Safari', state: 'In Progress', effort: 3, assignedTo: 'Mike Johnson' }
        ]
    };
}

function renderTPData(data) {
    // Update stats
    document.getElementById('tpUserStories').textContent = data.userStories;
    document.getElementById('tpFeatures').textContent = data.features;
    document.getElementById('tpBugs').textContent = data.bugs;
    document.getElementById('tpInProgress').textContent = data.inProgress;

    const container = document.getElementById('tpItemsList');

    if (!data.items || data.items.length === 0) {
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">No TargetProcess items found</div>';
        return;
    }

    const typeColors = {
        Feature: '#8a3ffc',
        UserStory: 'var(--cds-interactive)',
        Bug: 'var(--cds-support-error)',
        Task: 'var(--cds-support-warning)'
    };

    const stateColors = {
        Open: 'tag--gray',
        'In Progress': 'tag--blue',
        Done: 'tag--green',
        Closed: 'tag--green'
    };

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 2px solid var(--cds-border-subtle-01);">
                    <th style="text-align: left; padding: 12px 8px; font-weight: 600; font-size: 12px; color: var(--cds-text-secondary);">TYPE</th>
                    <th style="text-align: left; padding: 12px 8px; font-weight: 600; font-size: 12px; color: var(--cds-text-secondary);">NAME</th>
                    <th style="text-align: left; padding: 12px 8px; font-weight: 600; font-size: 12px; color: var(--cds-text-secondary);">STATE</th>
                    <th style="text-align: left; padding: 12px 8px; font-weight: 600; font-size: 12px; color: var(--cds-text-secondary);">EFFORT</th>
                    <th style="text-align: left; padding: 12px 8px; font-weight: 600; font-size: 12px; color: var(--cds-text-secondary);">ASSIGNED TO</th>
                </tr>
            </thead>
            <tbody>
                ${data.items.map(item => `
                    <tr style="border-bottom: 1px solid var(--cds-border-subtle-01);">
                        <td style="padding: 12px 8px;">
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; background: ${typeColors[item.type] || '#697077'}; color: white;">${item.type}</span>
                        </td>
                        <td style="padding: 12px 8px; font-weight: 500;">${item.name}</td>
                        <td style="padding: 12px 8px;"><span class="tag ${stateColors[item.state] || ''}">${item.state}</span></td>
                        <td style="padding: 12px 8px;">${item.effort} pts</td>
                        <td style="padding: 12px 8px; color: var(--cds-text-secondary);">${item.assignedTo}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function refreshTPData() {
    loadTargetProcessData(getCustomerId());
}

// ============================================
// DOCUMENTS TAB FUNCTIONS
// ============================================

let customerDocuments = [];

// Document type icons
const documentTypeIcons = {
    email: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M28 6H4a2 2 0 00-2 2v16a2 2 0 002 2h24a2 2 0 002-2V8a2 2 0 00-2-2zm0 2v.67l-12 8.41-12-8.41V8zm-24 16V10.67l11.56 8.09a1 1 0 00.44.24 1 1 0 00.44-.24L28 10.67V24z"/></svg>',
    calendar: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M26 4h-4V2h-2v2h-8V2h-2v2H6a2 2 0 00-2 2v20a2 2 0 002 2h20a2 2 0 002-2V6a2 2 0 00-2-2zm0 22H6V12h20zm0-16H6V6h4v2h2V6h8v2h2V6h4z"/></svg>',
    pdf: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M30 18v-2h-6v10h2v-4h3v-2h-3v-2h4zm-11 8h-4V16h4a3 3 0 013 3v4a3 3 0 01-3 3zm-2-2h2a1 1 0 001-1v-4a1 1 0 00-1-1h-2zm-6-8h-4v10h2v-3h2a2.5 2.5 0 000-5zm0 5h-2v-3h2a.5.5 0 010 1z"/><path d="M22 14V4a2 2 0 00-.59-1.41l-4-4A2 2 0 0016 2V0H4a2 2 0 00-2 2v14h2V2h10v4a2 2 0 002 2h4v6h2z"/></svg>',
    document: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M25.7 9.3l-7-7A.91.91 0 0018 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10a.91.91 0 00-.3-.7zM18 4.4l5.6 5.6H18zM24 28H8V4h8v6a2 2 0 002 2h6z"/></svg>',
    spreadsheet: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M4 20v8h8v-8H4zm2 6v-4h4v4H6zm8-6v8h8v-8h-8zm2 6v-4h4v4h-4zm8-6v8h8v-8h-8zm2 6v-4h4v4h-4zM4 10v8h8v-8H4zm2 6v-4h4v4H6zm8-6v8h8v-8h-8zm2 6v-4h4v4h-4zm8-6v8h8v-8h-8zm2 6v-4h4v4h-4z"/></svg>',
    presentation: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M28 4H4a2 2 0 00-2 2v14a2 2 0 002 2h11v4h-4v2h10v-2h-4v-4h11a2 2 0 002-2V6a2 2 0 00-2-2zM4 20V6h24v14z"/></svg>',
    image: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M19 14a3 3 0 10-3-3 3 3 0 003 3zm0-4a1 1 0 11-1 1 1 1 0 011-1z"/><path d="M26 4H6a2 2 0 00-2 2v20a2 2 0 002 2h20a2 2 0 002-2V6a2 2 0 00-2-2zm0 22H6v-6l5-5 5.59 5.59a2 2 0 002.82 0L21 19l5 5zm0-4.83l-3.59-3.59a2 2 0 00-2.82 0L18 19.17l-5.59-5.59a2 2 0 00-2.82 0L6 17.17V6h20z"/></svg>',
    text: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M25.7 9.3l-7-7A.91.91 0 0018 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10a.91.91 0 00-.3-.7zM18 4.4l5.6 5.6H18zM24 28H8V4h8v6a2 2 0 002 2h6z"/><path d="M10 22h12v2H10zm0-6h12v2H10z"/></svg>',
    data: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M4 24h10v2H4zm0-6h10v2H4zm0-6h10v2H4zm14 0h10v2H18zm0 6h10v2H18zm0 6h10v2H18z"/></svg>',
    other: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M25.7 9.3l-7-7A.91.91 0 0018 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10a.91.91 0 00-.3-.7zM18 4.4l5.6 5.6H18zM24 28H8V4h8v6a2 2 0 002 2h6z"/></svg>'
};

// Document type labels
const documentTypeLabels = {
    email: 'Email',
    calendar: 'Calendar Event',
    pdf: 'PDF',
    document: 'Document',
    spreadsheet: 'Spreadsheet',
    presentation: 'Presentation',
    image: 'Image',
    text: 'Text',
    data: 'Data',
    other: 'Other'
};

async function loadDocuments(customerId, params = {}) {
    const container = document.getElementById('documentsTabContainer');
    if (!container) return;

    container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Loading documents...</div>';

    try {
        const response = await API.DocumentAPI.list(customerId, params);
        customerDocuments = response.items || [];
        renderDocumentsTab();
    } catch (error) {
        console.error('Failed to load documents:', error);
        container.innerHTML = `
            <div class="text-secondary text-center" style="padding: 24px;">
                Failed to load documents. <button class="btn-link" onclick="loadDocuments(${customerId})">Try again</button>
            </div>
        `;
    }
}

function renderDocumentsTab() {
    const container = document.getElementById('documentsTabContainer');
    const filterValue = document.getElementById('documentFilter')?.value || 'all';

    // Filter documents based on dropdown selection
    let filtered = customerDocuments;
    if (filterValue !== 'all') {
        // Map filter values to file types
        const filterTypeMap = {
            'contract': ['document', 'pdf'],
            'sow': ['document', 'pdf'],
            'presentation': ['presentation'],
            'report': ['document', 'pdf'],
            'other': ['other', 'image', 'text', 'data']
        };
        const allowedTypes = filterTypeMap[filterValue] || [filterValue];
        filtered = customerDocuments.filter(d => allowedTypes.includes(d.file_type));
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-secondary text-center" style="padding: 24px;">
                ${customerDocuments.length === 0
                    ? 'No documents yet. Drop files above to add documents.'
                    : 'No documents match the selected filter.'}
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; gap: 12px;">
            ${filtered.map(doc => `
                <div class="document-row" style="display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid var(--cds-border-subtle-01); border-radius: 4px;">
                    <div style="color: var(--cds-icon-secondary);">${documentTypeIcons[doc.file_type] || documentTypeIcons.other}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(doc.original_filename)}">${escapeHtml(doc.original_filename)}</div>
                        <div class="text-secondary" style="font-size: 12px;">
                            ${documentTypeLabels[doc.file_type] || 'File'} · ${formatFileSizeAlt(doc.file_size)}
                            ${doc.extra_data?.subject ? ` · ${escapeHtml(doc.extra_data.subject.substring(0, 50))}` : ''}
                        </div>
                    </div>
                    <div class="text-secondary" style="font-size: 12px; white-space: nowrap;">${formatDate(doc.created_at)}</div>
                    <button class="btn btn--ghost btn--icon" onclick="event.stopPropagation(); deleteDocumentById(${doc.id})" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 32 32"><path d="M12 12h2v12h-2zm6 0h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/></svg>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function formatFileSizeAlt(bytes) {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function filterDocuments() {
    renderDocumentsTab();
}

function openDocumentModal() {
    // Trigger the document file input
    const fileInput = document.getElementById('documentFileInput');
    if (fileInput) {
        fileInput.click();
    }
}

async function deleteDocumentById(id) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
        await API.DocumentAPI.delete(id);
        customerDocuments = customerDocuments.filter(d => d.id !== id);
        renderDocumentsTab();
        showSuccessToast('Document deleted');
    } catch (error) {
        console.error('Failed to delete document:', error);
        showErrorToast('Failed to delete document');
    }
}

function deleteDocument(id) {
    return deleteDocumentById(id);
}

function downloadDocument(id) {
    const doc = customerDocuments.find(d => d.id === id);
    if (!doc) {
        showErrorToast('Document not found');
        return;
    }

    // For now, show info about the document since we don't have file storage implemented
    // In the future, this would trigger a download from the storage path
    if (doc.storage_path) {
        window.open(`${API_BASE_URL}/documents/${id}/download`, '_blank');
    } else if (doc.content_text) {
        // Create a blob from the text content
        const blob = new Blob([doc.content_text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.original_filename || 'document.txt';
        a.click();
        URL.revokeObjectURL(url);
    } else {
        showErrorToast('Download not available for this document');
    }
}

// Expose document functions globally
window.deleteDocumentById = deleteDocumentById;
window.deleteDocument = deleteDocument;
window.downloadDocument = downloadDocument;
window.openDocumentModal = openDocumentModal;

// ============================================
// USAGE FRAMEWORK TAB FUNCTIONS
// ============================================

async function loadUsageFramework(customerId) {
    const container = document.getElementById('featureUsageList');
    if (!container) return;

    container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Loading usage data...</div>';

    // For demo, show sample usage data
    const usageData = generateSampleUsageData();
    renderUsageFramework(usageData);
}

function generateSampleUsageData() {
    return {
        activeUsers: 156,
        activeUsersTrend: '+12%',
        loginFrequency: '4.2/week',
        loginFreqTrend: '+8%',
        featureAdoption: '73%',
        featureAdoptionTrend: '+5%',
        engagementScore: 82,
        engagementScoreTrend: '+3',
        features: [
            { name: 'Dashboard', adoption: 95, trend: '+2%' },
            { name: 'Reports', adoption: 78, trend: '+5%' },
            { name: 'Analytics', adoption: 65, trend: '+8%' },
            { name: 'Integrations', adoption: 45, trend: '+12%' },
            { name: 'API Access', adoption: 32, trend: '+3%' },
            { name: 'Mobile App', adoption: 28, trend: '+15%' }
        ]
    };
}

function renderUsageFramework(data) {
    // Update metric cards
    document.getElementById('ufActiveUsers').textContent = data.activeUsers;
    const ufActiveUsersTrend = document.getElementById('ufActiveUsersTrend');
    if (ufActiveUsersTrend) {
        ufActiveUsersTrend.textContent = data.activeUsersTrend;
        ufActiveUsersTrend.className = 'metric-card__trend ' + (data.activeUsersTrend.startsWith('+') ? 'metric-card__trend--up' : 'metric-card__trend--down');
    }

    document.getElementById('ufLoginFreq').textContent = data.loginFrequency;
    const ufLoginFreqTrend = document.getElementById('ufLoginFreqTrend');
    if (ufLoginFreqTrend) {
        ufLoginFreqTrend.textContent = data.loginFreqTrend;
        ufLoginFreqTrend.className = 'metric-card__trend ' + (data.loginFreqTrend.startsWith('+') ? 'metric-card__trend--up' : 'metric-card__trend--down');
    }

    document.getElementById('ufFeatureAdoption').textContent = data.featureAdoption;
    const ufFeatureAdoptionTrend = document.getElementById('ufFeatureAdoptionTrend');
    if (ufFeatureAdoptionTrend) {
        ufFeatureAdoptionTrend.textContent = data.featureAdoptionTrend;
        ufFeatureAdoptionTrend.className = 'metric-card__trend ' + (data.featureAdoptionTrend.startsWith('+') ? 'metric-card__trend--up' : 'metric-card__trend--down');
    }

    document.getElementById('ufEngagementScore').textContent = data.engagementScore;
    const ufEngagementScoreTrend = document.getElementById('ufEngagementScoreTrend');
    if (ufEngagementScoreTrend) {
        ufEngagementScoreTrend.textContent = data.engagementScoreTrend;
        ufEngagementScoreTrend.className = 'metric-card__trend ' + (data.engagementScoreTrend.startsWith('+') ? 'metric-card__trend--up' : 'metric-card__trend--down');
    }

    // Render feature usage breakdown
    const container = document.getElementById('featureUsageList');

    container.innerHTML = `
        <div style="display: grid; gap: 16px;">
            ${data.features.map(feature => `
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 120px; font-weight: 500;">${feature.name}</div>
                    <div style="flex: 1;">
                        <div style="height: 8px; background: var(--cds-layer-02); border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${feature.adoption}%; background: ${feature.adoption >= 70 ? 'var(--cds-support-success)' : feature.adoption >= 40 ? 'var(--cds-support-warning)' : 'var(--cds-support-error)'}; border-radius: 4px; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    <div style="width: 50px; text-align: right; font-weight: 500;">${feature.adoption}%</div>
                    <div style="width: 50px; text-align: right; font-size: 12px; color: ${feature.trend.startsWith('+') ? 'var(--cds-support-success)' : 'var(--cds-support-error)'};">${feature.trend}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function updateUsageTimeframe() {
    const timeframe = document.getElementById('usageTimeframe')?.value;
    console.log('Updating usage timeframe to:', timeframe);
    // Would reload data with new timeframe
    loadUsageFramework(getCustomerId());
}

// Expose new tab functions to window
window.loadEngagements = loadEngagements;
window.filterEngagements = filterEngagements;
window.openEngagementModal = openEngagementModal;
window.closeEngagementModal = closeEngagementModal;
window.editEngagement = editEngagement;
window.handleEngagementSubmit = handleEngagementSubmit;
window.deleteEngagement = deleteEngagement;

window.loadTargetProcessData = loadTargetProcessData;
window.refreshTPData = refreshTPData;

window.loadDocuments = loadDocuments;
window.filterDocuments = filterDocuments;
window.openDocumentModal = openDocumentModal;
window.downloadDocument = downloadDocument;
window.deleteDocument = deleteDocument;

window.loadUsageFramework = loadUsageFramework;
window.updateUsageTimeframe = updateUsageTimeframe;

// ==================== ADOPTION STAGE MANAGEMENT ====================

// Selected adoption stage in modal
let selectedAdoptionStage = null;

// Stage name mappings
const ADOPTION_STAGES = {
    'onboarding': 'Onboarding',
    'adoption': 'Adoption',
    'value_realization': 'Value Realization',
    'expansion': 'Expansion',
    'renewal': 'Renewal'
};

// Open adoption stage modal
function openAdoptionStageModal() {
    if (!currentCustomer) {
        console.error('No customer data available');
        return;
    }

    const currentStage = currentCustomer.adoption_stage || 'onboarding';
    selectedAdoptionStage = currentStage;

    // Update current stage display
    const currentStageDisplay = document.getElementById('currentStageDisplay');
    if (currentStageDisplay) {
        currentStageDisplay.textContent = ADOPTION_STAGES[currentStage] || currentStage;
    }

    // Clear notes
    const notesField = document.getElementById('adoptionStageNotes');
    if (notesField) notesField.value = '';

    // Update selected state for all options
    updateStageSelectionUI(currentStage);

    // Open modal
    document.getElementById('adoptionStageModal').classList.add('open');
}

// Close adoption stage modal
function closeAdoptionStageModal() {
    document.getElementById('adoptionStageModal').classList.remove('open');
    selectedAdoptionStage = null;
}

// Select a stage in the modal
function selectAdoptionStage(stage) {
    selectedAdoptionStage = stage;
    updateStageSelectionUI(stage);
}

// Update the UI to show selected stage
function updateStageSelectionUI(stage) {
    const options = document.querySelectorAll('.stage-selector__option');
    options.forEach(option => {
        if (option.dataset.stage === stage) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// Handle adoption stage form submit
async function handleAdoptionStageSubmit(event) {
    event.preventDefault();

    if (!currentCustomer || !selectedAdoptionStage) {
        console.error('Missing customer or stage data');
        return;
    }

    const customerId = currentCustomer.id;
    const notes = document.getElementById('adoptionStageNotes')?.value || '';

    // If stage hasn't changed, just close
    if (selectedAdoptionStage === currentCustomer.adoption_stage) {
        closeAdoptionStageModal();
        return;
    }

    const submitBtn = document.getElementById('adoptionStageSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    try {
        // Use dedicated adoption-stage endpoint that tracks history
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}/adoption-stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adoption_stage: selectedAdoptionStage,
                notes: notes || null
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update adoption stage');
        }

        const updatedCustomer = await response.json();
        currentCustomer = updatedCustomer;

        // Update the UI
        updateAdoptionStages(selectedAdoptionStage);

        // Update the stat display
        const statAdoption = document.getElementById('statAdoption');
        if (statAdoption) {
            statAdoption.textContent = ADOPTION_STAGES[selectedAdoptionStage] || selectedAdoptionStage;
        }

        closeAdoptionStageModal();

    } catch (error) {
        console.error('Failed to update adoption stage:', error);
        alert('Failed to update adoption stage. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Expose adoption stage functions to window
window.openAdoptionStageModal = openAdoptionStageModal;
window.closeAdoptionStageModal = closeAdoptionStageModal;
window.selectAdoptionStage = selectAdoptionStage;
window.handleAdoptionStageSubmit = handleAdoptionStageSubmit;

// ==========================================
// EDIT ACCOUNT DETAILS FUNCTIONS
// ==========================================

// Open the edit account modal and populate with current data
async function openEditAccountModal() {
    if (!currentCustomer) {
        console.error('No customer data available');
        return;
    }

    // Load dropdown options from API (in parallel for performance)
    await Promise.all([
        loadAccountManagerOptions(),
        loadCsmOwnerOptions(),
        loadPartnerOptions(),
        loadIndustryOptions(),
        loadEmployeeCountOptions()
    ]);

    // Populate form with current values
    document.getElementById('editContractStart').value = currentCustomer.contract_start_date || '';
    document.getElementById('editContractEnd').value = currentCustomer.contract_end_date || '';
    document.getElementById('editRenewalDate').value = currentCustomer.renewal_date || '';
    document.getElementById('editArr').value = currentCustomer.arr || '';

    // Set dropdown values (after options are loaded)
    document.getElementById('editIndustry').value = currentCustomer.industry || '';
    document.getElementById('editEmployees').value = currentCustomer.employee_count || '';

    // Set current Account Manager
    const amSelect = document.getElementById('editAccountManager');
    if (currentCustomer.account_manager_id) {
        amSelect.value = currentCustomer.account_manager_id;
    }

    // Set current CSM owner
    const csmSelect = document.getElementById('editCsmOwner');
    if (currentCustomer.csm_owner_id) {
        csmSelect.value = currentCustomer.csm_owner_id;
    }

    // Set current partner
    const partnerSelect = document.getElementById('editPartner');
    if (partnerSelect && currentCustomer.partner_id) {
        partnerSelect.value = currentCustomer.partner_id;
    }

    // Open modal
    document.getElementById('editAccountModal').classList.add('open');
}

// Load Account Manager options from users API
async function loadAccountManagerOptions() {
    const select = document.getElementById('editAccountManager');

    try {
        const response = await API.UserAPI.getAll();
        // Filter to only show users with account_manager role
        const users = (response.items || []).filter(u => u.role === 'account_manager' && u.is_active);

        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select Account Manager</option>';

        // Add user options
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name || `${user.first_name} ${user.last_name}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Load CSM Owner options from users API
async function loadCsmOwnerOptions() {
    const select = document.getElementById('editCsmOwner');

    try {
        const response = await API.UserAPI.getAll();
        const users = response.items || [];

        // Clear existing options except the first one
        select.innerHTML = '<option value="">Select CSM Owner</option>';

        // Add user options
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.full_name || `${user.first_name} ${user.last_name}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// Load Partner options from partners API
async function loadPartnerOptions() {
    const select = document.getElementById('editPartner');
    if (!select) return;

    try {
        const response = await API.PartnerAPI.getAll();
        const partners = (response.items || []).filter(p => p.is_active);

        // Clear existing options except the first one
        select.innerHTML = '<option value="">No Partner</option>';

        // Add partner options
        partners.forEach(partner => {
            const option = document.createElement('option');
            option.value = partner.id;
            option.textContent = partner.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load partners:', error);
    }
}

// Load Industry options from lookups API
async function loadIndustryOptions() {
    const select = document.getElementById('editIndustry');
    if (!select) return;

    try {
        const response = await API.LookupAPI.getCategoryValues('industry');
        const values = (response.values || []).filter(v => v.is_active);

        select.innerHTML = '<option value="">Select industry</option>';

        values.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load industries:', error);
        // Fallback to basic options if API fails
        select.innerHTML = `
            <option value="">Select industry</option>
            <option value="Financial Services">Financial Services</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Technology">Technology</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Retail">Retail</option>
            <option value="Other">Other</option>
        `;
    }
}

// Load Employee Count options from lookups API
async function loadEmployeeCountOptions() {
    const select = document.getElementById('editEmployees');
    if (!select) return;

    try {
        const response = await API.LookupAPI.getCategoryValues('employee_count');
        const values = (response.values || []).filter(v => v.is_active);

        select.innerHTML = '<option value="">Select range</option>';

        values.forEach(item => {
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.label;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load employee counts:', error);
        // Fallback to basic options if API fails
        select.innerHTML = `
            <option value="">Select range</option>
            <option value="1-50">1-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="501-1000">501-1000</option>
            <option value="1001-5000">1,001-5,000</option>
            <option value="5001-10000">5,001-10,000</option>
            <option value="10000+">10,000+</option>
        `;
    }
}

// Close the edit account modal
function closeEditAccountModal() {
    document.getElementById('editAccountModal').classList.remove('open');
}

// Handle edit account form submit
async function handleEditAccountSubmit(event) {
    event.preventDefault();

    if (!currentCustomer) {
        console.error('No customer data available');
        return;
    }

    const submitBtn = document.getElementById('editAccountSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        // Gather form data
        const updateData = {};

        const accountManagerId = document.getElementById('editAccountManager').value;
        if (accountManagerId !== String(currentCustomer.account_manager_id || '')) {
            updateData.account_manager_id = accountManagerId ? parseInt(accountManagerId) : null;
        }

        const csmOwnerId = document.getElementById('editCsmOwner').value;
        if (csmOwnerId !== String(currentCustomer.csm_owner_id || '')) {
            updateData.csm_owner_id = csmOwnerId ? parseInt(csmOwnerId) : null;
        }

        const partnerId = document.getElementById('editPartner').value;
        if (partnerId !== String(currentCustomer.partner_id || '')) {
            updateData.partner_id = partnerId ? parseInt(partnerId) : null;
        }

        const industry = document.getElementById('editIndustry').value;
        if (industry !== (currentCustomer.industry || '')) {
            updateData.industry = industry || null;
        }

        const employees = document.getElementById('editEmployees').value;
        if (employees !== (currentCustomer.employee_count || '')) {
            updateData.employee_count = employees || null;
        }

        const contractStart = document.getElementById('editContractStart').value;
        if (contractStart !== (currentCustomer.contract_start_date || '')) {
            updateData.contract_start_date = contractStart || null;
        }

        const contractEnd = document.getElementById('editContractEnd').value;
        if (contractEnd !== (currentCustomer.contract_end_date || '')) {
            updateData.contract_end_date = contractEnd || null;
        }

        const renewalDate = document.getElementById('editRenewalDate').value;
        if (renewalDate !== (currentCustomer.renewal_date || '')) {
            updateData.renewal_date = renewalDate || null;
        }

        const arr = document.getElementById('editArr').value;
        const currentArr = currentCustomer.arr ? String(currentCustomer.arr) : '';
        if (arr !== currentArr) {
            updateData.arr = arr ? parseFloat(arr) : null;
        }

        // Only make API call if there are changes
        if (Object.keys(updateData).length > 0) {
            await API.CustomerAPI.update(currentCustomer.id, updateData);

            // Re-fetch customer to get complete data with relationships
            const refreshedCustomer = await API.CustomerAPI.getById(currentCustomer.id);
            currentCustomer = refreshedCustomer;

            // Update the UI
            updateAccountDetailsUI(refreshedCustomer);
        }

        closeEditAccountModal();

    } catch (error) {
        console.error('Failed to update account details:', error);
        alert('Failed to save changes. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Update the account details UI after save
function updateAccountDetailsUI(customer) {
    // Account Manager
    const accountManagerEl = document.getElementById('accountManager');
    if (accountManagerEl) {
        accountManagerEl.textContent = customer.account_manager?.full_name ||
                                       (customer.account_manager ? `${customer.account_manager.first_name} ${customer.account_manager.last_name}` : '-');
    }

    // CSM Owner
    const csmOwnerEl = document.getElementById('csmOwner');
    if (csmOwnerEl) {
        csmOwnerEl.textContent = customer.csm_owner?.full_name ||
                                 (customer.csm_owner ? `${customer.csm_owner.first_name} ${customer.csm_owner.last_name}` : '-');
    }

    // Industry
    const industryEl = document.getElementById('customerIndustry');
    if (industryEl) {
        industryEl.textContent = customer.industry || '-';
    }

    // Employees
    const employeesEl = document.getElementById('customerEmployees');
    if (employeesEl) {
        employeesEl.textContent = customer.employee_count || '-';
    }

    // Contract Start
    const contractStartEl = document.getElementById('contractStart');
    if (contractStartEl) {
        contractStartEl.textContent = customer.contract_start_date ? formatDate(customer.contract_start_date) : '-';
    }

    // Contract End
    const contractEndEl = document.getElementById('contractEnd');
    if (contractEndEl) {
        contractEndEl.textContent = customer.contract_end_date ? formatDate(customer.contract_end_date) : '-';
    }

    // Update header stats if needed
    const statArr = document.getElementById('statArr');
    if (statArr && customer.arr) {
        statArr.textContent = formatCurrency(customer.arr);
    }

    const statRenewal = document.getElementById('statRenewal');
    if (statRenewal && customer.renewal_date) {
        statRenewal.textContent = formatShortDate(customer.renewal_date);
    }

    const statDaysToRenewal = document.getElementById('statDaysToRenewal');
    if (statDaysToRenewal && customer.days_to_renewal !== undefined) {
        statDaysToRenewal.textContent = customer.days_to_renewal;
    }

    // Update partner badge
    const partnerBadge = document.getElementById('partnerBadge');
    if (partnerBadge) {
        if (customer.partner_id && customer.partner) {
            partnerBadge.textContent = customer.partner.name;
            partnerBadge.style.display = 'inline-flex';
        } else {
            partnerBadge.style.display = 'none';
        }
    }
}

// Expose edit account functions to window
window.openEditAccountModal = openEditAccountModal;
window.closeEditAccountModal = closeEditAccountModal;
window.handleEditAccountSubmit = handleEditAccountSubmit;

// ==========================================
// HEALTH SCORE EDITING FUNCTIONS
// ==========================================

// Open the edit health modal
function openEditHealthModal() {
    if (!currentCustomer) {
        console.error('No customer data available');
        return;
    }

    const modal = document.getElementById('editHealthModal');
    if (!modal) return;

    // Populate form with current values
    document.getElementById('editHealthStatus').value = currentCustomer.health_status || 'green';
    document.getElementById('editHealthScore').value = currentCustomer.health_score || '';
    document.getElementById('editHealthTrend').value = currentCustomer.health_trend || '';
    document.getElementById('editHealthOverrideReason').value = currentCustomer.health_override_reason || '';

    modal.classList.add('open');
}

// Close the edit health modal
function closeEditHealthModal() {
    const modal = document.getElementById('editHealthModal');
    if (modal) {
        modal.classList.remove('open');
    }
}

// Handle health score form submission
async function handleEditHealthSubmit(event) {
    event.preventDefault();

    if (!currentCustomer) {
        console.error('No customer data available');
        return;
    }

    const submitBtn = document.getElementById('editHealthSubmitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        const updateData = {};

        // Get form values
        const healthStatus = document.getElementById('editHealthStatus').value;
        if (healthStatus !== currentCustomer.health_status) {
            updateData.health_status = healthStatus;
        }

        const healthScore = document.getElementById('editHealthScore').value;
        const currentScore = currentCustomer.health_score !== null ? String(currentCustomer.health_score) : '';
        if (healthScore !== currentScore) {
            updateData.health_score = healthScore ? parseInt(healthScore) : null;
        }

        const healthTrend = document.getElementById('editHealthTrend').value;
        if (healthTrend !== (currentCustomer.health_trend || '')) {
            updateData.health_trend = healthTrend || null;
        }

        const overrideReason = document.getElementById('editHealthOverrideReason').value.trim();
        if (overrideReason !== (currentCustomer.health_override_reason || '')) {
            updateData.health_override_reason = overrideReason || null;
        }

        // Only update if there are changes
        if (Object.keys(updateData).length === 0) {
            closeEditHealthModal();
            return;
        }

        // Send update to API
        const updatedCustomer = await API.CustomerAPI.update(currentCustomer.id, updateData);

        // Update local state
        currentCustomer = { ...currentCustomer, ...updatedCustomer };

        // Update UI
        updateHealthScoreDisplay(currentCustomer);

        closeEditHealthModal();
        showToast('Health score updated successfully', 'success');

    } catch (error) {
        console.error('Failed to update health score:', error);
        showToast('Failed to update health score', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Update the health score display in the UI
function updateHealthScoreDisplay(customer) {
    const score = customer.health_score;
    const status = customer.health_status || 'green';
    const trend = customer.health_trend;

    // Update score circle
    const scoreCircle = document.getElementById('healthScoreCircle');
    const scoreValue = document.getElementById('healthScoreValue');

    if (scoreValue) {
        scoreValue.textContent = score !== null && score !== undefined ? score : '-';
    }

    // Calculate gradient based on score (0-100 maps to 0-360 degrees)
    const degrees = score !== null && score !== undefined ? (score / 100) * 360 : 0;

    // Get color based on status
    const colorMap = {
        'green': 'var(--health-green)',
        'yellow': 'var(--health-yellow)',
        'red': 'var(--health-red)'
    };
    const color = colorMap[status] || colorMap.green;

    if (scoreCircle) {
        scoreCircle.style.background = `conic-gradient(${color} 0deg ${degrees}deg, var(--cds-background-hover) ${degrees}deg 360deg)`;
    }
    if (scoreValue) {
        scoreValue.style.color = color;
    }

    // Update trend display
    const trendEl = document.getElementById('healthTrend');
    if (trendEl && trend) {
        const trendIcons = {
            'improving': { text: 'Improving', class: 'text-success', icon: '↑' },
            'stable': { text: 'Stable', class: 'text-secondary', icon: '→' },
            'declining': { text: 'Declining', class: 'text-danger', icon: '↓' }
        };
        const trendInfo = trendIcons[trend] || { text: trend, class: '', icon: '' };
        trendEl.textContent = `${trendInfo.icon} ${trendInfo.text}`;
        trendEl.className = trendInfo.class;
    }

    // Update health status badge in header if exists
    const headerHealthBadge = document.getElementById('customerHealth');
    if (headerHealthBadge) {
        const statusLabels = { 'green': 'Healthy', 'yellow': 'Needs Attention', 'red': 'At Risk' };
        headerHealthBadge.textContent = statusLabels[status] || status;
        headerHealthBadge.className = `tag tag--${status}`;
    }
}

// Expose health modal functions to window
window.openEditHealthModal = openEditHealthModal;
window.closeEditHealthModal = closeEditHealthModal;
window.handleEditHealthSubmit = handleEditHealthSubmit;

// ==========================================
// SPM MATURITY ASSESSMENT FUNCTIONS
// ==========================================

let currentAssessment = null;
let customerAssessments = [];
let assessmentTemplate = null;
let assessmentResponses = {};
let currentQuestionIndex = 0;
let assessmentQuestions = [];
let spmRadarChart = null;
let currentEditingAssessmentId = null; // Track if we're editing an existing assessment

// Multi-assessment type state
let activeAssessmentTypeTab = 'spm';
let assessmentsByType = {}; // { spm: {...}, tbm: {...}, finops: {...} }
let targetsByType = {}; // Targets filtered by assessment type

// Assessment type ID mapping
const ASSESSMENT_TYPE_IDS = {
    'spm': 1,
    'tbm': 2,
    'finops': 3
};

// Switch between assessment type tabs (SPM, TBM, FinOps)
function switchAssessmentTypeTab(typeCode) {
    activeAssessmentTypeTab = typeCode;

    // Update tab button states
    document.querySelectorAll('.assessment-type-tab').forEach(tab => {
        if (tab.dataset.type === typeCode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update content based on active type
    updateAssessmentTabContent(typeCode);

    // Load targets for this type
    const customerId = getCustomerId();
    if (customerId) {
        loadTargetsByType(customerId, typeCode);
    }
}

// Update tab scores in the tab buttons
function updateAssessmentTabScores(comprehensiveReport) {
    if (!comprehensiveReport || !comprehensiveReport.assessment_reports) return;

    for (const typeReport of comprehensiveReport.assessment_reports) {
        const typeCode = typeReport.assessment_type.code;
        const scoreEl = document.getElementById(`tab${typeCode.charAt(0).toUpperCase() + typeCode.slice(1)}Score`);
        if (scoreEl) {
            if (typeReport.scores.overall_score !== null) {
                scoreEl.textContent = typeReport.scores.overall_score.toFixed(1);
            } else {
                scoreEl.textContent = '-';
            }
        }
    }
}

// Update assessment content for the selected type
function updateAssessmentTabContent(typeCode) {
    // Use the existing comprehensive report data if available
    const typeData = assessmentsByType[typeCode];

    if (!typeData || !typeData.has_assessment) {
        // Show empty state for this type
        document.getElementById('noAssessmentState').style.display = 'block';
        document.getElementById('assessmentContent').style.display = 'none';
    } else {
        // Show assessment content
        document.getElementById('noAssessmentState').style.display = 'none';
        document.getElementById('assessmentContent').style.display = 'block';

        // Update radar chart and dimension scores for this type
        if (typeData.dimensions && typeData.dimensions.length > 0) {
            const dimensionScores = {};
            typeData.dimensions.forEach(d => {
                dimensionScores[d.name] = d.score;
            });
            renderRadarChart(dimensionScores);
            renderDimensionScoresCards(typeData.dimensions);

            // Update currentAssessment to reflect the selected framework's data
            // This ensures the modal and other features use the correct framework
            currentAssessment = {
                ...currentAssessment,
                dimension_scores: dimensionScores,
                id: typeData.assessment_id,
                assessment_date: typeData.assessment_date,
                assessment_type_code: typeCode
            };

            // Update overall score display
            const overallScoreValue = document.getElementById('overallScoreValue');
            if (overallScoreValue && typeData.overall_score !== null) {
                overallScoreValue.textContent = typeData.overall_score.toFixed(1);
            }
        }
    }
}

// Render dimension score cards
function renderDimensionScoresCards(dimensions) {
    const container = document.getElementById('dimensionScoreCards');
    if (!container) return;

    if (!dimensions || dimensions.length === 0) {
        container.innerHTML = '<div class="text-secondary">No dimension scores available</div>';
        return;
    }

    let html = '';
    for (const dim of dimensions) {
        const score = dim.score || 0;
        const percentage = (score / 5) * 100;
        let statusClass = 'danger';
        if (score >= 4) statusClass = 'success';
        else if (score >= 3) statusClass = 'warning';
        else if (score >= 2) statusClass = 'caution';

        html += `
            <div class="dimension-score-card">
                <div class="dimension-score-card__header">
                    <span class="dimension-score-card__name">${escapeHtml(dim.name)}</span>
                    <span class="dimension-score-card__score">${score.toFixed(1)}</span>
                </div>
                <div class="progress" style="height: 4px;">
                    <div class="progress__bar progress__bar--${statusClass}" style="width: ${percentage}%;"></div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Load targets filtered by assessment type
async function loadTargetsByType(customerId, typeCode) {
    const typeId = ASSESSMENT_TYPE_IDS[typeCode];

    try {
        const url = typeId
            ? `${API_BASE_URL}/assessments/customer/${customerId}/targets?assessment_type_id=${typeId}`
            : `${API_BASE_URL}/assessments/customer/${customerId}/targets`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load targets');
        const data = await response.json();

        targetsByType[typeCode] = data.items || [];
        customerTargets = targetsByType[typeCode]; // Update global for compatibility
        renderTargetsList();

        // Update active target for chart overlay
        activeTarget = customerTargets.find(t => t.is_active);

    } catch (error) {
        console.error('Failed to load targets by type:', error);
        targetsByType[typeCode] = [];
        customerTargets = [];
        renderTargetsList();
    }
}

// Expose tab switching function
window.switchAssessmentTypeTab = switchAssessmentTypeTab;

// Load assessments for the customer
async function loadAssessments(customerId) {
    try {
        // Get all assessments (including drafts and in-progress)
        const allAssessments = await API.AssessmentAPI.getCustomerAssessments(customerId);
        customerAssessments = allAssessments.items || [];

        // Also get history for comparison data (only completed)
        const history = await API.AssessmentAPI.getCustomerHistory(customerId);

        // Find if there's an in-progress assessment
        const inProgressAssessment = customerAssessments.find(a =>
            a.status === 'draft' || a.status === 'in_progress'
        );

        if (customerAssessments.length === 0) {
            showNoAssessmentState();
        } else if (inProgressAssessment) {
            // Show in-progress state with option to continue
            showInProgressAssessmentState(inProgressAssessment);
            // Also display the most recent completed assessment if any
            const completedAssessments = customerAssessments.filter(a => a.status === 'completed');
            if (completedAssessments.length > 0) {
                // Sort by id descending to get most recent, prefer ones with scores
                const sorted = [...completedAssessments].sort((a, b) => {
                    const aHasScores = a.dimension_scores && Object.keys(a.dimension_scores).length > 0;
                    const bHasScores = b.dimension_scores && Object.keys(b.dimension_scores).length > 0;
                    if (aHasScores && !bHasScores) return -1;
                    if (!aHasScores && bHasScores) return 1;
                    return b.id - a.id; // Most recent first
                });
                currentAssessment = sorted[0];
                displayAssessment(currentAssessment, history.comparison);
            }
        } else {
            // Sort by id descending to get most recent
            const sorted = [...customerAssessments].sort((a, b) => b.id - a.id);
            currentAssessment = sorted[0];
            displayAssessment(currentAssessment, history.comparison);
        }

        // Always render history table with all assessments
        renderAssessmentHistory(customerAssessments);
        // Update the overview summary card
        renderAssessmentSummary(customerAssessments);

        // Populate assessmentsByType from comprehensive report for tab switching
        try {
            const report = await API.AssessmentTypeAPI.getComprehensiveReport(customerId);
            if (report && report.assessment_reports) {
                for (const typeReport of report.assessment_reports) {
                    const typeCode = typeReport.assessment_type.code;
                    assessmentsByType[typeCode] = {
                        has_assessment: typeReport.scores.has_assessment,
                        overall_score: typeReport.scores.overall_score,
                        dimensions: typeReport.scores.dimensions || [],
                        assessment_id: typeReport.latest_assessment?.id,
                        assessment_date: typeReport.latest_assessment?.assessment_date
                    };
                }
                // Update tab scores in the tab buttons
                updateAssessmentTabScores(report);

                // Update content to show the active tab's assessment (not just the most recent)
                updateAssessmentTabContent(activeAssessmentTypeTab);
            }
        } catch (reportError) {
            console.warn('Could not load comprehensive report for tabs:', reportError);
        }

        // Load targets for the active tab
        loadTargetsByType(customerId, activeAssessmentTypeTab);

    } catch (error) {
        console.error('Failed to load assessments:', error);
        showNoAssessmentState();
        renderAssessmentSummary([]); // Clear summary on error
    }
}

// Render SPM Assessment summary on Overview section
function renderAssessmentSummary(assessments) {
    const container = document.getElementById('spmAssessmentSummaryContainer');
    if (!container) return;

    // Find the most recent completed assessment with scores
    const completedAssessments = assessments.filter(a => a.status === 'completed');
    // Sort by: has scores first, then by id descending
    completedAssessments.sort((a, b) => {
        const aHasScores = a.dimension_scores && Object.keys(a.dimension_scores).length > 0;
        const bHasScores = b.dimension_scores && Object.keys(b.dimension_scores).length > 0;
        if (aHasScores && !bHasScores) return -1;
        if (!aHasScores && bHasScores) return 1;
        return b.id - a.id;
    });
    const completedAssessment = completedAssessments[0] || null;
    const inProgressAssessment = assessments.find(a => a.status === 'draft' || a.status === 'in_progress');

    if (!completedAssessment && !inProgressAssessment) {
        container.innerHTML = `
            <div style="text-align: center; padding: 16px;">
                <div class="text-secondary" style="font-size: 13px;">No assessment completed</div>
                <button class="btn btn--primary btn--sm mt-3" onclick="showSection('spmAssessment'); openNewAssessmentModal();">
                    Start Assessment
                </button>
            </div>
        `;
        return;
    }

    if (completedAssessment) {
        const score = completedAssessment.overall_score || 0;
        const maxScore = 5;
        const percentage = (score / maxScore) * 100;
        const assessmentDate = new Date(completedAssessment.assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Determine color based on score
        let scoreColor = 'var(--cds-support-error)'; // Red for low
        if (score >= 4) scoreColor = 'var(--cds-support-success)'; // Green for high
        else if (score >= 3) scoreColor = 'var(--cds-support-warning)'; // Yellow for medium
        else if (score >= 2) scoreColor = '#f57c00'; // Orange for low-medium

        // Get dimension scores for mini display
        const dimensionScores = completedAssessment.dimension_scores || {};
        const dimensions = Object.entries(dimensionScores);

        container.innerHTML = `
            <div class="flex gap-4" style="align-items: center;">
                <div style="text-align: center; min-width: 80px;">
                    <div style="position: relative; width: 70px; height: 70px; margin: 0 auto;">
                        <svg width="70" height="70" viewBox="0 0 70 70">
                            <circle cx="35" cy="35" r="30" fill="none" stroke="var(--cds-border-subtle-01)" stroke-width="6"/>
                            <circle cx="35" cy="35" r="30" fill="none" stroke="${scoreColor}" stroke-width="6"
                                stroke-dasharray="${percentage * 1.885} 188.5"
                                stroke-linecap="round"
                                transform="rotate(-90 35 35)"/>
                        </svg>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 18px; font-weight: 600; color: ${scoreColor};">
                            ${score.toFixed(1)}
                        </div>
                    </div>
                    <div class="text-secondary" style="font-size: 11px; margin-top: 4px;">/ 5.0 Maturity</div>
                </div>
                <div style="flex: 1; font-size: 13px;">
                    ${dimensions.slice(0, 3).map(([name, dimScore]) => `
                        <div class="flex flex-between mb-2">
                            <span class="text-secondary">${name}</span>
                            <span style="font-weight: 500;">${dimScore.toFixed(1)}</span>
                        </div>
                    `).join('')}
                    ${dimensions.length > 3 ? `<div class="text-secondary" style="font-size: 11px;">+${dimensions.length - 3} more dimensions</div>` : ''}
                    <div class="text-secondary" style="font-size: 11px; margin-top: 8px;">Assessed: ${assessmentDate}</div>
                </div>
            </div>
        `;
    } else if (inProgressAssessment) {
        // Show in-progress state
        container.innerHTML = `
            <div style="text-align: center; padding: 12px;">
                <div style="display: inline-flex; align-items: center; gap: 8px; color: var(--cds-support-warning);">
                    <svg width="16" height="16" viewBox="0 0 32 32"><path fill="currentColor" d="M16 4a12 12 0 1012 12A12 12 0 0016 4zm0 22a10 10 0 1110-10 10 10 0 01-10 10z"/><path fill="currentColor" d="M16 10h-2v8h2v-8zm0 10h-2v2h2v-2z"/></svg>
                    <span style="font-weight: 500;">Assessment In Progress</span>
                </div>
                <button class="btn btn--primary btn--sm mt-3" onclick="showSection('spmAssessment'); resumeAssessment(${inProgressAssessment.id});">
                    Continue Assessment
                </button>
            </div>
        `;
    }
}

// Show "no assessment" state
function showNoAssessmentState() {
    document.getElementById('noAssessmentState').style.display = 'block';
    document.getElementById('assessmentContent').style.display = 'none';
    // Hide in-progress banner
    const inProgressBanner = document.getElementById('inProgressAssessmentBanner');
    if (inProgressBanner) inProgressBanner.style.display = 'none';
}

// Show in-progress assessment banner
function showInProgressAssessmentState(assessment) {
    // Create or show the in-progress banner
    let banner = document.getElementById('inProgressAssessmentBanner');
    if (!banner) {
        // Create the banner element
        banner = document.createElement('div');
        banner.id = 'inProgressAssessmentBanner';
        banner.className = 'notification notification--warning mb-4';
        banner.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 16px;';

        // Insert at the top of SPM Assessment section
        const spmSection = document.getElementById('spmAssessmentSection');
        if (spmSection) {
            const cardBody = spmSection.querySelector('.card__body') || spmSection.firstElementChild;
            if (cardBody) {
                cardBody.insertBefore(banner, cardBody.firstChild);
            }
        }
    }

    const answeredCount = assessment.overall_score !== null ? 'some' : '0';
    banner.innerHTML = `
        <div class="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="var(--cds-support-warning)">
                <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm-1 7h2v10h-2V9zm1 16c-.8 0-1.5-.7-1.5-1.5S15.2 22 16 22s1.5.7 1.5 1.5S16.8 25 16 25z"/>
            </svg>
            <div>
                <strong>Assessment in Progress</strong>
                <p class="text-secondary" style="margin: 0; font-size: 12px;">
                    Started on ${formatDate(assessment.assessment_date)} - ${formatAssessmentStatus(assessment.status)}
                </p>
            </div>
        </div>
        <button class="btn btn--primary btn--sm" onclick="resumeAssessment(${assessment.id})">
            Continue Assessment
        </button>
    `;
    banner.style.display = 'flex';
}

// Display assessment data
function displayAssessment(assessment, comparison) {
    document.getElementById('noAssessmentState').style.display = 'none';
    document.getElementById('assessmentContent').style.display = 'block';

    // Overall score
    const overallScore = assessment.overall_score ? assessment.overall_score.toFixed(1) : '-';
    document.getElementById('overallScoreValue').textContent = overallScore;

    // Details
    document.getElementById('assessmentDate').textContent = formatDate(assessment.assessment_date);
    document.getElementById('assessmentVersion').textContent = assessment.template?.version || 'v1.0';
    document.getElementById('assessmentStatus').textContent = formatAssessmentStatus(assessment.status);
    document.getElementById('assessmentCompletedBy').textContent = assessment.completed_by
        ? `${assessment.completed_by.first_name} ${assessment.completed_by.last_name}`
        : '-';

    // Dimension scores
    renderDimensionScores(assessment.dimension_scores);

    // Radar chart
    renderRadarChart(assessment.dimension_scores);

    // Trend comparison
    if (comparison && comparison.previous) {
        renderTrendComparison(comparison);
    } else {
        document.getElementById('assessmentTrendSection').style.display = 'none';
    }

    // History table
    renderAssessmentHistory(customerAssessments);
}

// Format assessment status
function formatAssessmentStatus(status) {
    const labels = {
        'draft': 'Draft',
        'in_progress': 'In Progress',
        'completed': 'Completed'
    };
    return labels[status] || status;
}

// Render dimension score cards
function renderDimensionScores(dimensionScores) {
    const container = document.getElementById('dimensionScoreCards');
    if (!dimensionScores || Object.keys(dimensionScores).length === 0) {
        container.innerHTML = '<p class="text-secondary">No dimension scores available</p>';
        return;
    }

    let html = '';
    for (const [dimension, score] of Object.entries(dimensionScores)) {
        const scoreNum = typeof score === 'number' ? score.toFixed(1) : '-';
        const percentage = typeof score === 'number' ? (score / 5) * 100 : 0;

        html += `
            <div class="dimension-score-card">
                <div class="dimension-score-card__name">${dimension}</div>
                <div class="dimension-score-card__score">${scoreNum}</div>
                <div class="dimension-score-card__bar">
                    <div class="dimension-score-card__fill" style="width: ${percentage}%;"></div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// State for assessment comparison
let selectedAssessmentsForComparison = [];

// Color palette for comparison chart
const comparisonColors = [
    { bg: 'rgba(15, 98, 254, 0.2)', border: 'rgba(15, 98, 254, 1)', point: 'rgba(15, 98, 254, 1)' },       // Blue
    { bg: 'rgba(255, 131, 0, 0.2)', border: 'rgba(255, 131, 0, 1)', point: 'rgba(255, 131, 0, 1)' },       // Orange
    { bg: 'rgba(36, 161, 72, 0.2)', border: 'rgba(36, 161, 72, 1)', point: 'rgba(36, 161, 72, 1)' },       // Green
    { bg: 'rgba(162, 25, 255, 0.2)', border: 'rgba(162, 25, 255, 1)', point: 'rgba(162, 25, 255, 1)' },    // Purple
    { bg: 'rgba(218, 30, 40, 0.2)', border: 'rgba(218, 30, 40, 1)', point: 'rgba(218, 30, 40, 1)' }        // Red
];

// Render radar/spider chart with optional comparison datasets
function renderRadarChart(dimensionScores, comparisonAssessments = []) {
    const ctx = document.getElementById('spmRadarChart');
    if (!ctx) return;

    // Destroy existing chart if any
    if (spmRadarChart) {
        spmRadarChart.destroy();
    }

    if (!dimensionScores || Object.keys(dimensionScores).length === 0) {
        return;
    }

    const labels = Object.keys(dimensionScores);
    const data = Object.values(dimensionScores);

    // Build datasets array - primary assessment first
    const datasets = [{
        label: 'Current Assessment',
        data: data,
        backgroundColor: comparisonColors[0].bg,
        borderColor: comparisonColors[0].border,
        borderWidth: 2,
        pointBackgroundColor: comparisonColors[0].point,
        pointRadius: 4
    }];

    // Add comparison datasets
    comparisonAssessments.forEach((assessment, index) => {
        if (assessment.dimension_scores && Object.keys(assessment.dimension_scores).length > 0) {
            const colorIndex = (index + 1) % comparisonColors.length;
            const comparisonData = labels.map(label => assessment.dimension_scores[label] || 0);
            const assessmentDate = new Date(assessment.assessment_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            datasets.push({
                label: assessmentDate,
                data: comparisonData,
                backgroundColor: comparisonColors[colorIndex].bg,
                borderColor: comparisonColors[colorIndex].border,
                borderWidth: 2,
                borderDash: [5, 5],  // Dashed line for comparison
                pointBackgroundColor: comparisonColors[colorIndex].point,
                pointRadius: 3
            });
        }
    });

    spmRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    left: 120,
                    right: 120,
                    top: 20,
                    bottom: 20
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: '#525252',
                        backdropColor: 'transparent',
                        font: { size: 10 },
                        showLabelBackdrop: false
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        color: '#161616',
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        padding: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'bottom',
                    labels: {
                        color: '#161616',
                        usePointStyle: true,
                        padding: 16,
                        font: { size: 12 }
                    }
                }
            }
        }
    });

    // Update comparison legend UI
    updateComparisonLegend(datasets);
}

// Update the comparison legend below the chart
function updateComparisonLegend(datasets) {
    const legendContainer = document.getElementById('comparisonLegend');
    if (!legendContainer) return;

    if (datasets.length <= 1) {
        legendContainer.innerHTML = '';
        legendContainer.style.display = 'none';
        return;
    }

    legendContainer.style.display = 'flex';
    let html = '';
    datasets.forEach((ds, index) => {
        const isDashed = ds.borderDash && ds.borderDash.length > 0;
        html += `
            <div class="comparison-legend-item">
                <span class="comparison-legend-color" style="background-color: ${ds.borderColor}; ${isDashed ? 'border: 2px dashed ' + ds.borderColor + '; background: transparent;' : ''}"></span>
                <span class="comparison-legend-label">${ds.label}</span>
            </div>
        `;
    });
    legendContainer.innerHTML = html;
}

// ============================================================
// RADAR CHART MODAL & CLIPBOARD
// ============================================================

let largeRadarChart = null;

function openRadarChartModal() {
    if (!currentAssessment || !currentAssessment.dimension_scores) {
        return;
    }

    const modal = document.getElementById('radarChartModal');
    modal.classList.add('open');

    // Update modal title based on active framework tab
    const frameworkNames = {
        'spm': 'SPM Maturity Assessment',
        'tbm': 'TBM Maturity Assessment',
        'finops': 'FinOps Maturity Assessment'
    };
    const modalTitle = modal.querySelector('.modal__title');
    if (modalTitle) {
        modalTitle.textContent = frameworkNames[activeAssessmentTypeTab] || 'Maturity Assessment';
    }

    // Render larger chart after modal is visible
    setTimeout(() => {
        renderLargeRadarChart();
    }, 100);
}

function closeRadarChartModal() {
    const modal = document.getElementById('radarChartModal');
    modal.classList.remove('open');

    if (largeRadarChart) {
        largeRadarChart.destroy();
        largeRadarChart = null;
    }
}

function renderLargeRadarChart() {
    const ctx = document.getElementById('spmRadarChartLarge');
    if (!ctx) return;

    if (largeRadarChart) {
        largeRadarChart.destroy();
    }

    const dimensionScores = currentAssessment.dimension_scores;
    if (!dimensionScores || Object.keys(dimensionScores).length === 0) {
        return;
    }

    const labels = Object.keys(dimensionScores);
    const data = Object.values(dimensionScores);

    // Build datasets - include target if active
    const datasets = [{
        label: 'Current Assessment',
        data: data,
        backgroundColor: 'rgba(15, 98, 254, 0.2)',
        borderColor: 'rgba(15, 98, 254, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(15, 98, 254, 1)',
        pointRadius: 5
    }];

    // Add target overlay if there's an active target
    const activeTarget = customerTargets.find(t => t.is_active);
    if (activeTarget && activeTarget.target_scores) {
        const targetData = labels.map(label => activeTarget.target_scores[label] || 0);
        datasets.push({
            label: `Target: ${activeTarget.name}`,
            data: targetData,
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            borderColor: 'rgba(245, 158, 11, 1)',
            borderWidth: 2,
            borderDash: [8, 4],
            pointBackgroundColor: 'rgba(245, 158, 11, 1)',
            pointRadius: 4
        });
    }

    // Add comparison assessments if any
    selectedAssessmentsForComparison.forEach((assessment, index) => {
        if (assessment.dimension_scores) {
            const colorIndex = (index + 1) % comparisonColors.length;
            const comparisonData = labels.map(label => assessment.dimension_scores[label] || 0);
            const assessmentDate = new Date(assessment.assessment_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            datasets.push({
                label: assessmentDate,
                data: comparisonData,
                backgroundColor: comparisonColors[colorIndex].bg,
                borderColor: comparisonColors[colorIndex].border,
                borderWidth: 2,
                borderDash: [5, 5],
                pointBackgroundColor: comparisonColors[colorIndex].point,
                pointRadius: 4
            });
        }
    });

    largeRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 80,
                    right: 80,
                    top: 20,
                    bottom: 20
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: '#525252',
                        backdropColor: 'transparent',
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        color: '#171717',
                        font: { size: 13, weight: '500' },
                        padding: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#525252',
                        padding: 20,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

async function copyRadarChartToClipboard() {
    const canvas = document.getElementById('spmRadarChartLarge');
    if (!canvas) {
        alert('No chart to copy');
        return;
    }

    try {
        // Create a temporary canvas with white background
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill with white background
        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw the chart on top
        tempCtx.drawImage(canvas, 0, 0);

        // Convert to blob and copy to clipboard
        tempCanvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);

                // Show success feedback
                const btn = event.target.closest('button');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!';
                btn.classList.add('btn--success');

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.classList.remove('btn--success');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                alert('Failed to copy to clipboard. Try using the Download button instead.');
            }
        }, 'image/png');
    } catch (err) {
        console.error('Failed to create image:', err);
        alert('Failed to create image');
    }
}

function downloadRadarChart() {
    const canvas = document.getElementById('spmRadarChartLarge');
    if (!canvas) {
        alert('No chart to download');
        return;
    }

    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Fill with white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the chart on top
    tempCtx.drawImage(canvas, 0, 0);

    // Create download link
    const link = document.createElement('a');
    const customerName = currentCustomer ? currentCustomer.name.replace(/[^a-z0-9]/gi, '_') : 'assessment';
    const date = new Date().toISOString().split('T')[0];
    link.download = `${customerName}_spm_maturity_${date}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
}

// Toggle assessment selection for comparison
function toggleAssessmentComparison(assessmentId, checkbox) {
    const assessment = customerAssessments.find(a => a.id === assessmentId);
    if (!assessment) return;

    if (checkbox.checked) {
        // Max 4 comparisons (including current)
        if (selectedAssessmentsForComparison.length >= 4) {
            checkbox.checked = false;
            alert('You can compare up to 4 assessments at a time');
            return;
        }
        selectedAssessmentsForComparison.push(assessment);
    } else {
        selectedAssessmentsForComparison = selectedAssessmentsForComparison.filter(a => a.id !== assessmentId);
    }

    // Re-render chart with comparisons
    if (currentAssessment) {
        const comparisons = selectedAssessmentsForComparison.filter(a => a.id !== currentAssessment.id);
        renderRadarChart(currentAssessment.dimension_scores, comparisons);
    }
}

// Clear all comparison selections
function clearComparisonSelections() {
    selectedAssessmentsForComparison = [];
    // Uncheck all checkboxes
    document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = false);
    // Re-render chart without comparisons
    if (currentAssessment) {
        renderRadarChart(currentAssessment.dimension_scores);
    }
}

// Render trend comparison indicators
function renderTrendComparison(comparison) {
    const container = document.getElementById('trendIndicators');
    const section = document.getElementById('assessmentTrendSection');

    if (!comparison || !comparison.dimension_changes) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    let html = '';
    for (const [dimension, change] of Object.entries(comparison.dimension_changes)) {
        const changeNum = typeof change === 'number' ? change : 0;
        const isUp = changeNum > 0;
        const isDown = changeNum < 0;
        const arrow = isUp ? '&#x2191;' : isDown ? '&#x2193;' : '&#x2194;';
        const colorClass = isUp ? 'trend-up' : isDown ? 'trend-down' : 'trend-same';

        html += `
            <div class="trend-indicator">
                <span class="trend-indicator__name">${dimension}</span>
                <span class="trend-indicator__change ${colorClass}">
                    ${arrow} ${isUp ? '+' : ''}${changeNum.toFixed(1)}
                </span>
            </div>
        `;
    }

    if (comparison.overall_change !== null && comparison.overall_change !== undefined) {
        const overallUp = comparison.overall_change > 0;
        const overallDown = comparison.overall_change < 0;
        html += `
            <div class="trend-indicator trend-indicator--overall">
                <span class="trend-indicator__name">Overall</span>
                <span class="trend-indicator__change ${overallUp ? 'trend-up' : overallDown ? 'trend-down' : 'trend-same'}">
                    ${overallUp ? '&#x2191; +' : overallDown ? '&#x2193; ' : '&#x2194; '}${comparison.overall_change.toFixed(1)}
                </span>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Render assessment history table
function renderAssessmentHistory(assessments) {
    const tbody = document.getElementById('assessmentHistoryTableBody');
    const thead = document.getElementById('assessmentHistoryTableHead');

    if (!assessments || assessments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary">No assessment history</td></tr>';
        return;
    }

    // Update table header to include Compare and Type columns
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th style="width: 50px;">Compare</th>
                <th>Date</th>
                <th>Type</th>
                <th>Version</th>
                <th>Overall Score</th>
                <th>Change</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        `;
    }

    // Separate completed and incomplete assessments for comparison calculation
    const completedAssessments = assessments.filter(a => a.status === 'completed');

    // Reset comparison selections when re-rendering
    selectedAssessmentsForComparison = [];

    let html = '';
    assessments.forEach((assessment, index) => {
        // Only calculate change against previous completed assessment
        let changeHtml = '-';
        if (assessment.status === 'completed') {
            const currentCompletedIdx = completedAssessments.indexOf(assessment);
            const prevCompleted = completedAssessments[currentCompletedIdx + 1];
            if (prevCompleted && assessment.overall_score && prevCompleted.overall_score) {
                const change = assessment.overall_score - prevCompleted.overall_score;
                const isUp = change > 0;
                const isDown = change < 0;
                changeHtml = `<span class="${isUp ? 'trend-up' : isDown ? 'trend-down' : 'trend-same'}">
                    ${isUp ? '&#x2191; +' : isDown ? '&#x2193; ' : ''}${change.toFixed(1)}
                </span>`;
            }
        }

        const isIncomplete = assessment.status === 'draft' || assessment.status === 'in_progress';
        const statusClass = assessment.status === 'completed' ? 'tag--green'
            : assessment.status === 'in_progress' ? 'tag--yellow'
            : 'tag--gray';

        // Check if assessment can be compared (completed and has dimension scores)
        const hasScores = assessment.dimension_scores && Object.keys(assessment.dimension_scores).length > 0;
        const canCompare = assessment.status === 'completed' && hasScores;
        const isCurrentAssessment = currentAssessment && assessment.id === currentAssessment.id;

        // Compare checkbox
        const compareCheckbox = canCompare && !isCurrentAssessment
            ? `<input type="checkbox" class="compare-checkbox" data-assessment-id="${assessment.id}" onchange="toggleAssessmentComparison(${assessment.id}, this)" title="Add to comparison">`
            : isCurrentAssessment
                ? `<span class="tag tag--blue tag--sm">Current</span>`
                : `<span class="text-secondary">-</span>`;

        // Show different action button based on status
        const actionButton = isIncomplete
            ? `<button class="btn btn--primary btn--sm" onclick="resumeAssessment(${assessment.id})">Continue</button>
               <button class="btn btn--ghost btn--sm" onclick="deleteAssessment(${assessment.id})" title="Delete">
                   <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M12 12h2v12h-2zm6 0h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/></svg>
               </button>`
            : `<button class="btn btn--ghost btn--sm" onclick="viewAssessmentDetail(${assessment.id})">View</button>
               <button class="btn btn--secondary btn--sm" onclick="openAssessmentReport(${assessment.id})" title="View Report">
                   <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" style="margin-right: 4px;">
                       <path d="M10 18h8v2h-8zm0-5h12v2H10zm0 10h5v2h-5z"/>
                       <path d="M25 5h-3V4a2 2 0 00-2-2h-8a2 2 0 00-2 2v1H7a2 2 0 00-2 2v21a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2zm-13-1h8v4h-8zm13 24H7V7h3v3h12V7h3z"/>
                   </svg>
                   Report
               </button>`;

        // Assessment type display with edit capability
        const assessmentType = assessment.assessment_type;
        const typeColor = assessmentType?.color || '#6f6f6f';
        const typeName = assessmentType?.short_name || 'Not Set';
        const typeHtml = `
            <span class="tag tag--clickable" style="background-color: ${typeColor}; color: white; cursor: pointer;"
                  onclick="openEditAssessmentTypeModal(${assessment.id}, ${assessment.assessment_type_id || 'null'})"
                  title="Click to change assessment type">
                ${typeName}
                <svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor" style="margin-left: 4px; opacity: 0.7;">
                    <path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"/>
                </svg>
            </span>
        `;

        html += `
            <tr${isIncomplete ? ' class="assessment-row--incomplete"' : ''}>
                <td class="text-center">${compareCheckbox}</td>
                <td>${formatDate(assessment.assessment_date)}</td>
                <td>${typeHtml}</td>
                <td>${assessment.template?.version || 'v1.0'}</td>
                <td><strong>${assessment.overall_score ? assessment.overall_score.toFixed(1) : '-'}</strong> / 5.0</td>
                <td>${changeHtml}</td>
                <td><span class="tag ${statusClass}">${formatAssessmentStatus(assessment.status)}</span></td>
                <td class="flex gap-2">
                    ${actionButton}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;

    // Initialize table sorting (Date, Version, Score, Change, Status - not Compare/Actions)
    if (window.TableSort) {
        TableSort.init('assessmentHistoryTable', [1, 2, 3, 4, 5]);
    }
}

// View assessment detail
async function viewAssessmentDetail(assessmentId) {
    try {
        const assessment = await API.AssessmentAPI.getAssessment(assessmentId);
        currentAssessment = assessment;
        displayAssessment(assessment, null);
    } catch (error) {
        console.error('Failed to load assessment:', error);
        alert('Failed to load assessment details.');
    }
}

// ============================================================
// EDIT ASSESSMENT TYPE FUNCTIONS
// ============================================================

let cachedAssessmentTypes = null;

async function loadAssessmentTypes() {
    if (cachedAssessmentTypes) return cachedAssessmentTypes;
    try {
        const response = await API.AssessmentTypeAPI.getAll();
        cachedAssessmentTypes = response.items || response;
        return cachedAssessmentTypes;
    } catch (error) {
        console.error('Failed to load assessment types:', error);
        return [];
    }
}

async function openEditAssessmentTypeModal(assessmentId, currentTypeId) {
    const modal = document.getElementById('editAssessmentTypeModal');
    const select = document.getElementById('assessmentTypeSelect');
    const hiddenInput = document.getElementById('editAssessmentTypeId');

    // Store the assessment ID
    hiddenInput.value = assessmentId;

    // Load assessment types and populate dropdown
    const types = await loadAssessmentTypes();
    select.innerHTML = '<option value="">-- Select Type --</option>';
    types.forEach(type => {
        const selected = type.id === currentTypeId ? 'selected' : '';
        select.innerHTML += `<option value="${type.id}" ${selected} style="color: ${type.color};">${type.name} (${type.short_name})</option>`;
    });

    modal.classList.add('is-visible');
}

function closeEditAssessmentTypeModal() {
    const modal = document.getElementById('editAssessmentTypeModal');
    modal.classList.remove('is-visible');
}

async function saveAssessmentType() {
    const assessmentId = document.getElementById('editAssessmentTypeId').value;
    const typeId = document.getElementById('assessmentTypeSelect').value;

    if (!typeId) {
        alert('Please select an assessment type.');
        return;
    }

    try {
        await API.AssessmentAPI.updateAssessment(assessmentId, {
            assessment_type_id: parseInt(typeId)
        });

        closeEditAssessmentTypeModal();

        // Reload assessments to reflect the change
        await loadAssessments(customerId);

        // Also reload the multi-assessment dashboard
        await loadMultiAssessmentDashboard(customerId);

        showToast('Assessment type updated successfully', 'success');
    } catch (error) {
        console.error('Failed to update assessment type:', error);
        alert('Failed to update assessment type. Please try again.');
    }
}

// Export functions for global access
window.openEditAssessmentTypeModal = openEditAssessmentTypeModal;
window.closeEditAssessmentTypeModal = closeEditAssessmentTypeModal;
window.saveAssessmentType = saveAssessmentType;

// Resume an in-progress assessment
async function resumeAssessment(assessmentId) {
    try {
        // Get the assessment with its existing responses
        const assessment = await API.AssessmentAPI.getAssessment(assessmentId);

        if (assessment.status === 'completed') {
            alert('This assessment is already completed.');
            return;
        }

        // Store the assessment ID we're editing
        currentEditingAssessmentId = assessmentId;

        // Get template details
        assessmentTemplate = assessment.template;
        const templateDetail = await API.AssessmentAPI.getTemplate(assessmentTemplate.id);
        assessmentQuestions = templateDetail.questions || [];

        if (assessmentQuestions.length === 0) {
            alert('The assessment template has no questions.');
            return;
        }

        // Sort questions by display order
        assessmentQuestions.sort((a, b) => a.display_order - b.display_order);

        // Restore existing responses
        assessmentResponses = {};
        if (assessment.responses && assessment.responses.length > 0) {
            assessment.responses.forEach(response => {
                assessmentResponses[response.question_id] = {
                    question_id: response.question_id,
                    score: response.score,
                    notes: response.notes
                };
            });
        }

        // Find the first unanswered question to resume from
        let resumeIndex = 0;
        for (let i = 0; i < assessmentQuestions.length; i++) {
            if (!assessmentResponses[assessmentQuestions[i].id]) {
                resumeIndex = i;
                break;
            }
            // If all questions answered, go to last one
            if (i === assessmentQuestions.length - 1) {
                resumeIndex = i;
            }
        }

        currentQuestionIndex = resumeIndex;
        displayQuestion(resumeIndex);

        document.getElementById('newAssessmentModal').classList.add('open');
    } catch (error) {
        console.error('Failed to resume assessment:', error);
        alert('Failed to resume assessment. Please try again.');
    }
}

// Save assessment progress and close
async function saveAndCloseAssessment() {
    // Save current notes if on a question
    const currentQuestion = assessmentQuestions[currentQuestionIndex];
    if (currentQuestion && assessmentResponses[currentQuestion.id]) {
        assessmentResponses[currentQuestion.id].notes = document.getElementById('questionNotes').value || null;
    }

    // Check if there are any responses to save
    const responses = Object.values(assessmentResponses);
    if (responses.length === 0) {
        closeNewAssessmentModal();
        return;
    }

    const saveBtn = document.getElementById('saveCloseBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        const customerId = getCustomerId();

        // If we're editing an existing assessment, use that ID
        let assessmentId = currentEditingAssessmentId;

        // If no existing assessment, create a new one
        if (!assessmentId) {
            const assessment = await API.AssessmentAPI.createAssessment(customerId, {
                template_id: assessmentTemplate.id,
                assessment_date: new Date().toISOString().split('T')[0]
            });
            assessmentId = assessment.id;
        }

        // Save responses (not complete)
        await API.AssessmentAPI.saveResponses(assessmentId, responses, false);

        closeNewAssessmentModal();

        // Show confirmation
        const answered = responses.length;
        const total = assessmentQuestions.length;
        alert(`Progress saved! ${answered} of ${total} questions answered.`);

        // Reload assessments to show in-progress state
        await loadAssessments(customerId);

    } catch (error) {
        console.error('Failed to save assessment:', error);
        alert('Failed to save assessment progress. Please try again.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save & Close';
    }
}

// Delete an assessment
async function deleteAssessment(assessmentId) {
    if (!confirm('Are you sure you want to delete this assessment? This cannot be undone.')) {
        return;
    }

    try {
        await API.AssessmentAPI.deleteAssessment(assessmentId);
        const customerId = getCustomerId();
        await loadAssessments(customerId);
    } catch (error) {
        console.error('Failed to delete assessment:', error);
        alert('Failed to delete assessment. Please try again.');
    }
}

// Open new assessment modal - show template selection
async function openNewAssessmentModal() {
    // Reset state
    currentQuestionIndex = 0;
    assessmentResponses = {};
    currentEditingAssessmentId = null;
    assessmentTemplate = null;
    assessmentQuestions = [];

    // Show template selection step, hide question step
    document.getElementById('templateSelectionStep').style.display = 'block';
    document.getElementById('questionStep').style.display = 'none';
    document.getElementById('assessmentModalTitle').textContent = 'Select Assessment Template';

    // Hide question navigation buttons
    document.getElementById('saveCloseBtn').style.display = 'none';
    document.getElementById('backToTemplatesBtn').style.display = 'none';
    document.getElementById('prevQuestionBtn').style.display = 'none';
    document.getElementById('nextQuestionBtn').style.display = 'none';
    document.getElementById('submitAssessmentBtn').style.display = 'none';

    // Load templates
    const templateList = document.getElementById('templateList');
    templateList.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Loading templates...</div>';

    document.getElementById('newAssessmentModal').classList.add('open');

    try {
        const response = await API.AssessmentAPI.getTemplates();
        const templates = response.items || response || [];

        if (!templates || templates.length === 0) {
            templateList.innerHTML = `
                <div class="text-secondary text-center" style="padding: 24px;">
                    <p>No assessment templates available.</p>
                    <p class="mt-2">Please contact an administrator to create a template.</p>
                </div>
            `;
            return;
        }

        // Render template cards
        templateList.innerHTML = templates.map(t => `
            <div class="template-card" onclick="selectAssessmentTemplate(${t.id})">
                <div class="template-card__info">
                    <div class="template-card__name">${escapeHtml(t.name)}</div>
                    <div class="template-card__meta">
                        Version ${escapeHtml(t.version || '1.0')}
                        ${t.description ? ' · ' + escapeHtml(t.description) : ''}
                        ${t.questions_count ? ' · ' + t.questions_count + ' questions' : ''}
                    </div>
                </div>
                <div class="template-card__arrow">
                    <svg width="20" height="20" viewBox="0 0 32 32"><path d="M22 16L12 26l-1.4-1.4 8.6-8.6-8.6-8.6L12 6z"/></svg>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Failed to load templates:', error);
        templateList.innerHTML = `
            <div class="text-secondary text-center" style="padding: 24px;">
                Failed to load templates. <button class="btn-link" onclick="openNewAssessmentModal()">Try again</button>
            </div>
        `;
    }
}

// Select a template and start the assessment
async function selectAssessmentTemplate(templateId) {
    try {
        // Get template with questions
        const templateDetail = await API.AssessmentAPI.getTemplate(templateId);
        assessmentTemplate = templateDetail;
        assessmentQuestions = templateDetail.questions || [];

        if (assessmentQuestions.length === 0) {
            alert('This template has no questions. Please choose another template or contact an administrator.');
            return;
        }

        // Sort questions by display order
        assessmentQuestions.sort((a, b) => a.display_order - b.display_order);

        // Switch to question step
        document.getElementById('templateSelectionStep').style.display = 'none';
        document.getElementById('questionStep').style.display = 'block';
        document.getElementById('assessmentModalTitle').textContent = assessmentTemplate.name || 'Assessment';

        // Show navigation buttons
        document.getElementById('saveCloseBtn').style.display = 'block';
        document.getElementById('backToTemplatesBtn').style.display = 'block';
        document.getElementById('prevQuestionBtn').style.display = 'block';
        document.getElementById('nextQuestionBtn').style.display = 'block';

        // Display first question
        displayQuestion(0);

    } catch (error) {
        console.error('Failed to load template:', error);
        alert('Failed to load template. Please try again.');
    }
}

// Go back to template selection
function showTemplateSelection() {
    document.getElementById('templateSelectionStep').style.display = 'block';
    document.getElementById('questionStep').style.display = 'none';
    document.getElementById('assessmentModalTitle').textContent = 'Select Assessment Template';

    // Hide question navigation buttons
    document.getElementById('saveCloseBtn').style.display = 'none';
    document.getElementById('backToTemplatesBtn').style.display = 'none';
    document.getElementById('prevQuestionBtn').style.display = 'none';
    document.getElementById('nextQuestionBtn').style.display = 'none';
    document.getElementById('submitAssessmentBtn').style.display = 'none';

    // Reset state
    assessmentTemplate = null;
    assessmentQuestions = [];
    assessmentResponses = {};
    currentQuestionIndex = 0;
}

// Close new assessment modal
function closeNewAssessmentModal() {
    document.getElementById('newAssessmentModal').classList.remove('open');
}

// Display a question in the wizard
function displayQuestion(index) {
    if (index < 0 || index >= assessmentQuestions.length) return;

    const question = assessmentQuestions[index];
    const totalQuestions = assessmentQuestions.length;

    // Update progress
    const progress = ((index + 1) / totalQuestions) * 100;
    document.getElementById('wizardProgressBar').style.width = `${progress}%`;
    document.getElementById('currentDimensionName').textContent = question.dimension?.name || 'Assessment';
    document.getElementById('questionProgress').textContent = `${index + 1} / ${totalQuestions}`;

    // Update question
    document.getElementById('currentQuestionNumber').textContent = `Question ${question.question_number}`;
    document.getElementById('currentQuestionText').textContent = question.question_text;

    // Render rating options
    const ratingContainer = document.getElementById('ratingOptions');
    const minScore = question.min_score || 1;
    const maxScore = question.max_score || 5;
    const scoreLabels = question.score_labels || {};
    const scoreDescriptions = question.score_descriptions || {};
    const scoreEvidence = question.score_evidence || {};

    let ratingHtml = '';
    for (let i = minScore; i <= maxScore; i++) {
        const label = scoreLabels[String(i)] || `Level ${i}`;
        const description = scoreDescriptions[String(i)] || '';
        const evidence = scoreEvidence[String(i)] || '';
        const selected = assessmentResponses[question.id]?.score === i ? 'selected' : '';
        const hasDetails = description || evidence;

        ratingHtml += `
            <div class="rating-option ${selected}" onclick="selectRating(${question.id}, ${i})">
                <div class="rating-option__header">
                    <div class="rating-option__score">${i}</div>
                    <div class="rating-option__label">${escapeHtml(label)}</div>
                </div>
                ${hasDetails ? `
                <div class="rating-option__details">
                    ${description ? `<div class="rating-option__description">${escapeHtml(description)}</div>` : ''}
                    ${evidence ? `<div class="rating-option__evidence"><strong>Evidence:</strong> ${escapeHtml(evidence)}</div>` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }
    ratingContainer.innerHTML = ratingHtml;

    // Restore notes if any
    document.getElementById('questionNotes').value = assessmentResponses[question.id]?.notes || '';

    // Update navigation buttons
    document.getElementById('prevQuestionBtn').disabled = index === 0;
    document.getElementById('nextQuestionBtn').style.display = index < totalQuestions - 1 ? 'inline-flex' : 'none';
    document.getElementById('submitAssessmentBtn').style.display = index === totalQuestions - 1 ? 'inline-flex' : 'none';

    currentQuestionIndex = index;
}

// Select a rating
function selectRating(questionId, score) {
    // Save the response
    assessmentResponses[questionId] = {
        question_id: questionId,
        score: score,
        notes: document.getElementById('questionNotes').value || null
    };

    // Update UI to show selection
    document.querySelectorAll('.rating-option').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.rating-option')[score - 1]?.classList.add('selected');
}

// Go to previous question
function previousQuestion() {
    // Save current notes
    const currentQuestion = assessmentQuestions[currentQuestionIndex];
    if (assessmentResponses[currentQuestion.id]) {
        assessmentResponses[currentQuestion.id].notes = document.getElementById('questionNotes').value || null;
    }

    if (currentQuestionIndex > 0) {
        displayQuestion(currentQuestionIndex - 1);

        // Scroll modal body to top so user sees the question
        const modalBody = document.querySelector('#newAssessmentModal .modal__body');
        if (modalBody) {
            modalBody.scrollTop = 0;
        }
    }
}

// Go to next question
function nextQuestion() {
    // Validate current question is answered
    const currentQuestion = assessmentQuestions[currentQuestionIndex];
    if (!assessmentResponses[currentQuestion.id] || !assessmentResponses[currentQuestion.id].score) {
        alert('Please select a rating before proceeding.');
        return;
    }

    // Save notes
    assessmentResponses[currentQuestion.id].notes = document.getElementById('questionNotes').value || null;

    if (currentQuestionIndex < assessmentQuestions.length - 1) {
        displayQuestion(currentQuestionIndex + 1);

        // Scroll modal body to top so user sees the question
        const modalBody = document.querySelector('#newAssessmentModal .modal__body');
        if (modalBody) {
            modalBody.scrollTop = 0;
        }
    }
}

// Submit the assessment
async function submitAssessment() {
    // Validate last question
    const lastQuestion = assessmentQuestions[currentQuestionIndex];
    if (!assessmentResponses[lastQuestion.id] || !assessmentResponses[lastQuestion.id].score) {
        alert('Please select a rating before submitting.');
        return;
    }
    assessmentResponses[lastQuestion.id].notes = document.getElementById('questionNotes').value || null;

    // Check all required questions are answered
    const requiredQuestions = assessmentQuestions.filter(q => q.is_required);
    const unanswered = requiredQuestions.filter(q => !assessmentResponses[q.id]?.score);

    if (unanswered.length > 0) {
        alert(`Please answer all required questions. ${unanswered.length} question(s) remaining.`);
        return;
    }

    const submitBtn = document.getElementById('submitAssessmentBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const customerId = getCustomerId();

        // Use existing assessment ID if resuming, otherwise create new
        let assessmentId = currentEditingAssessmentId;

        if (!assessmentId) {
            // Create new assessment
            const assessment = await API.AssessmentAPI.createAssessment(customerId, {
                template_id: assessmentTemplate.id,
                assessment_date: new Date().toISOString().split('T')[0]
            });
            assessmentId = assessment.id;
        }

        // Submit all responses with current user as the assessor
        const responses = Object.values(assessmentResponses);
        const currentUser = Auth.getCurrentUser();
        const completedById = currentUser ? currentUser.id : null;
        console.log('Submitting assessment - currentUser:', currentUser, 'completedById:', completedById);
        await API.AssessmentAPI.saveResponses(assessmentId, responses, true, completedById);

        closeNewAssessmentModal();
        alert('Assessment completed successfully!');

        // Reload assessments
        await loadAssessments(customerId);

    } catch (error) {
        console.error('Failed to submit assessment:', error);
        alert('Failed to submit assessment. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Complete Assessment';
    }
}

// Open upload assessment modal
function openUploadAssessmentModal() {
    document.getElementById('uploadAssessmentForm').reset();
    document.getElementById('assessmentUploadDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('uploadAssessmentModal').classList.add('open');
}

// Close upload assessment modal
function closeUploadAssessmentModal() {
    document.getElementById('uploadAssessmentModal').classList.remove('open');
}

// Handle assessment Excel upload
async function handleAssessmentUpload(event) {
    event.preventDefault();

    const fileInput = document.getElementById('assessmentUploadFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file.');
        return;
    }

    const uploadBtn = document.getElementById('uploadAssessmentBtn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
        const customerId = getCustomerId();
        const assessmentDate = document.getElementById('assessmentUploadDate').value;

        const formData = new FormData();
        formData.append('file', file);
        if (assessmentDate) {
            formData.append('assessment_date', assessmentDate);
        }

        const result = await API.AssessmentAPI.uploadResponses(customerId, formData);

        if (result.success) {
            closeUploadAssessmentModal();
            alert(`Assessment uploaded successfully! ${result.responses_saved} responses saved.`);
            await loadAssessments(customerId);
        } else {
            alert('Upload failed: ' + (result.errors?.join(', ') || 'Unknown error'));
        }
    } catch (error) {
        console.error('Failed to upload assessment:', error);
        alert('Failed to upload assessment. Please check the file format and try again.');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Upload';
    }
}

// Expose SPM Assessment functions to window
window.loadAssessments = loadAssessments;
window.openNewAssessmentModal = openNewAssessmentModal;
window.closeNewAssessmentModal = closeNewAssessmentModal;
window.selectAssessmentTemplate = selectAssessmentTemplate;
window.showTemplateSelection = showTemplateSelection;
window.previousQuestion = previousQuestion;
window.nextQuestion = nextQuestion;
window.selectRating = selectRating;
window.submitAssessment = submitAssessment;
window.saveAndCloseAssessment = saveAndCloseAssessment;
window.resumeAssessment = resumeAssessment;
window.deleteAssessment = deleteAssessment;
window.openUploadAssessmentModal = openUploadAssessmentModal;
window.closeUploadAssessmentModal = closeUploadAssessmentModal;
window.handleAssessmentUpload = handleAssessmentUpload;
window.viewAssessmentDetail = viewAssessmentDetail;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    if (await Auth.checkAuthAndRedirect()) {
        Auth.updateUserDisplay();
        await loadCustomerDetail();

        // Load additional data after customer loads
        const customerId = getCustomerId();
        if (customerId) {
            loadRoadmap(customerId);
            loadRisks(customerId);
            loadTasks(customerId);
        }

        // Set up tab switching
        setupTabSwitching();
    }
});

// Set up tab switching logic
function setupTabSwitching() {
    const tabs = document.querySelectorAll('.tabs__tab');

    // Helper to hide all tab sections - queries elements at call time to handle dynamic content
    function hideAllSections() {
        const tasksSection = document.getElementById('tasksSection');
        const risksSection = document.getElementById('risksSection');
        const roadmapSection = document.getElementById('roadmapSection');
        const engagementsSection = document.getElementById('engagementsSection');
        const targetprocessSection = document.getElementById('targetprocessSection');
        const documentsSection = document.getElementById('documentsSection');
        const usageFrameworkSection = document.getElementById('usageFrameworkSection');
        const spmAssessmentSection = document.getElementById('spmAssessmentSection');
        const recommendationsSection = document.getElementById('recommendationsSection');
        const implementationFlowSection = document.getElementById('implementationFlowSection');
        const reportsSection = document.getElementById('reportsSection');
        const overviewGrid = document.querySelector('.grid.grid--2');

        if (tasksSection) tasksSection.style.display = 'none';
        if (risksSection) risksSection.style.display = 'none';
        if (roadmapSection) roadmapSection.style.display = 'none';
        if (engagementsSection) engagementsSection.style.display = 'none';
        if (targetprocessSection) targetprocessSection.style.display = 'none';
        if (documentsSection) documentsSection.style.display = 'none';
        if (usageFrameworkSection) usageFrameworkSection.style.display = 'none';
        if (spmAssessmentSection) spmAssessmentSection.style.display = 'none';
        if (recommendationsSection) recommendationsSection.style.display = 'none';
        if (implementationFlowSection) implementationFlowSection.style.display = 'none';
        if (reportsSection) reportsSection.style.display = 'none';
        if (overviewGrid) overviewGrid.style.display = 'none';
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active tab styling
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.textContent.trim();
            const customerId = getCustomerId();

            // Hide all sections first
            hideAllSections();

            // Query for sections at click time to handle dynamic content
            const tasksSection = document.getElementById('tasksSection');
            const risksSection = document.getElementById('risksSection');
            const roadmapSection = document.getElementById('roadmapSection');
            const engagementsSection = document.getElementById('engagementsSection');
            const targetprocessSection = document.getElementById('targetprocessSection');
            const documentsSection = document.getElementById('documentsSection');
            const usageFrameworkSection = document.getElementById('usageFrameworkSection');
            const spmAssessmentSection = document.getElementById('spmAssessmentSection');
            const recommendationsSection = document.getElementById('recommendationsSection');
            const implementationFlowSection = document.getElementById('implementationFlowSection');
            const reportsSection = document.getElementById('reportsSection');
            const overviewGrid = document.querySelector('.grid.grid--2');

            // Show appropriate section based on tab
            if (tabName === 'Overview') {
                if (overviewGrid) overviewGrid.style.display = 'grid';
                if (roadmapSection) roadmapSection.style.display = 'block';
            } else if (tabName === 'Usage Framework') {
                if (usageFrameworkSection) usageFrameworkSection.style.display = 'block';
                loadUsageFramework(customerId);
            } else if (tabName === 'Engagements') {
                if (engagementsSection) engagementsSection.style.display = 'block';
                loadEngagements(customerId);
            } else if (tabName === 'Tasks') {
                if (tasksSection) tasksSection.style.display = 'block';
            } else if (tabName === 'Risks') {
                if (risksSection) risksSection.style.display = 'block';
            } else if (tabName === 'TargetProcess') {
                if (targetprocessSection) targetprocessSection.style.display = 'block';
                loadTargetProcessData(customerId);
            } else if (tabName === 'Roadmap') {
                if (roadmapSection) roadmapSection.style.display = 'block';
            } else if (tabName === 'Recommendations') {
                if (recommendationsSection) recommendationsSection.style.display = 'block';
                loadCustomRecommendations(customerId);
                loadRecommendations(customerId);
            } else if (tabName === 'Journey') {
                if (implementationFlowSection) implementationFlowSection.style.display = 'block';
                // Update title for current framework and load tab scores
                updateFlowChartTitle(selectedFlowAssessmentType);
                loadFlowTabScores(customerId);
                loadFlowAssessmentOptions(customerId).then(() => {
                    loadFlowVisualization(customerId, selectedFlowAssessmentId);
                });
            } else if (tabName === 'Reports') {
                if (reportsSection) reportsSection.style.display = 'block';
            } else if (tabName === 'Documents') {
                if (documentsSection) documentsSection.style.display = 'block';
                loadDocuments(customerId);
            } else if (tabName === 'Assessments') {
                if (spmAssessmentSection) spmAssessmentSection.style.display = 'block';
                loadAssessments(customerId);
            } else {
                // Default to overview
                if (overviewGrid) overviewGrid.style.display = 'grid';
                if (roadmapSection) roadmapSection.style.display = 'block';
            }
        });
    });
}

// Helper function to programmatically show a section by clicking its tab
function showSection(sectionName) {
    const tabNameMap = {
        'overview': 'Overview',
        'usageFramework': 'Usage Framework',
        'engagements': 'Engagements',
        'tasks': 'Tasks',
        'risks': 'Risks',
        'spmAssessment': 'Assessments',
        'targetprocess': 'TargetProcess',
        'roadmap': 'Roadmap',
        'recommendations': 'Recommendations',
        'implementationFlow': 'Journey',
        'reports': 'Reports',
        'documents': 'Documents'
    };

    const tabText = tabNameMap[sectionName] || sectionName;
    const tab = Array.from(document.querySelectorAll('.tabs__tab')).find(t => t.textContent.trim() === tabText);
    if (tab) {
        tab.click();
    }
}

// Make showSection available globally
window.showSection = showSection;

// ==================== MEETING NOTES ====================

let currentMeetingNotes = [];
let currentMeetingNoteId = null;

// Load meeting notes for the customer
async function loadMeetingNotes(customerId) {
    const container = document.getElementById('meetingNotesContainer');
    if (!container) return;

    try {
        const response = await API.MeetingNoteAPI.getByCustomer(customerId);
        currentMeetingNotes = response.items || [];

        if (currentMeetingNotes.length === 0) {
            container.innerHTML = `
                <div class="text-secondary text-center" style="padding: 24px;">
                    <svg width="48" height="48" viewBox="0 0 32 32" style="opacity: 0.5; margin-bottom: 8px;">
                        <path d="M28 4H4a2 2 0 00-2 2v20a2 2 0 002 2h24a2 2 0 002-2V6a2 2 0 00-2-2zM4 26V6h24v20z"/>
                        <path d="M6 12h20v2H6zM6 18h20v2H6zM6 24h12v2H6z"/>
                    </svg>
                    <p style="margin: 0;">No meeting notes yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = currentMeetingNotes.slice(0, 5).map(note => `
            <div class="meeting-note-item" onclick="viewMeetingNote(${note.id})" style="padding: 12px; border-bottom: 1px solid var(--cds-border-subtle); cursor: pointer; transition: background-color 0.2s;">
                <div class="flex justify-between items-center" style="margin-bottom: 4px;">
                    <span style="font-weight: 500;">${escapeHtml(note.title)}</span>
                    <span class="tag tag--gray" style="font-size: 11px;">${formatDate(note.meeting_date)}</span>
                </div>
                ${note.attendees ? `<div style="font-size: 12px; color: var(--cds-text-secondary); margin-bottom: 4px;"><strong>Attendees:</strong> ${escapeHtml(note.attendees)}</div>` : ''}
                ${note.notes ? `<div style="font-size: 12px; color: var(--cds-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(note.notes.substring(0, 100))}${note.notes.length > 100 ? '...' : ''}</div>` : ''}
            </div>
        `).join('');

        // Add hover effect
        container.querySelectorAll('.meeting-note-item').forEach(item => {
            item.addEventListener('mouseenter', () => item.style.backgroundColor = 'var(--cds-layer-hover)');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = '');
        });

    } catch (error) {
        console.error('Failed to load meeting notes:', error);
        container.innerHTML = `
            <div class="text-secondary text-center" style="padding: 16px;">
                Failed to load meeting notes
            </div>
        `;
    }
}

// Open meeting note modal for creating
function openMeetingNoteModal(noteId = null) {
    const modal = document.getElementById('meetingNoteModal');
    const form = document.getElementById('meetingNoteForm');
    const title = document.getElementById('meetingNoteModalTitle');
    const submitBtn = document.getElementById('meetingNoteSubmitBtn');

    form.reset();
    document.getElementById('meetingNoteId').value = '';

    if (noteId) {
        // Edit mode
        const note = currentMeetingNotes.find(n => n.id === noteId);
        if (note) {
            title.textContent = 'Edit Meeting Note';
            submitBtn.textContent = 'Update Note';
            document.getElementById('meetingNoteId').value = note.id;
            document.getElementById('meetingNoteDate').value = note.meeting_date;
            document.getElementById('meetingNoteTitle').value = note.title;
            document.getElementById('meetingNoteAttendees').value = note.attendees || '';
            document.getElementById('meetingNoteNotes').value = note.notes || '';
            document.getElementById('meetingNoteActionItems').value = note.action_items || '';
            document.getElementById('meetingNoteNextSteps').value = note.next_steps || '';
        }
    } else {
        // Create mode
        title.textContent = 'Add Meeting Note';
        submitBtn.textContent = 'Save Note';
        // Set default date to today
        document.getElementById('meetingNoteDate').value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('open');
}

// Close meeting note modal
function closeMeetingNoteModal() {
    const modal = document.getElementById('meetingNoteModal');
    modal.classList.remove('open');
}

// Handle meeting note form submission
async function handleMeetingNoteSubmit(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('meetingNoteSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const noteId = document.getElementById('meetingNoteId').value;
    const customerId = getCustomerId();

    const data = {
        meeting_date: document.getElementById('meetingNoteDate').value,
        title: document.getElementById('meetingNoteTitle').value,
        attendees: document.getElementById('meetingNoteAttendees').value || null,
        notes: document.getElementById('meetingNoteNotes').value || null,
        action_items: document.getElementById('meetingNoteActionItems').value || null,
        next_steps: document.getElementById('meetingNoteNextSteps').value || null,
    };

    try {
        if (noteId) {
            // Update existing
            await API.MeetingNoteAPI.update(parseInt(noteId), data);
        } else {
            // Create new
            data.customer_id = parseInt(customerId);
            await API.MeetingNoteAPI.create(data);
        }

        closeMeetingNoteModal();
        loadMeetingNotes(customerId);
    } catch (error) {
        console.error('Error saving meeting note:', error);
        alert('Failed to save meeting note. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = noteId ? 'Update Note' : 'Save Note';
    }
}

// View meeting note details
function viewMeetingNote(noteId) {
    const note = currentMeetingNotes.find(n => n.id === noteId);
    if (!note) return;

    currentMeetingNoteId = noteId;
    const modal = document.getElementById('viewMeetingNoteModal');
    const titleEl = document.getElementById('viewMeetingNoteTitle');
    const contentEl = document.getElementById('viewMeetingNoteContent');

    titleEl.textContent = note.title;

    contentEl.innerHTML = `
        <div style="margin-bottom: 16px;">
            <div class="flex justify-between items-center" style="margin-bottom: 16px;">
                <span class="tag tag--blue">${formatDate(note.meeting_date)}</span>
            </div>
            ${note.attendees ? `
                <div style="margin-bottom: 16px;">
                    <h4 style="font-size: 12px; text-transform: uppercase; color: var(--cds-text-secondary); margin-bottom: 8px;">Attendees</h4>
                    <p style="margin: 0;">${escapeHtml(note.attendees)}</p>
                </div>
            ` : ''}
            ${note.notes ? `
                <div style="margin-bottom: 16px;">
                    <h4 style="font-size: 12px; text-transform: uppercase; color: var(--cds-text-secondary); margin-bottom: 8px;">Notes</h4>
                    <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(note.notes)}</p>
                </div>
            ` : ''}
            ${note.action_items ? `
                <div style="margin-bottom: 16px;">
                    <h4 style="font-size: 12px; text-transform: uppercase; color: var(--cds-text-secondary); margin-bottom: 8px;">Action Items</h4>
                    <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(note.action_items)}</p>
                </div>
            ` : ''}
            ${note.next_steps ? `
                <div style="margin-bottom: 16px;">
                    <h4 style="font-size: 12px; text-transform: uppercase; color: var(--cds-text-secondary); margin-bottom: 8px;">Next Steps</h4>
                    <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(note.next_steps)}</p>
                </div>
            ` : ''}
        </div>
    `;

    modal.classList.add('open');
}

// Close view meeting note modal
function closeViewMeetingNoteModal() {
    const modal = document.getElementById('viewMeetingNoteModal');
    modal.classList.remove('open');
    currentMeetingNoteId = null;
}

// Edit current meeting note
function editMeetingNote() {
    closeViewMeetingNoteModal();
    openMeetingNoteModal(currentMeetingNoteId);
}

// Delete current meeting note
async function deleteMeetingNote() {
    if (!currentMeetingNoteId) return;

    if (!confirm('Are you sure you want to delete this meeting note?')) {
        return;
    }

    try {
        await API.MeetingNoteAPI.delete(currentMeetingNoteId);
        closeViewMeetingNoteModal();
        loadMeetingNotes(getCustomerId());
    } catch (error) {
        console.error('Error deleting meeting note:', error);
        alert('Failed to delete meeting note. Please try again.');
    }
}

// Create a task from the current meeting note
async function createTaskFromMeetingNote() {
    if (!currentMeetingNoteId) return;

    const note = currentMeetingNotes.find(n => n.id === currentMeetingNoteId);
    if (!note) return;

    // Close the view modal
    closeViewMeetingNoteModal();

    // Open the task modal
    await openTaskModal();

    // Pre-populate task fields with meeting note context
    const titlePrefix = `Follow-up: ${note.title}`;
    document.getElementById('taskTitle').value = titlePrefix;

    // Build description from meeting note
    let description = `From meeting on ${formatDate(note.meeting_date)}`;
    if (note.attendees) {
        description += `\nAttendees: ${note.attendees}`;
    }
    if (note.action_items) {
        description += `\n\nAction Items:\n${note.action_items}`;
    }
    if (note.next_steps) {
        description += `\n\nNext Steps:\n${note.next_steps}`;
    }
    document.getElementById('taskDescription').value = description;
}

// Make meeting note functions globally available
window.openMeetingNoteModal = openMeetingNoteModal;
window.closeMeetingNoteModal = closeMeetingNoteModal;
window.handleMeetingNoteSubmit = handleMeetingNoteSubmit;
window.viewMeetingNote = viewMeetingNote;
window.closeViewMeetingNoteModal = closeViewMeetingNoteModal;
window.editMeetingNote = editMeetingNote;
window.deleteMeetingNote = deleteMeetingNote;
window.createTaskFromMeetingNote = createTaskFromMeetingNote;

// ==================== END MEETING NOTES ====================

// Nav toggle function
function toggleNav() {
    document.getElementById('sideNav').classList.toggle('open');
}

// Nav collapse functionality
document.addEventListener('DOMContentLoaded', function() {
    const sideNav = document.getElementById('sideNav');
    const toggleBtn = document.getElementById('navToggleBtn');

    if (localStorage.getItem('navCollapsed') === 'true') {
        sideNav.classList.add('collapsed');
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sideNav.classList.toggle('collapsed');
            localStorage.setItem('navCollapsed', sideNav.classList.contains('collapsed'));
        });
    }

    // Initialize drop zones
    initDropZones();
});

// ==========================================
// DRAG & DROP FUNCTIONALITY
// ==========================================

let pendingDropData = null;  // Stores parsed data while waiting for user choice
let pendingDropFile = null;  // Stores the original file

// Allowed file extensions for drop zones
const ENGAGEMENT_ALLOWED_EXTENSIONS = ['.eml', '.ics', '.ical'];
const DOCUMENT_ALLOWED_EXTENSIONS = ['.eml', '.ics', '.ical', '.msg', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.txt', '.csv'];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Initialize drop zones with event listeners
function initDropZones() {
    const engagementDropZone = document.getElementById('engagementDropZone');
    const documentDropZone = document.getElementById('documentDropZone');

    if (engagementDropZone) {
        setupDropZone(engagementDropZone, 'engagement');
    }

    if (documentDropZone) {
        setupDropZone(documentDropZone, 'document');
    }

    // Show browser warning for Chrome/Firefox on first visit
    checkBrowserCompatibility();
}

// Set up event listeners for a drop zone
function setupDropZone(dropZone, dropType) {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        });
    });

    // Handle drop
    dropZone.addEventListener('drop', (e) => handleDrop(e, dropType));

    // Also allow click to browse
    dropZone.addEventListener('click', (e) => {
        // Don't trigger if clicking on the file input or browse button
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('btn-link')) {
            return;
        }
        const fileInput = dropType === 'engagement'
            ? document.getElementById('engagementFileInput')
            : document.getElementById('documentFileInput');
        if (fileInput) {
            fileInput.click();
        }
    });
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Check browser compatibility and show warning
function checkBrowserCompatibility() {
    // Skip if user has dismissed the warning
    if (localStorage.getItem('dismissBrowserWarning') === 'true') {
        return;
    }

    // Check if Chrome or Firefox on Mac
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(navigator.userAgent);

    if (isMac && (isChrome || isFirefox)) {
        // Show hint in the drop zone
        const hintEl = document.getElementById('engagementDropHint');
        if (hintEl) {
            hintEl.innerHTML = '<span class="warning">Tip: For Mac Outlook, drag to Desktop first, then here</span>';
        }
    }
}

// Handle file drop
async function handleDrop(e, dropType) {
    const dropZone = e.currentTarget;
    const files = e.dataTransfer.files;

    if (files.length === 0) {
        // Check for text/calendar data (sometimes Outlook drops this)
        const calendarData = e.dataTransfer.getData('text/calendar');
        if (calendarData) {
            await processCalendarData(calendarData, dropType, dropZone);
            return;
        }

        // Check for text/plain (email preview text)
        const textData = e.dataTransfer.getData('text/plain');
        if (textData && textData.includes('Subject:')) {
            showDropHint(dropZone, 'For full email content, save as .eml first', 'warning');
            return;
        }

        showDropHint(dropZone, 'No files detected. Try dragging to Desktop first.', 'warning');
        return;
    }

    // Process the first file
    const file = files[0];
    await processDroppedFile(file, dropType, dropZone);
}

// Process a dropped file
async function processDroppedFile(file, dropType, dropZone) {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        showDropHint(dropZone, 'File too large. Maximum size is 10MB.', 'error');
        return;
    }

    // Validate file extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowedExt = dropType === 'engagement' ? ENGAGEMENT_ALLOWED_EXTENSIONS : DOCUMENT_ALLOWED_EXTENSIONS;

    if (!allowedExt.includes(ext)) {
        showDropHint(dropZone, `File type not supported. Allowed: ${allowedExt.join(', ')}`, 'error');
        return;
    }

    // Show processing state
    dropZone.classList.add('processing');
    showDropHint(dropZone, 'Processing file...', '');

    try {
        if (ext === '.eml') {
            // Parse email and show action modal
            const parsed = await API.DocumentAPI.parseEmail(file);
            pendingDropData = { type: 'email', data: parsed };
            pendingDropFile = file;
            showDropActionModal(parsed, 'email', dropType);
        } else if (ext === '.ics' || ext === '.ical') {
            // Parse calendar and show action modal
            const parsed = await API.DocumentAPI.parseCalendar(file);
            pendingDropData = { type: 'calendar', data: parsed };
            pendingDropFile = file;
            showDropActionModal(parsed, 'calendar', dropType);
        } else {
            // Non-parseable file - upload directly as document
            if (dropType === 'document') {
                await uploadDocument(file);
            } else {
                showDropHint(dropZone, 'This file type can only be saved as a document', 'warning');
            }
        }

        showDropHint(dropZone, '', '');
    } catch (error) {
        console.error('Error processing dropped file:', error);
        showDropHint(dropZone, 'Failed to process file. Please try again.', 'error');
    } finally {
        dropZone.classList.remove('processing');
    }
}

// Process calendar data dropped directly
async function processCalendarData(calendarData, dropType, dropZone) {
    dropZone.classList.add('processing');

    try {
        // Create a Blob from the calendar data
        const blob = new Blob([calendarData], { type: 'text/calendar' });
        const file = new File([blob], 'event.ics', { type: 'text/calendar' });

        const parsed = await API.DocumentAPI.parseCalendar(file);
        pendingDropData = { type: 'calendar', data: parsed };
        pendingDropFile = file;
        showDropActionModal(parsed, 'calendar', dropType);
    } catch (error) {
        console.error('Error processing calendar data:', error);
        showDropHint(dropZone, 'Failed to parse calendar data', 'error');
    } finally {
        dropZone.classList.remove('processing');
    }
}

// Show hint message in drop zone
function showDropHint(dropZone, message, type) {
    const hintId = dropZone.id === 'engagementDropZone' ? 'engagementDropHint' : 'documentDropHint';
    const hintEl = document.getElementById(hintId);
    if (hintEl) {
        hintEl.textContent = message;
        hintEl.className = 'drop-zone__hint' + (type ? ` ${type}` : '');
    }
}

// Handle file selection via browse button
function handleEngagementFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const dropZone = document.getElementById('engagementDropZone');
        processDroppedFile(files[0], 'engagement', dropZone);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
}

function handleDocumentFileSelect(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const dropZone = document.getElementById('documentDropZone');
        processDroppedFile(files[0], 'document', dropZone);
    }
    event.target.value = '';
}

// Show the drop action modal with parsed content preview
function showDropActionModal(parsed, fileType, dropType) {
    const modal = document.getElementById('dropActionModal');
    const previewContent = document.getElementById('dropPreviewContent');
    const description = document.getElementById('dropActionDescription');

    if (fileType === 'email') {
        description.textContent = 'You dropped an email. How would you like to save it?';
        previewContent.innerHTML = `
            <div class="drop-preview__row">
                <div class="drop-preview__label">Subject</div>
                <div class="drop-preview__value">${escapeHtml(parsed.subject || '(No subject)')}</div>
            </div>
            <div class="drop-preview__row">
                <div class="drop-preview__label">From</div>
                <div class="drop-preview__value">${escapeHtml(parsed.from_name || '')} ${escapeHtml(parsed.from_address || '')}</div>
            </div>
            <div class="drop-preview__row">
                <div class="drop-preview__label">Date</div>
                <div class="drop-preview__value">${parsed.date ? formatDate(parsed.date) : 'Unknown'}</div>
            </div>
        `;
    } else if (fileType === 'calendar') {
        description.textContent = 'You dropped a calendar event. How would you like to save it?';
        previewContent.innerHTML = `
            <div class="drop-preview__row">
                <div class="drop-preview__label">Event</div>
                <div class="drop-preview__value">${escapeHtml(parsed.summary || '(No title)')}</div>
            </div>
            <div class="drop-preview__row">
                <div class="drop-preview__label">When</div>
                <div class="drop-preview__value">${parsed.start ? formatDate(parsed.start) : 'Unknown'}</div>
            </div>
            ${parsed.location ? `
            <div class="drop-preview__row">
                <div class="drop-preview__label">Location</div>
                <div class="drop-preview__value">${escapeHtml(parsed.location)}</div>
            </div>
            ` : ''}
            ${parsed.attendees && parsed.attendees.length > 0 ? `
            <div class="drop-preview__row">
                <div class="drop-preview__label">Attendees</div>
                <div class="drop-preview__value">${parsed.attendees.length} participant(s)</div>
            </div>
            ` : ''}
        `;
    }

    // If dropped on engagement zone, auto-create engagement
    if (dropType === 'engagement') {
        saveDropAsEngagement();
        return;
    }

    // Otherwise show modal for user choice
    modal.classList.add('open');
}

function closeDropActionModal() {
    const modal = document.getElementById('dropActionModal');
    modal.classList.remove('open');
    pendingDropData = null;
    pendingDropFile = null;
}

// Save the dropped item as an engagement
async function saveDropAsEngagement() {
    closeDropActionModal();

    if (!pendingDropData) return;

    const customerId = getCustomerId();
    const { type, data } = pendingDropData;

    try {
        let engagementData;

        if (type === 'email') {
            engagementData = {
                customer_id: parseInt(customerId),
                engagement_type: 'email',
                title: data.subject || 'Email',
                summary: data.body_text ? data.body_text.substring(0, 500) : '',
                details: data.body_text || '',
                engagement_date: data.date || new Date().toISOString(),
                attendees: [
                    ...(data.from_address ? [{ email: data.from_address, name: data.from_name || '' }] : []),
                    ...(data.to_addresses || []).map(email => ({ email })),
                ],
            };
        } else if (type === 'calendar') {
            engagementData = {
                customer_id: parseInt(customerId),
                engagement_type: 'meeting',
                title: data.summary || 'Meeting',
                summary: data.description || '',
                details: data.description || '',
                engagement_date: data.start || new Date().toISOString(),
                attendees: (data.attendees || []).map(a => ({
                    email: a.email,
                    name: a.name || '',
                    status: a.status || 'unknown',
                })),
            };
        }

        // Create engagement
        await API.EngagementAPI.create(engagementData);

        // Also save the original file as a document linked to this engagement
        // (Optional: could prompt user)

        // Refresh engagements list
        await loadRecentEngagements(customerId);

        // Show success
        showSuccessToast('Engagement created successfully');

    } catch (error) {
        console.error('Failed to create engagement:', error);
        showErrorToast('Failed to create engagement');
    }

    pendingDropData = null;
    pendingDropFile = null;
}

// Save the dropped item as a document
async function saveDropAsDocument() {
    closeDropActionModal();

    if (!pendingDropFile) return;

    await uploadDocument(pendingDropFile);

    pendingDropData = null;
    pendingDropFile = null;
}

// Upload a file as a document
async function uploadDocument(file) {
    const customerId = getCustomerId();

    try {
        await API.DocumentAPI.upload(customerId, file, { source: 'drag_drop' });

        // Refresh documents list
        await loadDocuments(customerId);

        showSuccessToast('Document uploaded successfully');

    } catch (error) {
        console.error('Failed to upload document:', error);
        showErrorToast('Failed to upload document');
    }
}

// Simple toast notifications
function showSuccessToast(message) {
    showToast(message, 'success');
}

function showErrorToast(message) {
    showToast(message, 'error');
}

function showToast(message, type) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 12px 24px;
        border-radius: 4px;
        background: ${type === 'success' ? 'var(--cds-support-success)' : 'var(--cds-support-error)'};
        color: white;
        font-size: 14px;
        z-index: 10000;
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Browser warning modal functions
function closeBrowserWarningModal() {
    const modal = document.getElementById('browserWarningModal');
    modal.classList.remove('open');

    // Check if user wants to dismiss permanently
    const checkbox = document.getElementById('dontShowBrowserWarning');
    if (checkbox && checkbox.checked) {
        localStorage.setItem('dismissBrowserWarning', 'true');
    }
}

// Expose drag-drop functions globally
window.handleEngagementFileSelect = handleEngagementFileSelect;
window.handleDocumentFileSelect = handleDocumentFileSelect;
window.closeDropActionModal = closeDropActionModal;
window.saveDropAsEngagement = saveDropAsEngagement;
window.saveDropAsDocument = saveDropAsDocument;
window.closeBrowserWarningModal = closeBrowserWarningModal;

// ==================== END DRAG & DROP ====================

// ==================== RECOMMENDATIONS ====================

// Store recommendations data
let recommendationsCache = [];

/**
 * Load recommendations for the customer
 */
async function loadRecommendations(customerId) {
    const noState = document.getElementById('noGeneratedRecsState');
    const listEl = document.getElementById('recommendationsList');
    const countBadge = document.getElementById('generatedRecCount');

    try {
        const response = await fetch(`${API_BASE_URL}/recommendations/customer/${customerId}?include_accepted=true&include_dismissed=false`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        recommendationsCache = data.items || [];

        // Update count badge
        if (countBadge) {
            countBadge.textContent = recommendationsCache.length;
        }

        if (recommendationsCache.length === 0) {
            if (noState) noState.style.display = 'block';
            if (listEl) listEl.innerHTML = '';
            return;
        }

        if (noState) noState.style.display = 'none';

        // Render weak dimensions
        if (data.weak_dimensions && data.weak_dimensions.length > 0) {
            const chipsEl = document.getElementById('weakDimensionsChips');
            chipsEl.innerHTML = data.weak_dimensions.map(d => `
                <span class="weak-dimension-chip">
                    ${escapeHtml(d.name)}
                    <span class="weak-dimension-chip__score">${d.score.toFixed(1)}</span>
                </span>
            `).join('');
            document.getElementById('weakDimensionsSummary').style.display = 'block';
        } else {
            document.getElementById('weakDimensionsSummary').style.display = 'none';
        }

        // Render recommendations
        listEl.innerHTML = recommendationsCache.map(r => renderRecommendationCard(r)).join('');

        // Update all recommendation counts
        updateAllRecCounts();

        // If "All" tab is active, re-render it
        if (activeRecTypeTab === 'all') {
            renderAllRecommendations();
        }

    } catch (error) {
        console.error('Failed to load recommendations:', error);
        if (listEl) {
            listEl.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Failed to load recommendations</div>';
        }
    }
}

/**
 * Render a single recommendation card
 */
function renderRecommendationCard(rec) {
    const priorityScore = Math.round(rec.priority_score);
    const isAccepted = rec.is_accepted;

    // Build tools display
    const toolsHtml = rec.tools && rec.tools.length > 0
        ? rec.tools.map(t => `<span class="tag tag--outline">${escapeHtml(t)}</span>`).join('')
        : '';

    return `
        <div class="recommendation-card ${isAccepted ? 'accepted' : ''}" data-rec-id="${rec.id}">
            <div class="recommendation-card__header">
                <div>
                    <div class="recommendation-card__title">${escapeHtml(rec.title)}</div>
                    <div class="recommendation-card__meta">
                        ${rec.category ? `<span class="tag tag--purple">${escapeHtml(rec.category)}</span>` : ''}
                        ${rec.solution_area ? `<span class="tag tag--blue">${escapeHtml(rec.solution_area)}</span>` : ''}
                        ${rec.tp_feature_name ? `<span>TP: ${escapeHtml(rec.tp_feature_name)}</span>` : ''}
                        ${toolsHtml}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn btn--ghost btn--small" onclick="openEditRecommendationGeneratedModal(${rec.id})" title="Edit recommendation">
                        <svg width="16" height="16" viewBox="0 0 32 32"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"/></svg>
                    </button>
                    <span class="recommendation-card__priority">Score: ${priorityScore}</span>
                </div>
            </div>
            <div class="recommendation-card__description">${escapeHtml(rec.description || '')}</div>
            <div class="recommendation-card__footer">
                <span class="recommendation-card__improvement">
                    Potential improvement: +${rec.improvement_potential.toFixed(1)} in ${escapeHtml(rec.dimension_name)}
                </span>
                <div class="recommendation-card__actions">
                    ${isAccepted ? `
                        <span class="tag tag--green">Added to Roadmap</span>
                    ` : `
                        <button class="btn btn--ghost btn--small" onclick="dismissRecommendation(${rec.id})" title="Dismiss">
                            <svg width="16" height="16" viewBox="0 0 32 32"><path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6 17.4 16 24 9.4z"/></svg>
                        </button>
                        <button class="btn btn--primary btn--small" onclick="openAcceptRecommendationModal(${rec.id})">
                            Add to Roadmap
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

/**
 * Generate recommendations for the customer
 */
async function generateRecommendations() {
    const customerId = getCustomerId();
    const btn = document.getElementById('generateRecsBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Generating...';

    try {
        const response = await fetch(`${API_BASE_URL}/recommendations/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: parseInt(customerId),
                threshold: 3.5,
                limit: 20,
                regenerate: true
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate recommendations');
        }

        const data = await response.json();
        showToast(`Generated ${data.total} recommendation(s)`, 'success');

        // Reload recommendations
        await loadRecommendations(customerId);

    } catch (error) {
        console.error('Failed to generate recommendations:', error);
        showToast(error.message || 'Failed to generate recommendations', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

let acceptRecRatingValue = null;

/**
 * Set the rating value in the accept modal
 */
function setAcceptRating(rating) {
    acceptRecRatingValue = rating;
    document.getElementById('acceptRecRatingValue').value = rating;

    // Update star button visuals
    const buttons = document.querySelectorAll('#acceptRecRating .star-btn');
    buttons.forEach((btn, index) => {
        if (index < rating) {
            btn.classList.add('star-btn--active');
        } else {
            btn.classList.remove('star-btn--active');
        }
    });
}

/**
 * Open accept recommendation modal
 */
function openAcceptRecommendationModal(recId) {
    const rec = recommendationsCache.find(r => r.id === recId);
    if (!rec) return;

    const modal = document.getElementById('acceptRecommendationModal');
    document.getElementById('acceptRecId').value = recId;
    document.getElementById('acceptRecTitle').textContent = rec.title;

    // Reset rating
    acceptRecRatingValue = null;
    document.getElementById('acceptRecRatingValue').value = '';
    const buttons = document.querySelectorAll('#acceptRecRating .star-btn');
    buttons.forEach(btn => btn.classList.remove('star-btn--active'));

    // Populate year options
    const yearSelect = document.getElementById('acceptRecYear');
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let y = currentYear; y <= currentYear + 3; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }

    // Default to next quarter
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    const nextQuarter = currentQuarter >= 4 ? 1 : currentQuarter + 1;
    document.getElementById('acceptRecQuarter').value = `Q${nextQuarter}`;
    if (nextQuarter === 1) {
        document.getElementById('acceptRecYear').value = currentYear + 1;
    }

    document.getElementById('acceptRecNotes').value = '';

    modal.classList.add('open');
}

/**
 * Close accept recommendation modal
 */
function closeAcceptRecommendationModal() {
    const modal = document.getElementById('acceptRecommendationModal');
    modal.classList.remove('open');
}

/**
 * Handle accept recommendation form submit
 */
async function handleAcceptRecommendation(event) {
    event.preventDefault();

    const recId = document.getElementById('acceptRecId').value;
    const btn = document.getElementById('acceptRecSubmitBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Adding...';

    try {
        // Use the learning feedback API for accept
        const requestBody = {
            action: 'accept',
            target_quarter: document.getElementById('acceptRecQuarter').value,
            target_year: parseInt(document.getElementById('acceptRecYear').value),
            notes: document.getElementById('acceptRecNotes').value || null
        };

        // Include rating if provided
        if (acceptRecRatingValue) {
            requestBody.quality_rating = acceptRecRatingValue;
        }

        const response = await fetch(`${API_BASE_URL}/learning/recommendations/${recId}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to accept recommendation');
        }

        closeAcceptRecommendationModal();
        showToast('Recommendation added to roadmap', 'success');

        // Reload recommendations and roadmap
        const customerId = getCustomerId();
        await loadRecommendations(customerId);
        loadRoadmap(customerId);

    } catch (error) {
        console.error('Failed to accept recommendation:', error);
        showToast(error.message || 'Failed to accept recommendation', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

let dismissRecRatingValue = null;

/**
 * Open dismiss recommendation modal
 */
function openDismissRecommendationModal(recId) {
    const rec = recommendationsCache.find(r => r.id === recId);
    if (!rec) return;

    const modal = document.getElementById('dismissRecommendationModal');
    document.getElementById('dismissRecId').value = recId;
    document.getElementById('dismissRecTitle').textContent = rec.title;

    // Reset form
    dismissRecRatingValue = null;
    document.getElementById('dismissRecReason').value = '';
    document.getElementById('dismissRecFeedback').value = '';
    document.getElementById('dismissRecRatingValue').value = '';
    const buttons = document.querySelectorAll('#dismissRecRating .star-btn');
    buttons.forEach(btn => btn.classList.remove('star-btn--active'));

    modal.classList.add('open');
}

/**
 * Close dismiss recommendation modal
 */
function closeDismissRecommendationModal() {
    const modal = document.getElementById('dismissRecommendationModal');
    modal.classList.remove('open');
}

/**
 * Set dismiss rating value
 */
function setDismissRating(rating) {
    dismissRecRatingValue = rating;
    document.getElementById('dismissRecRatingValue').value = rating;

    // Update star button visuals
    const buttons = document.querySelectorAll('#dismissRecRating .star-btn');
    buttons.forEach((btn, index) => {
        if (index < rating) {
            btn.classList.add('star-btn--active');
        } else {
            btn.classList.remove('star-btn--active');
        }
    });
}

/**
 * Handle dismiss recommendation form submit
 */
async function handleDismissRecommendation(event) {
    event.preventDefault();

    const recId = document.getElementById('dismissRecId').value;
    const btn = document.getElementById('dismissRecSubmitBtn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Dismissing...';

    try {
        const requestBody = {
            action: 'dismiss',
            dismiss_reason_category: document.getElementById('dismissRecReason').value,
            feedback_reason: document.getElementById('dismissRecFeedback').value || null
        };

        // Include rating if provided
        if (dismissRecRatingValue) {
            requestBody.quality_rating = dismissRecRatingValue;
        }

        const response = await fetch(`${API_BASE_URL}/learning/recommendations/${recId}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to dismiss recommendation');
        }

        closeDismissRecommendationModal();
        showToast('Recommendation dismissed', 'info');

        // Reload recommendations
        const customerId = getCustomerId();
        await loadRecommendations(customerId);

    } catch (error) {
        console.error('Failed to dismiss recommendation:', error);
        showToast(error.message || 'Failed to dismiss recommendation', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Dismiss a recommendation (legacy - now opens modal)
 */
function dismissRecommendation(recId) {
    openDismissRecommendationModal(recId);
}

/**
 * Quick rate a recommendation (thumbs up/down)
 */
async function rateRecommendation(recId, thumbsUp) {
    try {
        const response = await fetch(`${API_BASE_URL}/learning/recommendations/${recId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                thumbs: thumbsUp
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit feedback');
        }

        // Update button state visually
        const card = document.querySelector(`[data-recommendation-id="${recId}"]`);
        if (card) {
            const thumbsUpBtn = card.querySelector('.feedback-btn--thumbs-up');
            const thumbsDownBtn = card.querySelector('.feedback-btn--thumbs-down');

            thumbsUpBtn.classList.toggle('feedback-btn--active', thumbsUp === true);
            thumbsDownBtn.classList.toggle('feedback-btn--active', thumbsUp === false);
        }

        showToast(thumbsUp ? 'Thanks for the feedback!' : 'Feedback recorded', 'success');

    } catch (error) {
        console.error('Failed to rate recommendation:', error);
        showToast(error.message || 'Failed to submit feedback', 'error');
    }
}

/**
 * Open modal to edit an AI-generated recommendation
 */
function openEditRecommendationGeneratedModal(recId) {
    // recommendationsCache is an array, not an object with items property
    const rec = recommendationsCache?.find(r => r.id === recId);
    if (!rec) {
        showToast('Recommendation not found', 'error');
        return;
    }

    // Store the ID for saving
    document.getElementById('editRecGeneratedId').value = recId;

    // Populate form fields
    document.getElementById('editRecGeneratedTitle').value = rec.title || '';
    document.getElementById('editRecGeneratedDescription').value = rec.description || '';
    document.getElementById('editRecGeneratedDimension').value = rec.dimension_name || '';
    document.getElementById('editRecGeneratedScore').value = rec.priority_score || 50;
    document.getElementById('editRecGeneratedCategory').value = rec.category || '';

    // Set priority dropdown based on score
    const prioritySelect = document.getElementById('editRecGeneratedPriority');
    if (rec.priority_score >= 70) {
        prioritySelect.value = 'high';
    } else if (rec.priority_score >= 40) {
        prioritySelect.value = 'medium';
    } else {
        prioritySelect.value = 'low';
    }

    // Set tools checkboxes
    const toolCheckboxes = document.querySelectorAll('input[name="editRecGeneratedTools"]');
    const recTools = rec.tools || [];
    toolCheckboxes.forEach(cb => {
        cb.checked = recTools.includes(cb.value);
    });

    // Open modal
    document.getElementById('editRecGeneratedModal').classList.add('open');
}

/**
 * Close the edit recommendation modal
 */
function closeEditRecommendationGeneratedModal() {
    document.getElementById('editRecGeneratedModal').classList.remove('open');
    document.getElementById('editRecGeneratedForm').reset();
}

/**
 * Handle edit recommendation form submission
 */
async function handleEditRecommendationGeneratedSubmit(event) {
    event.preventDefault();

    const recId = document.getElementById('editRecGeneratedId').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    // Get priority score from dropdown or direct input
    const priorityDropdown = document.getElementById('editRecGeneratedPriority').value;
    let priorityScore = parseFloat(document.getElementById('editRecGeneratedScore').value) || 50;

    // If dropdown changed, calculate score from priority level
    if (priorityDropdown === 'high' && priorityScore < 70) {
        priorityScore = 80;
    } else if (priorityDropdown === 'medium' && (priorityScore >= 70 || priorityScore < 40)) {
        priorityScore = 55;
    } else if (priorityDropdown === 'low' && priorityScore >= 40) {
        priorityScore = 25;
    }

    // Collect selected tools
    const selectedTools = Array.from(document.querySelectorAll('input[name="editRecGeneratedTools"]:checked'))
        .map(cb => cb.value);

    const data = {
        title: document.getElementById('editRecGeneratedTitle').value,
        description: document.getElementById('editRecGeneratedDescription').value,
        priority_score: priorityScore,
        dimension_name: document.getElementById('editRecGeneratedDimension').value,
        category: document.getElementById('editRecGeneratedCategory').value || null,
        tools: selectedTools.length > 0 ? selectedTools : null
    };

    try {
        const response = await fetch(`${API_BASE_URL}/recommendations/${recId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update recommendation');
        }

        const updatedRec = await response.json();

        // Update the cache (recommendationsCache is an array)
        if (recommendationsCache && Array.isArray(recommendationsCache)) {
            const idx = recommendationsCache.findIndex(r => r.id === parseInt(recId));
            if (idx !== -1) {
                recommendationsCache[idx] = updatedRec;
            }
        }

        closeEditRecommendationGeneratedModal();
        showToast('Recommendation updated', 'success');

        // Re-render the recommendations
        const customerId = getCustomerId();
        await loadRecommendations(customerId);

    } catch (error) {
        console.error('Failed to update recommendation:', error);
        showToast(error.message || 'Failed to update recommendation', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

// Track which type of recommendation is being added to roadmap
let addToRoadmapRecType = null;

/**
 * Unified function to open add-to-roadmap modal for any recommendation type
 */
function openAddToRoadmapModal(recId, recType = 'generated') {
    addToRoadmapRecType = recType;

    let rec;
    if (recType === 'custom') {
        rec = customerRecommendations.find(r => r.id === recId);
    } else {
        rec = recommendationsCache.find(r => r.id === recId);
    }

    if (!rec) {
        showToast('Recommendation not found', 'error');
        return;
    }

    const modal = document.getElementById('acceptRecommendationModal');
    document.getElementById('acceptRecId').value = recId;
    document.getElementById('acceptRecTitle').textContent = rec.title;

    // Reset rating
    acceptRecRatingValue = null;
    document.getElementById('acceptRecRatingValue').value = '';
    const buttons = document.querySelectorAll('#acceptRecRating .star-btn');
    buttons.forEach(btn => btn.classList.remove('star-btn--active'));

    // Populate year options
    const yearSelect = document.getElementById('acceptRecYear');
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let y = currentYear; y <= currentYear + 3; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }

    // Default to next quarter
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    const nextQuarter = currentQuarter >= 4 ? 1 : currentQuarter + 1;
    document.getElementById('acceptRecQuarter').value = `Q${nextQuarter}`;
    if (nextQuarter === 1) {
        document.getElementById('acceptRecYear').value = currentYear + 1;
    }

    // Reset notes
    document.getElementById('acceptRecNotes').value = '';

    // Reset and populate tools checkboxes
    const toolCheckboxes = document.querySelectorAll('input[name="acceptRecTools"]');
    const existingTools = rec.tools || [];
    toolCheckboxes.forEach(cb => {
        cb.checked = existingTools.includes(cb.value);
    });

    modal.classList.add('open');
}

/**
 * Handle adding recommendation to roadmap (unified handler)
 */
async function handleAddToRoadmap(event) {
    event.preventDefault();

    const recId = parseInt(document.getElementById('acceptRecId').value);
    const quarter = document.getElementById('acceptRecQuarter').value;
    const year = parseInt(document.getElementById('acceptRecYear').value);
    const notes = document.getElementById('acceptRecNotes').value.trim();
    const rating = acceptRecRatingValue;

    // Collect selected tools
    const selectedTools = Array.from(document.querySelectorAll('input[name="acceptRecTools"]:checked'))
        .map(cb => cb.value);

    const btn = document.getElementById('acceptRecSubmitBtn');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Adding...';

    try {
        const customerId = getCustomerId();

        if (addToRoadmapRecType === 'custom') {
            // For custom recommendations, create a roadmap item directly
            const rec = customerRecommendations.find(r => r.id === recId);
            if (!rec) throw new Error('Recommendation not found');

            // Ensure roadmap exists
            if (!currentRoadmap) {
                // Create a default roadmap if none exists
                const roadmapResponse = await fetch(`${API_BASE_URL}/roadmaps`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_id: customerId,
                        name: `${new Date().getFullYear()} Roadmap`,
                        start_date: new Date().toISOString().split('T')[0],
                        end_date: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0]
                    })
                });
                if (!roadmapResponse.ok) throw new Error('Failed to create roadmap');
                currentRoadmap = await roadmapResponse.json();
            }

            // Determine category based on assessment type
            // Valid categories: feature, enhancement, integration, migration, optimization, other
            let category = 'enhancement';
            if (rec.assessment_type) {
                const typeCode = rec.assessment_type.code || '';
                if (typeCode === 'finops') category = 'optimization';
                else if (typeCode === 'tbm') category = 'optimization';
            }

            // Calculate dates based on quarter
            const quarterNum = parseInt(quarter.replace('Q', ''));
            const startMonth = (quarterNum - 1) * 3;
            const startDate = new Date(year, startMonth, 1);
            const endDate = new Date(year, startMonth + 3, 0);

            // Create roadmap item with correct schema fields
            const itemResponse = await fetch(`${API_BASE_URL}/roadmaps/${currentRoadmap.id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: rec.title,
                    description: rec.description || notes || '',
                    category: category,
                    target_quarter: quarter,
                    target_year: year,
                    planned_start_date: startDate.toISOString().split('T')[0],
                    planned_end_date: endDate.toISOString().split('T')[0],
                    tools: selectedTools.length > 0 ? selectedTools : null
                })
            });

            if (!itemResponse.ok) {
                const error = await itemResponse.json();
                throw new Error(error.detail || 'Failed to create roadmap item');
            }

            // Update the recommendation status to in_progress and save tools
            await fetch(`${API_BASE_URL}/assessments/recommendations/${recId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'in_progress',
                    tools: selectedTools.length > 0 ? selectedTools : null
                })
            });

        } else {
            // For generated recommendations, use the existing accept endpoint
            const requestBody = {
                target_quarter: quarter,
                target_year: year,
                notes: notes || null,
                tools: selectedTools.length > 0 ? selectedTools : null
            };

            if (rating) {
                requestBody.quality_rating = rating;
            }

            const response = await fetch(`${API_BASE_URL}/recommendations/${recId}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to accept recommendation');
            }
        }

        closeAcceptRecommendationModal();
        showToast('Recommendation added to roadmap', 'success');

        // Reload recommendations and roadmap
        if (addToRoadmapRecType === 'custom') {
            await loadCustomRecommendations(customerId);
        } else {
            await loadRecommendations(customerId);
        }
        loadRoadmap(customerId);

    } catch (error) {
        console.error('Failed to add to roadmap:', error);
        showToast(error.message || 'Failed to add to roadmap', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Export recommendation functions
window.loadRecommendations = loadRecommendations;
window.generateRecommendations = generateRecommendations;
window.openAcceptRecommendationModal = openAcceptRecommendationModal;
window.closeAcceptRecommendationModal = closeAcceptRecommendationModal;
window.handleAcceptRecommendation = handleAcceptRecommendation;
window.dismissRecommendation = dismissRecommendation;
window.openDismissRecommendationModal = openDismissRecommendationModal;
window.closeDismissRecommendationModal = closeDismissRecommendationModal;
window.handleDismissRecommendation = handleDismissRecommendation;
window.setDismissRating = setDismissRating;
window.rateRecommendation = rateRecommendation;
window.setAcceptRating = setAcceptRating;
window.openAddToRoadmapModal = openAddToRoadmapModal;
window.handleAddToRoadmap = handleAddToRoadmap;

// ==================== END RECOMMENDATIONS ====================


// ==========================================
// ASSESSMENT REPORT FUNCTIONS
// ==========================================

let currentReportAssessmentId = null;
let reportRadarChart = null;
let currentReportData = null;
let reportComparisonAssessments = [];
let reportRadarDrilldownDimension = null;
let reportShowTarget = false;

/**
 * Open assessment report modal
 */
async function openAssessmentReport(assessmentId) {
    currentReportAssessmentId = assessmentId;
    const modal = document.getElementById('assessmentReportModal');
    const content = document.getElementById('assessmentReportContent');

    modal.classList.add('open');
    content.innerHTML = '<div class="text-secondary text-center" style="padding: 48px;">Loading report...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}/report`);
        if (!response.ok) {
            throw new Error('Failed to load report');
        }

        const report = await response.json();
        renderAssessmentReport(report);

    } catch (error) {
        console.error('Failed to load assessment report:', error);
        content.innerHTML = `
            <div class="text-secondary text-center" style="padding: 48px;">
                <p>Failed to load report</p>
                <button class="btn btn--secondary" onclick="openAssessmentReport(${assessmentId})">Try Again</button>
            </div>
        `;
    }
}

/**
 * Close assessment report modal
 */
function closeAssessmentReportModal() {
    document.getElementById('assessmentReportModal').classList.remove('open');
    currentReportAssessmentId = null;
}

/**
 * Render assessment report
 */
function renderAssessmentReport(report) {
    const content = document.getElementById('assessmentReportContent');

    // Store report data for radar chart rendering
    currentReportData = report;
    reportRadarDrilldownDimension = null;
    reportComparisonAssessments = [];
    reportShowTarget = false;

    // Build dimension scores HTML
    let dimensionScoresHtml = '';
    if (report.dimension_scores && Object.keys(report.dimension_scores).length > 0) {
        dimensionScoresHtml = Object.entries(report.dimension_scores)
            .map(([dim, score]) => `
                <div class="report-dimension-score">
                    <span class="report-dimension-name">${escapeHtml(dim)}</span>
                    <span class="report-dimension-value">${score.toFixed(2)}</span>
                    <div class="report-dimension-bar">
                        <div class="report-dimension-bar-fill" style="width: ${(score / 5) * 100}%"></div>
                    </div>
                </div>
            `).join('');
    }

    // Build comparison selector options for radar chart
    let comparisonOptionsHtml = '';
    if (customerAssessments && customerAssessments.length > 1) {
        const otherAssessments = customerAssessments.filter(a =>
            a.id !== report.assessment_id &&
            a.status === 'completed' &&
            a.dimension_scores &&
            Object.keys(a.dimension_scores).length > 0
        );
        comparisonOptionsHtml = otherAssessments.map(a => {
            const dateStr = new Date(a.assessment_date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            });
            return `<option value="${a.id}">${dateStr} - Score: ${a.overall_score ? a.overall_score.toFixed(1) : 'N/A'}</option>`;
        }).join('');
    }

    // Build questions HTML grouped by dimension using card layout for better evidence display
    let questionsHtml = '';
    for (const dimension of report.dimensions) {
        const questionCardsHtml = dimension.questions.map(q => {
            // Parse notes for URLs and images
            const parsedNotes = parseTextWithLinks(q.notes);
            const hasDetails = q.score_description || q.score_evidence || q.notes;

            return `
                <div class="report-question-card">
                    <div class="report-question-header">
                        <span class="report-question-number">${escapeHtml(q.question_number)}</span>
                        <span class="report-question-text">${escapeHtml(q.question_text)}</span>
                        <div class="report-question-score-area">
                            ${q.score !== null ? `
                                <span class="report-score-badge ${getScoreBadgeClass(q.score, q.max_score)}">${q.score}</span>
                                ${q.score_label ? `<span class="report-score-label">${escapeHtml(q.score_label)}</span>` : ''}
                            ` : '<span class="text-secondary">Not Answered</span>'}
                        </div>
                    </div>
                    ${hasDetails ? `
                        <div class="report-question-details">
                            ${q.score_description ? `
                                <div class="report-detail-section report-rating-description">
                                    <span class="report-detail-label">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px; vertical-align: -2px;">
                                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                                        </svg>
                                        Rating Description
                                    </span>
                                    <span class="report-detail-text">${escapeHtml(q.score_description)}</span>
                                </div>
                            ` : ''}
                            ${q.score_evidence ? `
                                <div class="report-detail-section report-evidence-required">
                                    <span class="report-detail-label">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px; vertical-align: -2px;">
                                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                            <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z"/>
                                        </svg>
                                        Evidence Required
                                    </span>
                                    <span class="report-detail-text">${escapeHtml(q.score_evidence)}</span>
                                </div>
                            ` : ''}
                            ${q.notes ? `
                                <div class="report-detail-section report-assessor-notes">
                                    <span class="report-detail-label">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px; vertical-align: -2px;">
                                            <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                                        </svg>
                                        Assessor Notes
                                    </span>
                                    <div class="report-detail-text report-notes-content">${parsedNotes.html}</div>
                                    ${renderEvidenceThumbnails(parsedNotes.images)}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        questionsHtml += `
            <div class="report-dimension-section">
                <h4 class="report-dimension-header">${escapeHtml(dimension.dimension_name)}</h4>
                <div class="report-questions-cards">
                    ${questionCardsHtml}
                </div>
            </div>
        `;
    }

    content.innerHTML = `
        <div class="assessment-report" id="printableReport">
            <!-- Header -->
            <div class="report-header">
                <div class="report-header-main">
                    <h2 class="report-title">${escapeHtml(report.customer.name)}</h2>
                    <p class="report-subtitle">${escapeHtml(report.template.name)} v${escapeHtml(report.template.version)}</p>
                </div>
                <div class="report-header-meta">
                    <div class="report-overall-score ${getOverallScoreClass(report.overall_score)}">
                        <span class="report-overall-label">Overall Score</span>
                        <span class="report-overall-value">${report.overall_score ? report.overall_score.toFixed(2) : 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Meta Info -->
            <div class="report-meta-grid">
                <div class="report-meta-item">
                    <span class="report-meta-label">Assessment Date</span>
                    <span class="report-meta-value">${report.assessment_date ? formatDate(report.assessment_date) : 'N/A'}</span>
                </div>
                <div class="report-meta-item">
                    <span class="report-meta-label">Status</span>
                    <span class="report-meta-value">${report.status ? report.status.replace('_', ' ').toUpperCase() : 'N/A'}</span>
                </div>
                <div class="report-meta-item">
                    <span class="report-meta-label">Assessed By</span>
                    <span class="report-meta-value">${report.completed_by.name || 'N/A'}</span>
                </div>
                <div class="report-meta-item">
                    <span class="report-meta-label">Completed At</span>
                    <span class="report-meta-value">${report.completed_at ? formatDateTime(report.completed_at) : 'N/A'}</span>
                </div>
                <div class="report-meta-item">
                    <span class="report-meta-label">Questions Answered</span>
                    <span class="report-meta-value">${report.answered_questions} / ${report.total_questions}</span>
                </div>
            </div>

            <!-- Radar Chart Section -->
            ${report.dimension_scores && Object.keys(report.dimension_scores).length > 0 ? `
                <div class="report-section report-radar-section">
                    <div class="report-radar-header">
                        <h3 class="report-section-title" style="margin-bottom: 0;">
                            <span id="reportRadarTitle">Dimension Overview</span>
                        </h3>
                        <div class="report-radar-controls no-print">
                            <button id="reportRadarBackBtn" class="btn btn--ghost btn--sm" onclick="reportRadarBackToDimensions()" style="display: none;">
                                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" style="margin-right: 4px;">
                                    <path d="M10 16L20 6l1.4 1.4-8.6 8.6 8.6 8.6L20 26z"/>
                                </svg>
                                Back to Dimensions
                            </button>
                            ${comparisonOptionsHtml ? `
                                <div class="report-comparison-select">
                                    <label for="reportComparisonSelect" style="font-size: 12px; margin-right: 8px;">Compare with:</label>
                                    <select id="reportComparisonSelect" class="form__input form__input--sm" onchange="toggleReportComparison(this.value)" style="min-width: 180px;">
                                        <option value="">No comparison</option>
                                        ${comparisonOptionsHtml}
                                    </select>
                                </div>
                            ` : ''}
                            ${activeTarget && activeTarget.target_scores && Object.keys(activeTarget.target_scores).length > 0 ? `
                                <div class="report-target-toggle">
                                    <label class="checkbox-label" style="font-size: 12px; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                                        <input type="checkbox" id="reportTargetToggle" onchange="toggleReportTarget(this.checked)">
                                        <span>Show Target: ${escapeHtml(activeTarget.name)}</span>
                                    </label>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="report-radar-container">
                        <canvas id="reportRadarChart"></canvas>
                    </div>
                    <div id="reportRadarLegend" class="report-radar-legend"></div>
                    <p class="report-radar-hint no-print" id="reportRadarHint">
                        <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" style="vertical-align: middle; margin-right: 4px;">
                            <path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 26a12 12 0 1112-12 12 12 0 01-12 12z"/>
                            <path d="M16 7a1.5 1.5 0 101.5 1.5A1.5 1.5 0 0016 7zm1 17h-2v-9h2z"/>
                        </svg>
                        Click on a dimension label to drill down and see individual question scores
                    </p>
                </div>
            ` : ''}

            <!-- Dimension Scores Summary -->
            ${dimensionScoresHtml ? `
                <div class="report-section">
                    <h3 class="report-section-title">Dimension Scores</h3>
                    <div class="report-dimension-scores">
                        ${dimensionScoresHtml}
                    </div>
                </div>
            ` : ''}

            <!-- Assessment Notes -->
            ${report.notes ? `
                <div class="report-section">
                    <h3 class="report-section-title">Assessment Notes</h3>
                    <div class="report-notes">${escapeHtml(report.notes)}</div>
                </div>
            ` : ''}

            <!-- Questions by Dimension -->
            <div class="report-section">
                <h3 class="report-section-title">Detailed Responses</h3>
                ${questionsHtml}
            </div>

            <!-- Recommendations Section -->
            <div class="report-section recommendations-section" id="recommendationsSection">
                <div class="report-section-header">
                    <h3 class="report-section-title">Recommendations</h3>
                    <p class="report-section-subtitle text-secondary text-sm" style="margin: 0;">Based on assessment scores and identified improvement areas</p>
                </div>
                <div id="recommendationsList">
                    ${renderRecommendationsList(report.recommendations || [])}
                </div>
            </div>
        </div>
    `;

    // Store the current report for recommendations operations
    window.currentAssessmentReport = report;

    // Initialize radar chart after DOM is updated
    if (report.dimension_scores && Object.keys(report.dimension_scores).length > 0) {
        setTimeout(() => renderReportRadarChart(), 100);
    }
}

/**
 * Get score badge class based on score
 */
function getScoreBadgeClass(score, maxScore = 5) {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'score-high';
    if (percentage >= 60) return 'score-medium';
    if (percentage >= 40) return 'score-low';
    return 'score-critical';
}

// ============================================================
// ASSESSMENT RECOMMENDATIONS
// ============================================================

let currentEditingRecommendationId = null;

/**
 * Render recommendations list (roadmap recommendations)
 */
function renderRecommendationsList(recommendations) {
    if (!recommendations || recommendations.length === 0) {
        return `
            <div class="recommendations-empty">
                <p class="text-secondary">No recommendations generated yet.</p>
                <p class="text-secondary text-sm">Recommendations are automatically generated based on assessment scores and identified improvement areas.</p>
            </div>
        `;
    }

    // Sort by priority_score (highest first)
    const sorted = [...recommendations].sort((a, b) => {
        return (b.priority_score || 0) - (a.priority_score || 0);
    });

    // Group by dimension
    const byDimension = {};
    sorted.forEach(rec => {
        const dim = rec.dimension_name || 'General';
        if (!byDimension[dim]) {
            byDimension[dim] = [];
        }
        byDimension[dim].push(rec);
    });

    // Render grouped by dimension
    return Object.entries(byDimension).map(([dimension, recs]) => `
        <div class="recommendation-dimension-group">
            <div class="recommendation-dimension-header">
                <span class="recommendation-dimension-name">${escapeHtml(dimension)}</span>
                <span class="recommendation-dimension-score text-secondary">Current Score: ${recs[0].dimension_score?.toFixed(1) || 'N/A'}</span>
            </div>
            ${recs.map(rec => `
                <div class="recommendation-card ${rec.is_accepted ? 'recommendation--accepted' : ''}" data-recommendation-id="${rec.id}">
                    <div class="recommendation-header">
                        <div class="recommendation-title-row">
                            <span class="recommendation-priority-score" title="Priority Score">${Math.round(rec.priority_score || 0)}</span>
                            ${rec.is_accepted ? `<span class="recommendation-badge recommendation-badge--accepted">Accepted</span>` : ''}
                            <h4 class="recommendation-title">${escapeHtml(rec.title)}</h4>
                        </div>
                        <div class="recommendation-improvement" title="Potential Improvement">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
                                <path fill-rule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"/>
                                <path fill-rule="evenodd" d="M1 13.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 0-1h-13a.5.5 0 0 0-.5.5z"/>
                            </svg>
                            +${rec.improvement_potential?.toFixed(2) || '0.00'}
                        </div>
                    </div>
                    ${rec.description ? `
                        <div class="recommendation-description">
                            ${renderMarkdown(rec.description)}
                        </div>
                    ` : ''}
                    <div class="recommendation-meta">
                        ${rec.use_case_name ? `<span class="recommendation-use-case">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
                                <path d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4zm0 1h8a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
                            </svg>
                            ${escapeHtml(rec.use_case_name)}
                        </span>` : ''}
                        ${rec.solution_area ? `<span class="recommendation-area">${escapeHtml(rec.solution_area)}</span>` : ''}
                        ${rec.tp_feature_name ? `<span class="recommendation-tp-feature" title="TargetProcess Feature">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 4px;">
                                <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>
                            </svg>
                            ${escapeHtml(rec.tp_feature_name)}
                        </span>` : ''}
                    </div>
                    <div class="recommendation-feedback">
                        <span class="recommendation-feedback-label">Was this helpful?</span>
                        <div class="recommendation-feedback-buttons">
                            <button class="feedback-btn feedback-btn--thumbs-up ${rec.thumbs_feedback === true ? 'feedback-btn--active' : ''}"
                                    onclick="rateRecommendation(${rec.id}, true)"
                                    title="Thumbs up - relevant recommendation">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41-.28.077-.484.324-.484.607v4.172c0 .347.301.636.637.697.306.056.552.27.552.577 0 .317-.256.544-.54.629-.203.063-.478.185-.762.327-.364.182-.678.378-.9.57-.268.234-.522.502-.619.858-.092.336-.045.7.06 1.012.111.325.278.624.492.872.411.475.991.767 1.592.926.612.162 1.264.252 1.957.322.77.078 1.543.148 2.307.15a42.33 42.33 0 0 0 3.12-.16c.616-.051 1.21-.126 1.728-.29.516-.163.973-.412 1.271-.87.3-.462.389-1.054.226-1.707l-.033-.146c-.133-.608-.306-1.201-.376-1.58-.056-.298.054-.545.238-.698.184-.153.414-.202.598-.14.198.067.398.152.57.23l.019.008c.136.066.289.135.46.195.352.126.756.208 1.145.146.392-.062.76-.276.98-.622.223-.35.27-.769.194-1.157a2.63 2.63 0 0 0-.467-1.013c-.24-.318-.575-.597-.944-.82.082-.279.13-.584.133-.909.006-.647-.198-1.296-.617-1.807a1.785 1.785 0 0 0-.21-.231 2.64 2.64 0 0 0 .21-1.061c-.006-.67-.227-1.321-.669-1.825-.437-.497-1.067-.8-1.798-.899a8.263 8.263 0 0 0-1.107-.07c-.478-.002-.959.02-1.42.068-.475.049-.93.117-1.353.203a3.8 3.8 0 0 0-.68.195c.175-.585.31-1.239.376-1.924.019-.198.034-.397.046-.597z"/>
                                </svg>
                            </button>
                            <button class="feedback-btn feedback-btn--thumbs-down ${rec.thumbs_feedback === false ? 'feedback-btn--active' : ''}"
                                    onclick="rateRecommendation(${rec.id}, false)"
                                    title="Thumbs down - not relevant">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41-.28-.077-.484-.325-.484-.608V3.835c0-.346.301-.636.637-.697.306-.055.552-.27.552-.577 0-.316-.256-.543-.54-.628-.203-.064-.478-.186-.762-.328-.364-.182-.678-.378-.9-.57-.268-.233-.522-.502-.619-.857-.092-.337-.045-.701.06-1.013.111-.324.278-.624.492-.872.411-.474.991-.766 1.592-.925.612-.163 1.264-.252 1.957-.323.77-.077 1.543-.147 2.307-.15a42.33 42.33 0 0 1 3.12.16c.616.052 1.21.127 1.728.291.516.163.973.412 1.271.869.3.462.389 1.055.226 1.708l-.033.145c-.133.608-.306 1.202-.376 1.581-.056.297.054.544.238.697.184.153.414.203.598.141.198-.067.398-.153.57-.23l.019-.009c.136-.065.289-.134.46-.194.352-.127.756-.209 1.145-.147.392.062.76.276.98.622.223.35.27.77.194 1.158a2.63 2.63 0 0 1-.467 1.012c-.24.318-.575.598-.944.82.082.28.13.585.133.91.006.646-.198 1.295-.617 1.806a1.8 1.8 0 0 1-.21.232c.138.294.21.617.21 1.06-.006.671-.227 1.322-.669 1.826-.437.496-1.067.799-1.798.898a8.26 8.26 0 0 1-1.107.07c-.478.003-.959-.02-1.42-.067a12.58 12.58 0 0 1-1.353-.203 3.8 3.8 0 0 1-.68-.196c.175.586.31 1.24.376 1.925.019.197.034.396.046.596z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

/**
 * Simple markdown renderer for recommendations
 */
function renderMarkdown(text) {
    if (!text) return '';

    // Escape HTML first
    let html = escapeHtml(text);

    // Bold: **text** or __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Unordered lists: - item or * item
    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.+<\/li>)+/g, '<ul>$&</ul>');

    // Numbered lists: 1. item
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    return html;
}

/**
 * Open add recommendation modal
 */
function openAddRecommendationModal() {
    currentEditingRecommendationId = null;
    document.getElementById('recommendationModalTitle').textContent = 'Add Recommendation';
    document.getElementById('recommendationForm').reset();
    document.getElementById('recommendationModal').classList.add('open');
}

/**
 * Open edit recommendation modal
 */
function openEditRecommendationModal(recommendationId) {
    const report = window.currentAssessmentReport;
    if (!report || !report.recommendations) return;

    const rec = report.recommendations.find(r => r.id === recommendationId);
    if (!rec) return;

    currentEditingRecommendationId = recommendationId;
    document.getElementById('recommendationModalTitle').textContent = 'Edit Recommendation';

    document.getElementById('recTitle').value = rec.title || '';
    document.getElementById('recDescription').value = rec.description || '';
    document.getElementById('recPriority').value = rec.priority || 'medium';
    document.getElementById('recCategory').value = rec.category || '';

    document.getElementById('recommendationModal').classList.add('open');
}

/**
 * Close recommendation modal
 */
function closeRecommendationModal() {
    document.getElementById('recommendationModal').classList.remove('open');
    currentEditingRecommendationId = null;
}

/**
 * Save recommendation (create or update)
 */
async function saveRecommendation() {
    const assessmentId = currentReportAssessmentId;
    if (!assessmentId) return;

    const title = document.getElementById('recTitle').value.trim();
    const description = document.getElementById('recDescription').value.trim();
    const priority = document.getElementById('recPriority').value;
    const category = document.getElementById('recCategory').value.trim();

    if (!title) {
        alert('Title is required');
        return;
    }

    const data = {
        title,
        description: description || null,
        priority,
        category: category || null
    };

    try {
        if (currentEditingRecommendationId) {
            // Update existing
            await API.AssessmentRecommendationsAPI.update(assessmentId, currentEditingRecommendationId, data);
        } else {
            // Create new
            // Get the current user name if available
            if (window.Auth && window.Auth.getCurrentUser) {
                const user = window.Auth.getCurrentUser();
                if (user) {
                    data.created_by = `${user.first_name} ${user.last_name}`;
                }
            }
            await API.AssessmentRecommendationsAPI.create(assessmentId, data);
        }

        closeRecommendationModal();

        // Refresh the report to show updated recommendations
        await openAssessmentReport(assessmentId);

    } catch (error) {
        console.error('Failed to save recommendation:', error);
        alert('Failed to save recommendation. Please try again.');
    }
}

/**
 * Delete recommendation
 */
async function deleteRecommendation(recommendationId) {
    if (!confirm('Are you sure you want to delete this recommendation?')) {
        return;
    }

    const assessmentId = currentReportAssessmentId;
    if (!assessmentId) return;

    try {
        await API.AssessmentRecommendationsAPI.delete(assessmentId, recommendationId);

        // Refresh the report
        await openAssessmentReport(assessmentId);

    } catch (error) {
        console.error('Failed to delete recommendation:', error);
        alert('Failed to delete recommendation. Please try again.');
    }
}

// Export recommendation functions
window.openAddRecommendationModal = openAddRecommendationModal;
window.openEditRecommendationModal = openEditRecommendationModal;
window.closeRecommendationModal = closeRecommendationModal;
window.saveRecommendation = saveRecommendation;
window.deleteRecommendation = deleteRecommendation;

/**
 * Render radar chart in the assessment report
 */
function renderReportRadarChart() {
    const ctx = document.getElementById('reportRadarChart');
    if (!ctx || !currentReportData) return;

    // Destroy existing chart if any
    if (reportRadarChart) {
        reportRadarChart.destroy();
        reportRadarChart = null;
    }

    let labels, data, chartTitle, isDrilldown = false;

    if (reportRadarDrilldownDimension) {
        // Drill-down mode: show questions for selected dimension
        isDrilldown = true;
        const dimension = currentReportData.dimensions.find(d => d.dimension_name === reportRadarDrilldownDimension);
        if (!dimension) return;

        labels = dimension.questions.map(q => `Q${q.question_number}`);
        data = dimension.questions.map(q => q.score !== null ? q.score : 0);
        chartTitle = `${reportRadarDrilldownDimension} - Question Scores`;

        // Update UI
        document.getElementById('reportRadarTitle').textContent = chartTitle;
        document.getElementById('reportRadarBackBtn').style.display = 'inline-flex';
        document.getElementById('reportRadarHint').style.display = 'none';
    } else {
        // Dimension overview mode
        labels = Object.keys(currentReportData.dimension_scores);
        data = Object.values(currentReportData.dimension_scores);
        chartTitle = 'Dimension Overview';

        // Update UI
        document.getElementById('reportRadarTitle').textContent = chartTitle;
        document.getElementById('reportRadarBackBtn').style.display = 'none';
        document.getElementById('reportRadarHint').style.display = 'block';
    }

    // Build datasets array - primary assessment first
    const datasets = [{
        label: 'Current Assessment',
        data: data,
        backgroundColor: comparisonColors[0].bg,
        borderColor: comparisonColors[0].border,
        borderWidth: 2,
        pointBackgroundColor: comparisonColors[0].point,
        pointRadius: 5,
        pointHoverRadius: 7
    }];

    // Add comparison dataset if available and not in drilldown mode
    if (!isDrilldown && reportComparisonAssessments.length > 0) {
        reportComparisonAssessments.forEach((assessment, index) => {
            if (assessment.dimension_scores && Object.keys(assessment.dimension_scores).length > 0) {
                const colorIndex = (index + 1) % comparisonColors.length;
                const comparisonData = labels.map(label => assessment.dimension_scores[label] || 0);
                const assessmentDate = new Date(assessment.assessment_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });

                datasets.push({
                    label: assessmentDate,
                    data: comparisonData,
                    backgroundColor: comparisonColors[colorIndex].bg,
                    borderColor: comparisonColors[colorIndex].border,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointBackgroundColor: comparisonColors[colorIndex].point,
                    pointRadius: 4,
                    pointHoverRadius: 6
                });
            }
        });
    }

    // Add target dataset if toggled on and not in drilldown mode
    if (!isDrilldown && reportShowTarget && activeTarget && activeTarget.target_scores) {
        const targetData = labels.map(label => activeTarget.target_scores[label] || 0);
        datasets.push({
            label: `Target: ${activeTarget.name}`,
            data: targetData,
            backgroundColor: 'rgba(255, 131, 0, 0.1)',
            borderColor: 'rgba(255, 131, 0, 1)',
            borderWidth: 2,
            borderDash: [8, 4],
            pointBackgroundColor: 'rgba(255, 131, 0, 1)',
            pointRadius: 3,
            pointStyle: 'triangle'
        });
    }

    // Store labels for click handling
    const chartLabels = labels;

    reportRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    left: 80,
                    right: 80,
                    top: 20,
                    bottom: 20
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: '#525252',
                        backdropColor: 'transparent',
                        font: { size: 10 },
                        showLabelBackdrop: false
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        color: '#161616',
                        font: {
                            size: isDrilldown ? 11 : 12,
                            weight: 'bold'
                        },
                        padding: 15,
                        callback: function(label, index) {
                            // For drilldown, show truncated question text as tooltip alternative
                            if (isDrilldown && currentReportData) {
                                const dimension = currentReportData.dimensions.find(d => d.dimension_name === reportRadarDrilldownDimension);
                                if (dimension && dimension.questions[index]) {
                                    const qText = dimension.questions[index].question_text;
                                    // Keep question number label short, tooltip will show full text
                                    return label;
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'bottom',
                    labels: {
                        color: '#161616',
                        usePointStyle: true,
                        padding: 16,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            if (isDrilldown && currentReportData) {
                                const dimension = currentReportData.dimensions.find(d => d.dimension_name === reportRadarDrilldownDimension);
                                if (dimension && dimension.questions[context[0].dataIndex]) {
                                    return dimension.questions[context[0].dataIndex].question_text;
                                }
                            }
                            return context[0].label;
                        },
                        label: function(context) {
                            return `Score: ${context.raw.toFixed(2)} / 5`;
                        }
                    }
                }
            },
            onClick: function(event, elements, chart) {
                // Only allow drill-down when not already in drilldown mode
                if (!isDrilldown && elements.length > 0) {
                    const labelIndex = elements[0].index;
                    const dimensionName = chartLabels[labelIndex];
                    reportRadarDrillDown(dimensionName);
                }
            }
        }
    });

    // Update legend
    updateReportRadarLegend(datasets);
}

/**
 * Update the radar chart legend in the report
 */
function updateReportRadarLegend(datasets) {
    const legendContainer = document.getElementById('reportRadarLegend');
    if (!legendContainer) return;

    if (datasets.length <= 1) {
        legendContainer.innerHTML = '';
        legendContainer.style.display = 'none';
        return;
    }

    legendContainer.style.display = 'flex';
    let html = '';
    datasets.forEach((ds, index) => {
        const isDashed = ds.borderDash && ds.borderDash.length > 0;
        html += `
            <div class="report-radar-legend-item">
                <span class="report-radar-legend-color" style="background-color: ${ds.borderColor}; ${isDashed ? 'border: 2px dashed ' + ds.borderColor + '; background: transparent;' : ''}"></span>
                <span class="report-radar-legend-label">${ds.label}</span>
            </div>
        `;
    });
    legendContainer.innerHTML = html;
}

/**
 * Drill down into a dimension to see question-level radar chart
 */
function reportRadarDrillDown(dimensionName) {
    reportRadarDrilldownDimension = dimensionName;
    renderReportRadarChart();
}

/**
 * Go back to dimension-level radar chart
 */
function reportRadarBackToDimensions() {
    reportRadarDrilldownDimension = null;
    renderReportRadarChart();
}

/**
 * Toggle comparison assessment in the report radar chart
 */
async function toggleReportComparison(assessmentId) {
    if (!assessmentId) {
        reportComparisonAssessments = [];
        renderReportRadarChart();
        return;
    }

    try {
        // Find the assessment in customerAssessments
        const assessment = customerAssessments.find(a => a.id === parseInt(assessmentId));
        if (assessment && assessment.dimension_scores) {
            reportComparisonAssessments = [assessment];
        } else {
            // Fetch the full assessment data if not available
            const response = await fetch(`${API_BASE_URL}/assessments/${assessmentId}`);
            if (response.ok) {
                const fullAssessment = await response.json();
                reportComparisonAssessments = [fullAssessment];
            }
        }
        renderReportRadarChart();
    } catch (error) {
        console.error('Failed to load comparison assessment:', error);
        reportComparisonAssessments = [];
        renderReportRadarChart();
    }
}

/**
 * Toggle target state overlay in the report radar chart
 */
function toggleReportTarget(showTarget) {
    reportShowTarget = showTarget;
    renderReportRadarChart();
}

// Export report radar functions
window.reportRadarDrillDown = reportRadarDrillDown;
window.reportRadarBackToDimensions = reportRadarBackToDimensions;
window.toggleReportComparison = toggleReportComparison;
window.toggleReportTarget = toggleReportTarget;

/**
 * Parse text for URLs and make them clickable links
 * Also detects image URLs and returns them separately for thumbnail display
 */
function parseTextWithLinks(text) {
    if (!text) return { html: '', images: [] };

    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;

    // Image file extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;

    const images = [];
    let html = escapeHtml(text);

    // Find all URLs in original text
    const urls = text.match(urlPattern) || [];

    urls.forEach(url => {
        const escapedUrl = escapeHtml(url);
        const isImage = imageExtensions.test(url);

        if (isImage) {
            images.push(url);
        }

        // Replace URL with clickable link
        const linkHtml = `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="report-evidence-link">${escapedUrl}</a>`;
        html = html.replace(escapedUrl, linkHtml);
    });

    return { html, images };
}

/**
 * Render evidence thumbnails with lightbox support
 */
function renderEvidenceThumbnails(images) {
    if (!images || images.length === 0) return '';

    return `
        <div class="report-evidence-thumbnails">
            ${images.map((url, idx) => `
                <div class="report-evidence-thumbnail" onclick="openImageLightbox('${escapeHtml(url)}')">
                    <img src="${escapeHtml(url)}" alt="Evidence image ${idx + 1}" loading="lazy" onerror="this.parentElement.style.display='none'">
                    <div class="report-thumbnail-overlay">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 3a.5.5 0 0 1 .5.5v4h4a.5.5 0 0 1 0 1h-4v4a.5.5 0 0 1-1 0v-4h-4a.5.5 0 0 1 0-1h4v-4A.5.5 0 0 1 8 3z"/>
                        </svg>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Open image in lightbox
 */
function openImageLightbox(imageUrl) {
    // Create lightbox if it doesn't exist
    let lightbox = document.getElementById('imageLightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'imageLightbox';
        lightbox.className = 'image-lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-backdrop" onclick="closeImageLightbox()"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" onclick="closeImageLightbox()" aria-label="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
                <img id="lightboxImage" src="" alt="Evidence image enlarged">
            </div>
        `;
        document.body.appendChild(lightbox);
    }

    // Set image and show lightbox
    const img = document.getElementById('lightboxImage');
    img.src = imageUrl;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Close on Escape key
    document.addEventListener('keydown', handleLightboxKeydown);
}

/**
 * Close image lightbox
 */
function closeImageLightbox() {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleLightboxKeydown);
    }
}

/**
 * Handle keyboard events for lightbox
 */
function handleLightboxKeydown(e) {
    if (e.key === 'Escape') {
        closeImageLightbox();
    }
}

/**
 * Get overall score class
 */
function getOverallScoreClass(score) {
    if (!score) return '';
    if (score >= 4) return 'score-high';
    if (score >= 3) return 'score-medium';
    if (score >= 2) return 'score-low';
    return 'score-critical';
}

/**
 * Format datetime
 */
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Export assessment to Excel
 */
function exportAssessmentExcel() {
    if (!currentReportAssessmentId) return;

    // Open download in new window
    window.open(`${API_BASE_URL}/assessments/${currentReportAssessmentId}/export/excel`, '_blank');
}

/**
 * Print assessment report (can save as PDF)
 */
function printAssessmentReport() {
    const printContent = document.getElementById('printableReport');
    if (!printContent) return;

    // Clone content for modifications
    const clonedContent = printContent.cloneNode(true);

    // Convert radar chart canvas to image for printing
    const radarCanvas = document.getElementById('reportRadarChart');
    const radarContainer = clonedContent.querySelector('.report-radar-container');
    if (radarCanvas && radarContainer) {
        try {
            const imageUrl = radarCanvas.toDataURL('image/png');
            const img = document.createElement('img');
            img.src = imageUrl;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '0 auto';
            radarContainer.innerHTML = '';
            radarContainer.appendChild(img);
        } catch (e) {
            console.warn('Could not convert radar chart to image:', e);
        }
    }

    // Remove no-print elements from cloned content
    clonedContent.querySelectorAll('.no-print').forEach(el => el.remove());

    // Create print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Assessment Report</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    line-height: 1.5;
                    color: #161616;
                    padding: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 24px;
                    padding-bottom: 16px;
                    border-bottom: 2px solid #161616;
                }
                .report-title { font-size: 24px; margin: 0 0 4px 0; }
                .report-subtitle { color: #525252; margin: 0; }
                .report-overall-score {
                    text-align: center;
                    padding: 12px 24px;
                    background: #f4f4f4;
                    border-radius: 8px;
                }
                .report-overall-label { display: block; font-size: 12px; color: #525252; }
                .report-overall-value { display: block; font-size: 32px; font-weight: 600; }
                .report-overall-score.score-high .report-overall-value { color: #198038; }
                .report-overall-score.score-medium .report-overall-value { color: #f1c21b; }
                .report-overall-score.score-low .report-overall-value { color: #ff832b; }
                .report-overall-score.score-critical .report-overall-value { color: #da1e28; }
                .report-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 16px;
                    margin-bottom: 24px;
                    padding: 16px;
                    background: #f4f4f4;
                    border-radius: 8px;
                }
                .report-meta-label { display: block; font-size: 11px; color: #525252; text-transform: uppercase; }
                .report-meta-value { display: block; font-weight: 500; }
                .report-section { margin-bottom: 24px; }
                .report-section-title { font-size: 16px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
                .report-dimension-scores { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
                .report-dimension-score { display: flex; align-items: center; gap: 12px; }
                .report-dimension-name { flex: 1; font-weight: 500; }
                .report-dimension-value { font-weight: 600; width: 40px; text-align: right; }
                .report-dimension-bar { flex: 1; height: 8px; background: #e0e0e0; border-radius: 4px; }
                .report-dimension-bar-fill { height: 100%; background: #0f62fe; border-radius: 4px; }
                .report-dimension-section { margin-bottom: 20px; }
                .report-dimension-header { font-size: 14px; margin: 0 0 8px 0; padding: 8px 12px; background: #e0e0e0; }
                .report-questions-table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .report-questions-table th, .report-questions-table td { padding: 8px; border: 1px solid #e0e0e0; text-align: left; vertical-align: top; }
                .report-questions-table th { background: #f4f4f4; font-weight: 600; }
                .report-score-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
                .score-high { background: #defbe6; color: #198038; }
                .score-medium { background: #fcf4d6; color: #8a6d3b; }
                .score-low { background: #fff1e1; color: #ba4e00; }
                .score-critical { background: #fff1f1; color: #da1e28; }
                .text-center { text-align: center; }
                .text-secondary { color: #525252; }
                .report-notes { padding: 12px; background: #f4f4f4; border-radius: 4px; white-space: pre-wrap; }
                .report-detail-row { background: #f9f9f9; }
                .report-detail-row td { padding-top: 4px !important; padding-bottom: 12px !important; border-top: none !important; }
                .report-detail-section { margin-bottom: 8px; }
                .report-detail-section:last-child { margin-bottom: 0; }
                .report-detail-label { display: block; font-size: 10px; font-weight: 600; color: #525252; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
                .report-detail-text { display: block; font-size: 11px; color: #161616; line-height: 1.4; }
                /* Radar chart print styles */
                .report-radar-section { margin-bottom: 32px; page-break-inside: avoid; }
                .report-radar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
                .report-radar-container { max-width: 450px; margin: 0 auto; padding: 10px 0; }
                .report-radar-legend { display: flex; justify-content: center; flex-wrap: wrap; gap: 16px; margin-top: 16px; padding: 12px; background: #f4f4f4; border-radius: 8px; }
                .report-radar-legend-item { display: flex; align-items: center; gap: 8px; }
                .report-radar-legend-color { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; }
                .report-radar-legend-label { font-size: 13px; color: #161616; }
                /* Recommendations print styles */
                .recommendations-section { margin-top: 32px; page-break-before: auto; }
                .report-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
                .report-section-header .report-section-title { margin: 0; padding: 0; border: none; }
                .recommendation-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px; page-break-inside: avoid; }
                .recommendation-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px; }
                .recommendation-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }
                .recommendation-priority { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; }
                .recommendation-priority.priority--high { background: #fff1f1; color: #da1e28; border: 1px solid #da1e28; }
                .recommendation-priority.priority--medium { background: #fcf4d6; color: #8a6d3b; border: 1px solid #f1c21b; }
                .recommendation-priority.priority--low { background: #defbe6; color: #198038; border: 1px solid #24a148; }
                .recommendation-category { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: #f4f4f4; color: #525252; }
                .recommendation-title { font-size: 14px; font-weight: 600; color: #161616; margin: 0; }
                .recommendation-description { font-size: 13px; line-height: 1.6; color: #161616; margin: 8px 0; padding: 12px; background: #f4f4f4; border-radius: 4px; }
                .recommendation-description ul, .recommendation-description ol { margin: 8px 0; padding-left: 20px; }
                .recommendation-description li { margin: 4px 0; }
                .recommendation-meta { display: flex; gap: 16px; font-size: 11px; color: #525252; margin-top: 8px; }
                .recommendations-empty { padding: 24px; text-align: center; background: #f4f4f4; border-radius: 8px; }
                .no-print { display: none !important; }
                @media print {
                    body { padding: 0; }
                    .report-meta-grid { grid-template-columns: repeat(3, 1fr); }
                    .report-radar-section { page-break-inside: avoid; }
                    .recommendation-card { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            ${clonedContent.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = function() {
        printWindow.print();
    };
}

// Export report functions
window.openAssessmentReport = openAssessmentReport;
window.closeAssessmentReportModal = closeAssessmentReportModal;
window.exportAssessmentExcel = exportAssessmentExcel;
window.printAssessmentReport = printAssessmentReport;


// ============================================================
// ASSESSMENT TARGETS
// ============================================================

let customerTargets = [];
let currentEditingTargetId = null;
let activeTarget = null;

// Load targets for the customer
async function loadTargets(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/customer/${customerId}/targets`);
        if (!response.ok) throw new Error('Failed to load targets');
        const data = await response.json();
        customerTargets = data.items || [];
        renderTargetsList();

        // Find active target
        activeTarget = customerTargets.find(t => t.is_active);

        // Update radar chart if we have a target and assessment
        if (activeTarget && currentAssessment) {
            renderRadarChartWithTarget(currentAssessment.dimension_scores, activeTarget);
        }
    } catch (error) {
        console.error('Failed to load targets:', error);
        customerTargets = [];
        renderTargetsList();
    }
}

// Render targets list
function renderTargetsList() {
    const container = document.getElementById('targetsListContainer');
    if (!container) return;

    // Get the active framework name for empty state message
    const frameworkNames = { spm: 'SPM', tbm: 'TBM', finops: 'FinOps' };
    const activeFramework = frameworkNames[activeAssessmentTypeTab] || 'this framework';

    if (customerTargets.length === 0) {
        container.innerHTML = `<div class="text-secondary text-center" style="padding: 24px;">No ${activeFramework} targets set. Set a target to track progress toward goals.</div>`;
        return;
    }

    let html = '';
    for (const target of customerTargets) {
        const status = calculateTargetStatus(target);
        const statusClass = `target-card__status--${status.replace('_', '-')}`;
        const statusLabel = formatTargetStatus(status);
        const targetDate = target.target_date ? formatDate(target.target_date) : 'No date set';
        const daysRemaining = target.target_date ? getDaysRemaining(target.target_date) : null;

        // Get assessment type badge
        const typeInfo = target.assessment_type;
        const typeBadge = typeInfo ? `
            <span class="target-type-badge" style="background-color: ${typeInfo.color}20; color: ${typeInfo.color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 8px;">
                ${typeInfo.short_name}
            </span>
        ` : '';

        html += `
            <div class="target-card ${target.is_active ? 'active' : ''}" data-target-id="${target.id}">
                <div class="target-card__header">
                    <div>
                        <div class="target-card__name">${escapeHtml(target.name)}${typeBadge}</div>
                        <div class="target-card__date">
                            Target: ${targetDate}
                            ${daysRemaining !== null ? `(${daysRemaining > 0 ? daysRemaining + ' days remaining' : daysRemaining === 0 ? 'Due today' : Math.abs(daysRemaining) + ' days overdue'})` : ''}
                        </div>
                    </div>
                    <span class="target-card__status ${statusClass}">${statusLabel}</span>
                </div>
                <div class="target-card__scores">
                    ${Object.entries(target.target_scores || {}).slice(0, 5).map(([dim, score]) => `
                        <span class="target-score-chip">
                            <span class="target-score-chip__name">${escapeHtml(dim)}</span>
                            <span class="target-score-chip__value">${score.toFixed(1)}</span>
                        </span>
                    `).join('')}
                    ${Object.keys(target.target_scores || {}).length > 5 ? `<span class="target-score-chip">+${Object.keys(target.target_scores).length - 5} more</span>` : ''}
                </div>
                <div class="target-card__actions">
                    <button class="btn btn--ghost btn--sm" onclick="viewGapAnalysis(${target.id})">
                        <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M10 18H6v8h4v-8zm12-8h-4v16h4V10zm-6 6h-4v10h4V16z"/></svg>
                        Gap Analysis
                    </button>
                    ${target.is_active ? `
                        <button class="btn btn--ghost btn--sm" onclick="overlayTargetOnChart(${target.id})" title="Show on chart">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M16 8a5 5 0 105 5 5 5 0 00-5-5zm0 8a3 3 0 113-3 3.003 3.003 0 01-3 3z"/><path d="M16 4a12 12 0 00-7.9 21l1.3-1.5a10 10 0 1113.2 0l1.3 1.5A12 12 0 0016 4z"/></svg>
                        </button>
                    ` : `
                        <button class="btn btn--ghost btn--sm" onclick="setActiveTarget(${target.id})" title="Set as active">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M16 2a14 14 0 1014 14A14.016 14.016 0 0016 2zm0 26a12 12 0 1112-12 12.014 12.014 0 01-12 12z"/><path d="M14 21.5l-5-4.96L10.59 15 14 18.35 21.41 11 23 12.58 14 21.5z"/></svg>
                        </button>
                    `}
                    <button class="btn btn--ghost btn--sm" onclick="editTarget(${target.id})" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15z"/></svg>
                    </button>
                    <button class="btn btn--ghost btn--sm" onclick="deleteTarget(${target.id})" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M12 12h2v12h-2zm6 0h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/></svg>
                    </button>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Calculate target status based on current assessment
function calculateTargetStatus(target) {
    if (!currentAssessment || !currentAssessment.dimension_scores) {
        return 'at_risk';
    }

    const currentScores = currentAssessment.dimension_scores;
    const targetScores = target.target_scores || {};

    let totalGap = 0;
    let dimensionsCount = 0;

    for (const [dim, targetScore] of Object.entries(targetScores)) {
        const currentScore = currentScores[dim];
        if (currentScore !== undefined) {
            totalGap += targetScore - currentScore;
            dimensionsCount++;
        }
    }

    if (dimensionsCount === 0) return 'at_risk';

    const avgGap = totalGap / dimensionsCount;

    if (avgGap <= 0) return 'achieved';
    if (avgGap <= 0.5) return 'on_track';
    if (avgGap <= 1.0) return 'needs_attention';
    return 'at_risk';
}

function formatTargetStatus(status) {
    const labels = {
        'achieved': 'Achieved',
        'on_track': 'On Track',
        'needs_attention': 'Needs Attention',
        'at_risk': 'At Risk'
    };
    return labels[status] || status;
}

function getDaysRemaining(dateStr) {
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    return Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
}

// Open target modal
async function openTargetModal(targetId = null) {
    currentEditingTargetId = targetId;
    const modal = document.getElementById('targetModal');
    const title = document.getElementById('targetModalTitle');

    title.textContent = targetId ? 'Edit Target' : 'Set Assessment Target';

    // Reset form
    document.getElementById('targetName').value = '';
    document.getElementById('targetDescription').value = '';
    document.getElementById('targetDate').value = '';
    document.getElementById('targetOverallScore').value = '';

    // Pre-select current assessment type
    const typeSelect = document.getElementById('targetAssessmentType');
    if (typeSelect) {
        const typeId = ASSESSMENT_TYPE_IDS[activeAssessmentTypeTab];
        typeSelect.value = typeId || '';
    }

    // Load dimensions from current template
    await loadTargetDimensions();

    // If editing, populate with existing data
    if (targetId) {
        const target = customerTargets.find(t => t.id === targetId);
        if (target) {
            document.getElementById('targetName').value = target.name || '';
            document.getElementById('targetDescription').value = target.description || '';
            document.getElementById('targetDate').value = target.target_date || '';
            document.getElementById('targetOverallScore').value = target.overall_target || '';

            // Set assessment type
            if (typeSelect && target.assessment_type_id) {
                typeSelect.value = target.assessment_type_id;
            }

            // Populate dimension scores
            for (const [dim, score] of Object.entries(target.target_scores || {})) {
                const input = document.querySelector(`input[data-dimension="${dim}"]`);
                const slider = document.querySelector(`input[data-dimension-slider="${dim}"]`);
                if (input) input.value = score;
                if (slider) slider.value = score;
            }
        }
    }

    modal.classList.add('open');
}

function closeTargetModal() {
    document.getElementById('targetModal').classList.remove('open');
    currentEditingTargetId = null;
}

async function loadTargetDimensions() {
    const container = document.getElementById('targetDimensionScores');
    const typeSelect = document.getElementById('targetAssessmentType');
    const selectedTypeId = typeSelect?.value ? parseInt(typeSelect.value) : ASSESSMENT_TYPE_IDS[activeAssessmentTypeTab];

    // Map type ID to type code
    const typeCodeMap = { 1: 'spm', 2: 'tbm', 3: 'finops' };
    const selectedTypeCode = typeCodeMap[selectedTypeId] || activeAssessmentTypeTab;

    // Get dimensions from assessmentsByType cache or fetch from template
    let dimensions = [];
    let currentScores = {};

    // First try to get from cached assessment data for this type
    const typeData = assessmentsByType[selectedTypeCode];
    if (typeData && typeData.dimensions && typeData.dimensions.length > 0) {
        dimensions = typeData.dimensions.map(d => d.name);
        typeData.dimensions.forEach(d => {
            currentScores[d.name] = d.score || 0;
        });
    } else {
        // Try to get from active template for this type
        try {
            const response = await fetch(`${API_BASE_URL}/assessments/templates/active?assessment_type_id=${selectedTypeId}`);
            if (response.ok) {
                const template = await response.json();
                if (template && template.dimensions) {
                    dimensions = template.dimensions.map(d => d.name);
                }
            }
        } catch (error) {
            console.error('Failed to load template dimensions:', error);
        }
    }

    if (dimensions.length === 0) {
        const frameworkNames = { spm: 'SPM', tbm: 'TBM', finops: 'FinOps' };
        container.innerHTML = `<div class="text-secondary">No dimensions found for ${frameworkNames[selectedTypeCode] || 'this framework'}. Complete an assessment first or select a different framework.</div>`;
        return;
    }

    let html = '';
    for (const dim of dimensions) {
        // Use currentScores from type data, fallback to currentAssessment
        const currentScore = currentScores[dim] ?? currentAssessment?.dimension_scores?.[dim] ?? 0;
        html += `
            <div class="target-dimension-row">
                <span class="target-dimension-row__name">${escapeHtml(dim)}</span>
                <input type="range" class="target-dimension-row__slider"
                    min="1" max="5" step="0.1" value="${Math.max(currentScore, 1)}"
                    data-dimension-slider="${dim}"
                    oninput="syncTargetSlider(this, '${dim}')">
                <input type="number" class="form-input target-dimension-row__input"
                    min="1" max="5" step="0.1" value="${currentScore > 0 ? currentScore.toFixed(1) : '3.0'}"
                    data-dimension="${dim}"
                    oninput="syncTargetInput(this, '${dim}')">
                <span class="text-secondary" style="font-size: 11px; width: 60px;">
                    (Current: ${currentScore > 0 ? currentScore.toFixed(1) : 'N/A'})
                </span>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Reload dimensions when assessment type changes in modal
function onTargetAssessmentTypeChange() {
    loadTargetDimensions();
}

function syncTargetSlider(slider, dimension) {
    const input = document.querySelector(`input[data-dimension="${dimension}"]`);
    if (input) input.value = parseFloat(slider.value).toFixed(1);
}

function syncTargetInput(input, dimension) {
    const slider = document.querySelector(`input[data-dimension-slider="${dimension}"]`);
    if (slider) slider.value = input.value;
}

async function saveTarget() {
    const customerId = getCustomerId();
    const name = document.getElementById('targetName').value.trim();
    const description = document.getElementById('targetDescription').value.trim();
    const targetDate = document.getElementById('targetDate').value;
    const overallTarget = document.getElementById('targetOverallScore').value;
    const assessmentTypeId = document.getElementById('targetAssessmentType')?.value;

    if (!name) {
        alert('Please enter a target name');
        return;
    }

    // Collect dimension scores
    const targetScores = {};
    document.querySelectorAll('input[data-dimension]').forEach(input => {
        const dim = input.getAttribute('data-dimension');
        const score = parseFloat(input.value);
        if (!isNaN(score) && score >= 1 && score <= 5) {
            targetScores[dim] = score;
        }
    });

    const targetData = {
        name,
        description: description || null,
        target_date: targetDate || null,
        target_scores: targetScores,
        overall_target: overallTarget ? parseFloat(overallTarget) : null,
        is_active: customerTargets.length === 0, // First target is active by default
        assessment_type_id: assessmentTypeId ? parseInt(assessmentTypeId) : null
    };

    try {
        let response;
        if (currentEditingTargetId) {
            response = await fetch(`${API_BASE_URL}/assessments/targets/${currentEditingTargetId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targetData)
            });
        } else {
            response = await fetch(`${API_BASE_URL}/assessments/customer/${customerId}/targets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(targetData)
            });
        }

        if (!response.ok) throw new Error('Failed to save target');

        closeTargetModal();
        await loadTargetsByType(customerId, activeAssessmentTypeTab);

    } catch (error) {
        console.error('Failed to save target:', error);
        alert('Failed to save target. Please try again.');
    }
}

function editTarget(targetId) {
    openTargetModal(targetId);
}

async function deleteTarget(targetId) {
    if (!confirm('Are you sure you want to delete this target?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/assessments/targets/${targetId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete target');

        await loadTargetsByType(getCustomerId(), activeAssessmentTypeTab);

    } catch (error) {
        console.error('Failed to delete target:', error);
        alert('Failed to delete target. Please try again.');
    }
}

async function setActiveTarget(targetId) {
    // Deactivate all other targets first
    for (const target of customerTargets) {
        if (target.is_active && target.id !== targetId) {
            await fetch(`${API_BASE_URL}/assessments/targets/${target.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: false })
            });
        }
    }

    // Activate this target
    await fetch(`${API_BASE_URL}/assessments/targets/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
    });

    await loadTargetsByType(getCustomerId(), activeAssessmentTypeTab);
}

function overlayTargetOnChart(targetId) {
    const target = customerTargets.find(t => t.id === targetId);
    if (target && currentAssessment) {
        renderRadarChartWithTarget(currentAssessment.dimension_scores, target);
    }
}

async function viewGapAnalysis(targetId) {
    const customerId = getCustomerId();

    try {
        const response = await fetch(`${API_BASE_URL}/assessments/customer/${customerId}/targets/${targetId}/gap-analysis`);
        if (!response.ok) throw new Error('Failed to load gap analysis');

        const gapData = await response.json();
        showGapAnalysisModal(gapData);

    } catch (error) {
        console.error('Failed to load gap analysis:', error);
        alert('Failed to load gap analysis. Please try again.');
    }
}

function showGapAnalysisModal(gapData) {
    // Create or show gap analysis in a modal
    let modal = document.getElementById('gapAnalysisModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gapAnalysisModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal__overlay" onclick="closeGapAnalysisModal()"></div>
            <div class="modal__container" style="max-width: 700px;">
                <div class="modal__header">
                    <h2 class="modal__title">Gap Analysis</h2>
                    <button class="modal__close" onclick="closeGapAnalysisModal()">&times;</button>
                </div>
                <div class="modal__body" id="gapAnalysisContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const content = document.getElementById('gapAnalysisContent');
    const daysText = gapData.days_to_target !== null ?
        (gapData.days_to_target > 0 ? `${gapData.days_to_target} days remaining` :
         gapData.days_to_target === 0 ? 'Due today' : `${Math.abs(gapData.days_to_target)} days overdue`) : '';

    content.innerHTML = `
        <div class="gap-analysis-header">
            <div>
                <div class="gap-analysis-header__title">${escapeHtml(gapData.target.name)}</div>
                <div class="gap-analysis-header__target">${daysText}</div>
            </div>
            <span class="gap-status gap-status--${gapData.overall_status.replace('_', '-')}">${formatTargetStatus(gapData.overall_status)}</span>
        </div>

        <div style="margin: 16px 0; padding: 16px; background: var(--cds-layer-02); border-radius: 8px;">
            <div class="flex flex-between items-center">
                <div>
                    <div class="text-secondary" style="font-size: 12px;">Current Overall</div>
                    <div style="font-size: 24px; font-weight: 600;">${gapData.current_overall?.toFixed(2) || 'N/A'}</div>
                </div>
                <div style="font-size: 24px; color: var(--cds-text-secondary);">→</div>
                <div>
                    <div class="text-secondary" style="font-size: 12px;">Target Overall</div>
                    <div style="font-size: 24px; font-weight: 600; color: var(--cds-interactive);">${gapData.target_overall?.toFixed(2) || 'N/A'}</div>
                </div>
                <div>
                    <div class="text-secondary" style="font-size: 12px;">Gap</div>
                    <div style="font-size: 24px; font-weight: 600;" class="${gapData.overall_gap > 0 ? 'gap-value--positive' : 'gap-value--negative'}">
                        ${gapData.overall_gap !== null ? (gapData.overall_gap > 0 ? '+' : '') + gapData.overall_gap.toFixed(2) : 'N/A'}
                    </div>
                </div>
            </div>
        </div>

        <table class="gap-analysis-table">
            <thead>
                <tr>
                    <th>Dimension</th>
                    <th>Current</th>
                    <th>Target</th>
                    <th>Gap</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${gapData.dimension_gaps.map(gap => `
                    <tr>
                        <td>${escapeHtml(gap.dimension_name)}</td>
                        <td>${gap.current_score?.toFixed(2) || 'N/A'}</td>
                        <td>${gap.target_score?.toFixed(2) || 'N/A'}</td>
                        <td class="${gap.gap > 0 ? 'gap-value--positive' : 'gap-value--negative'}">
                            ${gap.gap !== null ? (gap.gap > 0 ? '+' : '') + gap.gap.toFixed(2) : 'N/A'}
                        </td>
                        <td><span class="gap-status gap-status--${gap.status.replace('_', '-')}">${formatTargetStatus(gap.status)}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    modal.classList.add('open');
}

function closeGapAnalysisModal() {
    const modal = document.getElementById('gapAnalysisModal');
    if (modal) modal.classList.remove('open');
}


// ============================================================
// RADAR CHART WITH TARGET OVERLAY
// ============================================================

function renderRadarChartWithTarget(dimensionScores, target) {
    const ctx = document.getElementById('spmRadarChart');
    if (!ctx) return;

    // Destroy existing chart if any
    if (spmRadarChart) {
        spmRadarChart.destroy();
    }

    if (!dimensionScores || Object.keys(dimensionScores).length === 0) {
        return;
    }

    const labels = Object.keys(dimensionScores);
    const data = Object.values(dimensionScores);

    // Build datasets - current assessment
    const datasets = [{
        label: 'Current Assessment',
        data: data,
        backgroundColor: 'rgba(15, 98, 254, 0.2)',
        borderColor: 'rgba(15, 98, 254, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(15, 98, 254, 1)',
        pointRadius: 4
    }];

    // Add target dataset if provided
    if (target && target.target_scores) {
        const targetData = labels.map(label => target.target_scores[label] || 0);
        datasets.push({
            label: `Target: ${target.name}`,
            data: targetData,
            backgroundColor: 'rgba(255, 131, 0, 0.1)',
            borderColor: 'rgba(255, 131, 0, 1)',
            borderWidth: 2,
            borderDash: [8, 4],
            pointBackgroundColor: 'rgba(255, 131, 0, 1)',
            pointRadius: 3,
            pointStyle: 'triangle'
        });
    }

    spmRadarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            layout: {
                padding: {
                    left: 120,
                    right: 120,
                    top: 20,
                    bottom: 20
                }
            },
            scales: {
                r: {
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: '#525252',
                        backdropColor: 'transparent',
                        font: { size: 10 },
                        showLabelBackdrop: false
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    pointLabels: {
                        color: '#161616',
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        padding: 20
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#161616',
                        usePointStyle: true,
                        padding: 16,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}


// ============================================================
// SCORE EDITING
// ============================================================

let pendingEdits = {};

async function openEditScoresModal() {
    if (!currentAssessment) {
        alert('No assessment selected');
        return;
    }

    pendingEdits = {};

    const modal = document.getElementById('editScoresModal');
    const container = document.getElementById('editScoresContainer');

    container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Loading responses...</div>';
    modal.classList.add('open');

    try {
        // Load full assessment details
        const response = await fetch(`${API_BASE_URL}/assessments/${currentAssessment.id}`);
        if (!response.ok) throw new Error('Failed to load assessment');

        const assessment = await response.json();
        assessmentResponses = assessment.responses || [];

        renderEditScoresTable();

    } catch (error) {
        console.error('Failed to load responses:', error);
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Failed to load responses</div>';
    }
}

function closeEditScoresModal() {
    document.getElementById('editScoresModal').classList.remove('open');
    pendingEdits = {};
}

function renderEditScoresTable() {
    const container = document.getElementById('editScoresContainer');

    if (assessmentResponses.length === 0) {
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">No responses to edit</div>';
        return;
    }

    // Group by dimension
    const byDimension = {};
    for (const response of assessmentResponses) {
        const dimName = response.question?.dimension?.name || 'General';
        if (!byDimension[dimName]) byDimension[dimName] = [];
        byDimension[dimName].push(response);
    }

    let html = '';
    for (const [dimName, responses] of Object.entries(byDimension)) {
        html += `
            <div style="margin-bottom: 24px;">
                <h4 style="margin-bottom: 12px; color: var(--cds-text-secondary); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(dimName)}</h4>
                <table class="edit-scores-table">
                    <thead>
                        <tr>
                            <th style="width: 60px;">#</th>
                            <th>Question</th>
                            <th style="width: 80px;">Score</th>
                            <th style="width: 100px;">Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${responses.map(r => {
                            const pending = pendingEdits[r.id];
                            const currentScore = pending?.score ?? r.score;
                            const hasChange = pending?.score !== undefined && pending.score !== r.score;

                            return `
                                <tr>
                                    <td>${r.question?.question_number || '-'}</td>
                                    <td style="font-size: 13px;">${escapeHtml(r.question?.question_text || '')}</td>
                                    <td>
                                        <input type="number" class="edit-score-input ${hasChange ? 'changed' : ''}"
                                            value="${currentScore}" min="${r.question?.min_score || 1}" max="${r.question?.max_score || 5}"
                                            data-response-id="${r.id}" data-original="${r.score}"
                                            onchange="trackScoreChange(${r.id}, this.value, ${r.score})">
                                    </td>
                                    <td>
                                        ${hasChange ? `
                                            <span class="score-change-indicator ${pending.score > r.score ? 'score-change-indicator--up' : 'score-change-indicator--down'}">
                                                ${pending.score > r.score ? '↑' : '↓'} ${r.score} → ${pending.score}
                                            </span>
                                        ` : '-'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    container.innerHTML = html;
}

function trackScoreChange(responseId, newValue, originalValue) {
    const score = parseInt(newValue);

    if (score === originalValue) {
        delete pendingEdits[responseId];
    } else {
        pendingEdits[responseId] = { score, originalValue };
    }

    renderEditScoresTable();
}

async function saveEditedScores() {
    const editCount = Object.keys(pendingEdits).length;

    if (editCount === 0) {
        closeEditScoresModal();
        return;
    }

    // Open reason modal
    document.getElementById('editReasonModal').classList.add('open');
}

function closeEditReasonModal() {
    document.getElementById('editReasonModal').classList.remove('open');
}

async function confirmScoreEdit() {
    const reason = document.getElementById('editChangeReason').value.trim();

    if (!reason) {
        alert('Please provide a reason for the changes');
        return;
    }

    closeEditReasonModal();

    const saveBtn = document.getElementById('saveEditedScoresBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // Save each edit
        const userId = 1; // TODO: Get current user ID

        for (const [responseId, edit] of Object.entries(pendingEdits)) {
            await fetch(`${API_BASE_URL}/assessments/${currentAssessment.id}/responses/${responseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    score: edit.score,
                    change_reason: reason,
                    edited_by_id: userId
                })
            });
        }

        closeEditScoresModal();
        document.getElementById('editChangeReason').value = '';

        // Reload assessment
        await loadAssessments(getCustomerId());

    } catch (error) {
        console.error('Failed to save edits:', error);
        alert('Failed to save some changes. Please try again.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Changes';
    }
}


// ============================================================
// AUDIT TRAIL
// ============================================================

async function viewAuditTrail() {
    closeEditScoresModal();

    const section = document.getElementById('auditTrailSection');
    const container = document.getElementById('auditTrailContainer');

    section.style.display = 'block';
    container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Loading change history...</div>';

    // Scroll to audit section
    section.scrollIntoView({ behavior: 'smooth' });

    try {
        const response = await fetch(`${API_BASE_URL}/assessments/${currentAssessment.id}/audit`);
        if (!response.ok) throw new Error('Failed to load audit trail');

        const auditData = await response.json();
        renderAuditTrail(auditData.items || []);

    } catch (error) {
        console.error('Failed to load audit trail:', error);
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Failed to load change history</div>';
    }
}

function renderAuditTrail(entries) {
    const container = document.getElementById('auditTrailContainer');

    if (entries.length === 0) {
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">No changes have been made to this assessment</div>';
        return;
    }

    container.innerHTML = entries.map(entry => `
        <div class="audit-entry">
            <div class="audit-entry__icon">
                <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15z"/></svg>
            </div>
            <div class="audit-entry__content">
                <div class="audit-entry__header">
                    <span class="audit-entry__user">${entry.changed_by ? `${entry.changed_by.first_name} ${entry.changed_by.last_name}` : 'Unknown'}</span>
                    <span class="audit-entry__time">${formatDateTime(entry.changed_at)}</span>
                </div>
                <div class="audit-entry__change">
                    Changed <strong>${entry.field_changed}</strong> for Q${entry.question_id}
                </div>
                <div class="audit-entry__change-values">
                    <span class="audit-entry__old-value">${entry.old_value || 'empty'}</span>
                    <span>→</span>
                    <span class="audit-entry__new-value">${entry.new_value || 'empty'}</span>
                </div>
                ${entry.change_reason ? `<div class="audit-entry__reason">"${escapeHtml(entry.change_reason)}"</div>` : ''}
            </div>
        </div>
    `).join('');
}

function hideAuditTrail() {
    document.getElementById('auditTrailSection').style.display = 'none';
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}


// ============================================================
// UPDATED REPORT WITH GAP ANALYSIS
// ============================================================

// Update the renderAssessmentReport function to include gap analysis
const originalRenderAssessmentReport = window.renderAssessmentReport || renderAssessmentReport;

function renderAssessmentReportWithGap(report) {
    // First render the original report
    originalRenderAssessmentReport(report);

    // Then add gap analysis if there's an active target
    if (activeTarget && report.dimension_scores) {
        addGapAnalysisToReport(report, activeTarget);
    }
}

function addGapAnalysisToReport(report, target) {
    const content = document.getElementById('assessmentReportContent');
    const reportDiv = content.querySelector('.assessment-report');

    if (!reportDiv) return;

    // Calculate gap data
    const dimensionGaps = [];
    for (const [dim, targetScore] of Object.entries(target.target_scores || {})) {
        const currentScore = report.dimension_scores[dim];
        const gap = currentScore !== undefined ? targetScore - currentScore : null;
        let status = 'at_risk';

        if (gap !== null) {
            if (gap <= 0) status = 'achieved';
            else if (gap <= 0.5) status = 'on_track';
            else if (gap <= 1.0) status = 'needs_attention';
        }

        dimensionGaps.push({
            dimension_name: dim,
            current_score: currentScore,
            target_score: targetScore,
            gap,
            status
        });
    }

    // Calculate overall gap
    const overallGap = target.overall_target && report.overall_score ?
        target.overall_target - report.overall_score : null;
    let overallStatus = 'at_risk';
    if (overallGap !== null) {
        if (overallGap <= 0) overallStatus = 'achieved';
        else if (overallGap <= 0.5) overallStatus = 'on_track';
        else if (overallGap <= 1.0) overallStatus = 'needs_attention';
    }

    const daysRemaining = target.target_date ? getDaysRemaining(target.target_date) : null;
    const daysText = daysRemaining !== null ?
        (daysRemaining > 0 ? `${daysRemaining} days remaining` :
         daysRemaining === 0 ? 'Due today' : `${Math.abs(daysRemaining)} days overdue`) : '';

    const gapSectionHtml = `
        <div class="gap-analysis-section">
            <div class="gap-analysis-header">
                <div>
                    <div class="gap-analysis-header__title">Target: ${escapeHtml(target.name)}</div>
                    <div class="gap-analysis-header__target">${target.target_date ? formatDate(target.target_date) : 'No target date'} ${daysText ? `(${daysText})` : ''}</div>
                </div>
                <span class="gap-status gap-status--${overallStatus.replace('_', '-')}">${formatTargetStatus(overallStatus)}</span>
            </div>

            <table class="gap-analysis-table">
                <thead>
                    <tr>
                        <th>Dimension</th>
                        <th>Current</th>
                        <th>Target</th>
                        <th>Gap</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${dimensionGaps.map(gap => `
                        <tr>
                            <td>${escapeHtml(gap.dimension_name)}</td>
                            <td>${gap.current_score?.toFixed(2) || 'N/A'}</td>
                            <td>${gap.target_score?.toFixed(2) || 'N/A'}</td>
                            <td class="gap-value ${gap.gap > 0 ? 'gap-value--positive' : 'gap-value--negative'}">
                                ${gap.gap !== null ? (gap.gap > 0 ? '+' : '') + gap.gap.toFixed(2) : 'N/A'}
                            </td>
                            <td><span class="gap-status gap-status--${gap.status.replace('_', '-')}">${formatTargetStatus(gap.status)}</span></td>
                        </tr>
                    `).join('')}
                    <tr style="font-weight: 600; background: var(--cds-layer-02);">
                        <td>Overall</td>
                        <td>${report.overall_score?.toFixed(2) || 'N/A'}</td>
                        <td>${target.overall_target?.toFixed(2) || 'N/A'}</td>
                        <td class="gap-value ${overallGap > 0 ? 'gap-value--positive' : 'gap-value--negative'}">
                            ${overallGap !== null ? (overallGap > 0 ? '+' : '') + overallGap.toFixed(2) : 'N/A'}
                        </td>
                        <td><span class="gap-status gap-status--${overallStatus.replace('_', '-')}">${formatTargetStatus(overallStatus)}</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    // Insert after dimension scores section
    const dimensionSection = reportDiv.querySelector('.report-section');
    if (dimensionSection) {
        dimensionSection.insertAdjacentHTML('afterend', gapSectionHtml);
    } else {
        reportDiv.insertAdjacentHTML('beforeend', gapSectionHtml);
    }
}


// ============================================================
// INITIALIZATION UPDATES
// ============================================================

// Update displayAssessment to load targets and show edit button
const originalDisplayAssessment = displayAssessment;
displayAssessment = function(assessment, comparison) {
    originalDisplayAssessment(assessment, comparison);

    // Show edit scores button for completed assessments
    const editBtn = document.getElementById('editScoresBtn');
    if (editBtn && assessment.status === 'completed') {
        editBtn.style.display = 'inline-flex';
    }

    // Load targets for active assessment type
    loadTargetsByType(getCustomerId(), activeAssessmentTypeTab);
};


// Export new functions
window.openTargetModal = openTargetModal;
window.closeTargetModal = closeTargetModal;
window.saveTarget = saveTarget;
window.editTarget = editTarget;
window.deleteTarget = deleteTarget;
window.setActiveTarget = setActiveTarget;
window.overlayTargetOnChart = overlayTargetOnChart;
window.viewGapAnalysis = viewGapAnalysis;
window.closeGapAnalysisModal = closeGapAnalysisModal;
window.openEditScoresModal = openEditScoresModal;
window.closeEditScoresModal = closeEditScoresModal;
window.trackScoreChange = trackScoreChange;
window.saveEditedScores = saveEditedScores;
window.closeEditReasonModal = closeEditReasonModal;
window.confirmScoreEdit = confirmScoreEdit;
window.viewAuditTrail = viewAuditTrail;
window.hideAuditTrail = hideAuditTrail;
window.syncTargetSlider = syncTargetSlider;
window.syncTargetInput = syncTargetInput;
window.onTargetAssessmentTypeChange = onTargetAssessmentTypeChange;
window.loadTargets = loadTargets;
window.loadTargetsByType = loadTargetsByType;


// ============================================================
// CUSTOM RECOMMENDATIONS
// ============================================================

let customerRecommendations = [];
let currentEditingRecId = null;
let activeRecTypeTab = 'all';

// Store all recommendations (unfiltered) for client-side filtering
let allCustomerRecommendations = [];

// Load customer recommendations
async function loadCustomRecommendations(customerId) {
    const typeFilter = document.getElementById('recAssessmentTypeFilter')?.value || '';
    const statusFilter = document.getElementById('recStatusFilter')?.value || '';

    let url = `${API_BASE_URL}/assessments/customer/${customerId}/recommendations`;
    const params = new URLSearchParams();
    if (typeFilter) params.append('assessment_type_id', typeFilter);
    if (statusFilter) params.append('status', statusFilter);
    if (params.toString()) url += '?' + params.toString();

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load recommendations');
        const data = await response.json();
        allCustomerRecommendations = data.items || [];

        // Apply client-side tool filter
        applyToolFilter();
    } catch (error) {
        console.error('Failed to load recommendations:', error);
        allCustomerRecommendations = [];
        customerRecommendations = [];
        renderCustomRecommendations();
    }
}

// Apply tool filter (client-side)
function applyToolFilter() {
    const toolFilter = document.getElementById('recToolFilter')?.value || '';

    if (toolFilter) {
        customerRecommendations = allCustomerRecommendations.filter(rec => {
            return rec.tools && Array.isArray(rec.tools) && rec.tools.includes(toolFilter);
        });
    } else {
        customerRecommendations = [...allCustomerRecommendations];
    }

    // Update count badges
    document.getElementById('customRecCount').textContent = customerRecommendations.length;
    updateAllRecCounts();

    renderCustomRecommendations();

    // If "All" tab is active, re-render it
    if (activeRecTypeTab === 'all') {
        renderAllRecommendations();
    }
}

// Render custom recommendations list
function renderCustomRecommendations() {
    const container = document.getElementById('customRecsList');
    const emptyState = document.getElementById('noCustomRecsState');

    if (!container) return;

    if (customerRecommendations.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const priorityColors = {
        high: 'var(--cds-support-error)',
        medium: 'var(--cds-support-warning)',
        low: 'var(--cds-support-info)'
    };

    const statusLabels = {
        open: 'Open',
        in_progress: 'In Progress',
        completed: 'Completed',
        dismissed: 'Dismissed'
    };

    const statusColors = {
        open: 'var(--cds-interactive)',
        in_progress: 'var(--cds-support-warning)',
        completed: 'var(--cds-support-success)',
        dismissed: 'var(--cds-text-secondary)'
    };

    let html = '';
    for (const rec of customerRecommendations) {
        const typeInfo = rec.assessment_type;
        const typeBadge = typeInfo ? `
            <span style="background-color: ${typeInfo.color}20; color: ${typeInfo.color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ${typeInfo.short_name}
            </span>
        ` : '';

        const priorityColor = priorityColors[rec.priority] || priorityColors.medium;
        const statusColor = statusColors[rec.status] || statusColors.open;
        const statusLabel = statusLabels[rec.status] || rec.status;

        html += `
            <div class="recommendation-card ${rec.status === 'completed' || rec.status === 'dismissed' ? 'completed' : ''}" data-rec-id="${rec.id}">
                <div class="recommendation-card__header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                            ${rec.priority}
                        </span>
                        ${typeBadge}
                        ${rec.category ? `<span style="background: var(--cds-layer-02); padding: 2px 8px; border-radius: 4px; font-size: 11px;">${escapeHtml(rec.category)}</span>` : ''}
                        ${rec.status === 'in_progress' ? `
                            <span style="background: var(--cds-interactive); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                                <svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M28 4H4a2 2 0 00-2 2v20a2 2 0 002 2h24a2 2 0 002-2V6a2 2 0 00-2-2zM4 26V6h24v20z"/><path d="M6 12h20v2H6zm0 6h12v2H6z"/></svg>
                                On Roadmap
                            </span>
                        ` : ''}
                    </div>
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                        ${statusLabel}
                    </span>
                </div>
                <div class="recommendation-card__title">${escapeHtml(rec.title)}</div>
                ${rec.description ? `<div class="recommendation-card__description">${escapeHtml(rec.description)}</div>` : ''}
                <div class="recommendation-card__meta">
                    ${rec.due_date ? `<span>Due: ${formatDate(rec.due_date)}</span>` : ''}
                    ${rec.expected_impact ? `<span>Expected Impact: +${rec.expected_impact.toFixed(1)} maturity</span>` : ''}
                </div>
                ${rec.tools && rec.tools.length > 0 ? `
                <div class="recommendation-card__tools" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
                    ${rec.tools.map(tool => `<span class="rec-tool-tag">${escapeHtml(tool)}</span>`).join('')}
                </div>
                ` : ''}
                <div class="recommendation-card__footer">
                    <span style="font-size: 11px; color: var(--cds-text-secondary);">
                        Created ${formatDate(rec.created_at)}
                    </span>
                    <div class="recommendation-card__actions">
                        ${rec.status === 'open' ? `
                            <button class="btn btn--ghost btn--sm" onclick="updateRecStatus(${rec.id}, 'in_progress')" title="Start">
                                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M7 28a1 1 0 01-1-1V5a1 1 0 011.5-.87l19 11a1 1 0 010 1.74l-19 11A1 1 0 017 28z"/></svg>
                            </button>
                        ` : ''}
                        ${rec.status === 'in_progress' ? `
                            <button class="btn btn--ghost btn--sm" onclick="updateRecStatus(${rec.id}, 'completed')" title="Complete">
                                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M14 21.414l-5-5L10.586 15 14 18.414 21.414 11 23 12.586l-9 9z"/><path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/></svg>
                            </button>
                        ` : ''}
                        ${rec.status === 'open' ? `
                            <button class="btn btn--primary btn--sm" onclick="openAddToRoadmapModal(${rec.id}, 'custom')" title="Add to Roadmap">
                                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M17 15V7h-2v8H7v2h8v8h2v-8h8v-2h-8z"/></svg>
                                Roadmap
                            </button>
                        ` : ''}
                        <button class="btn btn--ghost btn--sm" onclick="editCustomRecommendation(${rec.id})" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15z"/></svg>
                        </button>
                        <button class="btn btn--ghost btn--sm" onclick="deleteCustomRecommendation(${rec.id})" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M12 12h2v12h-2zm6 0h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Switch between custom and generated recommendations tabs
function switchRecTypeTab(tabType) {
    activeRecTypeTab = tabType;

    // Update tab styles
    document.querySelectorAll('.rec-type-tab').forEach(tab => {
        const badge = tab.querySelector('.rec-count-badge');
        if (tab.dataset.recType === tabType) {
            tab.classList.add('active');
            tab.style.borderBottomColor = 'var(--cds-interactive)';
            tab.style.color = 'var(--cds-text-primary)';
            if (badge) {
                badge.style.background = 'var(--cds-interactive)';
                badge.style.color = 'white';
            }
        } else {
            tab.classList.remove('active');
            tab.style.borderBottomColor = 'transparent';
            tab.style.color = 'var(--cds-text-secondary)';
            if (badge) {
                badge.style.background = 'var(--cds-layer-02)';
                badge.style.color = 'var(--cds-text-primary)';
            }
        }
    });

    // Show/hide panels
    const allPanel = document.getElementById('allRecommendationsPanel');
    const customPanel = document.getElementById('customRecommendationsPanel');
    const generatedPanel = document.getElementById('generatedRecommendationsPanel');
    const generateBtn = document.getElementById('generateRecsBtn');
    const addCustomBtn = document.getElementById('addCustomRecBtn');

    // Hide all panels first
    if (allPanel) allPanel.style.display = 'none';
    if (customPanel) customPanel.style.display = 'none';
    if (generatedPanel) generatedPanel.style.display = 'none';

    if (tabType === 'all') {
        if (allPanel) allPanel.style.display = 'block';
        if (generateBtn) generateBtn.style.display = 'inline-flex';
        if (addCustomBtn) addCustomBtn.style.display = 'inline-flex';
        renderAllRecommendations();
    } else if (tabType === 'custom') {
        if (customPanel) customPanel.style.display = 'block';
        if (generateBtn) generateBtn.style.display = 'none';
        if (addCustomBtn) addCustomBtn.style.display = 'inline-flex';
    } else {
        if (generatedPanel) generatedPanel.style.display = 'block';
        if (generateBtn) generateBtn.style.display = 'inline-flex';
        if (addCustomBtn) addCustomBtn.style.display = 'none';
    }
}

// Render all recommendations (combined custom + AI generated)
function renderAllRecommendations() {
    const container = document.getElementById('allRecsList');
    const emptyState = document.getElementById('noAllRecsState');
    const countBadge = document.getElementById('allRecCount');

    if (!container) return;

    // Combine custom and AI-generated recommendations
    const customRecs = (customerRecommendations || []).map(rec => ({
        ...rec,
        _type: 'custom',
        _sortDate: rec.created_at || rec.updated_at
    }));

    const aiRecs = (recommendationsCache || []).map(rec => ({
        ...rec,
        _type: 'generated',
        _sortDate: rec.created_at || rec.accepted_at
    }));

    const allRecs = [...customRecs, ...aiRecs];

    // Sort by date (newest first)
    allRecs.sort((a, b) => {
        const dateA = new Date(a._sortDate || 0);
        const dateB = new Date(b._sortDate || 0);
        return dateB - dateA;
    });

    // Update count badge
    if (countBadge) countBadge.textContent = allRecs.length;

    if (allRecs.length === 0) {
        container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    const priorityColors = {
        high: 'var(--cds-support-error)',
        medium: 'var(--cds-support-warning)',
        low: 'var(--cds-support-info)'
    };

    const statusLabels = {
        open: 'Open',
        in_progress: 'In Progress',
        completed: 'Completed',
        dismissed: 'Dismissed'
    };

    const statusColors = {
        open: 'var(--cds-interactive)',
        in_progress: 'var(--cds-support-warning)',
        completed: 'var(--cds-support-success)',
        dismissed: 'var(--cds-text-secondary)'
    };

    let html = '';
    for (const rec of allRecs) {
        const isCustom = rec._type === 'custom';
        const isGenerated = rec._type === 'generated';

        // Type badge for custom vs AI
        const sourceBadge = isCustom
            ? '<span style="background: #8a3ffc20; color: #8a3ffc; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">CUSTOM</span>'
            : '<span style="background: #0f62fe20; color: #0f62fe; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600;">AI</span>';

        // Framework badge
        const typeInfo = rec.assessment_type;
        const typeBadge = typeInfo ? `
            <span style="background-color: ${typeInfo.color}20; color: ${typeInfo.color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ${typeInfo.short_name}
            </span>
        ` : '';

        // Priority
        const priority = rec.priority || (rec.priority_score > 70 ? 'high' : rec.priority_score > 40 ? 'medium' : 'low');
        const priorityColor = priorityColors[priority] || priorityColors.medium;

        // Status
        const status = rec.status || (rec.is_accepted ? 'in_progress' : rec.is_dismissed ? 'dismissed' : 'open');
        const statusColor = statusColors[status] || statusColors.open;
        const statusLabel = statusLabels[status] || status;

        // Category
        const category = rec.category || rec.dimension_name;

        html += `
            <div class="recommendation-card ${status === 'completed' || status === 'dismissed' ? 'completed' : ''}" data-rec-id="${rec.id}" data-rec-type="${rec._type}">
                <div class="recommendation-card__header">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        ${sourceBadge}
                        <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                            ${priority}
                        </span>
                        ${typeBadge}
                        ${category ? `<span style="background: var(--cds-layer-02); padding: 2px 8px; border-radius: 4px; font-size: 11px;">${escapeHtml(category)}</span>` : ''}
                    </div>
                    <span style="background: ${statusColor}20; color: ${statusColor}; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                        ${statusLabel}
                    </span>
                </div>
                <div class="recommendation-card__title">${escapeHtml(rec.title)}</div>
                ${rec.description ? `<div class="recommendation-card__description">${escapeHtml(rec.description)}</div>` : ''}
                <div class="recommendation-card__meta">
                    ${rec.due_date ? `<span>Due: ${formatDate(rec.due_date)}</span>` : ''}
                    ${rec.expected_impact ? `<span>Expected Impact: +${rec.expected_impact.toFixed(1)} maturity</span>` : ''}
                    ${rec.priority_score ? `<span>Score: ${rec.priority_score.toFixed(0)}</span>` : ''}
                </div>
                ${rec.tools && rec.tools.length > 0 ? `
                <div class="recommendation-card__tools" style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
                    ${rec.tools.map(tool => `<span class="rec-tool-tag">${escapeHtml(tool)}</span>`).join('')}
                </div>
                ` : ''}
                <div class="recommendation-card__footer">
                    <span style="font-size: 11px; color: var(--cds-text-secondary);">
                        ${rec.created_at ? `Created ${formatDate(rec.created_at)}` : ''}
                    </span>
                    <div class="recommendation-card__actions">
                        ${isCustom && status === 'open' ? `
                            <button class="btn btn--ghost btn--sm" onclick="openAddToRoadmapModal(${rec.id}, 'custom')" title="Add to Roadmap">
                                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M17 15V7h-2v8H7v2h8v8h2v-8h8v-2h-8z"/></svg>
                            </button>
                        ` : ''}
                        ${isGenerated && !rec.is_accepted && !rec.is_dismissed ? `
                            <button class="btn btn--primary btn--sm" onclick="openAcceptRecommendationModal(${rec.id})" title="Accept to Roadmap">
                                <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M14 21.414l-5-5L10.586 15 14 18.414 21.414 11 23 12.586l-9 9z"/></svg>
                                Accept
                            </button>
                        ` : ''}
                        <button class="btn btn--ghost btn--sm" onclick="${isCustom ? `editCustomRecommendation(${rec.id})` : `openEditRecommendationGeneratedModal(${rec.id})`}" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor"><path d="M2 26h28v2H2zM25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10 3.6 3.6-10 10H6z"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Update all recommendation counts
function updateAllRecCounts() {
    const customCount = (customerRecommendations || []).length;
    const generatedCount = (recommendationsCache || []).length;
    const allCount = customCount + generatedCount;

    const customBadge = document.getElementById('customRecCount');
    const generatedBadge = document.getElementById('generatedRecCount');
    const allBadge = document.getElementById('allRecCount');

    if (customBadge) customBadge.textContent = customCount;
    if (generatedBadge) generatedBadge.textContent = generatedCount;
    if (allBadge) allBadge.textContent = allCount;
}

// Filter recommendations (unified filter function)
function filterRecommendations() {
    const customerId = getCustomerId();
    if (customerId) {
        // Always reload from API to apply server-side filters (type, status)
        // Tool filter is then applied client-side after load
        loadCustomRecommendations(customerId);
    }
}

// Legacy function name for compatibility
function filterRecommendationsByType() {
    filterRecommendations();
}

// Clear all recommendation filters
function clearRecFilters() {
    document.getElementById('recAssessmentTypeFilter').value = '';
    document.getElementById('recStatusFilter').value = '';
    document.getElementById('recToolFilter').value = '';

    const customerId = getCustomerId();
    if (customerId) {
        loadCustomRecommendations(customerId);
    }
}

// Open custom recommendation modal
function openCustomRecommendationModal(recId = null) {
    currentEditingRecId = recId;
    const modal = document.getElementById('customRecommendationModal');
    const title = document.getElementById('customRecModalTitle');

    title.textContent = recId ? 'Edit Recommendation' : 'Add Recommendation';

    // Reset form
    document.getElementById('recTitle').value = '';
    document.getElementById('recDescription').value = '';
    document.getElementById('recAssessmentType').value = '';
    document.getElementById('recPriority').value = 'medium';
    document.getElementById('recStatus').value = 'open';
    document.getElementById('recCategory').value = '';
    document.getElementById('recExpectedImpact').value = '';
    document.getElementById('recDueDate').value = '';
    // Reset tools checkboxes
    document.querySelectorAll('input[name="recTools"]').forEach(cb => cb.checked = false);

    // If editing, populate with existing data
    if (recId) {
        const rec = customerRecommendations.find(r => r.id === recId);
        if (rec) {
            document.getElementById('recTitle').value = rec.title || '';
            document.getElementById('recDescription').value = rec.description || '';
            document.getElementById('recAssessmentType').value = rec.assessment_type_id || '';
            document.getElementById('recPriority').value = rec.priority || 'medium';
            document.getElementById('recStatus').value = rec.status || 'open';
            document.getElementById('recCategory').value = rec.category || '';
            document.getElementById('recExpectedImpact').value = rec.expected_impact || '';
            document.getElementById('recDueDate').value = rec.due_date || '';
            // Set tools checkboxes
            const tools = rec.tools || [];
            document.querySelectorAll('input[name="recTools"]').forEach(cb => {
                cb.checked = tools.includes(cb.value);
            });
        }
    }

    modal.classList.add('open');
}

function closeCustomRecommendationModal() {
    document.getElementById('customRecommendationModal').classList.remove('open');
    currentEditingRecId = null;
}

// Save custom recommendation
async function saveCustomRecommendation() {
    const customerId = getCustomerId();
    const title = document.getElementById('recTitle').value.trim();

    if (!title) {
        alert('Please enter a title');
        return;
    }

    // Collect selected tools
    const selectedTools = Array.from(document.querySelectorAll('input[name="recTools"]:checked'))
        .map(cb => cb.value);

    const recData = {
        title,
        description: document.getElementById('recDescription').value.trim() || null,
        assessment_type_id: document.getElementById('recAssessmentType').value ? parseInt(document.getElementById('recAssessmentType').value) : null,
        priority: document.getElementById('recPriority').value,
        status: document.getElementById('recStatus').value,
        category: document.getElementById('recCategory').value.trim() || null,
        expected_impact: document.getElementById('recExpectedImpact').value ? parseFloat(document.getElementById('recExpectedImpact').value) : null,
        tools: selectedTools.length > 0 ? selectedTools : null,
        due_date: document.getElementById('recDueDate').value || null
    };

    try {
        let response;
        if (currentEditingRecId) {
            response = await fetch(`${API_BASE_URL}/assessments/recommendations/${currentEditingRecId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recData)
            });
        } else {
            response = await fetch(`${API_BASE_URL}/assessments/customer/${customerId}/recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recData)
            });
        }

        if (!response.ok) throw new Error('Failed to save recommendation');

        closeCustomRecommendationModal();
        await loadCustomRecommendations(customerId);
        showToast(currentEditingRecId ? 'Recommendation updated' : 'Recommendation added', 'success');

    } catch (error) {
        console.error('Failed to save recommendation:', error);
        alert('Failed to save recommendation. Please try again.');
    }
}

// Edit custom recommendation
function editCustomRecommendation(recId) {
    openCustomRecommendationModal(recId);
}

// Delete custom recommendation
async function deleteCustomRecommendation(recId) {
    if (!confirm('Are you sure you want to delete this recommendation?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/assessments/recommendations/${recId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete recommendation');

        await loadCustomRecommendations(getCustomerId());
        showToast('Recommendation deleted', 'success');

    } catch (error) {
        console.error('Failed to delete recommendation:', error);
        alert('Failed to delete recommendation. Please try again.');
    }
}

// Update recommendation status
async function updateRecStatus(recId, newStatus) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/recommendations/${recId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: newStatus,
                completed_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
            })
        });

        if (!response.ok) throw new Error('Failed to update status');

        await loadCustomRecommendations(getCustomerId());

    } catch (error) {
        console.error('Failed to update recommendation status:', error);
        alert('Failed to update status. Please try again.');
    }
}

// Expose recommendation functions
window.openCustomRecommendationModal = openCustomRecommendationModal;
window.closeCustomRecommendationModal = closeCustomRecommendationModal;
window.saveCustomRecommendation = saveCustomRecommendation;
window.editCustomRecommendation = editCustomRecommendation;
window.deleteCustomRecommendation = deleteCustomRecommendation;
window.updateRecStatus = updateRecStatus;
window.switchRecTypeTab = switchRecTypeTab;
window.filterRecommendationsByType = filterRecommendationsByType;
window.filterRecommendations = filterRecommendations;
window.clearRecFilters = clearRecFilters;
window.applyToolFilter = applyToolFilter;
window.loadCustomRecommendations = loadCustomRecommendations;


// ============================================================
// FLOW VISUALIZATION (SANKEY DIAGRAM)
// ============================================================

let flowSankeyChart = null;
let largeFlowSankeyChart = null;
let flowVisualizationData = null;
let flowFilterState = {
    dimension: 'all',
    useCase: 'all'
};
let flowAssessments = []; // List of assessments for the flow dropdown
let selectedFlowAssessmentId = null; // Currently selected assessment ID for flow
let selectedFlowAssessmentType = 'spm'; // Currently selected assessment type (spm, tbm, finops)

// Get color based on dimension score
function getDimensionColor(score) {
    if (score < 2.0) return '#da1e28';  // Red - Critical
    if (score < 3.0) return '#ff832b';  // Orange - Needs Work
    if (score < 4.0) return '#f1c21b';  // Yellow - Below Target
    return '#24a148';                    // Green - On Target
}

// Get status badge class based on score
function getDimensionStatusBadge(score) {
    if (score < 2.0) return { class: 'flow-status-badge--critical', text: 'Critical' };
    if (score < 3.0) return { class: 'flow-status-badge--warning', text: 'Needs Work' };
    if (score < 4.0) return { class: 'flow-status-badge--below-target', text: 'Below Target' };
    return { class: '', text: 'On Track' };
}

// Assessment type display names (ASSESSMENT_TYPE_IDS is defined earlier in the file)
const ASSESSMENT_TYPE_NAMES = {
    'spm': 'SPM',
    'tbm': 'TBM',
    'finops': 'FinOps'
};

// Framework-specific feature names for the flow chart title
const FLOW_FEATURE_NAMES = {
    'spm': 'TP Feature',
    'tbm': 'Apptio Feature',
    'finops': 'Cloudability Feature'
};

// Update the flow chart title based on selected framework
function updateFlowChartTitle(typeCode) {
    const titleEl = document.getElementById('flowChartTitle');
    const subtitleEl = document.getElementById('flowExportSubtitle');
    const featureName = FLOW_FEATURE_NAMES[typeCode] || 'TP Feature';

    if (titleEl) {
        titleEl.textContent = `Assessment Gap -> Use Case -> ${featureName} Flow`;
    }
    if (subtitleEl) {
        subtitleEl.textContent = `Assessment Gaps → Recommended Use Cases → ${featureName}s`;
    }
}

// Switch flow assessment type (used by tab buttons)
function switchFlowAssessmentType(typeCode) {
    selectedFlowAssessmentType = typeCode || 'spm';

    // Update tab active state
    document.querySelectorAll('#flowAssessmentTypeTabs .assessment-type-tab').forEach(tab => {
        if (tab.dataset.type === typeCode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update the flow chart title
    updateFlowChartTitle(typeCode);

    // Reload assessments for the selected type
    const customerId = getCustomerId();
    if (customerId) {
        loadFlowAssessmentOptions(customerId);
    }
}

// Legacy function for backward compatibility
function onFlowAssessmentTypeChange() {
    const typeSelect = document.getElementById('flowAssessmentTypeSelect');
    if (typeSelect) {
        switchFlowAssessmentType(typeSelect.value || 'spm');
    }
}

// Load assessments for the flow dropdown based on selected type
async function loadFlowAssessmentOptions(customerId) {
    const select = document.getElementById('flowAssessmentSelect');
    if (!select) return;

    const typeName = ASSESSMENT_TYPE_NAMES[selectedFlowAssessmentType] || 'SPM';

    try {
        // Load assessments for the selected type - use 'type' parameter with code (spm/tbm/finops)
        const response = await fetch(`${API_BASE_URL}/assessments/customer/${customerId}?status=completed&type=${selectedFlowAssessmentType}`);
        if (!response.ok) {
            select.innerHTML = `<option value="">No ${typeName} assessments found</option>`;
            return;
        }

        const data = await response.json();
        flowAssessments = data.items || [];

        if (flowAssessments.length === 0) {
            select.innerHTML = `<option value="">No completed ${typeName} assessments</option>`;
            return;
        }

        // Sort by assessment_date descending (most recent first)
        flowAssessments.sort((a, b) => {
            const dateA = a.assessment_date || a.completed_at || '';
            const dateB = b.assessment_date || b.completed_at || '';
            return dateB.localeCompare(dateA);
        });

        // Populate dropdown
        select.innerHTML = flowAssessments.map((assessment, index) => {
            const date = assessment.assessment_date
                ? new Date(assessment.assessment_date).toLocaleDateString()
                : (assessment.completed_at
                    ? new Date(assessment.completed_at).toLocaleDateString()
                    : 'Unknown date');
            const score = assessment.overall_score !== null
                ? ` (Score: ${assessment.overall_score.toFixed(1)})`
                : '';
            const label = index === 0 ? ' (Latest)' : '';
            return `<option value="${assessment.id}">${date}${score}${label}</option>`;
        }).join('');

        // Default to the latest (first) assessment
        selectedFlowAssessmentId = flowAssessments[0]?.id || null;

        // Load the visualization with the first assessment
        loadFlowVisualization(customerId, selectedFlowAssessmentId);

    } catch (error) {
        console.error('Failed to load flow assessment options:', error);
        select.innerHTML = '<option value="">Error loading assessments</option>';
    }
}

// Load all flow tab scores (called when Journey tab is opened)
async function loadFlowTabScores(customerId) {
    const types = ['spm', 'tbm', 'finops'];

    for (const typeCode of types) {
        try {
            const response = await fetch(`${API_BASE_URL}/assessments/customer/${customerId}?status=completed&type=${typeCode}`);
            if (response.ok) {
                const data = await response.json();
                const assessments = data.items || [];

                // Get the latest assessment's score
                if (assessments.length > 0) {
                    const latestAssessment = assessments[0];
                    const scoreEl = document.getElementById(`flowTab${typeCode.charAt(0).toUpperCase() + typeCode.slice(1)}Score`);
                    if (scoreEl) {
                        scoreEl.textContent = latestAssessment.overall_score !== null
                            ? latestAssessment.overall_score.toFixed(1)
                            : '-';
                    }
                } else {
                    const scoreEl = document.getElementById(`flowTab${typeCode.charAt(0).toUpperCase() + typeCode.slice(1)}Score`);
                    if (scoreEl) {
                        scoreEl.textContent = '-';
                    }
                }
            }
        } catch (error) {
            console.error(`Failed to load ${typeCode} score:`, error);
        }
    }
}

// Handle flow assessment selection change
function onFlowAssessmentChange() {
    const select = document.getElementById('flowAssessmentSelect');
    selectedFlowAssessmentId = select?.value ? parseInt(select.value) : null;

    // Reload flow visualization with the selected assessment
    const customerId = getCustomerId();
    if (customerId) {
        loadFlowVisualization(customerId, selectedFlowAssessmentId);
    }
}

// Load flow visualization data
async function loadFlowVisualization(customerId, assessmentId = null) {
    const noFlowState = document.getElementById('noFlowState');
    const flowContent = document.getElementById('flowVisualizationContent');

    // Use provided assessmentId or the currently selected one
    const useAssessmentId = assessmentId !== null ? assessmentId : selectedFlowAssessmentId;

    try {
        // Build URL with assessment type and optional assessment_id parameter
        let url = `${API_BASE_URL}/assessments/customer/${customerId}/flow-visualization?threshold=3.5&type=${selectedFlowAssessmentType}`;
        if (useAssessmentId) {
            url += `&assessment_id=${useAssessmentId}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            showNoFlowState();
            return;
        }

        flowVisualizationData = await response.json();

        if (flowVisualizationData.nodes.length === 0) {
            showNoFlowState();
            return;
        }

        // Hide no-data state, show content
        if (noFlowState) noFlowState.style.display = 'none';
        if (flowContent) flowContent.style.display = 'block';

        // Update summary stats
        document.getElementById('flowWeakDimensionsCount').textContent = flowVisualizationData.weak_dimensions_count;
        document.getElementById('flowUseCasesCount').textContent = flowVisualizationData.recommended_use_cases_count;
        document.getElementById('flowTPFeaturesCount').textContent = flowVisualizationData.tp_solutions_count;

        // Reset filter state and populate filter dropdowns
        flowFilterState.dimension = 'all';
        flowFilterState.useCase = 'all';
        populateFlowFilters();

        // Render tables
        renderFlowDimensionsTable();
        renderFlowUseCasesTable();
        renderFlowTPFeaturesTable();

        // Render Sankey chart
        renderFlowSankeyChart('flowSankeyChart', false);

        // Update export title with customer name and assessment date
        const customerName = document.getElementById('customerName')?.textContent || 'Customer';
        const selectedAssessment = flowAssessments.find(a => a.id === useAssessmentId);
        const dateStr = selectedAssessment?.assessment_date
            ? ` - ${new Date(selectedAssessment.assessment_date).toLocaleDateString()}`
            : '';
        document.getElementById('flowExportTitleText').textContent = `${customerName} - Implementation Flow${dateStr}`;

    } catch (error) {
        console.error('Failed to load flow visualization:', error);
        showNoFlowState();
    }
}

function showNoFlowState() {
    const noFlowState = document.getElementById('noFlowState');
    const flowContent = document.getElementById('flowVisualizationContent');

    if (noFlowState) noFlowState.style.display = 'block';
    if (flowContent) flowContent.style.display = 'none';
}

// Render dimensions table
function renderFlowDimensionsTable() {
    const tbody = document.getElementById('flowDimensionsTableBody');
    if (!tbody || !flowVisualizationData) return;

    const dimNodes = flowVisualizationData.nodes.filter(n => n.type === 'dimension');

    if (dimNodes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">No weak dimensions found</td></tr>';
        return;
    }

    // Sort by gap descending
    dimNodes.sort((a, b) => (b.gap || 0) - (a.gap || 0));

    tbody.innerHTML = dimNodes.map(node => {
        const status = getDimensionStatusBadge(node.score);
        return `
            <tr>
                <td style="font-weight: 500;">${escapeHtml(node.name)}</td>
                <td>
                    <span style="color: ${getDimensionColor(node.score)}; font-weight: 600;">${node.score?.toFixed(1) || '-'}</span>
                </td>
                <td>
                    <span style="color: var(--cds-support-error);">${node.gap?.toFixed(1) || '-'}</span>
                </td>
                <td>
                    <span class="flow-status-badge ${status.class}">${status.text}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// Render use cases table
function renderFlowUseCasesTable() {
    const tbody = document.getElementById('flowUseCasesTableBody');
    if (!tbody || !flowVisualizationData) return;

    const ucNodes = flowVisualizationData.nodes.filter(n => n.type === 'use_case');

    if (ucNodes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">No recommended use cases</td></tr>';
        return;
    }

    // Build a map of use case id -> dimensions it improves
    const ucToDims = {};
    const ucToTP = {};

    flowVisualizationData.links.forEach(link => {
        if (link.source.startsWith('dim_') && link.target.startsWith('uc_')) {
            const dimName = link.source.replace('dim_', '');
            const ucId = link.target;
            if (!ucToDims[ucId]) ucToDims[ucId] = [];
            ucToDims[ucId].push(dimName);
        }
        if (link.source.startsWith('uc_') && link.target.startsWith('tp_')) {
            const ucId = link.source;
            if (!ucToTP[ucId]) ucToTP[ucId] = 0;
            ucToTP[ucId]++;
        }
    });

    tbody.innerHTML = ucNodes.map(node => {
        const dims = ucToDims[node.id] || [];
        const tpCount = ucToTP[node.id] || 0;
        return `
            <tr>
                <td style="font-weight: 500;">${escapeHtml(node.name)}</td>
                <td>
                    <span class="solution-area-chip">${node.solution_area || '-'}</span>
                </td>
                <td>
                    ${dims.map(d => `<span class="tag tag--gray" style="font-size: 10px; margin-right: 4px;">${escapeHtml(d)}</span>`).join('')}
                </td>
                <td>
                    ${tpCount > 0 ? `<span class="tag tag--blue" style="font-size: 10px;">${tpCount} feature${tpCount > 1 ? 's' : ''}</span>` : '-'}
                </td>
            </tr>
        `;
    }).join('');
}

// Render TP features table
function renderFlowTPFeaturesTable() {
    const tbody = document.getElementById('flowTPFeaturesTableBody');
    if (!tbody || !flowVisualizationData) return;

    const tpNodes = flowVisualizationData.nodes.filter(n => n.type === 'tp_solution');

    if (tpNodes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">No TP features to implement</td></tr>';
        return;
    }

    // Build a map of TP feature id -> use case names
    const tpToUC = {};
    const ucNodeMap = {};

    flowVisualizationData.nodes.forEach(n => {
        if (n.type === 'use_case') {
            ucNodeMap[n.id] = n.name;
        }
    });

    flowVisualizationData.links.forEach(link => {
        if (link.source.startsWith('uc_') && link.target.startsWith('tp_')) {
            const ucName = ucNodeMap[link.source] || 'Unknown';
            const tpId = link.target;
            if (!tpToUC[tpId]) tpToUC[tpId] = [];
            tpToUC[tpId].push(ucName);
        }
    });

    tbody.innerHTML = tpNodes.map(node => {
        const ucNames = tpToUC[node.id] || [];
        return `
            <tr>
                <td style="font-weight: 500;">${escapeHtml(node.name)}</td>
                <td>
                    ${ucNames.map(uc => `<span class="tag tag--gray" style="font-size: 10px; margin-right: 4px;">${escapeHtml(uc)}</span>`).join('')}
                </td>
                <td>
                    ${node.is_required
                        ? '<span class="required-badge required-badge--yes">Required</span>'
                        : '<span class="required-badge required-badge--no">Recommended</span>'}
                </td>
                <td>
                    ${node.tp_id
                        ? `<a href="https://targetprocess.com/entity/${node.tp_id}" target="_blank" class="tp-link-btn">
                            <svg width="12" height="12" viewBox="0 0 32 32"><path d="M26 28H6a2 2 0 01-2-2V6a2 2 0 012-2h9v2H6v20h20v-9h2v9a2 2 0 01-2 2z"/><path d="M21 2v2h5.59l-9.3 9.29 1.42 1.42L28 5.41V11h2V2h-9z"/></svg>
                            TP #${node.tp_id}
                           </a>`
                        : '-'}
                </td>
            </tr>
        `;
    }).join('');
}

// Refresh flow visualization
function refreshFlowVisualization() {
    const customerId = getCustomerId();
    if (customerId) {
        loadFlowVisualization(customerId, selectedFlowAssessmentId);
    }
}

// Open flow chart modal
function openFlowChartModal() {
    document.getElementById('flowChartModal').classList.add('open');
    // Sync filters from main view to modal
    syncFlowFilters();
    // Render the large chart after modal opens
    setTimeout(() => {
        renderFlowSankeyChart('flowSankeyChartLarge', true);
    }, 100);
}

// Close flow chart modal
function closeFlowChartModal() {
    document.getElementById('flowChartModal').classList.remove('open');
    if (largeFlowSankeyChart) {
        largeFlowSankeyChart.destroy();
        largeFlowSankeyChart = null;
    }
}

// Copy flow chart to clipboard
async function copyFlowChartToClipboard() {
    const canvas = document.getElementById('flowSankeyChartLarge');
    if (!canvas) return;

    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);
        alert('Chart copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy chart:', error);
        alert('Failed to copy chart. Try downloading instead.');
    }
}

// Download flow chart (legacy - keep for compatibility)
function downloadFlowChart() {
    const canvas = document.getElementById('flowSankeyChartLarge');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `implementation-flow-${getCustomerId()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Populate filter dropdowns
function populateFlowFilters() {
    if (!flowVisualizationData) return;

    const dimensions = flowVisualizationData.nodes.filter(n => n.type === 'dimension');
    const useCases = flowVisualizationData.nodes.filter(n => n.type === 'use_case');

    // Populate dimension filters (main and modal)
    const dimSelects = [
        document.getElementById('flowDimensionFilter'),
        document.getElementById('flowDimensionFilterModal')
    ];

    dimSelects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="all">All Dimensions</option>';
        dimensions.forEach(dim => {
            const option = document.createElement('option');
            option.value = dim.id;
            option.textContent = `${dim.name} (${dim.score?.toFixed(1) || '-'})`;
            select.appendChild(option);
        });
    });

    // Populate use case filters (main and modal)
    const ucSelects = [
        document.getElementById('flowUseCaseFilter'),
        document.getElementById('flowUseCaseFilterModal')
    ];

    ucSelects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="all">All Use Cases</option>';
        useCases.forEach(uc => {
            const option = document.createElement('option');
            option.value = uc.id;
            option.textContent = uc.name;
            select.appendChild(option);
        });
    });
}

// Get filtered flow data based on current filter state
function getFilteredFlowData() {
    if (!flowVisualizationData) return { nodes: [], links: [] };

    let filteredLinks = [...flowVisualizationData.links];
    let filteredNodeIds = new Set();

    // Apply dimension filter
    if (flowFilterState.dimension !== 'all') {
        // Keep only links that originate from the selected dimension
        filteredLinks = filteredLinks.filter(link => {
            if (link.source === flowFilterState.dimension) {
                return true;
            }
            // Check if the link is a downstream link (use case -> TP feature)
            if (link.source.startsWith('uc_')) {
                // Check if this use case is connected to the filtered dimension
                return flowVisualizationData.links.some(l =>
                    l.source === flowFilterState.dimension && l.target === link.source
                );
            }
            return false;
        });
    }

    // Apply use case filter
    if (flowFilterState.useCase !== 'all') {
        filteredLinks = filteredLinks.filter(link => {
            // Keep links where the use case is either source or target
            if (link.source === flowFilterState.useCase || link.target === flowFilterState.useCase) {
                return true;
            }
            // Check if it's a TP feature link from the selected use case
            if (link.source.startsWith('uc_') && link.source === flowFilterState.useCase) {
                return true;
            }
            return false;
        });
    }

    // Collect all node IDs from filtered links
    filteredLinks.forEach(link => {
        filteredNodeIds.add(link.source);
        filteredNodeIds.add(link.target);
    });

    // Filter nodes to only include those in the filtered links
    const filteredNodes = flowVisualizationData.nodes.filter(n => filteredNodeIds.has(n.id));

    return { nodes: filteredNodes, links: filteredLinks };
}

// Apply flow filters
function applyFlowFilters(isModal = false) {
    const dimSelect = isModal
        ? document.getElementById('flowDimensionFilterModal')
        : document.getElementById('flowDimensionFilter');
    const ucSelect = isModal
        ? document.getElementById('flowUseCaseFilterModal')
        : document.getElementById('flowUseCaseFilter');

    if (dimSelect) flowFilterState.dimension = dimSelect.value;
    if (ucSelect) flowFilterState.useCase = ucSelect.value;

    // Sync filters between main and modal
    syncFlowFilters();

    // Re-render charts
    renderFlowSankeyChart('flowSankeyChart', false);
    if (document.getElementById('flowChartModal')?.classList.contains('open')) {
        renderFlowSankeyChart('flowSankeyChartLarge', true);
    }
}

// Sync filter values between main view and modal
function syncFlowFilters() {
    const mainDimSelect = document.getElementById('flowDimensionFilter');
    const modalDimSelect = document.getElementById('flowDimensionFilterModal');
    const mainUcSelect = document.getElementById('flowUseCaseFilter');
    const modalUcSelect = document.getElementById('flowUseCaseFilterModal');

    if (mainDimSelect) mainDimSelect.value = flowFilterState.dimension;
    if (modalDimSelect) modalDimSelect.value = flowFilterState.dimension;
    if (mainUcSelect) mainUcSelect.value = flowFilterState.useCase;
    if (modalUcSelect) modalUcSelect.value = flowFilterState.useCase;
}

// Reset flow filters
function resetFlowFilters(isModal = false) {
    flowFilterState.dimension = 'all';
    flowFilterState.useCase = 'all';
    syncFlowFilters();
    applyFlowFilters(isModal);
}

// Updated render function to use filtered data
const originalRenderFlowSankeyChart = renderFlowSankeyChart;

// Override renderFlowSankeyChart to use filtered data
function renderFlowSankeyChart(canvasId, isLarge = false) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !flowVisualizationData) return;

    console.log('renderFlowSankeyChart called with:', {
        canvasId,
        isLarge,
        totalNodes: flowVisualizationData.nodes?.length,
        totalLinks: flowVisualizationData.links?.length,
        filterState: flowFilterState
    });

    // Destroy existing chart
    if (isLarge && largeFlowSankeyChart) {
        largeFlowSankeyChart.destroy();
    } else if (!isLarge && flowSankeyChart) {
        flowSankeyChart.destroy();
    }

    // Check if chartjs-chart-sankey is loaded
    if (typeof Chart.controllers.sankey === 'undefined') {
        console.warn('chartjs-chart-sankey not loaded, skipping Sankey chart');
        ctx.parentElement.innerHTML = '<div class="text-secondary text-center" style="padding: 48px;">Sankey chart library not loaded. Please refresh the page.</div>';
        return;
    }

    // Get filtered data
    const filteredData = getFilteredFlowData();

    // Helper to truncate labels for display
    const truncateLabel = (text, maxLen) => {
        if (!text || text.length <= maxLen) return text;
        return text.substring(0, maxLen - 3) + '...';
    };

    // Transform data for Chart.js Sankey format
    const chartData = filteredData.links.map(link => {
        const sourceNode = filteredData.nodes.find(n => n.id === link.source);
        const targetNode = filteredData.nodes.find(n => n.id === link.target);

        if (!sourceNode || !targetNode) return null;

        let fromLabel = sourceNode.name;
        let fromLabelFull = sourceNode.name;
        if (sourceNode.type === 'dimension' && sourceNode.score) {
            fromLabel = `${truncateLabel(sourceNode.name, 18)} (${sourceNode.score.toFixed(1)})`;
            fromLabelFull = `${sourceNode.name} (${sourceNode.score.toFixed(1)})`;
        } else if (sourceNode.type === 'use_case') {
            fromLabel = truncateLabel(sourceNode.name, 25);
            fromLabelFull = sourceNode.name;
        }

        let toLabel = targetNode.name;
        let toLabelFull = targetNode.name;
        if (targetNode.type === 'tp_solution') {
            toLabel = truncateLabel(targetNode.name, 20);
            toLabelFull = targetNode.name;
            if (targetNode.is_required) {
                toLabel = `${toLabel} *`;
                toLabelFull = `${toLabelFull} *`;
            }
        } else if (targetNode.type === 'use_case') {
            toLabel = truncateLabel(targetNode.name, 25);
            toLabelFull = targetNode.name;
        }

        return {
            from: fromLabel,
            to: toLabel,
            fromFull: fromLabelFull,
            toFull: toLabelFull,
            flow: (link.value || 1) * 10,
            sourceScore: sourceNode.score,
            sourceType: sourceNode.type,
            targetType: targetNode.type
        };
    }).filter(Boolean);

    console.log('Sankey chart data:', {
        filteredNodes: filteredData.nodes?.length,
        filteredLinks: filteredData.links?.length,
        chartDataPoints: chartData.length,
        sampleData: chartData.slice(0, 3)
    });

    if (chartData.length === 0) {
        ctx.parentElement.innerHTML = '<div class="text-secondary text-center" style="padding: 48px;">No data matches the current filter</div>';
        return;
    }

    // Ensure the canvas is in DOM
    if (!ctx.parentElement.querySelector('canvas')) {
        const newCanvas = document.createElement('canvas');
        newCanvas.id = canvasId;
        ctx.parentElement.innerHTML = '';
        ctx.parentElement.appendChild(newCanvas);
    }

    const canvasEl = document.getElementById(canvasId);

    const chart = new Chart(canvasEl, {
        type: 'sankey',
        data: {
            datasets: [{
                data: chartData,
                colorFrom: (ctx) => {
                    const item = ctx.dataset.data[ctx.dataIndex];
                    if (item.sourceType === 'dimension') {
                        return getDimensionColor(item.sourceScore);
                    }
                    return '#0f62fe';  // Blue for use cases
                },
                colorTo: (ctx) => {
                    const item = ctx.dataset.data[ctx.dataIndex];
                    if (item.targetType === 'tp_solution') {
                        return '#8a3ffc';  // Purple for TP solutions
                    }
                    return '#0f62fe';  // Blue for use cases
                },
                colorMode: 'gradient',
                size: 'max',
                nodePadding: 40,
                nodeWidth: 8,
                labels: {
                    font: {
                        size: 10
                    }
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: !isLarge,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const item = context.dataset.data[context.dataIndex];
                            return `${item.fromFull || item.from} → ${item.toFull || item.to}`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });

    if (isLarge) {
        largeFlowSankeyChart = chart;
    } else {
        flowSankeyChart = chart;
    }
}

// Copy entire flow visual to clipboard for PowerPoint
async function copyFlowVisualToClipboard() {
    const container = document.getElementById('flowExportContainer');
    if (!container) {
        alert('Export container not found');
        return;
    }

    try {
        // Show loading state
        const copyBtn = event?.target?.closest('button');
        const originalText = copyBtn?.innerHTML;
        if (copyBtn) {
            copyBtn.innerHTML = '<svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg> Copying...';
            copyBtn.disabled = true;
        }

        // Use html2canvas to capture the entire container
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher resolution for better quality in PPT
            useCORS: true,
            logging: false
        });

        // Convert to blob and copy
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        // Show success
        if (copyBtn) {
            copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.disabled = false;
            }, 2000);
        } else {
            alert('Image copied to clipboard! You can now paste it into PowerPoint.');
        }

    } catch (error) {
        console.error('Failed to copy visual:', error);
        alert('Failed to copy. Try downloading instead.');
        if (copyBtn) {
            copyBtn.innerHTML = originalText;
            copyBtn.disabled = false;
        }
    }
}

// Download entire flow visual as image
async function downloadFlowVisual() {
    const container = document.getElementById('flowExportContainer');
    if (!container) {
        alert('Export container not found');
        return;
    }

    try {
        // Show loading state
        const downloadBtn = event?.target?.closest('button');
        const originalText = downloadBtn?.innerHTML;
        if (downloadBtn) {
            downloadBtn.innerHTML = '<svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg> Preparing...';
            downloadBtn.disabled = true;
        }

        // Use html2canvas to capture the entire container
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2, // Higher resolution for better quality
            useCORS: true,
            logging: false
        });

        // Get customer name for filename
        const customerName = document.getElementById('customerName')?.textContent || 'Customer';
        const safeName = customerName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

        // Download
        const link = document.createElement('a');
        link.download = `implementation-flow-${safeName}-${getCustomerId()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Reset button
        if (downloadBtn) {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }

    } catch (error) {
        console.error('Failed to download visual:', error);
        alert('Failed to download. Please try again.');
        if (downloadBtn) {
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
        }
    }
}

// Export flow visualization functions
window.loadFlowVisualization = loadFlowVisualization;
window.refreshFlowVisualization = refreshFlowVisualization;
window.loadFlowAssessmentOptions = loadFlowAssessmentOptions;
window.loadFlowTabScores = loadFlowTabScores;
window.onFlowAssessmentChange = onFlowAssessmentChange;
window.onFlowAssessmentTypeChange = onFlowAssessmentTypeChange;
window.switchFlowAssessmentType = switchFlowAssessmentType;
window.updateFlowChartTitle = updateFlowChartTitle;
window.openFlowChartModal = openFlowChartModal;
window.closeFlowChartModal = closeFlowChartModal;
window.copyFlowChartToClipboard = copyFlowChartToClipboard;
window.downloadFlowChart = downloadFlowChart;
window.applyFlowFilters = applyFlowFilters;
window.resetFlowFilters = resetFlowFilters;
window.copyFlowVisualToClipboard = copyFlowVisualToClipboard;
window.downloadFlowVisual = downloadFlowVisual;

// Multi-assessment dashboard exports
window.loadMultiAssessmentDashboard = loadMultiAssessmentDashboard;
window.showAssessmentTypeTab = showAssessmentTypeTab;

// ============================================================
// MULTI-ASSESSMENT DASHBOARD
// ============================================================

// Global chart instances for multi-assessment
let overallRadarChartInstance = null;
let miniRadarCharts = {
    spm: null,
    tbm: null,
    finops: null
};

// Assessment type colors
const ASSESSMENT_TYPE_COLORS = {
    spm: '#0f62fe',
    tbm: '#198038',
    finops: '#8a3ffc'
};

// Load the multi-assessment dashboard data
async function loadMultiAssessmentDashboard(customerId) {
    try {
        // Get comprehensive report data
        const report = await API.AssessmentTypeAPI.getComprehensiveReport(customerId);

        // Update overall maturity score
        const overallScoreEl = document.getElementById('overallMaturityScore');
        if (overallScoreEl) {
            if (report.overall_section.overall_maturity_score !== null) {
                overallScoreEl.textContent = report.overall_section.overall_maturity_score.toFixed(1);
            } else {
                overallScoreEl.textContent = '-';
            }
        }

        // Render overall radar chart (3 axes: SPM, TBM, FinOps)
        renderOverallRadarChart(report.overall_section.type_scores);

        // Render mini radar charts for each type
        for (const typeReport of report.assessment_reports) {
            const typeCode = typeReport.assessment_type.code;
            renderMiniRadarChart(typeCode, typeReport.scores);

            // Update score display
            const scoreEl = document.getElementById(`${typeCode}Score`);
            if (scoreEl) {
                if (typeReport.scores.overall_score !== null) {
                    scoreEl.textContent = typeReport.scores.overall_score.toFixed(1);
                } else {
                    scoreEl.textContent = '-';
                }
            }

            // Update card state (empty vs has data)
            const cardEl = document.querySelector(`.mini-radar-card[data-type="${typeCode}"]`);
            if (cardEl) {
                if (!typeReport.scores.has_assessment) {
                    cardEl.classList.add('mini-radar-card--empty');
                } else {
                    cardEl.classList.remove('mini-radar-card--empty');
                }
            }
        }

        // Render cross-type insights
        renderCrossTypeInsights(report.cross_type_analysis);

    } catch (error) {
        console.error('Failed to load multi-assessment dashboard:', error);
        // Show fallback or error state
    }
}

// Render the overall radar chart showing SPM, TBM, FinOps scores
function renderOverallRadarChart(typeScores) {
    const ctx = document.getElementById('overallRadarChart');
    if (!ctx) return;

    // Destroy existing chart
    if (overallRadarChartInstance) {
        overallRadarChartInstance.destroy();
    }

    // Prepare data
    const labels = typeScores.map(s => s.short_name);
    const scores = typeScores.map(s => s.overall_score || 0);
    const colors = typeScores.map(s => ASSESSMENT_TYPE_COLORS[s.type_code] || '#666');

    overallRadarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Maturity Score',
                data: scores,
                backgroundColor: 'rgba(15, 98, 254, 0.15)',
                borderColor: '#0f62fe',
                borderWidth: 2,
                pointBackgroundColor: colors,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        display: true,
                        color: '#ffffff80',
                        backdropColor: 'transparent'
                    },
                    grid: {
                        color: '#ffffff20'
                    },
                    angleLines: {
                        color: '#ffffff20'
                    },
                    pointLabels: {
                        color: '#ffffff',
                        font: {
                            size: 12,
                            weight: '600'
                        }
                    }
                }
            }
        }
    });
}

// Render a mini radar chart for a specific assessment type
function renderMiniRadarChart(typeCode, scores) {
    const canvasId = `miniRadar${typeCode.charAt(0).toUpperCase() + typeCode.slice(1)}`;
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Destroy existing chart
    if (miniRadarCharts[typeCode]) {
        miniRadarCharts[typeCode].destroy();
    }

    // If no assessment, show empty state
    if (!scores.has_assessment || scores.dimensions.length === 0) {
        // Clear the canvas and show placeholder
        const context = ctx.getContext('2d');
        context.clearRect(0, 0, ctx.width, ctx.height);
        return;
    }

    // Prepare data
    const labels = scores.dimensions.map(d => d.name);
    const data = scores.dimensions.map(d => d.score || 0);
    const typeColor = ASSESSMENT_TYPE_COLORS[typeCode] || '#666';

    miniRadarCharts[typeCode] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: `${typeColor}20`,
                borderColor: typeColor,
                borderWidth: 2,
                pointBackgroundColor: typeColor,
                pointRadius: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: 5,
                    ticks: {
                        display: false
                    },
                    grid: {
                        color: '#e0e0e0'
                    },
                    angleLines: {
                        color: '#e0e0e0'
                    },
                    pointLabels: {
                        display: false
                    }
                }
            }
        }
    });
}

// Render cross-type insights
function renderCrossTypeInsights(analysis) {
    const container = document.getElementById('crossTypeInsightsContainer');
    const card = document.getElementById('crossTypeInsightsCard');

    if (!container || !card) return;

    // Hide card if no insights
    if (!analysis.insights || analysis.insights.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';

    const insightIcons = {
        synergy: '\u2728', // sparkles
        gap: '\u26a0\ufe0f', // warning
        strength: '\u2705', // checkmark
        conflict: '\u274c' // x
    };

    container.innerHTML = analysis.insights.map(insight => `
        <div class="cross-type-insight cross-type-insight--${insight.severity}">
            <div class="cross-type-insight__icon">${insightIcons[insight.insight_type] || '\u2139\ufe0f'}</div>
            <div class="cross-type-insight__content">
                <div class="cross-type-insight__title">${escapeHtml(insight.title)}</div>
                <div class="cross-type-insight__description">${escapeHtml(insight.description)}</div>
            </div>
        </div>
    `).join('');
}

// Show assessment type tab (navigate to assessment details)
function showAssessmentTypeTab(typeCode) {
    // Switch to the SPM assessment section (or future type-specific sections)
    showSection('spmAssessment');

    // TODO: In future, implement tab switching within assessment section
    // for now, just navigate to the assessment section
    console.log(`Navigate to ${typeCode} assessment details`);
}

// ==================== REPORT BUILDER ====================

// Global report data storage
let reportData = {
    customer: null,
    comprehensiveReport: null,
    recommendations: [],
    roadmap: [],
    flowVisualization: null,
    targets: null,
    risks: []
};

// Report generation state
let reportGenerated = false;

// Load all data needed for report generation
async function loadReportData(customerId) {
    try {
        // Fetch all data in parallel for efficiency
        const [
            customer,
            comprehensiveReport,
            recommendations,
            roadmap,
            risks
        ] = await Promise.all([
            API.CustomerAPI.getById(customerId),
            fetchComprehensiveReport(customerId),
            fetchRecommendations(customerId),
            fetchRoadmap(customerId),
            fetchRisks(customerId)
        ]);

        // Also try to fetch flow visualization and targets (these may not exist)
        let flowVisualization = null;
        let targets = null;

        try {
            flowVisualization = await fetchFlowVisualization(customerId);
        } catch (e) {
            console.log('Flow visualization not available');
        }

        try {
            targets = await fetchTargets(customerId);
        } catch (e) {
            console.log('Targets not available');
        }

        reportData = {
            customer,
            comprehensiveReport,
            recommendations: recommendations || [],
            roadmap: roadmap || [],
            flowVisualization,
            targets,
            risks: risks || []
        };

        return reportData;
    } catch (error) {
        console.error('Error loading report data:', error);
        throw error;
    }
}

// Fetch comprehensive report data
async function fetchComprehensiveReport(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessment-types/customers/${customerId}/comprehensive-report`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}

// Fetch recommendations
async function fetchRecommendations(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/recommendations/customer/${customerId}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.items || [];
    } catch (e) {
        return [];
    }
}

// Fetch roadmap
async function fetchRoadmap(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/roadmaps/customer/${customerId}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.items || [];
    } catch (e) {
        return [];
    }
}

// Fetch risks
async function fetchRisks(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/risks/customer/${customerId}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.items || [];
    } catch (e) {
        return [];
    }
}

// Fetch flow visualization
async function fetchFlowVisualization(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/customer/${customerId}/flow-visualization`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}

// Fetch targets
async function fetchTargets(customerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/assessments/customer/${customerId}/targets`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}

// Get selected report components
function getSelectedReportComponents() {
    const checkboxes = document.querySelectorAll('input[name="reportComponent"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Select report preset
function selectReportPreset(preset) {
    const allCheckboxes = document.querySelectorAll('input[name="reportComponent"]');

    // Clear all first
    allCheckboxes.forEach(cb => cb.checked = false);

    const presets = {
        executive: ['executiveSummary', 'assessmentScores', 'recommendations'],
        full: ['executiveSummary', 'accountOverview', 'assessmentDetails', 'assessmentScores',
               'scoreTargets', 'spmAssessment', 'tbmAssessment', 'finopsAssessment',
               'recommendations', 'flowDiagram', 'roadmap', 'gapAnalysis', 'riskSummary'],
        assessment: ['assessmentDetails', 'assessmentScores', 'spmAssessment', 'tbmAssessment', 'finopsAssessment'],
        planning: ['recommendations', 'flowDiagram', 'roadmap'],
        clear: []
    };

    const selected = presets[preset] || [];

    allCheckboxes.forEach(cb => {
        if (selected.includes(cb.value)) {
            cb.checked = true;
        }
    });
}

// Main generate report function
async function generateReport() {
    const customerId = getCustomerId();
    if (!customerId) {
        alert('No customer ID found');
        return;
    }

    const previewContainer = document.getElementById('reportPreviewContainer');
    const printBtn = document.getElementById('reportPrintBtn');

    // Show loading state
    previewContainer.innerHTML = `
        <div class="report-preview__placeholder">
            <div class="loading-spinner" style="margin-bottom: 12px;"></div>
            <p>Loading report data...</p>
        </div>
    `;

    try {
        // Load all data
        await loadReportData(customerId);

        // Get selected components
        const components = getSelectedReportComponents();

        if (components.length === 0) {
            previewContainer.innerHTML = `
                <div class="report-preview__placeholder">
                    <svg width="48" height="48" viewBox="0 0 32 32" style="opacity: 0.3; margin-bottom: 12px;">
                        <path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 26a12 12 0 1112-12 12 12 0 01-12 12z"/>
                        <path d="M15 8h2v11h-2zm1 14a1.5 1.5 0 101.5 1.5A1.5 1.5 0 0016 22z"/>
                    </svg>
                    <p>Please select at least one component to include in the report</p>
                </div>
            `;
            return;
        }

        // Build report HTML
        const reportHtml = buildReportHtml(components);
        previewContainer.innerHTML = reportHtml;

        // Initialize any charts in the report
        initializeReportCharts(components);

        // Enable print button
        reportGenerated = true;
        printBtn.disabled = false;

    } catch (error) {
        console.error('Error generating report:', error);
        previewContainer.innerHTML = `
            <div class="report-preview__placeholder">
                <svg width="48" height="48" viewBox="0 0 32 32" style="opacity: 0.3; margin-bottom: 12px; color: #da1e28;">
                    <path d="M16 2a14 14 0 1014 14A14 14 0 0016 2zm0 26a12 12 0 1112-12 12 12 0 01-12 12z"/>
                    <path d="M15 8h2v11h-2zm1 14a1.5 1.5 0 101.5 1.5A1.5 1.5 0 0016 22z"/>
                </svg>
                <p>Error generating report. Please try again.</p>
            </div>
        `;
    }
}

// Build complete report HTML
function buildReportHtml(components) {
    let html = '<div class="generated-report">';

    // Always include header
    html += buildReportHeader();

    // Build each selected section
    if (components.includes('executiveSummary')) {
        html += buildExecutiveSummarySection();
    }

    if (components.includes('accountOverview')) {
        html += buildAccountOverviewSection();
    }

    if (components.includes('assessmentDetails')) {
        html += buildAssessmentDetailsSection();
    }

    if (components.includes('assessmentScores')) {
        html += buildAssessmentScoresSection();
    }

    if (components.includes('scoreTargets')) {
        html += buildScoreTargetsSection();
    }

    if (components.includes('spmAssessment')) {
        html += buildFrameworkSection('spm');
    }

    if (components.includes('tbmAssessment')) {
        html += buildFrameworkSection('tbm');
    }

    if (components.includes('finopsAssessment')) {
        html += buildFrameworkSection('finops');
    }

    if (components.includes('recommendations')) {
        html += buildRecommendationsSection();
    }

    if (components.includes('flowDiagram')) {
        html += buildFlowDiagramSection();
    }

    if (components.includes('roadmap')) {
        html += buildRoadmapSection();
    }

    if (components.includes('gapAnalysis')) {
        html += buildGapAnalysisSection();
    }

    if (components.includes('riskSummary')) {
        html += buildRiskSummarySection();
    }

    html += '</div>';
    return html;
}

// Build report header
function buildReportHeader() {
    const customer = reportData.customer;
    const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `
        <div class="generated-report__header">
            <div class="generated-report__logo">CS Tracker</div>
            <h1 class="generated-report__title">${escapeHtml(customer?.name || 'Customer')} Assessment Report</h1>
            <p class="generated-report__subtitle">Comprehensive Maturity Analysis & Recommendations</p>
            <p class="generated-report__date">Generated on ${date}</p>
        </div>
    `;
}

// Build Executive Summary section
function buildExecutiveSummarySection() {
    const comprehensive = reportData.comprehensiveReport;
    const recommendations = reportData.recommendations;
    const risks = reportData.risks;
    const customer = reportData.customer;

    // Calculate metrics
    const overallScore = comprehensive?.overall_score?.toFixed(1) || '-';
    const assessmentCount = comprehensive?.assessment_summaries?.length || 0;
    const pendingRecs = recommendations.filter(r => r.status === 'pending').length;
    const openRisks = risks.filter(r => r.status !== 'resolved').length;

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Executive Summary</h2>
            <div class="report-summary-grid">
                <div class="report-summary-card">
                    <div class="report-summary-card__value">${overallScore}</div>
                    <div class="report-summary-card__label">Overall Maturity Score</div>
                </div>
                <div class="report-summary-card">
                    <div class="report-summary-card__value">${assessmentCount}</div>
                    <div class="report-summary-card__label">Assessment Types</div>
                </div>
                <div class="report-summary-card">
                    <div class="report-summary-card__value">${pendingRecs}</div>
                    <div class="report-summary-card__label">Pending Recommendations</div>
                </div>
                <div class="report-summary-card">
                    <div class="report-summary-card__value">${openRisks}</div>
                    <div class="report-summary-card__label">Open Risks</div>
                </div>
            </div>
            <p style="color: #525252; font-size: 14px; line-height: 1.6;">
                This report provides a comprehensive analysis of ${escapeHtml(customer?.name || 'the customer')}'s
                maturity across strategic portfolio management frameworks. The assessment covers key dimensions
                including process maturity, tool adoption, governance, and value realization capabilities.
            </p>
        </div>
    `;
}

// Build Account Overview section
function buildAccountOverviewSection() {
    const customer = reportData.customer;

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Account Overview</h2>
            <table class="report-table">
                <tbody>
                    <tr>
                        <td style="width: 200px; font-weight: 500;">Customer Name</td>
                        <td>${escapeHtml(customer?.name || '-')}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 500;">Industry</td>
                        <td>${escapeHtml(customer?.industry || '-')}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 500;">ARR</td>
                        <td>${formatCurrency(customer?.arr)}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 500;">Adoption Stage</td>
                        <td>${formatAdoptionStage(customer?.adoption_stage)}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 500;">Health Status</td>
                        <td>${getHealthLabel(customer?.health_status)}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 500;">Renewal Date</td>
                        <td>${formatDate(customer?.renewal_date)}</td>
                    </tr>
                    <tr>
                        <td style="font-weight: 500;">Products Owned</td>
                        <td>${customer?.products_owned?.join(', ') || '-'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

// Build Assessment Details section
function buildAssessmentDetailsSection() {
    const comprehensive = reportData.comprehensiveReport;
    const summaries = comprehensive?.assessment_summaries || [];

    if (summaries.length === 0) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">Assessment Details</h2>
                <p style="color: #525252;">No assessments completed yet.</p>
            </div>
        `;
    }

    let rows = summaries.map(summary => `
        <tr>
            <td style="font-weight: 500;">${escapeHtml(summary.type_name || summary.type_code?.toUpperCase() || '-')}</td>
            <td>${summary.overall_score?.toFixed(1) || '-'}</td>
            <td>${formatDate(summary.completed_date)}</td>
            <td>${summary.dimension_count || '-'} dimensions</td>
        </tr>
    `).join('');

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Assessment Details</h2>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Assessment Type</th>
                        <th>Score</th>
                        <th>Completed</th>
                        <th>Coverage</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

// Build Assessment Scores section with radar chart placeholder
function buildAssessmentScoresSection() {
    const comprehensive = reportData.comprehensiveReport;
    const overallScore = comprehensive?.overall_score || 0;
    const scoreClass = overallScore >= 3.5 ? 'green' : overallScore >= 2.5 ? 'yellow' : 'red';

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Assessment Scores</h2>
            <div class="report-score-display">
                <div class="report-score-circle report-score-circle--${scoreClass}">
                    ${overallScore.toFixed(1)}
                </div>
                <div class="report-score-details">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px;">Overall Maturity Score</h3>
                    <p style="margin: 0; color: #525252; font-size: 14px;">
                        ${getScoreInterpretation(overallScore)}
                    </p>
                </div>
            </div>
            <div class="report-chart-container">
                <div class="report-radar-chart">
                    <canvas id="reportRadarChart" width="400" height="400"></canvas>
                </div>
            </div>
        </div>
    `;
}

// Get score interpretation text
function getScoreInterpretation(score) {
    if (score >= 4.5) return 'Optimized - Mature processes with continuous improvement';
    if (score >= 3.5) return 'Managed - Standardized processes with good adoption';
    if (score >= 2.5) return 'Defined - Documented processes, room for improvement';
    if (score >= 1.5) return 'Developing - Early stage with basic processes';
    return 'Initial - Ad-hoc processes, significant improvement needed';
}

// Build Score Targets Comparison section
function buildScoreTargetsSection() {
    const comprehensive = reportData.comprehensiveReport;
    const targets = reportData.targets;

    if (!comprehensive?.assessment_summaries || comprehensive.assessment_summaries.length === 0) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">Score Targets Comparison</h2>
                <p style="color: #525252;">No assessment data available for comparison.</p>
            </div>
        `;
    }

    // Build gap items for each assessment type
    let gapItems = '';
    comprehensive.assessment_summaries.forEach(summary => {
        const currentScore = summary.overall_score || 0;
        const targetScore = 3.5; // Default target
        const gap = targetScore - currentScore;

        gapItems += `
            <div class="report-gap-item">
                <div class="report-gap-item__label">${escapeHtml(summary.type_name || summary.type_code?.toUpperCase())}</div>
                <div class="report-gap-item__scores">
                    <span class="report-gap-item__current">${currentScore.toFixed(1)}</span>
                    <span class="report-gap-item__arrow">→</span>
                    <span class="report-gap-item__target">${targetScore.toFixed(1)}</span>
                    <span style="color: ${gap > 0 ? '#da1e28' : '#24a148'}; margin-left: 8px;">
                        (${gap > 0 ? '+' : ''}${gap.toFixed(1)} gap)
                    </span>
                </div>
            </div>
        `;
    });

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Score Targets Comparison</h2>
            ${gapItems}
        </div>
    `;
}

// Build Framework Section (SPM, TBM, or FinOps)
function buildFrameworkSection(typeCode) {
    const comprehensive = reportData.comprehensiveReport;
    const summary = comprehensive?.assessment_summaries?.find(
        s => s.type_code?.toLowerCase() === typeCode.toLowerCase()
    );

    const typeNames = {
        spm: 'Strategic Portfolio Management (SPM)',
        tbm: 'Technology Business Management (TBM)',
        finops: 'FinOps'
    };

    if (!summary) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">${typeNames[typeCode] || typeCode.toUpperCase()} Assessment</h2>
                <p style="color: #525252;">No ${typeCode.toUpperCase()} assessment completed yet.</p>
            </div>
        `;
    }

    const dimensionScores = summary.dimension_scores || [];

    let dimensionHtml = '';
    dimensionScores.forEach(dim => {
        const score = dim.score || 0;
        const percentage = (score / 5) * 100;
        const color = score >= 3.5 ? '#24a148' : score >= 2.5 ? '#f1c21b' : '#da1e28';

        dimensionHtml += `
            <div class="report-dimension-score">
                <div class="report-dimension-score__name">${escapeHtml(dim.name || dim.dimension_name)}</div>
                <div class="report-dimension-score__bar">
                    <div class="report-dimension-score__fill" style="width: ${percentage}%; background: ${color};"></div>
                </div>
                <div class="report-dimension-score__value">${score.toFixed(1)}</div>
            </div>
        `;
    });

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">${typeNames[typeCode] || typeCode.toUpperCase()} Assessment</h2>
            <div class="report-score-display" style="margin-bottom: 20px;">
                <div class="report-score-circle report-score-circle--${summary.overall_score >= 3.5 ? 'green' : summary.overall_score >= 2.5 ? 'yellow' : 'red'}">
                    ${(summary.overall_score || 0).toFixed(1)}
                </div>
                <div class="report-score-details">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px;">Overall ${typeCode.toUpperCase()} Score</h3>
                    <p style="margin: 0; color: #525252; font-size: 14px;">
                        ${getScoreInterpretation(summary.overall_score || 0)}
                    </p>
                </div>
            </div>
            <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Dimension Scores</h3>
            <div class="report-dimension-scores">
                ${dimensionHtml || '<p style="color: #525252;">No dimension scores available.</p>'}
            </div>
        </div>
    `;
}

// Build Recommendations section
function buildRecommendationsSection() {
    const recommendations = reportData.recommendations;
    const pending = recommendations.filter(r => r.status === 'pending');

    if (pending.length === 0) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">Recommendations</h2>
                <p style="color: #525252;">No pending recommendations.</p>
            </div>
        `;
    }

    // Sort by priority
    const sorted = [...pending].sort((a, b) => (a.priority || 99) - (b.priority || 99));

    let recItems = sorted.slice(0, 10).map(rec => `
        <li class="report-recommendation-item">
            <div class="report-recommendation-item__header">
                <h4 class="report-recommendation-item__title">${escapeHtml(rec.title)}</h4>
                <span class="report-recommendation-item__priority">P${rec.priority || '-'}</span>
            </div>
            <div class="report-recommendation-item__meta">
                ${rec.dimension_name ? `<span>Dimension: ${escapeHtml(rec.dimension_name)}</span>` : ''}
                ${rec.expected_impact ? `<span>Impact: +${rec.expected_impact} points</span>` : ''}
            </div>
            ${rec.description ? `<p class="report-recommendation-item__description">${escapeHtml(rec.description)}</p>` : ''}
        </li>
    `).join('');

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Recommendations (${pending.length} pending)</h2>
            <ul class="report-recommendation-list">
                ${recItems}
            </ul>
            ${pending.length > 10 ? `<p style="color: #525252; margin-top: 12px; font-size: 13px;">Showing top 10 of ${pending.length} recommendations.</p>` : ''}
        </div>
    `;
}

// Build Flow Diagram section
function buildFlowDiagramSection() {
    const flow = reportData.flowVisualization;

    if (!flow || !flow.flows || flow.flows.length === 0) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">Implementation Flow</h2>
                <p style="color: #525252;">No flow visualization data available. Complete an assessment to see the implementation flow from dimensions to use cases to solutions.</p>
            </div>
        `;
    }

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Implementation Flow</h2>
            <div class="report-summary-grid">
                <div class="report-summary-card">
                    <div class="report-summary-card__value">${flow.summary?.weak_dimensions || 0}</div>
                    <div class="report-summary-card__label">Weak Dimensions</div>
                </div>
                <div class="report-summary-card">
                    <div class="report-summary-card__value">${flow.summary?.recommended_use_cases || 0}</div>
                    <div class="report-summary-card__label">Recommended Use Cases</div>
                </div>
                <div class="report-summary-card">
                    <div class="report-summary-card__value">${flow.summary?.tp_features || 0}</div>
                    <div class="report-summary-card__label">TP Features</div>
                </div>
            </div>
            <p style="color: #525252; font-size: 13px;">
                The flow diagram shows the mapping from assessment gaps to recommended use cases and implementation solutions.
                View the interactive Flow tab for the full Sankey visualization.
            </p>
        </div>
    `;
}

// Build Roadmap section
function buildRoadmapSection() {
    const roadmap = reportData.roadmap;

    if (!roadmap || roadmap.length === 0) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">Roadmap</h2>
                <p style="color: #525252;">No roadmap items have been created yet.</p>
            </div>
        `;
    }

    // Group by quarter/year
    const grouped = {};
    roadmap.forEach(item => {
        const key = `${item.quarter || 'TBD'} ${item.year || ''}`.trim();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    let roadmapHtml = '';
    Object.keys(grouped).sort().forEach(period => {
        const items = grouped[period];
        roadmapHtml += `
            <h3 style="font-size: 14px; font-weight: 600; margin: 16px 0 8px 0; color: #0f62fe;">${period}</h3>
        `;
        items.forEach(item => {
            const statusColors = {
                not_started: '#6f6f6f',
                in_progress: '#0f62fe',
                completed: '#24a148',
                blocked: '#da1e28'
            };
            roadmapHtml += `
                <div class="report-gap-item">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColors[item.status] || '#6f6f6f'}; flex-shrink: 0;"></div>
                    <div class="report-gap-item__label" style="flex: 1;">${escapeHtml(item.title)}</div>
                    <div style="font-size: 12px; color: #525252;">${item.status?.replace('_', ' ') || 'Not Started'}</div>
                </div>
            `;
        });
    });

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Roadmap (${roadmap.length} items)</h2>
            ${roadmapHtml}
        </div>
    `;
}

// Build Gap Analysis section
function buildGapAnalysisSection() {
    const comprehensive = reportData.comprehensiveReport;

    if (!comprehensive?.assessment_summaries) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">Gap Analysis</h2>
                <p style="color: #525252;">No assessment data available for gap analysis.</p>
            </div>
        `;
    }

    // Find all weak dimensions across assessments
    let weakDimensions = [];
    comprehensive.assessment_summaries.forEach(summary => {
        (summary.dimension_scores || []).forEach(dim => {
            if (dim.score < 3.0) {
                weakDimensions.push({
                    ...dim,
                    typeCode: summary.type_code,
                    typeName: summary.type_name
                });
            }
        });
    });

    // Sort by score ascending (weakest first)
    weakDimensions.sort((a, b) => (a.score || 0) - (b.score || 0));

    if (weakDimensions.length === 0) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">Gap Analysis</h2>
                <p style="color: #24a148; font-weight: 500;">No significant gaps identified. All dimensions score above 3.0.</p>
            </div>
        `;
    }

    let gapHtml = weakDimensions.slice(0, 10).map(dim => {
        const gap = 3.5 - (dim.score || 0);
        return `
            <div class="report-gap-item">
                <div class="report-gap-item__label">
                    ${escapeHtml(dim.name || dim.dimension_name)}
                    <span style="font-size: 11px; color: #6f6f6f; margin-left: 8px;">(${dim.typeName || dim.typeCode?.toUpperCase()})</span>
                </div>
                <div class="report-gap-item__scores">
                    <span class="report-gap-item__current">${(dim.score || 0).toFixed(1)}</span>
                    <span class="report-gap-item__arrow">→</span>
                    <span class="report-gap-item__target">3.5</span>
                    <span style="color: #da1e28; margin-left: 8px; font-size: 12px;">
                        (${gap.toFixed(1)} gap)
                    </span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Gap Analysis</h2>
            <p style="color: #525252; margin-bottom: 16px; font-size: 14px;">
                The following dimensions have scores below 3.0 and represent improvement opportunities:
            </p>
            ${gapHtml}
            ${weakDimensions.length > 10 ? `<p style="color: #525252; margin-top: 12px; font-size: 13px;">Showing top 10 of ${weakDimensions.length} gaps.</p>` : ''}
        </div>
    `;
}

// Build Risk Summary section
function buildRiskSummarySection() {
    const risks = reportData.risks;
    const openRisks = risks.filter(r => r.status !== 'resolved');

    if (openRisks.length === 0) {
        return `
            <div class="generated-report__section">
                <h2 class="generated-report__section-title">Risk Summary</h2>
                <p style="color: #24a148; font-weight: 500;">No open risks identified.</p>
            </div>
        `;
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    openRisks.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

    let riskHtml = openRisks.map(risk => `
        <li class="report-risk-item">
            <div class="report-risk-item__severity report-risk-item__severity--${risk.severity || 'medium'}"></div>
            <div class="report-risk-item__content">
                <h4 class="report-risk-item__title">${escapeHtml(risk.title)}</h4>
                ${risk.description ? `<p class="report-risk-item__description">${escapeHtml(risk.description)}</p>` : ''}
            </div>
        </li>
    `).join('');

    return `
        <div class="generated-report__section">
            <h2 class="generated-report__section-title">Risk Summary (${openRisks.length} open)</h2>
            <ul class="report-risk-list">
                ${riskHtml}
            </ul>
        </div>
    `;
}

// Initialize charts in the generated report
function initializeReportCharts(components) {
    if (components.includes('assessmentScores')) {
        const canvas = document.getElementById('reportRadarChart');
        if (canvas && reportData.comprehensiveReport) {
            renderReportRadarChart(canvas);
        }
    }
}

// Render radar chart for report
function renderReportRadarChart(canvas) {
    const comprehensive = reportData.comprehensiveReport;
    const summaries = comprehensive?.assessment_summaries || [];

    if (summaries.length === 0) return;

    // Collect all unique dimensions across all assessments
    const allDimensions = new Set();
    summaries.forEach(summary => {
        (summary.dimension_scores || []).forEach(dim => {
            allDimensions.add(dim.name || dim.dimension_name);
        });
    });

    const labels = Array.from(allDimensions).slice(0, 8); // Max 8 for readability

    // Build datasets for each assessment type
    const typeColors = {
        spm: { bg: 'rgba(15, 98, 254, 0.2)', border: '#0f62fe' },
        tbm: { bg: 'rgba(36, 161, 72, 0.2)', border: '#24a148' },
        finops: { bg: 'rgba(138, 63, 252, 0.2)', border: '#8a3ffc' }
    };

    const datasets = summaries.map(summary => {
        const typeCode = summary.type_code?.toLowerCase() || 'spm';
        const colors = typeColors[typeCode] || typeColors.spm;

        const data = labels.map(label => {
            const dim = (summary.dimension_scores || []).find(
                d => (d.name || d.dimension_name) === label
            );
            return dim?.score || 0;
        });

        return {
            label: summary.type_name || summary.type_code?.toUpperCase() || 'Assessment',
            data: data,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: 2,
            pointBackgroundColor: colors.border,
            pointRadius: 4
        };
    });

    new Chart(canvas, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: 5,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: '#e0e0e0'
                    },
                    angleLines: {
                        color: '#e0e0e0'
                    },
                    pointLabels: {
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Print report function
function printReport() {
    if (!reportGenerated) {
        alert('Please generate a report preview first.');
        return;
    }

    const previewContainer = document.getElementById('reportPreviewContainer');
    const reportContent = previewContainer.innerHTML;

    // Convert any canvas elements to images for print fidelity
    const canvases = previewContainer.querySelectorAll('canvas');
    let printContent = reportContent;

    canvases.forEach(canvas => {
        try {
            const imageData = canvas.toDataURL('image/png');
            const img = `<img src="${imageData}" style="max-width: 100%; height: auto;" />`;
            printContent = printContent.replace(canvas.outerHTML, img);
        } catch (e) {
            console.warn('Could not convert canvas to image:', e);
        }
    });

    // Open print window
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${reportData.customer?.name || 'Customer'} Assessment Report</title>
            <style>
                * { box-sizing: border-box; }
                body {
                    font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
                    margin: 0;
                    padding: 20px;
                    color: #161616;
                    line-height: 1.5;
                }
                ${getReportPrintStyles()}
            </style>
        </head>
        <body>
            ${printContent}
        </body>
        </html>
    `);

    printWindow.document.close();

    // Wait for images to load, then print
    setTimeout(() => {
        printWindow.focus();
        printWindow.print();
    }, 500);
}

// Get print styles for the report
function getReportPrintStyles() {
    return `
        .generated-report { padding: 0; }
        .generated-report__header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #161616; }
        .generated-report__logo { font-size: 24px; font-weight: 700; color: #0f62fe; margin-bottom: 8px; }
        .generated-report__title { font-size: 28px; font-weight: 600; margin: 0 0 8px 0; }
        .generated-report__subtitle { font-size: 16px; color: #525252; margin: 0 0 8px 0; }
        .generated-report__date { font-size: 13px; color: #6f6f6f; }
        .generated-report__section { margin-bottom: 32px; page-break-inside: avoid; }
        .generated-report__section-title { font-size: 18px; font-weight: 600; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0; }
        .report-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .report-summary-card { background: #f4f4f4; padding: 16px; border-radius: 8px; text-align: center; }
        .report-summary-card__value { font-size: 28px; font-weight: 600; margin-bottom: 4px; }
        .report-summary-card__label { font-size: 12px; color: #525252; text-transform: uppercase; }
        .report-score-display { display: flex; align-items: center; gap: 24px; margin-bottom: 24px; }
        .report-score-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; color: white; }
        .report-score-circle--green { background: #24a148; }
        .report-score-circle--yellow { background: #f1c21b; color: #161616; }
        .report-score-circle--red { background: #da1e28; }
        .report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .report-table th, .report-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        .report-table th { background: #f4f4f4; font-weight: 600; }
        .report-dimension-scores { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .report-dimension-score { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f4f4f4; border-radius: 6px; }
        .report-dimension-score__name { flex: 1; font-size: 13px; }
        .report-dimension-score__bar { width: 60px; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; }
        .report-dimension-score__fill { height: 100%; border-radius: 3px; }
        .report-dimension-score__value { font-size: 14px; font-weight: 600; }
        .report-recommendation-list { list-style: none; padding: 0; margin: 0; }
        .report-recommendation-item { padding: 16px; background: #f4f4f4; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #0f62fe; }
        .report-recommendation-item__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .report-recommendation-item__title { font-size: 15px; font-weight: 600; margin: 0; }
        .report-recommendation-item__priority { font-size: 12px; font-weight: 500; padding: 4px 8px; border-radius: 4px; background: #0f62fe; color: white; }
        .report-recommendation-item__meta { display: flex; gap: 16px; font-size: 12px; color: #525252; margin-bottom: 8px; }
        .report-recommendation-item__description { font-size: 14px; color: #525252; margin: 0; }
        .report-gap-item { display: flex; align-items: center; gap: 16px; padding: 12px; background: #f4f4f4; border-radius: 6px; margin-bottom: 8px; }
        .report-gap-item__label { flex: 1; font-size: 13px; }
        .report-gap-item__scores { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .report-gap-item__current { font-weight: 600; color: #da1e28; }
        .report-gap-item__arrow { color: #6f6f6f; }
        .report-gap-item__target { font-weight: 600; color: #24a148; }
        .report-risk-list { list-style: none; padding: 0; margin: 0; }
        .report-risk-item { padding: 12px 16px; background: #f4f4f4; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
        .report-risk-item__severity { width: 10px; height: 10px; border-radius: 50%; }
        .report-risk-item__severity--high { background: #da1e28; }
        .report-risk-item__severity--medium { background: #f1c21b; }
        .report-risk-item__severity--low { background: #24a148; }
        .report-risk-item__content { flex: 1; }
        .report-risk-item__title { font-size: 14px; font-weight: 500; margin: 0 0 4px 0; }
        .report-risk-item__description { font-size: 12px; color: #525252; margin: 0; }
        .report-chart-container { text-align: center; margin: 20px 0; }
        .report-radar-chart { max-width: 400px; margin: 0 auto; }
        @media print {
            body { padding: 0; }
            .generated-report__section { page-break-inside: avoid; }
            .generated-report__header { page-break-after: avoid; }
        }
    `;
}

// Make report functions available globally
window.generateReport = generateReport;
window.printReport = printReport;
window.selectReportPreset = selectReportPreset;
