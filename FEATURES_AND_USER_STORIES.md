# Features and User Stories
## Customer Status Tracker

**Generated from:** PRD v1.6
**Date:** January 8, 2026

---

## Table of Contents
1. [Epic 1: Customer Management](#epic-1-customer-management)
2. [Epic 2: Dashboard & Portfolio Views](#epic-2-dashboard--portfolio-views)
3. [Epic 3: Task & Reminder Management](#epic-3-task--reminder-management)
4. [Epic 4: Customer Usage Framework](#epic-4-customer-usage-framework)
5. [Epic 5: Health Scoring](#epic-5-health-scoring)
6. [Epic 6: Engagement Logging](#epic-6-engagement-logging)
7. [Epic 7: Partner Portal](#epic-7-partner-portal)
8. [Epic 8: Salesforce Integration](#epic-8-salesforce-integration)
9. [Epic 9: Gainsight Integration](#epic-9-gainsight-integration)
10. [Epic 10: TargetProcess Integration](#epic-10-targetprocess-integration)
11. [Epic 11: Outlook Integration](#epic-11-outlook-integration)
12. [Epic 12: Excel Integration](#epic-12-excel-integration)
13. [Epic 13: PowerPoint Export](#epic-13-powerpoint-export)
14. [Epic 14: Custom Fields](#epic-14-custom-fields)
15. [Epic 15: User Management & Roles](#epic-15-user-management--roles)
16. [Epic 16: Responsive Design (Desktop & Mobile)](#epic-16-responsive-design-desktop--mobile)

---

## Epic 1: Customer Management

### Feature 1.1: Customer Profile Page
**Description:** A single-page view consolidating all key customer information.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-1.1.1 | As a CSM, I want to view a customer's complete profile on a single page, so that I can quickly understand their status without navigating multiple screens. | P0 | - Profile displays customer header with name, logo, health score badge, CSM owner, last contact date<br>- All sections load within 2 seconds |
| US-1.1.2 | As a CSM, I want to see the customer's required fields (Name, Salesforce ID, Account Manager, CSM, Products Owned), so that I have the essential information for compliance. | P0 | - All 5 required fields are displayed prominently<br>- Salesforce ID links to Salesforce record |
| US-1.1.3 | As a CSM, I want to see a customer's health section showing current score and trend, so that I can assess their risk level at a glance. | P0 | - Health score displayed as Red/Yellow/Green badge<br>- Trend indicator shows improving/stable/declining |
| US-1.1.4 | As a CSM, I want to view a customer's financials including ARR/MRR and renewal date, so that I understand their revenue impact. | P0 | - ARR/MRR displayed with currency formatting<br>- Renewal date shows countdown (days remaining) |
| US-1.1.5 | As a CSM, I want to see a chronological engagement timeline, so that I can review all past interactions. | P0 | - Timeline shows all engagements in reverse chronological order<br>- Each entry shows date, type, author, and summary |
| US-1.1.6 | As a CSM, I want to view open action items for a customer, so that I know what tasks are pending. | P0 | - Open tasks displayed with due date, assignee, and status<br>- Overdue tasks highlighted in red |
| US-1.1.7 | As a CSM, I want to see key contacts for a customer, so that I know who to reach out to. | P1 | - Contacts display name, role, email, and phone<br>- Primary contact is highlighted |
| US-1.1.8 | As a CSM, I want to access linked documents for a customer, so that I can reference contracts and resources. | P1 | - Documents section shows linked files with names and types<br>- Clicking opens document in new tab |

### Feature 1.2: Customer List
**Description:** Searchable, filterable list of all customers.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-1.2.1 | As a CSM, I want to view a list of all my assigned customers, so that I can see my portfolio at a glance. | P0 | - List shows all customers assigned to logged-in user<br>- Default sort by customer name |
| US-1.2.2 | As a CSM, I want to sort the customer list by different columns, so that I can organize data meaningfully. | P0 | - Sortable by: Name, Health, ARR, Renewal Date, Last Contact<br>- Click column header to toggle sort direction |
| US-1.2.3 | As a CSM, I want to filter the customer list by health status, so that I can focus on at-risk accounts. | P0 | - Filter options: All, Red, Yellow, Green<br>- Filter persists during session |
| US-1.2.4 | As a CSM, I want to search for customers by name, so that I can quickly find a specific account. | P0 | - Search box with type-ahead<br>- Results update as user types (debounced) |
| US-1.2.5 | As a CSM, I want to add custom fields as columns in the customer list, so that I can see relevant data. | P1 | - Column picker allows adding/removing custom field columns<br>- Column selection persists per user |
| US-1.2.6 | As a CSM, I want to save my filter and column configurations as views, so that I can quickly switch between them. | P1 | - Save current view with custom name<br>- Load saved views from dropdown |

---

## Epic 2: Dashboard & Portfolio Views

### Feature 2.1: Portfolio Dashboard
**Description:** Overview of all customers for quick health assessment.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-2.1.1 | As a CSM, I want to see a portfolio overview dashboard when I log in, so that I can assess my book of business. | P0 | - Dashboard is the default landing page<br>- Shows summary metrics for assigned customers |
| US-2.1.2 | As a CSM, I want to see a health distribution chart, so that I can visualize portfolio risk. | P0 | - Donut chart showing count by Red/Yellow/Green<br>- Clicking a segment filters customer list |
| US-2.1.3 | As a CSM, I want to see upcoming renewals in the next 30/60/90 days, so that I can prioritize renewal activities. | P0 | - List of renewals with customer name, date, and ARR<br>- Grouped by 30/60/90 day buckets |
| US-2.1.4 | As a CSM, I want to see my upcoming and overdue tasks, so that I know what needs attention. | P0 | - Tasks grouped by: Overdue, Due Today, Due This Week<br>- Count badges for each group |
| US-2.1.5 | As a CSM, I want to see risk alerts for flagged customers, so that I can take proactive action. | P0 | - Alert cards for customers with health changes or risk indicators<br>- Click to navigate to customer profile |
| US-2.1.6 | As a CSM, I want to see recent activity across my customers, so that I stay informed of changes. | P1 | - Activity feed showing recent engagements, task completions, health changes<br>- Filterable by activity type |

### Feature 2.2: Management Dashboard
**Description:** Executive-level views and KPIs for leadership.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-2.2.1 | As a CS Manager, I want to see an executive dashboard with portfolio KPIs, so that I can report to leadership. | P0 | - Total ARR, customer count, health distribution<br>- Renewal pipeline summary |
| US-2.2.2 | As a CS Manager, I want to see health score trends over 30/60/90 days, so that I can identify patterns. | P0 | - Line chart showing health distribution over time<br>- Tooltip shows values on hover |
| US-2.2.3 | As a CS Manager, I want to see a renewal forecast timeline, so that I can predict revenue retention. | P0 | - Timeline visualization of renewals by month<br>- Color-coded by health status |
| US-2.2.4 | As a CS Manager, I want to see team activity metrics by CSM, so that I can monitor team performance. | P1 | - Table showing engagements, tasks completed, health changes per CSM<br>- Sortable columns |
| US-2.2.5 | As a CS Manager, I want to see an at-risk report with all Red/Yellow customers, so that I can manage escalations. | P0 | - List of at-risk customers with reasons and assigned CSM<br>- Exportable to Excel/PowerPoint |
| US-2.2.6 | As a CS Manager, I want to see ARR breakdown by health status, so that I understand revenue at risk. | P0 | - Stacked bar chart showing ARR by Red/Yellow/Green<br>- Percentage and absolute values |

### Feature 2.3: Custom Reports
**Description:** User-configurable reports with drag-and-drop builder.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-2.3.1 | As a CS Manager, I want to create custom reports by selecting fields and filters, so that I can analyze specific data. | P2 | - Drag-and-drop field selection<br>- Preview updates in real-time |
| US-2.3.2 | As a CS Manager, I want to save custom reports for reuse, so that I don't have to recreate them. | P2 | - Save report with name and description<br>- Reports appear in Reports menu |
| US-2.3.3 | As a CS Manager, I want to schedule reports to run automatically, so that I receive them without manual effort. | P2 | - Schedule options: Daily, Weekly, Monthly<br>- Delivered via email or SharePoint |

---

## Epic 3: Task & Reminder Management

### Feature 3.1: Task Creation & Management
**Description:** Create and manage customer-related tasks.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-3.1.1 | As a CSM, I want to create a task for a customer, so that I can track follow-up actions. | P0 | - Task form with: Title, Description, Due Date, Assignee, Customer<br>- Task saved and appears in task list |
| US-3.1.2 | As a CSM, I want to set a priority on tasks, so that I can focus on urgent items. | P0 | - Priority options: Low, Medium, High, Urgent<br>- Priority displayed with visual indicator |
| US-3.1.3 | As a CSM, I want to assign tasks to myself or other team members, so that work is distributed. | P0 | - User picker for assignee field<br>- Assignee receives notification |
| US-3.1.4 | As a CSM, I want to mark a task as complete with optional notes, so that I can track outcomes. | P0 | - Complete button with optional outcome notes<br>- Completion timestamp and user recorded |
| US-3.1.5 | As a CSM, I want to edit a task's details, so that I can update information as needed. | P0 | - Edit form pre-filled with existing data<br>- Changes saved and audit logged |
| US-3.1.6 | As a CSM, I want to delete a task, so that I can remove items created in error. | P1 | - Delete with confirmation dialog<br>- Soft delete (recoverable by admin) |

### Feature 3.2: Task Views
**Description:** Different ways to view and filter tasks.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-3.2.1 | As a CSM, I want to view all my assigned tasks, so that I can manage my workload. | P0 | - "My Tasks" view shows tasks assigned to current user<br>- Grouped by status (Open, Completed) |
| US-3.2.2 | As a CSM, I want to view tasks by customer, so that I can see all actions for one account. | P0 | - Filter or navigate to customer-specific task list<br>- Accessible from customer profile |
| US-3.2.3 | As a CSM, I want to view overdue tasks, so that I can prioritize catching up. | P0 | - Overdue filter shows tasks past due date<br>- Sorted by days overdue |
| US-3.2.4 | As a CS Manager, I want to view all team tasks, so that I can monitor team workload. | P1 | - "Team Tasks" view shows all tasks for team members<br>- Filterable by assignee |
| US-3.2.5 | As a CSM, I want to view upcoming tasks for the week, so that I can plan my time. | P0 | - Calendar or list view of tasks due in next 7 days<br>- Grouped by day |

### Feature 3.3: Reminders
**Description:** Notification system for task due dates.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-3.3.1 | As a CSM, I want to receive a reminder when a task is due, so that I don't miss deadlines. | P0 | - Email notification sent on due date<br>- In-app notification appears |
| US-3.3.2 | As a CSM, I want to receive a reminder before a task is due, so that I have time to prepare. | P1 | - Configurable reminder lead time (1 day, 3 days, 1 week)<br>- User preference setting |
| US-3.3.3 | As a CSM, I want to snooze a reminder, so that I can defer it to a better time. | P1 | - Snooze options: 1 hour, 1 day, 1 week, custom<br>- Snoozed reminder reappears at specified time |
| US-3.3.4 | As a CSM, I want to configure my notification preferences, so that I receive alerts in my preferred channel. | P1 | - Settings for: In-app, Email, both, none<br>- Preferences saved per user |

---

## Epic 4: Customer Usage Framework

### Feature 4.1: Adoption Journey Tracking
**Description:** Track customer progress through adoption stages.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-4.1.1 | As a CSM, I want to see a customer's current adoption stage, so that I understand where they are in their journey. | P0 | - Visual progress indicator showing 5 stages<br>- Current stage highlighted |
| US-4.1.2 | As a CSM, I want to update a customer's adoption stage, so that I can track their progress. | P0 | - Dropdown to select new stage<br>- Stage change logged with timestamp and user |
| US-4.1.3 | As a CSM, I want to add notes when changing adoption stage, so that I can document the reason. | P0 | - Notes field when updating stage<br>- Notes saved and visible in history |
| US-4.1.4 | As a CSM, I want to see when a customer entered their current stage, so that I know how long they've been there. | P0 | - "Since" date displayed with stage<br>- Duration calculated and shown |
| US-4.1.5 | As a CSM, I want to view adoption stage history, so that I can see the customer's progression over time. | P1 | - History table showing stage, entered date, exited date, notes, user<br>- Reverse chronological order |
| US-4.1.6 | As a Partner, I want to update a customer's adoption stage, so that I can reflect implementation progress. | P0 | - Partners can update stage for assigned customers<br>- Change logged with partner user ID |

### Feature 4.2: Use Case Checklist
**Description:** Track which product features/modules each customer is using.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-4.2.1 | As a CSM, I want to see a checklist of use cases for a customer, so that I know what features they're using. | P0 | - Checklist displays all defined use cases<br>- Grouped by category |
| US-4.2.2 | As a CSM, I want to update the status of a use case item, so that I can track implementation progress. | P0 | - Status dropdown: Not Started, In Progress, Implemented, Optimized<br>- Status change saved immediately |
| US-4.2.3 | As a CSM, I want to add notes to a use case item, so that I can provide context. | P0 | - Notes field per checklist item<br>- Notes visible inline and in history |
| US-4.2.4 | As a CSM, I want to see an overall progress percentage, so that I can gauge total adoption. | P0 | - Progress bar showing % of items Implemented or Optimized<br>- Updates automatically when items change |
| US-4.2.5 | As a CSM, I want to see when a use case was last updated and by whom, so that I know the information is current. | P1 | - Last updated date and user shown per item<br>- Sortable by last updated |
| US-4.2.6 | As a Partner, I want to update use case checklist items, so that I can track implementation work. | P0 | - Partners can edit items for assigned customers<br>- Changes logged with partner user ID |
| US-4.2.7 | As an Admin, I want to define the master list of use cases, so that I can standardize tracking across customers. | P0 | - Admin UI to create/edit/delete use case definitions<br>- Changes apply to all customers |
| US-4.2.8 | As an Admin, I want to organize use cases into categories, so that the checklist is well-structured. | P1 | - Category field on use case definition<br>- Checklist grouped by category in UI |

---

## Epic 5: Health Scoring

### Feature 5.1: Health Score Display
**Description:** Display health scores synced from Gainsight.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-5.1.1 | As a CSM, I want to see a customer's health score from Gainsight, so that I understand their risk level. | P0 | - Health score displayed as Red/Yellow/Green badge<br>- Synced from Gainsight |
| US-5.1.2 | As a CSM, I want to see if a customer's health is improving or declining, so that I can identify trends. | P0 | - Trend indicator: up arrow (improving), down arrow (declining), dash (stable)<br>- Based on last 30 days |
| US-5.1.3 | As a CSM, I want to see the risk factors contributing to a health score, so that I can address specific issues. | P1 | - Risk factors displayed from Gainsight<br>- Listed with severity |
| US-5.1.4 | As a CSM, I want to see health score history over time, so that I can review patterns. | P1 | - Line chart showing health over 30/60/90 days<br>- Tooltip shows score and date |

### Feature 5.2: Health Score Override
**Description:** Allow manual health score adjustments.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-5.2.1 | As a CSM, I want to manually override a health score with a reason, so that I can reflect information not captured in Gainsight. | P1 | - Override form with new score and required reason<br>- Override syncs back to Gainsight |
| US-5.2.2 | As a CSM, I want to see when a health score was manually overridden, so that I know it differs from the automated score. | P1 | - "Manually set" indicator on overridden scores<br>- Original score shown for reference |

---

## Epic 6: Engagement Logging

### Feature 6.1: Log Engagements
**Description:** Capture customer interactions.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-6.1.1 | As a CSM, I want to log a customer engagement (meeting, call, email), so that I can maintain a record of interactions. | P0 | - Form with: Type, Date, Summary, Details<br>- Saved to customer timeline |
| US-6.1.2 | As a CSM, I want to quickly add a note to a customer, so that I can capture information efficiently. | P0 | - Quick add button from customer profile<br>- Minimal required fields |
| US-6.1.3 | As a CSM, I want to use templates for common engagement types, so that I can save time. | P1 | - Template dropdown pre-fills form<br>- Admin-configurable templates |
| US-6.1.4 | As a CSM, I want to tag engagements with categories (QBR, Escalation, etc.), so that I can filter and search. | P1 | - Multi-select tags field<br>- Admin-configurable tag options |
| US-6.1.5 | As a CSM, I want to attach files to an engagement, so that I can link relevant documents. | P1 | - File upload supporting common formats<br>- Files stored and accessible from timeline |
| US-6.1.6 | As a CSM, I want to @mention team members in an engagement note, so that they are notified. | P1 | - @mention autocomplete for team members<br>- Mentioned users receive notification |
| US-6.1.7 | As a CSM, I want to create a task directly from an engagement, so that I can capture follow-up actions. | P0 | - "Create Task" button on engagement form<br>- Task linked to engagement |

---

## Epic 7: Partner Portal

### Feature 7.1: Partner Access & Authentication
**Description:** Secure access for partner users.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-7.1.1 | As a Partner, I want to log in to the Partner Portal, so that I can access my assigned customers. | P0 | - Login page with email/password or SSO<br>- Partner-specific landing page after login |
| US-7.1.2 | As a Partner, I want to only see customers assigned to me, so that I don't have access to other accounts. | P0 | - Partner sees only assigned customers<br>- No access to customer list, search, or other data |
| US-7.1.3 | As an Admin, I want to invite partners via email, so that I can grant them access. | P0 | - Invite form with email, name, partner organization<br>- Invitation email sent with setup link |
| US-7.1.4 | As an Admin, I want to assign partners to specific customers, so that they have appropriate access. | P0 | - Multi-select customer assignment per partner<br>- Assignment takes effect immediately |
| US-7.1.5 | As an Admin, I want to deactivate a partner's access, so that I can revoke permissions when needed. | P0 | - Deactivate button on partner user record<br>- Partner can no longer log in but history preserved |

### Feature 7.2: Partner Customer Dashboard
**Description:** Partner-specific view of assigned customers.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-7.2.1 | As a Partner, I want to see a dashboard for each assigned customer, so that I can manage their status. | P0 | - Customer-specific dashboard with key metrics<br>- Shows status, tasks, milestones, issues, escalations |
| US-7.2.2 | As a Partner, I want to update the overall customer status (On Track/At Risk/Off Track), so that I can communicate project health. | P0 | - Status dropdown with three options<br>- Status change logged with timestamp |
| US-7.2.3 | As a Partner, I want to manage tasks for a customer, so that I can track implementation work. | P0 | - Create, edit, complete tasks<br>- Tasks visible to internal team |
| US-7.2.4 | As a Partner, I want to manage milestones for a customer, so that I can track project progress. | P0 | - Create milestones with name, date, status<br>- Visual timeline of milestones |
| US-7.2.5 | As a Partner, I want to log issues for a customer, so that I can track problems. | P0 | - Issue form with title, description, priority, status<br>- Issues visible to internal team |
| US-7.2.6 | As a Partner, I want to create escalations for a customer, so that I can flag items needing attention. | P0 | - Escalation form with details and severity<br>- Escalations highlighted to internal team |

### Feature 7.3: Partner Status Reporting
**Description:** Weekly status report submission by partners.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-7.3.1 | As a Partner, I want to submit a weekly status report, so that I can communicate progress. | P0 | - Status report form with required fields<br>- Submit saves and notifies CSM |
| US-7.3.2 | As a Partner, I want to enter status via a user-friendly form, so that reporting is efficient. | P0 | - Clean, simple form layout<br>- Inline help text and validation |
| US-7.3.3 | As a Partner, I want to save a draft status report, so that I can complete it later. | P1 | - Save Draft button<br>- Draft accessible until submitted |
| US-7.3.4 | As a Partner, I want to upload supporting documents with my status report, so that I can provide details. | P0 | - File upload on status form<br>- Supports Word, PDF, Excel, PowerPoint |
| US-7.3.5 | As a Partner, I want to view my past submitted status reports, so that I can reference them. | P1 | - List of past reports with dates<br>- Click to view details |
| US-7.3.6 | As a CSM, I want to receive a notification when a partner submits a status report, so that I can review it. | P0 | - Email notification to assigned CSM<br>- In-app notification |
| US-7.3.7 | As a CSM, I want to view partner status reports on the customer profile, so that I have complete information. | P0 | - Partner reports visible in customer timeline or dedicated tab<br>- Clearly marked as partner-submitted |

### Feature 7.4: Partner Management (Admin)
**Description:** Admin tools to manage partner organizations and users.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-7.4.1 | As an Admin, I want to manage partner organizations (Cprime, Rego, Merryville Consulting), so that I can organize partner users. | P0 | - CRUD for partner organizations<br>- Partners associated with their organization |
| US-7.4.2 | As an Admin, I want to configure which fields partners can see, so that I can control data visibility. | P1 | - Checkbox list of fields/sections<br>- Settings per partner organization or global |
| US-7.4.3 | As an Admin, I want to bulk assign a partner to multiple customers, so that I can set up access efficiently. | P1 | - Multi-select customer list for assignment<br>- Bulk operation with confirmation |
| US-7.4.4 | As an Admin, I want to view partner activity logs, so that I can audit their actions. | P1 | - Audit log showing partner actions by date, user, action, customer<br>- Filterable and exportable |

---

## Epic 8: Salesforce Integration

### Feature 8.1: Customer Sync
**Description:** Bidirectional sync of customer data with Salesforce.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-8.1.1 | As a CSM, I want customer records to sync automatically from Salesforce, so that data is always current. | P0 | - New Salesforce accounts appear in app<br>- Sync runs on schedule (configurable) |
| US-8.1.2 | As a CSM, I want required fields (Name, Salesforce ID, Account Manager, CSM, Products Owned) to sync from Salesforce, so that core data is populated. | P0 | - All 5 required fields synced<br>- Field mapping configurable by admin |
| US-8.1.3 | As a CSM, I want to click a Salesforce ID to open the record in Salesforce, so that I can access the full account. | P0 | - Salesforce ID is a clickable link<br>- Opens Salesforce in new tab |
| US-8.1.4 | As an Admin, I want to configure which Salesforce fields sync to which app fields, so that I can customize the integration. | P0 | - Field mapping UI in settings<br>- Supports standard and custom Salesforce fields |
| US-8.1.5 | As an Admin, I want to trigger a manual sync, so that I can refresh data on demand. | P1 | - "Sync Now" button in settings<br>- Shows sync status and last sync time |
| US-8.1.6 | As an Admin, I want to view sync logs and errors, so that I can troubleshoot issues. | P1 | - Sync log showing successes and failures<br>- Error details for failed records |

### Feature 8.2: Contact Sync
**Description:** Sync customer contacts from Salesforce.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-8.2.1 | As a CSM, I want customer contacts to sync from Salesforce, so that I have up-to-date contact information. | P1 | - Contacts associated with accounts sync<br>- Includes name, email, phone, title |
| US-8.2.2 | As a CSM, I want to see which contact is the primary, so that I know who to reach out to. | P1 | - Primary contact flag synced from Salesforce<br>- Primary highlighted in UI |

---

## Epic 9: Gainsight Integration

### Feature 9.1: Health Score Sync
**Description:** Import health scores from Gainsight.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-9.1.1 | As a CSM, I want health scores to sync automatically from Gainsight, so that I see current customer health. | P0 | - Health scores imported on schedule<br>- Displayed as Red/Yellow/Green |
| US-9.1.2 | As a CSM, I want health score history to sync from Gainsight, so that I can view trends. | P1 | - Historical scores imported<br>- Available for trend charts |
| US-9.1.3 | As an Admin, I want to configure the Gainsight connection, so that I can set up the integration. | P0 | - Settings page for Gainsight API credentials<br>- Test connection button |
| US-9.1.4 | As an Admin, I want to map Gainsight customers to app customers, so that scores sync to the correct records. | P0 | - Customer matching by Salesforce ID or name<br>- Manual mapping for exceptions |

---

## Epic 10: TargetProcess Integration

### Feature 10.1: Customer Entity Linking
**Description:** Link app customers to TargetProcess custom Customer entity.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-10.1.1 | As a CSM, I want to link a customer to their TargetProcess Customer entity, so that I can see related work items. | P0 | - Link/search for TP Customer entity<br>- Link saved and visible on profile |
| US-10.1.2 | As a CSM, I want to see the linked TargetProcess Customer name and ID, so that I can confirm the correct link. | P0 | - TP Customer name and ID displayed<br>- Clickable link to TP |
| US-10.1.3 | As an Admin, I want to configure the TargetProcess connection, so that I can set up the integration. | P0 | - Settings page for TP API credentials<br>- Test connection button |

### Feature 10.2: Work Item Display
**Description:** Display TargetProcess work items related to customers.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-10.2.1 | As a CSM, I want to see User Stories related to a customer, so that I know what's being built for them. | P0 | - List of User Stories linked to TP Customer<br>- Shows name, ID, state, assignee |
| US-10.2.2 | As a CSM, I want to see Bugs related to a customer, so that I know about issues affecting them. | P0 | - List of Bugs linked to TP Customer<br>- Shows name, ID, state, severity |
| US-10.2.3 | As a CSM, I want to see Features related to a customer, so that I understand planned enhancements. | P0 | - List of Features linked to TP Customer<br>- Shows name, ID, state, progress |
| US-10.2.4 | As a CSM, I want to click a TargetProcess item to open it in TP, so that I can see full details. | P0 | - Item name/ID is clickable link<br>- Opens TP in new tab |
| US-10.2.5 | As a CSM, I want work items to refresh automatically, so that I see current status. | P1 | - Sync on schedule or on-demand refresh<br>- Last synced time displayed |

### Feature 10.3: Create TargetProcess Items
**Description:** Create new TP items linked to customers from the app.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-10.3.1 | As a CSM, I want to create a Feature Request in TargetProcess from a customer profile, so that I can capture enhancement requests. | P1 | - Create form with required TP fields<br>- Created item linked to TP Customer |
| US-10.3.2 | As a CSM, I want to create a Bug in TargetProcess from a customer profile, so that I can report issues. | P1 | - Create form with required TP fields<br>- Created item linked to TP Customer |

---

## Epic 11: Outlook Integration

### Feature 11.1: Calendar Sync
**Description:** Sync meeting history from Outlook Calendar.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-11.1.1 | As a CSM, I want to see my Outlook calendar meetings with customers, so that I have a complete engagement history. | P1 | - Meetings with customer contacts appear in timeline<br>- Shows date, time, attendees, subject |
| US-11.1.2 | As a CSM, I want to connect my Outlook account, so that calendar sync is enabled. | P1 | - OAuth connection flow<br>- Permission consent for calendar read |
| US-11.1.3 | As a CSM, I want meetings to auto-associate with customers based on attendees, so that I don't have to manually link them. | P1 | - Match attendee emails to customer contacts<br>- Auto-create engagement entry |

### Feature 11.2: Email Logging
**Description:** Log email interactions from Outlook.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-11.2.1 | As a CSM, I want to see email exchanges with customer contacts, so that I have a complete communication history. | P1 | - Emails with customer contacts appear in timeline<br>- Shows date, subject, snippet |
| US-11.2.2 | As a CSM, I want emails to auto-associate with customers based on recipients, so that they appear in the right profile. | P1 | - Match recipient emails to customer contacts<br>- Auto-create engagement entry |

---

## Epic 12: Excel Integration

### Feature 12.1: Excel Export
**Description:** Export data to Excel format.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-12.1.1 | As a CSM, I want to export the customer list to Excel, so that I can analyze data offline. | P0 | - Export button on customer list<br>- Downloads .xlsx file with visible columns |
| US-12.1.2 | As a CSM, I want to export a filtered customer list, so that I get only the data I need. | P0 | - Export respects current filters<br>- Only filtered rows included |
| US-12.1.3 | As a CSM, I want custom fields included in exports, so that I have complete data. | P0 | - Custom field columns included in export<br>- Based on column selection |
| US-12.1.4 | As a CS Manager, I want to export any report to Excel, so that I can further analyze or share. | P0 | - Export button on all reports<br>- Formatting preserved where possible |
| US-12.1.5 | As a CSM, I want to export multiple data types (customers, contacts, tasks) to separate sheets, so that I have complete data. | P1 | - Multi-sheet export option<br>- Each data type on separate sheet |

### Feature 12.2: Excel Import
**Description:** Import data from Excel.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-12.2.1 | As an Admin, I want to import customer data from Excel, so that I can bulk load or update records. | P0 | - Upload .xlsx or .csv file<br>- Preview data before import |
| US-12.2.2 | As an Admin, I want to map Excel columns to app fields, so that data imports correctly. | P0 | - Column mapping UI<br>- Supports standard and custom fields |
| US-12.2.3 | As an Admin, I want to validate data before import, so that I can fix errors beforehand. | P0 | - Validation errors displayed per row<br>- Only valid rows imported |
| US-12.2.4 | As an Admin, I want to see import history, so that I can track what was imported and when. | P1 | - Import log with date, user, file name, row count<br>- Status (success, partial, failed) |
| US-12.2.5 | As an Admin, I want to rollback an import, so that I can undo mistakes. | P2 | - Rollback button on import history<br>- Restores data to pre-import state |

---

## Epic 13: PowerPoint Export

### Feature 13.1: Report to PowerPoint
**Description:** Export reports and dashboards to PowerPoint.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-13.1.1 | As a CS Manager, I want to export a dashboard to PowerPoint, so that I can present to leadership. | P0 | - Export button on dashboards<br>- Downloads .pptx file |
| US-13.1.2 | As a CS Manager, I want to export any report to PowerPoint, so that I can include it in presentations. | P0 | - Export button on all reports<br>- Charts converted to native PPT charts |
| US-13.1.3 | As a CS Manager, I want exports to use the corporate PowerPoint template, so that branding is consistent. | P0 | - Template (.potx) applied to exports<br>- Colors, fonts, logos from template |
| US-13.1.4 | As an Admin, I want to upload a corporate PowerPoint template, so that all exports use it. | P0 | - Upload .potx file in settings<br>- Template applies to all users' exports |

### Feature 13.2: Customer Summary Slides
**Description:** Generate customer-specific PowerPoint slides.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-13.2.1 | As a CSM, I want to generate a customer summary slide, so that I can include it in presentations. | P0 | - Export button on customer profile<br>- Slide includes key customer data |
| US-13.2.2 | As a CSM, I want to choose which sections to include in the slide, so that I can customize content. | P1 | - Checkboxes for sections (Health, Financials, Tasks, etc.)<br>- Only selected sections included |
| US-13.2.3 | As a CS Manager, I want to batch export slides for multiple customers, so that I can create portfolio decks. | P1 | - Multi-select customers for export<br>- One slide per customer in deck |

### Feature 13.3: Portfolio Summary Deck
**Description:** Auto-generate executive summary presentations.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-13.3.1 | As a CS Manager, I want to generate a portfolio summary deck, so that I can present to executives. | P0 | - One-click generation of summary deck<br>- Includes KPIs, health distribution, at-risk accounts, renewals |
| US-13.3.2 | As a CS Manager, I want the deck to use pre-built report templates, so that format is consistent. | P0 | - Templates define slide layouts<br>- Admin can configure templates |

---

## Epic 14: Custom Fields

### Feature 14.1: Custom Field Management
**Description:** Admin tools to create and manage custom fields.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-14.1.1 | As an Admin, I want to create a custom field, so that I can capture data specific to our business. | P0 | - Create form with name, type, section<br>- Field appears on customer profiles |
| US-14.1.2 | As an Admin, I want to choose from multiple field types (Text, Number, Date, Dropdown, etc.), so that I can capture different data formats. | P0 | - Field types: Text, Number, Currency, Date, Dropdown (single), Dropdown (multi), Checkbox, URL, User Reference |
| US-14.1.3 | As an Admin, I want to organize custom fields into sections, so that the profile is well-structured. | P0 | - Section field on definition<br>- Fields grouped by section in UI |
| US-14.1.4 | As an Admin, I want to mark a custom field as required, so that users must fill it in. | P1 | - Required checkbox on definition<br>- Validation enforced on save |
| US-14.1.5 | As an Admin, I want to set a default value for a custom field, so that new customers have consistent data. | P1 | - Default value field on definition<br>- Applied to new customer records |
| US-14.1.6 | As an Admin, I want to configure dropdown options for a field, so that users select from a predefined list. | P0 | - Options list editor for dropdown fields<br>- Add, edit, reorder, delete options |
| US-14.1.7 | As an Admin, I want to edit a custom field's properties, so that I can update it as needs change. | P0 | - Edit form pre-filled with current values<br>- Changes apply immediately |
| US-14.1.8 | As an Admin, I want to delete a custom field, so that I can remove fields no longer needed. | P1 | - Delete with confirmation<br>- Existing values preserved but field hidden |
| US-14.1.9 | As an Admin, I want to control the display order of custom fields, so that the most important appear first. | P1 | - Drag-and-drop reordering<br>- Order reflected in profile UI |

### Feature 14.2: Custom Field Visibility & Permissions
**Description:** Control who can view and edit custom fields.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-14.2.1 | As an Admin, I want to control which roles can view a custom field, so that sensitive data is protected. | P1 | - Checkbox list of roles for visibility<br>- Field hidden from unauthorized roles |
| US-14.2.2 | As an Admin, I want to control which roles can edit a custom field, so that data integrity is maintained. | P1 | - Checkbox list of roles for edit access<br>- Field read-only for unauthorized roles |

### Feature 14.3: Custom Field Data Entry
**Description:** Users entering data in custom fields.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-14.3.1 | As a CSM, I want to enter data in custom fields on a customer profile, so that I can capture relevant information. | P0 | - Custom fields displayed in profile with appropriate input controls<br>- Data saved on change/blur |
| US-14.3.2 | As a CSM, I want to bulk edit a custom field across multiple customers, so that I can update data efficiently. | P1 | - Bulk edit option on customer list<br>- Select customers and field to update |

---

## Epic 15: User Management & Roles

### Feature 15.1: User Roles
**Description:** Define and assign user roles with permissions.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-15.1.1 | As an Admin, I want to assign roles to users (Admin, Manager, CSM, Read-Only), so that permissions are appropriate. | P0 | - Role dropdown on user profile<br>- Role determines access and capabilities |
| US-15.1.2 | As a CS Manager, I want manager-level access to see team data, so that I can oversee my team. | P0 | - Managers see all customers for their team<br>- Access to team dashboards and reports |
| US-15.1.3 | As a CSM, I want to see only my assigned customers by default, so that I focus on my book of business. | P0 | - Default view filtered to assigned customers<br>- Option to see all (if permitted) |
| US-15.1.4 | As a Read-Only user, I want to view customer data without editing, so that I can reference information. | P1 | - All edit controls hidden/disabled<br>- Full view access to assigned data |

### Feature 15.2: User Administration
**Description:** Manage user accounts.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-15.2.1 | As an Admin, I want to create user accounts, so that team members can access the system. | P0 | - Create user form with name, email, role<br>- Invitation email sent |
| US-15.2.2 | As an Admin, I want to deactivate user accounts, so that former team members lose access. | P0 | - Deactivate button on user record<br>- User can no longer log in |
| US-15.2.3 | As an Admin, I want to assign customers to CSMs, so that ownership is clear. | P0 | - Customer assignment on customer profile or bulk<br>- Assignment visible in customer list |
| US-15.2.4 | As an Admin, I want to transfer customers from one CSM to another, so that I can handle role changes. | P0 | - Transfer function with from/to user selection<br>- History preserved on transferred customers |

### Feature 15.3: Authentication
**Description:** Secure login and authentication.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-15.3.1 | As a User, I want to log in with SSO, so that I use my corporate credentials. | P0 | - SSO integration (SAML/OAuth)<br>- Single click login |
| US-15.3.2 | As a User, I want my session to stay active while I'm working, so that I'm not logged out unexpectedly. | P0 | - Session timeout configurable<br>- Activity extends session |

---

## Epic 16: Responsive Design (Desktop & Mobile)

### Feature 16.1: Desktop Experience
**Description:** Optimized experience for desktop users.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-16.1.1 | As a Desktop User, I want a persistent side navigation, so that I can quickly navigate between sections. | P0 | - Side nav visible at all times (collapsible)<br>- Shows all main menu items |
| US-16.1.2 | As a Desktop User, I want to see data tables with all columns visible, so that I have complete information at a glance. | P0 | - Tables show all relevant columns<br>- Horizontal scroll for overflow |
| US-16.1.3 | As a Desktop User, I want to use keyboard shortcuts, so that I can work efficiently. | P2 | - Shortcuts for common actions (search, new task, etc.)<br>- Shortcut help available |

### Feature 16.2: Mobile Experience
**Description:** Optimized experience for mobile users.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-16.2.1 | As a Mobile User, I want a hamburger menu for navigation, so that the screen isn't cluttered. | P0 | - Hamburger icon opens slide-out menu<br>- Menu shows all main sections |
| US-16.2.2 | As a Mobile User, I want a bottom navigation bar for primary actions, so that I can quickly access key features. | P0 | - Bottom nav with 5 items max<br>- Includes Home, Customers, Add, Tasks, More |
| US-16.2.3 | As a Mobile User, I want touch-optimized tap targets, so that I can easily interact with the app. | P0 | - All tap targets minimum 44px<br>- Adequate spacing between elements |
| US-16.2.4 | As a Mobile User, I want to swipe on list items to reveal actions, so that I can quickly complete or edit. | P1 | - Swipe left for delete/archive<br>- Swipe right for complete/edit |
| US-16.2.5 | As a Mobile User, I want to pull down to refresh, so that I can update data easily. | P1 | - Pull-to-refresh on lists<br>- Loading indicator during refresh |
| US-16.2.6 | As a Mobile User, I want a floating action button for quick add, so that I can create items easily. | P1 | - FAB in bottom-right corner<br>- Opens quick add menu |

### Feature 16.3: Progressive Web App (PWA)
**Description:** App-like experience with offline support.

| ID | User Story | Priority | Acceptance Criteria |
|----|------------|----------|---------------------|
| US-16.3.1 | As a Mobile User, I want to install the app to my home screen, so that I can access it like a native app. | P1 | - "Add to Home Screen" prompt<br>- App icon and splash screen |
| US-16.3.2 | As a Mobile User, I want to view my customers and tasks offline, so that I have access without connectivity. | P2 | - Recently viewed data cached<br>- Offline indicator when disconnected |
| US-16.3.3 | As a Mobile User, I want changes made offline to sync when I reconnect, so that my work is saved. | P2 | - Changes queued when offline<br>- Auto-sync on reconnection |
| US-16.3.4 | As a Mobile User, I want to receive push notifications for reminders, so that I'm alerted even when not in the app. | P2 | - Push notification permission request<br>- Notifications for due tasks |

---

## Summary

| Epic | Features | User Stories | P0 | P1 | P2 |
|------|----------|--------------|----|----|-----|
| 1. Customer Management | 2 | 14 | 10 | 4 | 0 |
| 2. Dashboard & Portfolio | 3 | 14 | 9 | 2 | 3 |
| 3. Task & Reminder | 3 | 16 | 10 | 6 | 0 |
| 4. Usage Framework | 2 | 14 | 12 | 2 | 0 |
| 5. Health Scoring | 2 | 6 | 1 | 5 | 0 |
| 6. Engagement Logging | 1 | 7 | 2 | 5 | 0 |
| 7. Partner Portal | 4 | 20 | 16 | 4 | 0 |
| 8. Salesforce Integration | 2 | 8 | 5 | 3 | 0 |
| 9. Gainsight Integration | 1 | 4 | 3 | 1 | 0 |
| 10. TargetProcess Integration | 3 | 9 | 6 | 3 | 0 |
| 11. Outlook Integration | 2 | 5 | 0 | 5 | 0 |
| 12. Excel Integration | 2 | 10 | 5 | 3 | 2 |
| 13. PowerPoint Export | 3 | 8 | 5 | 3 | 0 |
| 14. Custom Fields | 3 | 13 | 8 | 5 | 0 |
| 15. User Management | 3 | 10 | 8 | 2 | 0 |
| 16. Responsive Design | 3 | 13 | 4 | 5 | 4 |
| **TOTAL** | **39** | **171** | **104** | **58** | **9** |

---

## Release Mapping

### Phase 1: MVP
- Epic 1: Customer Management (Core)
- Epic 2: Dashboard (Basic)
- Epic 3: Task Management (Basic)
- Epic 14: Custom Fields (Basic)
- Epic 15: User Management
- Epic 16: Responsive Design (Core)

### Phase 2: Integration & Reporting
- Epic 4: Usage Framework
- Epic 8: Salesforce Integration
- Epic 9: Gainsight Integration
- Epic 10: TargetProcess Integration
- Epic 12: Excel Integration
- Epic 13: PowerPoint Export
- Epic 7: Partner Portal

### Phase 3: Advanced Features
- Epic 5: Health Scoring (Advanced)
- Epic 6: Engagement Logging (Advanced)
- Epic 11: Outlook Integration
- Epic 2: Custom Reports
- Epic 16: PWA Features

### Phase 4: AI & Intelligence
- (Defined in PRD, user stories to be created when prioritized)

---

*Document generated from PRD v1.6*
