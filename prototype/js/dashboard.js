/**
 * Dashboard - Load and display data from API
 */

document.addEventListener('DOMContentLoaded', async function() {
    // Check auth and redirect if needed
    if (await Auth.checkAuthAndRedirect()) {
        Auth.updateUserDisplay();
        await loadDashboardData();
    }
});

async function loadDashboardData() {
    try {
        // Load customers, tasks, risks, and engagements in parallel
        const [customersData, tasksData, risksData, engagementsData] = await Promise.all([
            API.CustomerAPI.getAll(),
            API.TaskAPI.getAll(),
            API.RiskAPI.getAll({ open_only: true }),
            API.EngagementAPI.getAll({ limit: 20 }),
        ]);

        const customers = customersData.items || [];
        const tasks = tasksData.items || [];
        const risks = risksData.items || [];
        const engagements = engagementsData.items || engagementsData || [];

        // Update KPI cards
        updateKPICards(customers, tasks);

        // Update health distribution chart
        updateHealthDistribution(customers);

        // Update upcoming renewals
        updateUpcomingRenewals(customers);

        // Update tasks (pass customers for linking)
        updateTasksList(tasks, customers);

        // Update risk alerts
        updateRiskAlerts(risks, customers);

        // Update recent activity
        updateRecentActivity(engagements, tasks, customers);

    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showErrorMessage('Failed to load dashboard data. Please check that the backend is running.');
    }
}

function updateKPICards(customers, tasks) {
    const metricCards = document.querySelectorAll('.metric-card');

    // Total customers (first card)
    if (metricCards[0]) {
        const valueEl = metricCards[0].querySelector('.metric-card__value');
        if (valueEl) valueEl.textContent = customers.length;
    }

    // Total ARR (second card)
    const totalARR = customers.reduce((sum, c) => sum + (parseFloat(c.arr) || 0), 0);
    if (metricCards[1]) {
        const valueEl = metricCards[1].querySelector('.metric-card__value');
        if (valueEl) valueEl.textContent = Utils.formatCurrency(totalARR);
    }

    // At-risk ARR (third card)
    const atRiskCustomers = customers.filter(c => c.health_status === 'red' || c.health_status === 'yellow');
    const atRiskARR = atRiskCustomers.reduce((sum, c) => sum + (parseFloat(c.arr) || 0), 0);
    if (metricCards[2]) {
        const valueEl = metricCards[2].querySelector('.metric-card__value');
        const trendEl = metricCards[2].querySelector('.metric-card__trend');
        if (valueEl) valueEl.textContent = Utils.formatCurrency(atRiskARR);
        if (trendEl) trendEl.textContent = `${atRiskCustomers.length} customer${atRiskCustomers.length !== 1 ? 's' : ''}`;
    }

    // Open tasks (fourth card)
    const openTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
    if (metricCards[3]) {
        const valueEl = metricCards[3].querySelector('.metric-card__value');
        if (valueEl) valueEl.textContent = openTasks;
    }
}

function updateHealthDistribution(customers) {
    const healthCounts = {
        green: customers.filter(c => c.health_status === 'green').length,
        yellow: customers.filter(c => c.health_status === 'yellow').length,
        red: customers.filter(c => c.health_status === 'red').length,
    };

    const total = customers.length || 1;

    // Update the donut chart center
    const donutValue = document.querySelector('.donut-chart__value');
    if (donutValue) {
        donutValue.textContent = total;
    }

    // Update donut chart gradient
    const donutChart = document.querySelector('.donut-chart');
    if (donutChart) {
        const greenDeg = (healthCounts.green / total) * 360;
        const yellowDeg = greenDeg + (healthCounts.yellow / total) * 360;
        donutChart.style.background = `conic-gradient(var(--health-green) 0deg ${greenDeg}deg, var(--health-yellow) ${greenDeg}deg ${yellowDeg}deg, var(--health-red) ${yellowDeg}deg 360deg)`;
    }

    // Update legend counts
    const legend = document.querySelector('.legend');
    if (legend) {
        legend.innerHTML = `
            <div class="legend__item">
                <div class="legend__color legend__color--green"></div>
                <span>Healthy (${healthCounts.green})</span>
            </div>
            <div class="legend__item">
                <div class="legend__color legend__color--yellow"></div>
                <span>At Risk (${healthCounts.yellow})</span>
            </div>
            <div class="legend__item">
                <div class="legend__color legend__color--red"></div>
                <span>Critical (${healthCounts.red})</span>
            </div>
        `;
    }
}

