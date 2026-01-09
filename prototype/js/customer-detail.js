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
}

// Display roadmap timeline
function displayRoadmap(roadmap) {
    document.getElementById('noRoadmapState').style.display = 'none';
    document.getElementById('roadmapContent').style.display = 'block';
    document.getElementById('roadmapTimeframe').style.display = 'inline-block';
    document.getElementById('addRoadmapItemBtn').style.display = 'inline-flex';

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
            <div style="display: grid; grid-template-columns: 150px repeat(${gridCols}, 1fr); gap: 4px; margin-bottom: 8px; align-items: center;">
                <div style="font-weight: 500; font-size: 13px; padding: 8px 0;">${categoryLabels[cat]}</div>
        `;

        // Create a map of quarter to items for this category
        const quarterItems = {};
        categories[cat].forEach(item => {
            const q = item.target_quarter;
            if (!quarterItems[q]) quarterItems[q] = [];
            quarterItems[q].push(item);
        });

        // Render items in their quarters
        quarters.forEach((quarter, index) => {
            const qItems = quarterItems[quarter] || [];
            if (qItems.length > 0) {
                qItems.forEach(item => {
                    const colStart = index + 2; // +2 because col 1 is category label
                    const bgColor = getRoadmapItemColor(item.status);
                    const textColor = item.status === 'delayed' ? '#161616' : 'white';

                    html += `
                        <div style="grid-column: ${colStart} / ${colStart + 1}; background: ${bgColor}; color: ${textColor}; padding: 8px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;"
                             onclick="editRoadmapItem(${item.id})"
                             title="${item.title} - ${getRoadmapStatusLabel(item.status)}${item.progress_percent > 0 ? ' (' + item.progress_percent + '%)' : ''}">
                            <div style="font-weight: 500;">${truncateText(item.title, 25)}</div>
                            <div style="opacity: 0.8; font-size: 10px;">${getRoadmapStatusLabel(item.status)}</div>
                        </div>
                    `;
                });
            }
        });

        html += '</div>';
    });

    container.innerHTML = html;
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

    // Hide delete button for new items
    document.getElementById('roadmapItemDeleteBtn').style.display = 'none';

    // Update quarter options based on current roadmap
    updateQuarterOptions();

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

    // Show delete button for existing items
    document.getElementById('roadmapItemDeleteBtn').style.display = 'block';

    // Update quarter options and select current quarter
    updateQuarterOptions();
    document.getElementById('roadmapItemQuarter').value = item.target_quarter;

    document.getElementById('roadmapItemModal').classList.add('open');
}

// Handle roadmap item form submit
async function handleRoadmapItemSubmit(event) {
    event.preventDefault();

    const itemId = document.getElementById('roadmapItemId').value;
    const isEdit = !!itemId;

    const quarter = document.getElementById('roadmapItemQuarter').value;
    const yearMatch = quarter.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    const data = {
        title: document.getElementById('roadmapItemTitle').value,
        description: document.getElementById('roadmapItemDescription').value || null,
        category: document.getElementById('roadmapItemCategory').value,
        status: document.getElementById('roadmapItemStatus').value,
        target_quarter: quarter,
        target_year: targetYear,
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

// Expose functions to window for onclick handlers
window.openRoadmapItemModal = openRoadmapItemModal;
window.closeRoadmapItemModal = closeRoadmapItemModal;
window.editRoadmapItem = editRoadmapItem;
window.handleRoadmapItemSubmit = handleRoadmapItemSubmit;
window.deleteRoadmapItem = deleteRoadmapItem;
window.openCreateRoadmapModal = openCreateRoadmapModal;
window.closeCreateRoadmapModal = closeCreateRoadmapModal;
window.handleCreateRoadmap = handleCreateRoadmap;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    loadCustomerDetail();

    // Load roadmap after customer loads
    const customerId = getCustomerId();
    if (customerId) {
        loadRoadmap(customerId);
    }
});

// Nav toggle function
function toggleNav() {
    document.getElementById('sideNav').classList.toggle('open');
}
