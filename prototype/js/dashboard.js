/**
 * Dashboard - Load and display data from API
 */

document.addEventListener('DOMContentLoaded', async function() {
    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        // Load customers, tasks, and engagements in parallel
        const [customersData, tasksData] = await Promise.all([
            API.CustomerAPI.getAll(),
            API.TaskAPI.getAll(),
        ]);

        const customers = customersData.items || [];
        const tasks = tasksData.items || [];

        // Update KPI cards
        updateKPICards(customers, tasks);

        // Update health distribution chart
        updateHealthDistribution(customers);

        // Update upcoming renewals
        updateUpcomingRenewals(customers);

        // Update tasks
        updateTasksList(tasks);

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

function updateTasksList(tasks) {
    const tasksCard = document.getElementById('tasks-card');
    if (!tasksCard) return;

    const tasksList = tasksCard.querySelector('.flex.flex-column.gap-3');
    if (!tasksList) return;

    // Filter to open tasks and sort by due date
    const openTasks = tasks
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
        .map(t => ({
            ...t,
            daysUntilDue: t.due_date ? Utils.calculateDaysUntil(t.due_date) : null,
        }))
        .sort((a, b) => {
            if (a.daysUntilDue === null) return 1;
            if (b.daysUntilDue === null) return -1;
            return a.daysUntilDue - b.daysUntilDue;
        })
        .slice(0, 5);

    if (openTasks.length === 0) {
        tasksList.innerHTML = '<div class="text-secondary" style="padding: 16px;">No open tasks</div>';
        return;
    }

    tasksList.innerHTML = openTasks.map(task => {
        const isOverdue = task.daysUntilDue !== null && task.daysUntilDue < 0;
        const isDueToday = task.daysUntilDue === 0;
        const notificationClass = isOverdue ? 'notification notification--error' : (isDueToday ? 'notification notification--warning' : '');
        const bgStyle = notificationClass ? '' : 'background: var(--cds-layer-02);';

        let dueText = '';
        if (task.due_date) {
            if (isOverdue) {
                dueText = `Overdue by ${Math.abs(task.daysUntilDue)} day${Math.abs(task.daysUntilDue) !== 1 ? 's' : ''}`;
            } else if (isDueToday) {
                dueText = 'Due today';
            } else {
                dueText = `Due in ${task.daysUntilDue} day${task.daysUntilDue !== 1 ? 's' : ''}`;
            }
        }

        return `
            <div class="${notificationClass}" style="padding: 12px; ${bgStyle}">
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${task.title}</div>
                    <div class="text-secondary" style="font-size: 12px;">${dueText}</div>
                </div>
            </div>
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

// Make completeTask available globally
window.completeTask = completeTask;