function updateUpcomingRenewals(customers) {
    const renewalsCard = document.getElementById('renewals-card');
    if (!renewalsCard) return;

    const renewalsList = renewalsCard.querySelector('.flex.flex-column.gap-3');
    if (!renewalsList) return;

    // Filter and sort customers by renewal date
    const customersWithRenewals = customers
        .filter(c => c.renewal_date)
        .map(c => ({
            ...c,
            daysUntilRenewal: Utils.calculateDaysUntil(c.renewal_date),
        }))
        .filter(c => c.daysUntilRenewal !== null && c.daysUntilRenewal <= 180) // Next 6 months
        .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
        .slice(0, 5);

    if (customersWithRenewals.length === 0) {
        renewalsList.innerHTML = '<div class="text-secondary" style="padding: 16px;">No upcoming renewals in the next 6 months</div>';
        return;
    }

    renewalsList.innerHTML = customersWithRenewals.map(customer => `
        <div class="flex flex-between flex-center" style="padding: 8px 0; border-bottom: 1px solid var(--cds-border-subtle-01);">
            <div>
                <div style="font-weight: 500;">${customer.name}</div>
                <div class="text-secondary" style="font-size: 12px;">${Utils.formatCurrency(customer.arr)} ARR</div>
            </div>
            <div class="flex gap-3 flex-center">
                <span class="tag ${Utils.getHealthStatusClass(customer.health_status)}">${Utils.getHealthStatusLabel(customer.health_status)}</span>
                <span class="${customer.daysUntilRenewal <= 30 ? 'text-danger' : ''}" style="font-size: 13px; min-width: 55px;">${customer.daysUntilRenewal} days</span>
            </div>
        </div>
    `).join('');
}

