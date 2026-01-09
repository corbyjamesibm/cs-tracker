/**
 * Customer Detail - Fetches and displays customer information
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

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

// Fetch and display customer data
async function loadCustomerDetail() {
    const customerId = getCustomerId();

    if (!customerId) {
        showError('No customer ID provided');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/customers/${customerId}`);

        if (!response.ok) {
            if (response.status === 404) {
                showError('Customer not found');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return;
        }

        const customer = await response.json();
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

        // Load use cases for this customer
        loadUseCases(customerId);

    } catch (error) {
        console.error('Failed to load customer:', error);
        showError('Failed to load customer data');
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
    if (accountManagerEl) accountManagerEl.textContent = customer.account_manager || '-';

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
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        if (response.ok) {
            const user = await response.json();
            const csmEl = document.getElementById('csmOwner');
            if (csmEl) csmEl.textContent = user.full_name || `${user.first_name} ${user.last_name}`;
        }
    } catch (error) {
        console.error('Failed to load CSM owner:', error);
    }
}

// Load partner info
async function loadPartner(partnerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/partners/${partnerId}`);
        if (response.ok) {
            const partner = await response.json();
            const partnerBadge = document.getElementById('partnerBadge');
            if (partnerBadge) {
                partnerBadge.textContent = partner.name;
                partnerBadge.style.display = 'inline-block';
            }
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

// Load and display open tasks for this customer
async function loadOpenTasks(customerId) {
    const container = document.getElementById('openTasksContainer');
    const countEl = document.getElementById('openTasksCount');

    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/tasks?customer_id=${customerId}`);
        if (!response.ok) throw new Error('Failed to load tasks');

        const data = await response.json();
        // Handle paginated response - filter for open tasks only
        const tasks = (data.items || data).filter(t => t.status === 'pending' || t.status === 'in_progress');

        if (countEl) countEl.textContent = `${tasks.length} Task${tasks.length !== 1 ? 's' : ''}`;

        if (tasks.length === 0) {
            container.innerHTML = '<div class="text-secondary text-center" style="padding: 16px;">No open tasks</div>';
            return;
        }

        container.innerHTML = tasks.slice(0, 5).map(task => {
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDate && dueDate < new Date();
            const borderColor = isOverdue ? 'var(--cds-support-error)' :
                               (dueDate && dueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) ? 'var(--cds-support-warning)' :
                               'var(--cds-interactive)';

            return `
                <div style="border-left: 3px solid ${borderColor}; padding-left: 12px; margin-bottom: 12px;">
                    <div style="font-weight: 500;">${task.title}</div>
                    <div class="text-secondary" style="font-size: 12px;">Due: ${formatDate(task.due_date)} ${isOverdue ? '<span class="text-error">(Overdue)</span>' : ''}</div>
                    <div class="text-secondary" style="font-size: 12px;">Status: ${task.status}</div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Failed to load tasks:', error);
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 16px;">Could not load tasks</div>';
    }
}

// Load and display recent engagements for this customer
async function loadRecentEngagements(customerId) {
    const container = document.getElementById('recentEngagementsContainer');

    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/engagements?customer_id=${customerId}`);
        if (!response.ok) throw new Error('Failed to load engagements');

        const data = await response.json();
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

    // Render grouped use cases
    let html = '';
    const domainOrder = ['Strategic Planning', 'Portfolio Management', 'Resource Management', 'Financial Management'];

    domainOrder.forEach(domain => {
        if (!domains[domain]) return;

        html += `
            <div style="margin-bottom: 16px;">
                <strong style="font-size: 12px; color: var(--cds-text-secondary); text-transform: uppercase;">${domain}</strong>
            </div>
            <ul class="checklist" style="margin-bottom: 24px;">
        `;

        domains[domain].forEach(uc => {
            const checkboxClass = getCheckboxClass(uc.status);
            const statusTag = getStatusTag(uc.status);

            html += `
                <li class="checklist__item">
                    <div class="checklist__checkbox ${checkboxClass}">
                        ${(uc.status === 'implemented' || uc.status === 'optimized') ?
                            '<svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M13 24l-9-9 1.41-1.41L13 21.17 26.59 7.58 28 9 13 24z"/></svg>' : ''}
                    </div>
                    <span title="${uc.name}">${truncateText(uc.name, 50)}</span>
                    ${statusTag}
                </li>
            `;
        });

        html += '</ul>';
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadCustomerDetail();
});

// Nav toggle function
function toggleNav() {
    document.getElementById('sideNav').classList.toggle('open');
}
