/**
 * Customer Detail - Fetches and displays customer information
 * Uses API_BASE_URL from api.js
 */

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

// Load and display open tasks for this customer (sidebar panel)
async function loadOpenTasks(customerId) {
    const container = document.getElementById('openTasksContainer');
    const countEl = document.getElementById('openTasksCount');

    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/tasks?customer_id=${customerId}`);
        if (!response.ok) throw new Error('Failed to load tasks');

        const data = await response.json();
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

// ==========================================
// ROADMAP MANAGEMENT
// ==========================================

let currentRoadmap = null;
let roadmapQuarters = [];

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

    // Calculate quarters to display based on roadmap dates
    roadmapQuarters = generateQuarters(roadmap.start_date, roadmap.end_date);

    // Update timeframe tag
    const startYear = new Date(roadmap.start_date).getFullYear();
    const endYear = new Date(roadmap.end_date).getFullYear();
    document.getElementById('roadmapTimeframe').textContent = startYear === endYear ? startYear : `${startYear}-${endYear}`;

    // Render quarter headers
    renderQuarterHeaders(roadmapQuarters);

    // Render roadmap items by category
    renderRoadmapItems(roadmap.items, roadmapQuarters);

    // Update last updated text
    if (roadmap.updated_at) {
        document.getElementById('roadmapLastUpdated').textContent = `Last updated: ${formatDate(roadmap.updated_at)}`;
    }
}

// Generate quarters array between two dates
function generateQuarters(startDate, endDate) {
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
        // Limit to 8 quarters max for display
        if (quarters.length >= 8) break;
    }

    return quarters;
}

// Render quarter headers
function renderQuarterHeaders(quarters) {
    const container = document.getElementById('quarterHeaders');
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

// Render roadmap items grouped by category
function renderRoadmapItems(items, quarters) {
    const container = document.getElementById('roadmapItemsContainer');

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 32px; color: var(--cds-text-secondary);">
                No items yet. Click the + button to add roadmap items.
            </div>
        `;
        return;
    }

    // Group items by category
    const categories = {};
    items.forEach(item => {
        const cat = item.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(item);
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

    categoryOrder.forEach(cat => {
        if (!categories[cat]) return;

        html += `
            <div style="display: grid; grid-template-columns: 150px repeat(${gridCols}, 1fr); gap: 4px; margin-bottom: 8px; align-items: start;">
                <div style="font-weight: 500; font-size: 13px; padding: 8px 0;">${categoryLabels[cat]}</div>
        `;

        // Render each item with proper column span based on dates
        categories[cat].forEach(item => {
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

            html += `
                <div style="grid-column: ${colStart} / ${colEnd}; background: ${bgColor}; color: ${textColor}; padding: 8px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;"
                     onclick="editRoadmapItem(${item.id})"
                     title="${item.title}\n${dateRange}\n${getRoadmapStatusLabel(item.status)}${item.progress_percent > 0 ? ' (' + item.progress_percent + '%)' : ''}">
                    <div style="font-weight: 500;">${truncateText(item.title, 30)}</div>
                    <div style="opacity: 0.8; font-size: 10px;">${getRoadmapStatusLabel(item.status)}${item.progress_percent > 0 ? ' - ' + item.progress_percent + '%' : ''}</div>
                </div>
            `;
        });

        html += '</div>';
    });

    container.innerHTML = html;
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
        notes: document.getElementById('roadmapItemNotes').value || null
    };

    try {
        let response;
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
        }

        if (!response.ok) throw new Error('Failed to save roadmap item');

        closeRoadmapItemModal();

        // Reload roadmap to refresh display
        const customerId = getCustomerId();
        await loadRoadmap(customerId);

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
        description: document.getElementById('riskDescription').value || null,
        impact: document.getElementById('riskImpact').value || null,
        mitigation_plan: document.getElementById('riskMitigation').value || null,
        owner_id: document.getElementById('riskOwner').value || null,
        due_date: document.getElementById('riskDueDate').value || null,
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
window.openCreateRoadmapModal = openCreateRoadmapModal;
window.closeCreateRoadmapModal = closeCreateRoadmapModal;
window.handleCreateRoadmap = handleCreateRoadmap;
window.updateEndDateFromDuration = updateEndDateFromDuration;
window.openPushToTPModal = openPushToTPModal;
window.closePushToTPModal = closePushToTPModal;
window.handlePushToTP = handlePushToTP;
window.toggleAllPushItems = toggleAllPushItems;

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

async function loadDocuments(customerId) {
    const container = document.getElementById('documentsTabContainer');
    if (!container) return;

    container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">Loading documents...</div>';

    // For demo, show sample documents
    customerDocuments = generateSampleDocuments();
    renderDocumentsTab();
}

function generateSampleDocuments() {
    return [
        { id: 1, name: 'Master Service Agreement 2025.pdf', type: 'contract', size: '2.4 MB', uploadedBy: 'Corby James', uploadedAt: '2025-01-05T10:00:00' },
        { id: 2, name: 'SOW - Phase 2 Implementation.docx', type: 'sow', size: '1.1 MB', uploadedBy: 'Jane Smith', uploadedAt: '2025-01-02T14:30:00' },
        { id: 3, name: 'Q4 2024 QBR Presentation.pptx', type: 'presentation', size: '5.8 MB', uploadedBy: 'Corby James', uploadedAt: '2024-12-15T09:00:00' },
        { id: 4, name: 'Implementation Status Report.pdf', type: 'report', size: '890 KB', uploadedBy: 'Mike Johnson', uploadedAt: '2024-12-20T16:45:00' },
        { id: 5, name: 'Technical Architecture Diagram.png', type: 'other', size: '1.5 MB', uploadedBy: 'John Doe', uploadedAt: '2024-11-28T11:20:00' }
    ];
}

function renderDocumentsTab() {
    const container = document.getElementById('documentsTabContainer');
    const filterValue = document.getElementById('documentFilter')?.value || 'all';

    const filtered = filterValue === 'all'
        ? customerDocuments
        : customerDocuments.filter(d => d.type === filterValue);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-secondary text-center" style="padding: 24px;">No documents found</div>';
        return;
    }

    const typeIcons = {
        contract: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M25.7 9.3l-7-7A.91.91 0 0018 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10a.91.91 0 00-.3-.7zM18 4.4l5.6 5.6H18zM24 28H8V4h8v6a2 2 0 002 2h6z"/></svg>',
        sow: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M25.7 9.3l-7-7A.91.91 0 0018 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10a.91.91 0 00-.3-.7zM18 4.4l5.6 5.6H18zM24 28H8V4h8v6a2 2 0 002 2h6z"/><path d="M10 22h12v2H10zm0-6h12v2H10z"/></svg>',
        presentation: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M28 4H4a2 2 0 00-2 2v14a2 2 0 002 2h11v4h-4v2h10v-2h-4v-4h11a2 2 0 002-2V6a2 2 0 00-2-2zM4 20V6h24v14z"/></svg>',
        report: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M10 18H6v8h4v-8zm12-8h-4v16h4V10zm-6 6h-4v10h4V16z"/></svg>',
        other: '<svg width="20" height="20" viewBox="0 0 32 32"><path d="M25.7 9.3l-7-7A.91.91 0 0018 2H8a2 2 0 00-2 2v24a2 2 0 002 2h16a2 2 0 002-2V10a.91.91 0 00-.3-.7zM18 4.4l5.6 5.6H18zM24 28H8V4h8v6a2 2 0 002 2h6z"/></svg>'
    };

    const typeLabels = {
        contract: 'Contract',
        sow: 'SOW',
        presentation: 'Presentation',
        report: 'Report',
        other: 'Other'
    };

    container.innerHTML = `
        <div style="display: grid; gap: 12px;">
            ${filtered.map(doc => `
                <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border: 1px solid var(--cds-border-subtle-01); border-radius: 4px; cursor: pointer;" onclick="downloadDocument(${doc.id})">
                    <div style="color: var(--cds-icon-secondary);">${typeIcons[doc.type] || typeIcons.other}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${doc.name}</div>
                        <div class="text-secondary" style="font-size: 12px;">${typeLabels[doc.type]} · ${doc.size} · Uploaded by ${doc.uploadedBy}</div>
                    </div>
                    <div class="text-secondary" style="font-size: 12px; white-space: nowrap;">${formatDate(doc.uploadedAt)}</div>
                    <button class="btn btn--ghost btn--icon" onclick="event.stopPropagation(); deleteDocument(${doc.id})" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 32 32"><path d="M12 12h2v12h-2zm6 0h2v12h-2z"/><path d="M4 6v2h2v20a2 2 0 002 2h16a2 2 0 002-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/></svg>
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function filterDocuments() {
    renderDocumentsTab();
}

function openDocumentModal() {
    alert('Document upload feature - would open file picker and upload to server');
}

function downloadDocument(id) {
    const doc = customerDocuments.find(d => d.id === id);
    if (doc) {
        alert(`Would download: ${doc.name}`);
    }
}

function deleteDocument(id) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    customerDocuments = customerDocuments.filter(d => d.id !== id);
    renderDocumentsTab();
}

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
    const tasksSection = document.getElementById('tasksSection');
    const risksSection = document.getElementById('risksSection');
    const roadmapSection = document.getElementById('roadmapSection');
    const engagementsSection = document.getElementById('engagementsSection');
    const targetprocessSection = document.getElementById('targetprocessSection');
    const documentsSection = document.getElementById('documentsSection');
    const usageFrameworkSection = document.getElementById('usageFrameworkSection');
    const overviewGrid = document.querySelector('.grid.grid--2');

    // Helper to hide all tab sections
    function hideAllSections() {
        if (tasksSection) tasksSection.style.display = 'none';
        if (risksSection) risksSection.style.display = 'none';
        if (roadmapSection) roadmapSection.style.display = 'none';
        if (engagementsSection) engagementsSection.style.display = 'none';
        if (targetprocessSection) targetprocessSection.style.display = 'none';
        if (documentsSection) documentsSection.style.display = 'none';
        if (usageFrameworkSection) usageFrameworkSection.style.display = 'none';
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
            } else if (tabName === 'Documents') {
                if (documentsSection) documentsSection.style.display = 'block';
                loadDocuments(customerId);
            } else {
                // Default to overview
                if (overviewGrid) overviewGrid.style.display = 'grid';
                if (roadmapSection) roadmapSection.style.display = 'block';
            }
        });
    });
}

// Nav toggle function
function toggleNav() {
    document.getElementById('sideNav').classList.toggle('open');
}