function updateTasksList(tasks, customers) {
    const tasksList = document.getElementById('tasks-list');
    if (!tasksList) return;

    // Create customer lookup map
    const customerMap = {};
    if (customers) {
        customers.forEach(c => customerMap[c.id] = c);
    }

    // Filter to open tasks and sort by due date
    const openTasks = tasks
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        .map(t => ({
            ...t,
            daysUntilDue: t.due_date ? Utils.calculateDaysUntil(t.due_date) : null,
            customer: customerMap[t.customer_id] || null,
        }))
        .sort((a, b) => {
            // Sort by overdue first, then by due date
            if (a.daysUntilDue === null) return 1;
            if (b.daysUntilDue === null) return -1;
            return a.daysUntilDue - b.daysUntilDue;
        })
        .slice(0, 5);

    if (openTasks.length === 0) {
        tasksList.innerHTML = '<div class="text-secondary" style="padding: 16px; text-align: center;">No open tasks</div>';
        return;
    }

    tasksList.innerHTML = openTasks.map(task => {
        const isOverdue = task.daysUntilDue !== null && task.daysUntilDue < 0;
        const isDueToday = task.daysUntilDue === 0;
        const isDueSoon = task.daysUntilDue !== null && task.daysUntilDue > 0 && task.daysUntilDue <= 3;

        // Determine styling based on urgency
        let borderColor = 'var(--cds-border-subtle-01)';
        let bgColor = 'var(--cds-layer-02)';
        if (isOverdue) {
            borderColor = 'var(--cds-support-error)';
            bgColor = 'rgba(218, 30, 40, 0.1)';
        } else if (isDueToday) {
            borderColor = 'var(--cds-support-warning)';
            bgColor = 'rgba(244, 182, 8, 0.1)';
        } else if (isDueSoon) {
            borderColor = 'var(--cds-support-info)';
        }

        // Priority badge
        const priorityColors = {
            urgent: 'tag--red',
            high: 'tag--orange',
            medium: 'tag--blue',
            low: 'tag--gray'
        };
        const priorityClass = priorityColors[task.priority] || 'tag--gray';

        let dueText = '';
        if (task.due_date) {
            if (isOverdue) {
                dueText = `Overdue by ${Math.abs(task.daysUntilDue)} day${Math.abs(task.daysUntilDue) !== 1 ? 's' : ''}`;
            } else if (isDueToday) {
                dueText = 'Due today';
            } else {
                dueText = `Due in ${task.daysUntilDue} day${task.daysUntilDue !== 1 ? 's' : ''}`;
            }
        } else {
            dueText = 'No due date';
        }

        const customerName = task.customer ? task.customer.name : '';
        const customerLink = task.customer_id ? `customer-detail.html?id=${task.customer_id}` : '#';

        return `
            <div style="padding: 12px; background: ${bgColor}; border-left: 3px solid ${borderColor}; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span class="tag ${priorityClass}" style="font-size: 10px; padding: 2px 6px;">${task.priority}</span>
                            ${isOverdue ? '<span style="color: var(--cds-support-error); font-size: 11px; font-weight: 500;">OVERDUE</span>' : ''}
                        </div>
                        <div style="font-weight: 500; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${task.title}</div>
                        <div class="text-secondary" style="font-size: 12px;">
                            ${dueText}
                            ${customerName ? ` · <a href="${customerLink}" style="color: var(--cds-link-primary); text-decoration: none;">${customerName}</a>` : ''}
                        </div>
                    </div>
                    <button class="btn btn--ghost btn--sm" onclick="completeTask(${task.id})" title="Mark Complete" style="padding: 4px; min-height: auto;">
                        <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M14 21.5l-5-4.96L7.59 18 14 24.35 25.41 13 24 11.59 14 21.5z"/></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateRiskAlerts(risks, customers) {
    const riskAlertsList = document.getElementById('risk-alerts-list');
    const riskAlertsCount = document.getElementById('risk-alerts-count');

    if (!riskAlertsList) return;

    // Create a customer lookup map
    const customerMap = {};
    customers.forEach(c => customerMap[c.id] = c);

    // Filter to high/critical severity risks and sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const alertRisks = risks
        .filter(r => r.severity === 'critical' || r.severity === 'high' || r.severity === 'medium')
        .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
        .slice(0, 5);

    // Update count badge
    if (riskAlertsCount) {
        const criticalHighCount = risks.filter(r => r.severity === 'critical' || r.severity === 'high').length;
        if (criticalHighCount > 0) {
            riskAlertsCount.textContent = criticalHighCount;
            riskAlertsCount.style.display = 'inline-block';
        } else {
            riskAlertsCount.style.display = 'none';
        }
    }

    if (alertRisks.length === 0) {
        riskAlertsList.innerHTML = '<div class="text-secondary" style="padding: 16px; text-align: center;">No open risks</div>';
        return;
    }

    riskAlertsList.innerHTML = alertRisks.map(risk => {
        const customer = customerMap[risk.customer_id];
        const customerName = customer ? customer.name : 'Unknown Customer';
        const isCriticalOrHigh = risk.severity === 'critical' || risk.severity === 'high';
        const notificationClass = isCriticalOrHigh ? 'notification--error' : 'notification--warning';
        const iconColor = isCriticalOrHigh ? 'var(--cds-support-error)' : '#8e6a00';
        const iconPath = isCriticalOrHigh
            ? 'M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm-1 7h2v10h-2V9zm1 16c-.8 0-1.5-.7-1.5-1.5S15.2 22 16 22s1.5.7 1.5 1.5S16.8 25 16 25z'
            : 'M16 2L1 29h30L16 2zm-1 10h2v8h-2v-8zm1 14c-.8 0-1.5-.7-1.5-1.5S15.2 23 16 23s1.5.7 1.5 1.5S16.8 26 16 26z';

        const categoryLabel = Utils.getRiskCategoryLabel ? Utils.getRiskCategoryLabel(risk.category) : (risk.category || '');
        const severityLabel = Utils.getRiskSeverityLabel ? Utils.getRiskSeverityLabel(risk.severity) : risk.severity;

        return `
            <a href="customer-detail.html?id=${risk.customer_id}" class="notification ${notificationClass}" style="text-decoration: none; cursor: pointer;">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="${iconColor}"><path d="${iconPath}"/></svg>
                <div>
                    <div style="font-weight: 500;">${customerName} - ${risk.title}</div>
                    <div class="text-secondary" style="font-size: 12px;">${severityLabel} | ${categoryLabel}</div>
                </div>
            </a>
        `;
    }).join('');
}

async function completeTask(taskId) {
    try {
        await API.TaskAPI.complete(taskId);
        // Reload dashboard data
        await loadDashboardData();
    } catch (error) {
        console.error('Failed to complete task:', error);
        alert('Failed to complete task. Please try again.');
    }
}

function showErrorMessage(message) {
    // Could show a toast notification here
    console.error(message);
}

function updateRecentActivity(engagements, tasks, customers) {
    const activityTimeline = document.getElementById('activity-timeline');
    if (!activityTimeline) return;

    // Create customer lookup map
    const customerMap = {};
    customers.forEach(c => customerMap[c.id] = c);

    // Build activity items from engagements and completed tasks
    const activityItems = [];

    // Add engagements
    engagements.forEach(e => {
        const customer = customerMap[e.customer_id];
        const customerName = customer ? customer.name : 'Unknown Customer';
        const typeLabels = {
            'call': 'Call',
            'email': 'Email',
            'meeting': 'Meeting',
            'qbr': 'QBR',
            'onsite': 'Onsite Visit',
            'support': 'Support',
            'training': 'Training',
            'other': 'Engagement'
        };
        const typeLabel = typeLabels[e.engagement_type] || 'Engagement';

        activityItems.push({
            date: new Date(e.engagement_date || e.created_at),
            type: 'engagement',
            content: `<strong>${typeLabel}:</strong> ${e.subject || e.notes || 'No subject'} with <a href="customer-detail.html?id=${e.customer_id}" style="color: var(--cds-link-primary);">${customerName}</a>`,
        });
    });

    // Add completed tasks
    tasks.filter(t => t.status === 'completed').forEach(t => {
        const customer = customerMap[t.customer_id];
        const customerName = customer ? customer.name : '';

        activityItems.push({
            date: new Date(t.completed_at || t.updated_at),
            type: 'task',
            content: `<strong>Task Completed:</strong> ${t.title}${customerName ? ` for <a href="customer-detail.html?id=${t.customer_id}" style="color: var(--cds-link-primary);">${customerName}</a>` : ''}`,
        });
    });

    // Sort by date descending and take top 8
    activityItems.sort((a, b) => b.date - a.date);
    const recentActivity = activityItems.slice(0, 8);

    if (recentActivity.length === 0) {
        activityTimeline.innerHTML = '<div class="text-secondary" style="padding: 16px; text-align: center;">No recent activity</div>';
        return;
    }

    activityTimeline.innerHTML = recentActivity.map(item => {
        const formattedDate = formatActivityDate(item.date);
        return `
            <div class="timeline__item">
                <div class="timeline__date">${formattedDate}</div>
                <div class="timeline__content">${item.content}</div>
            </div>
        `;
    }).join('');
}

function formatActivityDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (diffDays === 0) {
        return `Today, ${timeStr}`;
    } else if (diffDays === 1) {
        return `Yesterday, ${timeStr}`;
    } else if (diffDays < 7) {
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        return `${dayName}, ${timeStr}`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ${timeStr}`;
    }
}

// Make completeTask available globally
window.completeTask = completeTask;
