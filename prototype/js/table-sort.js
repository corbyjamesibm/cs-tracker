/**
 * Table Sorting Utility
 * Adds click-to-sort functionality to table columns
 */

const TableSort = {
    // Track sort state per table
    sortState: {},

    /**
     * Initialize sortable columns for a table
     * @param {string} tableId - The table element ID
     * @param {number[]} sortableColumns - Array of column indices that should be sortable (0-based)
     */
    init(tableId, sortableColumns = null) {
        const table = document.getElementById(tableId);
        if (!table) {
            console.warn(`TableSort: Table #${tableId} not found`);
            return;
        }

        const headers = table.querySelectorAll('thead th');

        headers.forEach((th, index) => {
            // Skip if sortableColumns specified and this column isn't in the list
            if (sortableColumns && !sortableColumns.includes(index)) return;

            // Skip empty headers (like action columns)
            if (!th.textContent.trim()) return;

            // Skip if already has onclick handler for sorting
            if (th.classList.contains('sortable')) return;

            th.classList.add('sortable');
            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';

            // Add sort icon if not present
            if (!th.querySelector('.sort-icon')) {
                const icon = document.createElement('span');
                icon.className = 'sort-icon';
                icon.innerHTML = ' <svg width="12" height="12" viewBox="0 0 32 32" style="vertical-align: middle; opacity: 0.5;"><path d="M16 4L6 14h20L16 4zm0 24l10-10H6l10 10z" fill="currentColor"/></svg>';
                th.appendChild(icon);
            }

            th.addEventListener('click', () => this.sortTable(tableId, index));
        });

        // Initialize sort state
        if (!this.sortState[tableId]) {
            this.sortState[tableId] = { column: null, direction: 'asc' };
        }
    },

    /**
     * Sort table by column
     * @param {string} tableId - The table element ID
     * @param {number} columnIndex - Column index to sort by
     */
    sortTable(tableId, columnIndex) {
        const table = document.getElementById(tableId);
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Skip if only one row or no data rows
        if (rows.length <= 1) return;

        // Determine sort direction
        const state = this.sortState[tableId];
        let direction = 'asc';
        if (state.column === columnIndex) {
            direction = state.direction === 'asc' ? 'desc' : 'asc';
        }

        // Update state
        this.sortState[tableId] = { column: columnIndex, direction };

        // Sort rows
        rows.sort((a, b) => {
            const cellA = a.cells[columnIndex];
            const cellB = b.cells[columnIndex];

            if (!cellA || !cellB) return 0;

            let valueA = this.getCellValue(cellA);
            let valueB = this.getCellValue(cellB);

            // Compare values
            let comparison = 0;
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                comparison = valueA - valueB;
            } else {
                comparison = String(valueA).localeCompare(String(valueB), undefined, {
                    numeric: true,
                    sensitivity: 'base'
                });
            }

            return direction === 'asc' ? comparison : -comparison;
        });

        // Re-append rows in sorted order
        rows.forEach(row => tbody.appendChild(row));

        // Update header icons
        this.updateSortIcons(table, columnIndex, direction);
    },

    /**
     * Extract sortable value from a cell
     * @param {HTMLTableCellElement} cell
     * @returns {string|number}
     */
    getCellValue(cell) {
        // Check for data-sort-value attribute first
        if (cell.dataset.sortValue !== undefined) {
            const val = cell.dataset.sortValue;
            return isNaN(val) ? val : parseFloat(val);
        }

        let text = cell.textContent.trim();

        // Handle currency values
        if (text.match(/^\$[\d,.]+$/)) {
            return parseFloat(text.replace(/[$,]/g, ''));
        }

        // Handle percentages
        if (text.match(/^\d+(\.\d+)?%$/)) {
            return parseFloat(text.replace('%', ''));
        }

        // Handle dates (various formats)
        const dateMatch = text.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/);
        if (dateMatch) {
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const monthIndex = months.indexOf(dateMatch[1]);
            if (monthIndex >= 0) {
                return new Date(dateMatch[3], monthIndex, dateMatch[2]).getTime();
            }
        }

        // Try parsing as number
        const num = parseFloat(text.replace(/,/g, ''));
        if (!isNaN(num) && text.match(/^-?[\d,.]+$/)) {
            return num;
        }

        // Default to lowercase text for string comparison
        return text.toLowerCase();
    },

    /**
     * Update sort indicator icons in headers
     * @param {HTMLTableElement} table
     * @param {number} activeColumn
     * @param {string} direction
     */
    updateSortIcons(table, activeColumn, direction) {
        const headers = table.querySelectorAll('thead th');

        headers.forEach((th, index) => {
            const icon = th.querySelector('.sort-icon svg');
            if (!icon) return;

            if (index === activeColumn) {
                icon.style.opacity = '1';
                // Rotate icon based on direction
                if (direction === 'desc') {
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    icon.style.transform = 'rotate(0deg)';
                }
            } else {
                icon.style.opacity = '0.5';
                icon.style.transform = 'rotate(0deg)';
            }
        });
    },

    /**
     * Re-initialize sorting after table content changes (e.g., after loading data)
     * @param {string} tableId
     * @param {number[]} sortableColumns
     */
    refresh(tableId, sortableColumns = null) {
        // Re-apply current sort if one was active
        const state = this.sortState[tableId];
        if (state && state.column !== null) {
            // Temporarily flip direction so sortTable will restore it
            state.direction = state.direction === 'asc' ? 'desc' : 'asc';
            this.sortTable(tableId, state.column);
        }
    }
};

// Export for use in other scripts
window.TableSort = TableSort;
