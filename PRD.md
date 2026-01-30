# Product Requirements Document (PRD)
## Customer Status Tracker

**Version:** 1.8
**Date:** January 30, 2026
**Author:** Product Team
**Status:** Requirements Complete

---

## 1. Executive Summary

Customer Status Tracker is a web application designed to give Customer Success teams a centralized, organized view of their key customer portfolio. The app consolidates customer health data, engagement history, and financial metrics into a single interface, solving the problem of scattered information across multiple systems.

### Key Value Proposition
- **Single source of truth** for customer intelligence
- **At-a-glance portfolio visibility** with health scoring
- **Organized engagement history** with searchable notes and action items
- **Proactive risk identification** through automated signals
- **Flexible data model** with custom fields to adapt to your workflow
- **Executive-ready reporting** with PowerPoint and Excel export

---

## 2. Problem Statement

### Current State
Customer Success teams currently use a CRM (e.g., Salesforce) to track customer data, but the experience falls short in several ways:

- **Information is fragmented** – engagement notes, health indicators, and financial data live in different places
- **History is hard to find** – locating past conversations, decisions, or context requires digging through multiple screens
- **No unified customer view** – requires clicking through many tabs/objects to understand a customer's full picture
- **Team alignment suffers** – different team members have different views of customer status
- **Rigid data models** – can't easily add fields specific to your business without IT involvement
- **Manual reporting** – creating management updates requires exporting and reformatting data

### Impact
- Time wasted searching for information
- Context lost during handoffs or escalations
- Risk signals missed due to lack of visibility
- Inconsistent customer experience across the team
- Hours spent preparing status reports and presentations

---

## 3. Goals & Success Metrics

### Primary Goals
| Goal | Description |
|------|-------------|
| **G1** | Reduce time-to-context for any customer from minutes to seconds |
| **G2** | Provide department-wide visibility into portfolio health |
| **G3** | Ensure no customer action items fall through the cracks |
| **G4** | Enable proactive identification of at-risk customers |
| **G5** | Reduce management reporting prep time by 75% |
| **G6** | Provide flexible data capture without developer involvement |

### Success Metrics (KPIs)
| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Time to find customer information | < 30 seconds | User testing |
| Team adoption rate | > 80% weekly active | Usage analytics |
| Overdue action items | < 5% at any time | System tracking |
| At-risk customers identified early | +25% improvement | Churn analysis |
| Time to generate management report | < 5 minutes | User feedback |
| Custom fields created by users | Track adoption | System analytics |

---

## 4. User Personas

### Primary Persona: Customer Success Manager (CSM)
- **Role:** Owns 5-15 key customer relationships
- **Goals:** Keep customers healthy, drive adoption, identify expansion opportunities
- **Pain Points:** Spends too much time searching for info, misses follow-ups, lacks portfolio overview
- **Needs:** Quick access to customer context, organized notes, reminder system, custom tracking fields

### Secondary Persona: CS Leader / Manager
- **Role:** Oversees team of 3-10 CSMs, responsible for department metrics
- **Goals:** Ensure team coverage, identify portfolio risks, report to leadership
- **Pain Points:** No rollup view, relies on CSMs for updates, blind spots in portfolio, manual report creation
- **Needs:** Dashboard view, health trends, team activity visibility, one-click executive reports

### Tertiary Persona: Executive Stakeholder
- **Role:** VP/Director needing portfolio oversight
- **Goals:** Understand customer health trends, identify risks to revenue, make strategic decisions
- **Pain Points:** Reports are stale, inconsistent formats, lack of drill-down capability
- **Needs:** Executive dashboard, PowerPoint-ready summaries, trend analysis

### Quaternary Persona: Cross-Functional Stakeholder (Sales, Support, Product)
- **Role:** Needs occasional customer context
- **Goals:** Understand customer situation quickly for their function
- **Pain Points:** Doesn't know where to look, interrupts CSM for info
- **Needs:** Read-only access, simple search, key facts visible

---

## 5. Core Features & Requirements

### 5.1 Customer Profile Page
**Priority: P0 (Must Have)**

A single-page view consolidating all key customer information.

#### Required Core Fields (Compliance)
| Field | Type | Source | Required |
|-------|------|--------|----------|
| **Customer Name** | Text | Salesforce sync | ✅ Yes |
| **Salesforce ID** | Text (18-char) | Salesforce sync | ✅ Yes |
| **Account Manager** | User Reference | Salesforce sync | ✅ Yes |
| **CSM** | User Reference | Manual / Salesforce | ✅ Yes |
| **Products Owned** | Multi-select | Salesforce sync | ✅ Yes |

#### Profile Sections
| Requirement | Description |
|-------------|-------------|
| **Customer Header** | Company name, logo, health score badge, CSM owner, last contact date |
| **Health Section** | Current health score (Red/Yellow/Green), trend indicator, risk factors |
| **Financials Section** | ARR/MRR, contract dates, renewal date countdown, expansion opportunities |
| **Engagement Timeline** | Chronological list of all interactions (meetings, emails, notes) |
| **Action Items** | Open tasks with due dates, assignees, and status |
| **Key Contacts** | Primary stakeholders with roles and contact info |
| **Documents** | Links to relevant contracts, decks, or resources |
| **Custom Fields Section** | User-defined fields displayed based on configuration |

### 5.2 Custom Fields Architecture
**Priority: P0 (Must Have)**

Flexible data model allowing admins and users to extend the customer profile.

| Requirement | Description |
|-------------|-------------|
| **Field Types Supported** | Text, Number, Currency, Date, Dropdown (single/multi), Checkbox, URL, User Reference |
| **Field Creation UI** | Admin interface to create/edit/delete custom fields without code |
| **Field Grouping** | Organize custom fields into logical sections (e.g., "Technical Details", "Business Context") |
| **Field Visibility** | Control which roles can view/edit each custom field |
| **Required Fields** | Mark fields as required for data completeness |
| **Default Values** | Set default values for new customers |
| **Field Dependencies** | Show/hide fields based on other field values (conditional logic) |
| **Bulk Edit** | Update custom field values across multiple customers |
| **Import/Export** | Custom fields included in Excel import/export |
| **API Access** | Custom fields accessible via API for integrations |

#### Custom Field Data Model
```
CustomFieldDefinition {
  id: UUID
  name: string
  type: FieldType
  section: string
  required: boolean
  defaultValue: any
  options: string[]        // for dropdown types
  visibleToRoles: Role[]
  editableByRoles: Role[]
  displayOrder: number
  conditionalLogic: {
    dependsOn: fieldId
    showWhen: condition
  }
}

CustomerFieldValue {
  customerId: UUID
  fieldId: UUID
  value: any
  updatedAt: timestamp
  updatedBy: userId
}
```

### 5.3 Portfolio Dashboard
**Priority: P0 (Must Have)**

Overview of all customers for quick health assessment.

| Requirement | Description |
|-------------|-------------|
| **Customer List** | Sortable/filterable table of all customers |
| **Health Distribution** | Visual breakdown of portfolio by health status |
| **Upcoming Renewals** | List of renewals in next 30/60/90 days |
| **Action Items Due** | Aggregated view of upcoming/overdue tasks |
| **Risk Alerts** | Flagged customers requiring attention |
| **Quick Search** | Global search across all customers and notes |
| **Custom Columns** | Add custom fields as columns in customer list |
| **Saved Views** | Save filter/sort/column configurations |

### 5.4 Management Dashboard & Reports
**Priority: P0 (Must Have)**

Executive-level views and reporting for management communication.

| Requirement | Description |
|-------------|-------------|
| **Executive Dashboard** | High-level KPIs: total ARR, health distribution, renewal pipeline, risk summary |
| **Trend Charts** | Health score trends over time (30/60/90 days) |
| **Renewal Forecast** | Visual timeline of upcoming renewals with risk indicators |
| **Team Performance** | Activity metrics by CSM (engagements, tasks completed, health changes) |
| **At-Risk Report** | Detailed view of all red/yellow customers with reasons |
| **ARR by Health** | Revenue breakdown by health status |
| **Custom Report Builder** | Drag-and-drop report creation with custom fields |

#### Report Templates (Pre-built)
| Report | Description | Audience |
|--------|-------------|----------|
| **Weekly Status** | Portfolio snapshot with changes from prior week | CS Leadership |
| **Monthly Business Review** | Detailed metrics, trends, wins/losses | Executive Team |
| **Renewal Pipeline** | 90-day renewal forecast with risk assessment | CS + Sales |
| **At-Risk Summary** | Red/yellow accounts with action plans | CS Leadership |
| **Customer Health Trends** | Historical health score analysis | Executive Team |

### 5.5 Export Capabilities
**Priority: P0 (Must Have)**

Export data and reports to external formats for sharing and analysis.

#### PowerPoint Export
| Requirement | Description |
|-------------|-------------|
| **Template Support** | Upload corporate PowerPoint templates (.potx) |
| **Report-to-Slides** | Convert any report to formatted PowerPoint |
| **Customer Summary Slides** | One-click generation of customer overview slides |
| **Portfolio Summary Deck** | Auto-generate executive summary presentation |
| **Chart Export** | All dashboard charts exportable as editable PPT charts |
| **Branding** | Apply company colors, logos, fonts automatically |
| **Slide Customization** | Choose which sections/data to include |
| **Batch Export** | Generate slides for multiple customers at once |

#### Excel Export/Import
| Requirement | Description |
|-------------|-------------|
| **Full Data Export** | Export all customer data including custom fields to .xlsx |
| **Filtered Export** | Export only currently filtered/visible customers |
| **Report Export** | Export any report to Excel with formatting preserved |
| **Data Import** | Import customer data from Excel (create/update) |
| **Import Mapping** | Map Excel columns to system fields (including custom) |
| **Import Validation** | Preview and validate data before import |
| **Import History** | Track all imports with rollback capability |
| **Scheduled Export** | Automated recurring exports to email/SharePoint |
| **Excel Add-in** | (Future) Direct connection from Excel to live data |

### 5.6 Engagement Logging
**Priority: P0 (Must Have)**

Simple, fast way to capture customer interactions.

| Requirement | Description |
|-------------|-------------|
| **Quick Add** | One-click creation of notes, calls, meetings |
| **Templates** | Pre-built templates for common engagement types |
| **Tagging** | Categorize entries (QBR, escalation, feature request, etc.) |
| **Attachments** | Attach files or links to entries |
| **Mentions** | @mention team members for visibility |
| **Action Item Creation** | Create tasks directly from notes |

### 5.7 Customer Usage Framework
**Priority: P0 (Must Have)**

A comprehensive framework tracking customer adoption journey and feature usage. Both internal team members and partners can view and update this framework.

#### Adoption Steps (Journey Tracking)
| Requirement | Description |
|-------------|-------------|
| **Adoption Stage** | Track current stage in adoption journey |
| **Stage Progress** | Visual indicator of overall journey progress |
| **Stage Dates** | Record when customer entered each stage |
| **Stage Notes** | Add context about stage transitions |
| **Edit Access** | Both CSMs and Partners can update adoption stage |

#### Adoption Stages (Configurable)
| Stage | Description |
|-------|-------------|
| **1. Onboarding** | Initial setup, training, and configuration |
| **2. Implementing** | Rolling out to users, integrating with systems |
| **3. Adopted** | Active usage across intended user base |
| **4. Optimizing** | Advanced usage, expanding use cases, best practices |
| **5. Advocate** | Customer is a reference, case study, or champion |

#### Use Case Checklist
| Requirement | Description |
|-------------|-------------|
| **Checklist Display** | Show on customer profile which features/modules are in use |
| **Status per Item** | Track status for each use case (Not Started, In Progress, Implemented, Optimized) |
| **Edit Access** | Both CSMs and Partners can update checklist items |
| **Notes per Item** | Add notes or context to each checklist item |
| **Progress Indicator** | Visual indicator of overall adoption progress |
| **History Tracking** | Track when items were checked/updated and by whom |
| **Configurable Items** | Admin can define the master list of use cases/modules |

#### Usage Framework Data Model
```
AdoptionStageDefinition {
  id: UUID
  name: string                    // e.g., "Onboarding"
  description: string
  stageOrder: number              // 1, 2, 3, 4, 5
  isActive: boolean
}

CustomerAdoptionStatus {
  id: UUID
  customerId: UUID
  currentStageId: UUID
  stageEnteredDate: date
  notes: string
  updatedAt: timestamp
  updatedBy: UUID                 // Can be CSM or Partner
}

CustomerAdoptionHistory {
  id: UUID
  customerId: UUID
  stageId: UUID
  enteredDate: date
  exitedDate: date
  notes: string
  updatedBy: UUID
}

UseCaseDefinition {
  id: UUID
  name: string                    // e.g., "Reporting Module"
  description: string
  category: string                // Group use cases by category
  displayOrder: number
  isActive: boolean
  createdAt: timestamp
}

CustomerUseCase {
  id: UUID
  customerId: UUID
  useCaseId: UUID
  status: "not_started" | "in_progress" | "implemented" | "optimized"
  notes: string
  implementedDate: date
  updatedAt: timestamp
  updatedBy: UUID                 // Can be CSM or Partner
}
```

#### Usage Framework UI
```
Customer Profile → Usage Framework Tab

┌─────────────────────────────────────────────────────────────┐
│  Usage Framework                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ADOPTION JOURNEY                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ●━━━━━●━━━━━●━━━━━◐━━━━━○                          │   │
│  │  Onboard  Implement  Adopted  Optimizing  Advocate  │   │
│  │                        ▲                            │   │
│  │                   Current Stage                     │   │
│  │                                                     │   │
│  │  Stage: Adopted        Since: Oct 15, 2025          │   │
│  │  Notes: Full rollout complete, 250 active users     │   │
│  │                                      [Update ▾]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  USE CASE CHECKLIST                     Progress: ████░░ 67% │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CORE MODULES                                        │   │
│  │ ✅ Dashboard & Reporting          [Implemented ▾]   │   │
│  │    Notes: Rolled out Q3 2025                        │   │
│  │ ✅ User Management                [Optimized ▾]     │   │
│  │    Notes: SSO integrated                            │   │
│  │ 🔄 Workflow Automation            [In Progress ▾]   │   │
│  │    Notes: Phase 2 of implementation                 │   │
│  │ ○  Advanced Analytics             [Not Started ▾]   │   │
│  │    Notes: Planned for Q2 2026                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ INTEGRATIONS                                        │   │
│  │ ✅ Salesforce Integration         [Implemented ▾]   │   │
│  │ ○  API Access                     [Not Started ▾]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.8 Health Scoring
**Priority: P0 (Must Have)**

Health scores are managed in **Gainsight** as the source of truth and synced to Customer Tracker.

| Requirement | Description |
|-------------|-------------|
| **Gainsight Sync** | Import health scores from Gainsight (primary source) |
| **Manual Override** | CSM can set health score with reason (syncs back to Gainsight) |
| **Health History** | Track health changes over time |
| **Risk Factors** | Display Gainsight risk indicators and custom factors |
| **Score Display** | Show Red/Yellow/Green status with numeric score if available |
| **Trend Indicator** | Show if health is improving, stable, or declining |

### 5.8 Task & Reminder Management
**Priority: P0 (Must Have)**

Comprehensive task and reminder system for tracking customer-related action items.

#### Task Management
| Requirement | Description |
|-------------|-------------|
| **Task Creation** | Create tasks with title, description, due date, assignee, priority |
| **Task Types** | Categorize tasks (Follow-up, QBR Prep, Escalation, Onboarding, Renewal, General) |
| **Task Views** | My tasks, team tasks, by customer, by type, overdue, upcoming |
| **Subtasks** | Break complex tasks into subtasks with individual tracking |
| **Dependencies** | Link tasks that depend on each other |
| **Completion Tracking** | Mark complete with optional notes and outcome |
| **Task Templates** | Pre-built task templates for common workflows (e.g., "New Customer Onboarding") |
| **Bulk Operations** | Reassign, reschedule, or close multiple tasks at once |
| **TargetProcess Sync** | Sync tasks bidirectionally with TargetProcess |

#### Reminder System
| Requirement | Description |
|-------------|-------------|
| **Reminder Creation** | Create standalone reminders or attach to tasks/customers |
| **Reminder Types** | One-time, recurring (daily, weekly, monthly, custom) |
| **Trigger Events** | Time-based, event-based (e.g., "30 days before renewal") |
| **Smart Reminders** | Auto-generate reminders based on rules (e.g., "No contact in 14 days") |
| **Snooze** | Snooze reminders for 1 hour, 1 day, 1 week, or custom time |
| **Notification Channels** | In-app, email, Slack (configurable per user) |
| **Reminder Queue** | Central view of all upcoming reminders |
| **Escalation** | Auto-escalate overdue reminders to manager after X days |

#### Customer-Specific Task Views
| Requirement | Description |
|-------------|-------------|
| **Task Tab on Profile** | Dedicated tab showing all tasks/reminders for a customer |
| **Timeline Integration** | Tasks appear in customer engagement timeline |
| **Quick Add** | Create task/reminder directly from customer profile |
| **Recurring Tasks** | Set up recurring tasks per customer (e.g., monthly check-in) |
| **Task History** | View completed tasks and outcomes per customer |

#### Task Data Model
```
Task {
  id: UUID
  customerId: UUID
  title: string
  description: string
  type: TaskType
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled"
  assigneeId: UUID
  dueDate: timestamp
  completedAt: timestamp
  completedBy: UUID
  outcome: string
  parentTaskId: UUID          // for subtasks
  dependsOn: UUID[]           // task dependencies
  templateId: UUID            // if created from template
  tpEntityId: number          // TargetProcess link
  createdAt: timestamp
  updatedAt: timestamp
}

Reminder {
  id: UUID
  customerId: UUID            // optional
  taskId: UUID                // optional, if attached to task
  userId: UUID                // who receives the reminder
  title: string
  triggerType: "time" | "event" | "rule"
  triggerConfig: {
    datetime: timestamp       // for time-based
    event: string             // for event-based (e.g., "renewal_date")
    offsetDays: number        // days before/after event
    rule: string              // for smart reminders
  }
  recurrence: {
    type: "once" | "daily" | "weekly" | "monthly" | "custom"
    interval: number
    endDate: timestamp
  }
  channels: ["in_app", "email", "slack"]
  status: "active" | "snoozed" | "completed" | "dismissed"
  snoozedUntil: timestamp
  createdAt: timestamp
}
```

### 5.9 Team Features
**Priority: P1 (Should Have)**

Collaboration and visibility across the department.

| Requirement | Description |
|-------------|-------------|
| **User Roles** | Admin, Manager, CSM, Partner, Read-Only |
| **Customer Assignment** | Assign customers to CSMs and/or Partners |
| **Activity Feed** | See recent team activity on customers |
| **Handoff Support** | Transfer customer with full history preserved |

### 5.10 Partner Portal & Access
**Priority: P1 (Should Have)**

Enable external partners to report on customer status with controlled access.

#### Partner User Role
| Requirement | Description |
|-------------|-------------|
| **Limited Visibility** | Partners can ONLY see customers explicitly assigned to them |
| **No Cross-Customer Access** | Cannot search, browse, or view unassigned customers |
| **Restricted Navigation** | Simplified UI showing only relevant sections |
| **Audit Trail** | All partner actions logged for compliance |

#### Partner Capabilities
| Requirement | Description |
|-------------|-------------|
| **Customer Dashboard** | Partner-specific dashboard for each assigned customer |
| **Status Management** | Enter and edit overall customer status (On Track/At Risk/Off Track) |
| **Task Management** | Create, edit, and complete tasks for the customer |
| **Milestone Tracking** | Add and update project milestones with dates and status |
| **Issue Tracking** | Log and manage customer issues with priority and status |
| **Escalation Management** | Create and track escalations requiring attention |
| **Usage Framework** | View and update Use Case Checklist for customer adoption tracking |
| **Upload Documents** | Upload status reports, deliverables, meeting notes |
| **Add Engagement Notes** | Log interactions with the customer |

#### Status Report Submission
| Requirement | Description |
|-------------|-------------|
| **Manual Entry Form** | Structured form for status updates |
| **File Upload** | Upload Word, PDF, Excel, PowerPoint status reports |
| **Template Downloads** | Provide status report templates for partners |
| **Submission History** | View past submissions and their status |
| **Draft & Submit** | Save drafts before final submission |
| **Required Fields** | Enforce required fields before submission |

#### Status Report Form Fields (Configurable)
| Field | Type | Description |
|-------|------|-------------|
| **Reporting Period** | Date Range | Period this status covers |
| **Overall Status** | Dropdown | On Track / At Risk / Off Track |
| **Summary** | Text Area | Executive summary of status |
| **Accomplishments** | Text Area | What was completed this period |
| **Planned Activities** | Text Area | What's planned for next period |
| **Risks & Issues** | Text Area | Current risks or blockers |
| **Attachments** | File Upload | Supporting documents |
| **Custom Fields** | Various | Admin-configurable additional fields |

#### Partner Management (Admin)
| Requirement | Description |
|-------------|-------------|
| **Partner Invitations** | Invite partners via email |
| **Customer Assignment** | Assign partners to specific customers |
| **Permission Configuration** | Choose which fields/sections partners can see |
| **Submission Notifications** | Alert CSMs when partner submits status |
| **Bulk Assignment** | Assign partner to multiple customers at once |
| **Deactivation** | Disable partner access while preserving history |

#### Partner Data Model
```
PartnerUser {
  id: UUID
  email: string
  name: string
  company: string              // Partner organization name
  role: "partner"
  status: "invited" | "active" | "deactivated"
  assignedCustomers: UUID[]    // Only these customers are visible
  permissions: {
    canUploadFiles: boolean
    canAddNotes: boolean
    canViewTasks: boolean
    canCompleteTasks: boolean
    visibleFields: string[]    // Which customer fields they see
    visibleSections: string[]  // Which tabs/sections they see
  }
  invitedBy: UUID
  invitedAt: timestamp
  lastLoginAt: timestamp
}

PartnerStatusReport {
  id: UUID
  customerId: UUID
  partnerId: UUID
  reportingPeriodStart: date
  reportingPeriodEnd: date
  overallStatus: "on_track" | "at_risk" | "off_track"
  summary: string
  accomplishments: string
  plannedActivities: string
  risksAndIssues: string
  attachments: [{
    fileName: string
    fileUrl: string
    fileType: string
    uploadedAt: timestamp
  }]
  customFieldValues: JSONB
  status: "draft" | "submitted" | "reviewed"
  submittedAt: timestamp
  reviewedBy: UUID
  reviewedAt: timestamp
  reviewNotes: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Partner Portal UI (Simplified View)
```
Partner Portal Navigation:
├── My Customers
│   └── [List of assigned customers only]
│
├── Customer Profile (per customer)
│   ├── Overview (limited fields)
│   ├── My Status Reports
│   │   ├── Submit New Report
│   │   └── Past Submissions
│   ├── Documents
│   └── Tasks (assigned to me)
│
└── My Account
    ├── Profile
    └── Notification Settings
```

### 5.11 Implementation Flow Visualization
**Priority: P1 (Should Have)**

A Sankey diagram visualization showing the flow from assessment dimension gaps to recommended use cases to TargetProcess features, helping CSMs understand what a customer should implement based on their assessment scores.

#### Flow Visualization
| Requirement | Description |
|-------------|-------------|
| **Sankey Diagram** | Visual flow chart showing dimension gaps → use cases → TP features |
| **Color Coding** | Red (< 2.0), Orange (< 3.0), Yellow (< 4.0) based on dimension scores |
| **Flow Thickness** | Link thickness based on impact weight |
| **Interactive** | Click to expand to full-screen modal view |
| **Filtering** | Filter by specific dimension or use case to focus the visualization |
| **Export** | Copy entire visual to clipboard (for PowerPoint) and download as image |

#### Data Sources
| Requirement | Description |
|-------------|-------------|
| **Assessment Data** | Customer's latest completed assessment with dimension scores |
| **Gap Threshold** | Configurable threshold (default 3.5) for identifying weak dimensions |
| **Use Case Mappings** | DimensionUseCaseMapping table linking dimensions to recommended use cases |
| **TP Feature Mappings** | UseCaseTPFeatureMapping table linking use cases to TargetProcess features |

#### Summary Statistics
| Metric | Description |
|--------|-------------|
| **Weak Dimensions** | Count of dimensions below threshold |
| **Recommended Use Cases** | Count of use cases that address gaps |
| **TP Features** | Count of TargetProcess features to implement |

#### API Endpoint
```
GET /api/v1/assessments/customer/{customer_id}/flow-visualization

Response:
{
  "customer_id": 123,
  "assessment_id": 456,
  "nodes": [
    {"id": "dim_1", "name": "Organization", "score": 2.1, "gap": 1.4, "type": "dimension"},
    {"id": "uc_1", "name": "Strategic Resource Mgmt", "solution_area": "WFM", "type": "use_case"},
    {"id": "tp_1", "name": "Resource Capacity", "tp_id": 12345, "is_required": true, "type": "tp_feature"}
  ],
  "links": [
    {"source": "dim_1", "target": "uc_1", "value": 0.8, "impact_weight": 0.8},
    {"source": "uc_1", "target": "tp_1", "value": 1.0, "is_required": true}
  ],
  "weak_dimensions_count": 3,
  "recommended_use_cases_count": 5,
  "tp_features_count": 8
}
```

---

## 6. Integrations

### Required Integrations (P0/P1)

| System | Purpose | Data Flow | Priority |
|--------|---------|-----------|----------|
| **TargetProcess** | Work item tracking, feature requests, project status | Bidirectional | P0 |
| **Microsoft Excel** | Data import/export, offline analysis | Import/Export | P0 |
| **Microsoft PowerPoint** | Executive reporting, presentations | Export | P0 |
| **Salesforce** | Customer master data, opportunities, contacts | Bidirectional sync | P0 |
| **Slack** | Notifications, reminders, quick updates, team collaboration | Bidirectional | P2 (Future) |
| **Gainsight** | **Primary source for health scores**, CSM workflows, playbooks | Bidirectional | P0 |
| **Outlook Calendar** | Meeting history, upcoming meetings | Read from calendar | P1 |
| **Outlook Email** | Email engagement tracking | Read-only logging | P1 |

#### TargetProcess Integration Details

TargetProcess contains a **custom entity called "Customer"** which will be the primary link point.

| Requirement | Description |
|-------------|-------------|
| **Entity Linking** | Link app customers to TP custom "Customer" entity |
| **Customer Sync** | Bidirectional sync between app and TP Customer entity |
| **Work Item Display** | Show related TP items (User Stories, Bugs, Features) linked to the TP Customer |
| **Status Sync** | Display TP item status (state, progress, assignee) |
| **Create from App** | Create new TP items (Feature Requests, Bugs) linked to TP Customer |
| **Bidirectional Sync** | Changes in either system reflected in the other |
| **Custom Field Mapping** | Map TP Customer custom fields to app customer fields |
| **Release Tracking** | Show which releases/iterations include customer-related items |
| **Comment Sync** | Optionally sync comments between systems |

```
TargetProcess Integration Data Model:

CustomerTPLink {
  customerId: UUID                    // App customer ID
  tpCustomerId: number                // TP "Customer" entity ID
  tpCustomerName: string              // Cached name for display
  lastSyncAt: timestamp
  syncStatus: "synced" | "pending" | "error"
}

TP Custom "Customer" Entity Fields (to map):
- Customer Name
- Salesforce ID (if stored in TP)
- Related Projects
- Related Features/Epics
- Related User Stories/Bugs

Displayed TP Data (from related work items):
- Entity name, ID, state
- Assigned team/user
- Progress (% complete)
- Target release/iteration
- Child items count
- Recent activity
```

#### Excel Integration Details
| Feature | Description |
|---------|-------------|
| **Export Formats** | .xlsx (Excel 2007+), .csv |
| **Import Formats** | .xlsx, .csv |
| **Max Rows** | Support up to 10,000 rows per import |
| **Formulas** | Export preserves number formats; formulas not included |
| **Multiple Sheets** | Export can include multiple sheets (customers, contacts, tasks) |

#### PowerPoint Integration Details
| Feature | Description |
|---------|-------------|
| **Output Format** | .pptx (PowerPoint 2007+) |
| **Template Format** | .potx (PowerPoint template) |
| **Chart Types** | Bar, Pie, Line, Donut charts as native PPT charts |
| **Image Support** | Customer logos, health badges as images |
| **Text Styling** | Preserve formatting, support bullet lists |

#### Slack Integration Details
| Requirement | Description |
|-------------|-------------|
| **Notification Types** | Task due, task overdue, reminder triggered, health score change, customer risk alert |
| **Channel Posting** | Post updates to designated team channels |
| **Direct Messages** | Send personal notifications via DM |
| **Interactive Messages** | Complete tasks, snooze reminders, acknowledge alerts from Slack |
| **Slash Commands** | `/cstracker customer [name]` - quick customer lookup |
| **Customer Channels** | Optionally link Slack channels to customers for context |
| **Activity Logging** | Log Slack conversations as customer engagements (opt-in) |
| **Bot Presence** | CS Tracker bot for queries and quick actions |

```
Slack Integration Capabilities:

Outbound (App → Slack):
├── Notifications
│   ├── Task assigned to you
│   ├── Task due today / overdue
│   ├── Reminder triggered
│   ├── Customer health changed (Red/Yellow)
│   ├── Renewal approaching (30/60/90 days)
│   └── @mention in customer note
│
├── Channel Updates
│   ├── Weekly portfolio summary
│   ├── At-risk customer alerts
│   └── Team activity digest
│
└── Interactive Elements
    ├── "Mark Complete" button
    ├── "Snooze" dropdown
    ├── "View Customer" link
    └── "Add Note" action

Inbound (Slack → App):
├── Slash Commands
│   ├── /cst customer <name> - lookup customer
│   ├── /cst task <action> - manage tasks
│   ├── /cst remind <time> <message> - create reminder
│   └── /cst health <customer> - check health
│
└── Message Actions
    └── "Log to Customer" - save message as engagement
```

#### Gainsight Integration Details
| Requirement | Description |
|-------------|-------------|
| **Customer Sync** | Sync customer records between systems |
| **Health Score Sync** | Import Gainsight health scores or export app scores |
| **CTA Sync** | Sync Calls-to-Action (CTAs) with app tasks |
| **Timeline Sync** | Share engagement timeline entries |
| **Playbook Triggers** | Trigger Gainsight playbooks from app events |
| **Survey Data** | Import NPS/CSAT scores from Gainsight |
| **Usage Data** | Pull product usage metrics for health scoring |
| **Success Plans** | Display linked Gainsight success plans |

```
Gainsight Integration Data Flow:

Gainsight → Customer Tracker:
├── Customer Data
│   ├── Company attributes
│   ├── Health score (Gainsight calculated)
│   ├── NPS/CSAT scores
│   └── Product usage metrics
│
├── CTAs (Calls-to-Action)
│   ├── Open CTAs → Tasks
│   ├── CTA status updates
│   └── CTA outcomes
│
├── Timeline Activities
│   ├── Logged activities
│   └── Survey responses
│
└── Success Plans
    ├── Active plans
    ├── Objectives
    └── Milestones

Customer Tracker → Gainsight:
├── Engagement Data
│   ├── Logged notes/calls/meetings
│   └── Task completions
│
├── Custom Field Updates
│   └── Mapped fields sync back
│
└── Events (for Rules Engine)
    ├── Health score changes
    ├── Risk alerts triggered
    └── Renewal milestone events

Sync Configuration:
- Sync frequency: Real-time (webhooks) or scheduled (hourly)
- Conflict resolution: Configurable (Gainsight wins / App wins / newest)
- Field mapping: Admin-configurable field mappings
- Selective sync: Choose which customers/data to sync
```

### Future Integrations (P2)
| System | Purpose |
|--------|---------|
| **Support (Zendesk/Intercom)** | Ticket history, CSAT scores |
| **Product Analytics (Mixpanel/Amplitude)** | Usage data for health scoring |
| **Microsoft Teams** | Notifications, embedded views (alternative to Slack) |
| **Document Storage (Google Drive/SharePoint)** | Link relevant documents |
| **Jira** | Development work item tracking |
| **Pendo** | Product usage and adoption data |

---

## 7. Information Architecture

```
├── Dashboard (Home)
│   ├── Portfolio Overview
│   ├── My Tasks & Reminders
│   ├── Risk Alerts
│   ├── Upcoming Reminders
│   └── Recent Activity
│
├── Customers
│   ├── Customer List (searchable, filterable, custom columns)
│   └── Customer Profile
│       ├── Overview Tab
│       ├── Engagement Tab
│       ├── Tasks & Reminders Tab
│       ├── Financials Tab
│       ├── Contacts Tab
│       ├── Custom Fields Tab
│       ├── TargetProcess Tab (linked items)
│       └── Gainsight Tab (if integrated)
│
├── Tasks & Reminders
│   ├── My Tasks
│   ├── My Reminders
│   ├── Team Tasks
│   ├── By Customer
│   ├── By Type
│   ├── Overdue
│   ├── Upcoming
│   ├── Task Templates
│   └── TargetProcess Items
│
├── Reports
│   ├── Executive Dashboard
│   ├── Portfolio Health
│   ├── Renewal Forecast
│   ├── Team Activity
│   ├── Task Completion Report
│   ├── Custom Reports
│   └── Export Center
│       ├── PowerPoint Export
│       └── Excel Export
│
├── Imports
│   ├── Excel Import
│   ├── Import History
│   └── Field Mapping
│
└── Settings
    ├── Integrations
    │   ├── TargetProcess
    │   ├── Salesforce
    │   ├── Gainsight
    │   ├── Slack
    │   ├── Calendar
    │   └── Email
    ├── Custom Fields
    │   ├── Field Management
    │   └── Field Groups
    ├── Task & Reminder Settings
    │   ├── Task Types
    │   ├── Task Templates
    │   ├── Reminder Defaults
    │   └── Escalation Rules
    ├── Notification Preferences
    │   ├── In-App
    │   ├── Email
    │   └── Slack
    ├── Export Templates
    │   ├── PowerPoint Templates
    │   └── Report Templates
    ├── Team Management
    └── Preferences
```

---

## 8. Technical Architecture

### 8.1 Custom Fields Implementation

The custom fields system requires a flexible, schema-less approach:

```
Database Design:

-- Field definitions (metadata)
custom_field_definitions (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  field_type ENUM('text','number','currency','date','dropdown_single',
                  'dropdown_multi','checkbox','url','user_ref'),
  section VARCHAR(100),
  display_order INT,
  required BOOLEAN,
  default_value JSONB,
  options JSONB,           -- for dropdowns
  validation_rules JSONB,
  conditional_logic JSONB,
  visible_to_roles TEXT[],
  editable_by_roles TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Field values (EAV pattern with JSONB)
customer_custom_fields (
  customer_id UUID REFERENCES customers(id),
  field_values JSONB,      -- {field_id: value, ...}
  updated_at TIMESTAMP,
  updated_by UUID
)

-- Index for querying by custom field values
CREATE INDEX idx_custom_field_values ON customer_custom_fields
  USING GIN (field_values);
```

### 8.2 Export Architecture

```
Export Service Components:

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Export Request │────▶│  Export Engine   │────▶│  File Storage   │
│  (API/UI)       │     │                  │     │  (S3/Azure)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │  Excel  │ │  PPT    │ │  PDF    │
              │ Renderer│ │ Renderer│ │ Renderer│
              └─────────┘ └─────────┘ └─────────┘

Libraries:
- Excel: Apache POI / ExcelJS / OpenXML SDK
- PowerPoint: Apache POI / PptxGenJS / OpenXML SDK
- Charts: Convert chart data to native Office charts
```

### 8.3 TargetProcess Integration Architecture

```
Integration Pattern: API-based with webhook support

┌─────────────────┐                    ┌─────────────────┐
│ Customer Tracker│◀──── REST API ────▶│  TargetProcess  │
│                 │                    │                 │
│  ┌───────────┐  │    Webhooks        │                 │
│  │TP Sync    │◀─┼────────────────────┤                 │
│  │Service    │  │                    │                 │
│  └───────────┘  │                    │                 │
└─────────────────┘                    └─────────────────┘

Sync Strategy:
- Real-time: Webhooks for TP → App (item updates)
- Polling: App → TP for batch sync (every 5 min)
- On-demand: User-triggered refresh
- Conflict resolution: Last-write-wins with audit log
```

### 8.4 AI-Optimized Data Architecture

The data layer is designed for optimal AI/LLM access, enabling intelligent features like semantic search, automated insights, and conversational interfaces.

#### Design Principles for AI Access
| Principle | Implementation |
|-----------|----------------|
| **Semantic Richness** | Store embeddings alongside raw text for similarity search |
| **Context Windows** | Structure data to fit within LLM context limits |
| **Temporal Awareness** | Timestamp all data for time-based reasoning |
| **Relationship Graphs** | Explicit entity relationships for knowledge traversal |
| **Chunked Content** | Break long content into retrievable chunks |
| **Metadata Density** | Rich metadata for filtering and relevance ranking |

#### Vector Database Integration

```
Vector Storage Architecture:

┌─────────────────────────────────────────────────────────────────┐
│                     Customer Tracker App                        │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  PostgreSQL     │  │  Vector DB      │  │  Document Store │
│  (Structured)   │  │  (Embeddings)   │  │  (Files/Blobs)  │
│                 │  │                 │  │                 │
│ - Customers     │  │ - pgvector or   │  │ - S3/Azure Blob │
│ - Tasks         │  │ - Pinecone or   │  │ - Status reports│
│ - Contacts      │  │ - Weaviate or   │  │ - Attachments   │
│ - Custom Fields │  │ - Qdrant        │  │ - Exports       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  AI/LLM Layer   │
                    │                 │
                    │ - RAG Pipeline  │
                    │ - Embeddings    │
                    │ - Inference     │
                    └─────────────────┘

Recommended: pgvector extension for PostgreSQL (unified stack)
Alternative: Dedicated vector DB for scale (Pinecone, Weaviate)
```

#### LLM Provider Options

The application supports multiple LLM providers with automatic fallback:

| Provider | Model | Cost | Usage |
|----------|-------|------|-------|
| **Ollama (Default)** | llama3.1:8b, mistral, etc. | Free (local) | Primary provider for cost-free operation |
| **Anthropic** | Claude 3.5 Sonnet / Claude 3 Opus | Paid API | Fallback provider for advanced capabilities |

**Ollama Configuration:**
- Runs locally or in Docker container
- No API costs, full data privacy
- Recommended models: llama3.1:8b (4.9GB), mistral (4.1GB)

| Component | Model | Usage |
|-----------|-------|-------|
| **Text Generation** | Ollama (local) or Claude | Summaries, insights, conversational interface |
| **Embeddings** | Voyage AI (Anthropic partner) or alternative | Vector embeddings for semantic search |

#### Embedding Strategy

| Content Type | Embedding Model | Chunk Size | Overlap |
|--------------|-----------------|------------|---------|
| Engagement Notes | voyage-large-2 | 512 tokens | 50 tokens |
| Status Reports | voyage-large-2 | 1024 tokens | 100 tokens |
| Customer Summary | voyage-large-2 | Full document | N/A |
| Task Descriptions | voyage-large-2 | 256 tokens | 25 tokens |
| Email Content | voyage-large-2 | 512 tokens | 50 tokens |

#### AI-Ready Data Schema

```sql
-- Core customer table with AI metadata
customers (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  -- Standard fields...

  -- AI-optimized fields
  summary_embedding VECTOR(1536),      -- Customer summary embedding
  last_embedding_update TIMESTAMP,
  ai_generated_summary TEXT,           -- LLM-generated summary
  ai_health_factors JSONB,             -- AI-identified risk factors
  semantic_tags TEXT[]                 -- AI-extracted topics/themes
)

-- Engagement entries optimized for RAG
engagements (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  content TEXT,
  content_type VARCHAR(50),
  occurred_at TIMESTAMP,

  -- AI-optimized fields
  content_embedding VECTOR(1536),
  chunk_index INT,                     -- For chunked content
  parent_engagement_id UUID,           -- Link chunks to parent
  extracted_entities JSONB,            -- Named entities (people, orgs, dates)
  sentiment_score FLOAT,               -- -1 to 1
  key_topics TEXT[],                   -- Extracted topics
  action_items_extracted JSONB         -- AI-identified action items
)

-- Dedicated chunks table for long content
content_chunks (
  id UUID PRIMARY KEY,
  source_type VARCHAR(50),             -- 'engagement', 'status_report', etc.
  source_id UUID,
  chunk_index INT,
  content TEXT,
  token_count INT,
  embedding VECTOR(1536),
  metadata JSONB,                      -- Source context for retrieval
  created_at TIMESTAMP
)

-- AI conversation/query history for learning
ai_interactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  customer_id UUID,                    -- Optional: customer context
  query TEXT,
  query_embedding VECTOR(1536),
  retrieved_chunk_ids UUID[],
  response TEXT,
  feedback_rating INT,                 -- User feedback for improvement
  created_at TIMESTAMP
)

-- Indexes for vector similarity search
CREATE INDEX idx_customer_embedding ON customers
  USING ivfflat (summary_embedding vector_cosine_ops);

CREATE INDEX idx_engagement_embedding ON engagements
  USING ivfflat (content_embedding vector_cosine_ops);

CREATE INDEX idx_chunk_embedding ON content_chunks
  USING ivfflat (embedding vector_cosine_ops);
```

#### RAG (Retrieval-Augmented Generation) Pipeline

```
Query Flow:

User Query: "What risks have we discussed with Acme Corp?"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Query Processing                                         │
│    - Extract customer context (Acme Corp)                   │
│    - Identify query intent (risk-related)                   │
│    - Generate query embedding                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Hybrid Retrieval                                         │
│    - Vector similarity search (semantic)                    │
│    - Keyword search (BM25) for specific terms               │
│    - Filter by customer_id = Acme Corp                      │
│    - Filter by topics containing 'risk'                     │
│    - Rank and merge results (RRF)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Context Assembly                                         │
│    - Select top-k relevant chunks                           │
│    - Add customer metadata (health, ARR, renewal date)      │
│    - Include recent engagement summary                      │
│    - Fit within context window (~8k tokens)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. LLM Generation                                           │
│    - System prompt with CS domain knowledge                 │
│    - Retrieved context as grounding                         │
│    - Generate response with citations                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Response Enhancement                                     │
│    - Add source links to original engagements               │
│    - Highlight key dates and action items                   │
│    - Offer follow-up suggestions                            │
└─────────────────────────────────────────────────────────────┘
```

#### AI-Enabled Features

| Feature | Description | Data Requirements |
|---------|-------------|-------------------|
| **Semantic Search** | Natural language search across all customer data | Embeddings on all text content |
| **Customer Summarization** | Auto-generate customer health summaries | Full engagement history access |
| **Risk Detection** | Identify at-risk signals from communications | Sentiment analysis, topic extraction |
| **Meeting Prep** | Generate briefing docs before customer calls | Recent engagements, tasks, health data |
| **Action Item Extraction** | Auto-extract tasks from meeting notes | NLP entity extraction pipeline |
| **Similar Customer Finder** | Find customers with similar patterns | Customer-level embeddings |
| **Trend Analysis** | Identify portfolio-wide patterns | Time-series data, aggregated embeddings |
| **Conversational Interface** | Chat with your customer data | Full RAG pipeline |

#### Data Export for AI/ML

```
AI-Ready Export Formats:

1. JSONL (for fine-tuning)
   {"customer": "Acme", "engagement": "...", "outcome": "renewed"}
   {"customer": "Beta", "engagement": "...", "outcome": "churned"}

2. Parquet (for analytics/ML)
   - Columnar format for efficient queries
   - Includes embeddings as arrays
   - Partitioned by date/customer

3. Context Packages (for RAG)
   {
     "customer_id": "uuid",
     "context_window": {
       "metadata": {...},
       "recent_engagements": [...],
       "open_tasks": [...],
       "health_history": [...]
     },
     "token_count": 3500
   }
```

#### API Endpoints for AI Access

```
AI-Specific API Endpoints:

# Semantic search across all content
POST /api/v1/ai/search
{
  "query": "renewal concerns",
  "customer_id": "optional-filter",
  "top_k": 10,
  "include_embeddings": false
}

# Get customer context package for LLM
GET /api/v1/ai/context/{customer_id}
?max_tokens=8000
&include_sections=engagements,tasks,health

# Generate embedding for content
POST /api/v1/ai/embed
{
  "content": "Meeting notes text...",
  "model": "text-embedding-3-small"
}

# Trigger re-embedding for updated content
POST /api/v1/ai/reindex
{
  "entity_type": "engagement",
  "entity_ids": ["uuid1", "uuid2"]
}

# Get similar customers
GET /api/v1/ai/similar-customers/{customer_id}
?top_k=5
&similarity_threshold=0.8
```

#### Embedding Pipeline Architecture

```
Real-time Embedding Pipeline:

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Data Change │────▶│  Message     │────▶│  Embedding   │
│  (Create/    │     │  Queue       │     │  Worker      │
│   Update)    │     │  (Redis/SQS) │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  Embedding   │
                                          │  API         │
                                          │  (OpenAI)    │
                                          └──────────────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │  Vector DB   │
                                          │  Update      │
                                          └──────────────┘

Batch Re-indexing (nightly):
- Process all content modified in last 24h
- Update stale embeddings (>30 days old)
- Generate customer summary embeddings
- Compute similarity matrices
```

#### Privacy & Security for AI

| Requirement | Implementation |
|-------------|----------------|
| **Data Isolation** | Embeddings scoped to tenant; no cross-tenant retrieval |
| **PII Handling** | Option to exclude PII fields from embedding |
| **Audit Logging** | Log all AI queries and retrieved content |
| **Data Retention** | Embeddings deleted when source content deleted |
| **Model Selection** | Support for on-premise models (Ollama) for sensitive data |
| **Access Control** | AI queries respect same RBAC as direct data access |

---

## 9. UI Design System: IBM Carbon

The application will be built using the **IBM Carbon Design System** to ensure a consistent, accessible, and professional user interface.

### Why Carbon
| Benefit | Description |
|---------|-------------|
| **Enterprise-Ready** | Designed for complex enterprise applications |
| **Accessibility** | WCAG 2.1 AA compliant out of the box |
| **React Support** | First-class React component library |
| **Data Visualization** | Carbon Charts for dashboards and reports |
| **Consistency** | Unified design language across all screens |
| **Theming** | Support for light/dark modes and custom themes |

### Carbon Components to Utilize

#### Layout & Navigation
| Component | Usage |
|-----------|-------|
| **UI Shell** | Main application header and side navigation |
| **Breadcrumb** | Navigation hierarchy in customer profiles |
| **Tabs** | Customer profile sections, settings pages |
| **Side Panel** | Quick actions, task details, customer preview |

#### Data Display
| Component | Usage |
|-----------|-------|
| **Data Table** | Customer list, task list, engagement history |
| **Structured List** | Contact lists, document lists |
| **Tag** | Health status badges, task types, categories |
| **Tile** | Dashboard cards, customer summary cards |
| **Progress Indicator** | Task progress, onboarding stages |

#### Forms & Input
| Component | Usage |
|-----------|-------|
| **Text Input** | Customer fields, task titles, notes |
| **Text Area** | Descriptions, engagement notes |
| **Dropdown** | Field type selection, filters, assignments |
| **Multi Select** | Tags, multiple assignees |
| **Date Picker** | Due dates, renewal dates, reminders |
| **Search** | Global search, customer search |
| **File Uploader** | Document attachments, import files |

#### Feedback & Notifications
| Component | Usage |
|-----------|-------|
| **Notification (Toast)** | Task completed, reminder triggered |
| **Inline Notification** | Form validation, sync status |
| **Modal** | Confirmations, quick create forms |
| **Loading** | Data fetching, export generation |

#### Data Visualization (Carbon Charts)
| Chart Type | Usage |
|------------|-------|
| **Donut Chart** | Health distribution, task breakdown |
| **Bar Chart** | ARR by segment, team performance |
| **Line Chart** | Health trends over time |
| **Stacked Bar** | Renewal pipeline by status |
| **Gauge** | Portfolio health score |

### Design Specifications

```
Color Palette (Carbon Gray 100 Theme):
├── Primary: Carbon Blue 60 (#0f62fe)
├── Success/Green Health: Carbon Green 50 (#24a148)
├── Warning/Yellow Health: Carbon Yellow 30 (#f1c21b)
├── Danger/Red Health: Carbon Red 60 (#da1e28)
├── Background: Gray 10 (#f4f4f4)
├── Surface: White (#ffffff)
└── Text: Gray 100 (#161616)

Typography:
├── Font Family: IBM Plex Sans
├── Headings: IBM Plex Sans Semibold
├── Body: IBM Plex Sans Regular
└── Monospace: IBM Plex Mono (for IDs, code)

Spacing:
├── Base unit: 8px (Carbon spacing scale)
├── Component spacing: 16px (spacing-05)
└── Section spacing: 32px (spacing-07)

Breakpoints:
├── Small (Mobile): 320px - 671px
├── Medium (Tablet): 672px - 1055px
├── Large (Desktop): 1056px - 1311px
├── X-Large (Wide Desktop): 1312px - 1583px
└── Max (Ultra-wide): 1584px+
```

### Responsive Design: Desktop & Mobile

The application must provide a fully functional experience on both desktop and mobile devices through responsive web design.

#### Platform Support Matrix

| Platform | Form Factor | Min Resolution | Browser Support |
|----------|-------------|----------------|-----------------|
| **Desktop** | Laptop/Monitor | 1056px+ | Chrome, Firefox, Safari, Edge |
| **Tablet** | iPad/Android Tablet | 672px - 1055px | Safari, Chrome |
| **Mobile** | iPhone/Android Phone | 320px - 671px | Safari, Chrome |

#### Desktop Experience (1056px+)

```
Desktop Layout:
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo | Search | Notifications | User Menu              │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Side Nav  │              Main Content Area                     │
│            │                                                    │
│  - Dashboard│   ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  - Customers│   │  Card 1  │ │  Card 2  │ │  Card 3  │         │
│  - Tasks    │   └──────────┘ └──────────┘ └──────────┘         │
│  - Reports  │                                                   │
│  - Settings │   ┌────────────────────────────────────┐         │
│            │   │         Data Table                  │         │
│            │   │   (Full columns visible)            │         │
│            │   └────────────────────────────────────┘         │
│            │                                                    │
├────────────┴────────────────────────────────────────────────────┤
│  Footer (optional)                                              │
└─────────────────────────────────────────────────────────────────┘

Desktop Features:
- Persistent side navigation (collapsible)
- Multi-column layouts (2-4 columns)
- Full data tables with all columns
- Side panels for detail views
- Hover states and tooltips
- Keyboard shortcuts
- Drag-and-drop interactions
```

#### Mobile Experience (320px - 671px)

```
Mobile Layout:
┌─────────────────────┐
│ ☰  Logo    🔔  👤   │  ← Hamburger menu, notifications, profile
├─────────────────────┤
│                     │
│   Main Content      │
│   (Single column)   │
│                     │
│  ┌───────────────┐  │
│  │   Card 1      │  │  ← Full-width cards
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │   Card 2      │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │  List Item 1  │  │  ← Simplified lists
│  │  List Item 2  │  │
│  │  List Item 3  │  │
│  └───────────────┘  │
│                     │
├─────────────────────┤
│ 🏠  📋  ➕  📊  ⚙️  │  ← Bottom navigation bar
└─────────────────────┘

Mobile Features:
- Hamburger menu (slide-out navigation)
- Bottom navigation bar for primary actions
- Single-column layout
- Touch-optimized targets (min 44px)
- Swipe gestures for actions
- Pull-to-refresh
- Floating action button (FAB) for quick add
```

#### Responsive Component Behavior

| Component | Desktop Behavior | Mobile Behavior |
|-----------|------------------|-----------------|
| **Navigation** | Persistent side rail | Hamburger menu + bottom nav |
| **Data Table** | All columns visible, inline actions | Card-based list, swipe actions |
| **Customer Profile** | Tabbed layout, side panel details | Stacked sections, full-screen modals |
| **Dashboard** | Multi-column grid (3-4 cards/row) | Single column, scrollable |
| **Forms** | Inline labels, multi-column inputs | Stacked labels, full-width inputs |
| **Modals** | Centered overlay, max 60% width | Full-screen sheets |
| **Charts** | Full size with legends | Simplified, swipeable carousel |
| **Search** | Persistent search bar | Expandable search icon |
| **Filters** | Sidebar filter panel | Bottom sheet filter modal |
| **Actions** | Icon buttons with labels | Icon-only with tooltips on hold |

#### Mobile-Specific UI Patterns

```
Bottom Navigation (5 items max):
┌─────┬─────┬─────┬─────┬─────┐
│Home │Cust.│ ➕  │Tasks│More │
│ 🏠  │ 👥  │     │ ✓  │ ••• │
└─────┴─────┴─────┴─────┴─────┘

Floating Action Button (FAB):
┌─────────────────────┐
│                     │
│                 ╭─╮ │  ← Primary action (e.g., Add Note)
│                 │+│ │
│                 ╰─╯ │
└─────────────────────┘

Swipe Actions on List Items:
┌─────────────────────┐
│ ← Swipe Left        │  → Complete Task (Green)
│   Customer Name     │  → Delete (Red)
│ → Swipe Right       │  → Edit (Blue)
└─────────────────────┘

Pull to Refresh:
     ↓ ↓ ↓
┌─────────────────────┐
│   ◠ Refreshing...   │
├─────────────────────┤
│   Content           │
└─────────────────────┘
```

#### Mobile-Optimized Views

| Screen | Mobile Adaptation |
|--------|-------------------|
| **Customer List** | Card-based list with health badge, name, last contact; tap to expand |
| **Customer Profile** | Accordion sections; key info pinned at top |
| **Task List** | Grouped by due date; swipe to complete |
| **Dashboard** | Scrollable KPI cards; charts in carousel |
| **Engagement Entry** | Full-screen modal with voice input option |
| **Status Report (Partner)** | Step-by-step wizard flow |
| **Search Results** | Infinite scroll; filter chips at top |
| **Settings** | Standard iOS/Android settings pattern |

#### Touch Interaction Guidelines

| Interaction | Implementation |
|-------------|----------------|
| **Tap** | Primary selection, navigation |
| **Long Press** | Context menu, multi-select mode |
| **Swipe Left/Right** | Quick actions (complete, delete, archive) |
| **Swipe Down** | Pull to refresh |
| **Pinch** | Zoom on charts (optional) |
| **Double Tap** | Quick edit (optional) |

#### Mobile-First CSS Strategy

```scss
// Mobile-first approach with Carbon breakpoints
.customer-card {
  // Base: Mobile styles (320px+)
  display: flex;
  flex-direction: column;
  padding: $spacing-05;
  width: 100%;

  // Medium: Tablet (672px+)
  @include breakpoint(md) {
    flex-direction: row;
    padding: $spacing-06;
  }

  // Large: Desktop (1056px+)
  @include breakpoint(lg) {
    max-width: 33.33%;
    padding: $spacing-07;
  }
}

// Hide on mobile, show on desktop
.desktop-only {
  display: none;
  @include breakpoint(lg) {
    display: block;
  }
}

// Show on mobile, hide on desktop
.mobile-only {
  display: block;
  @include breakpoint(lg) {
    display: none;
  }
}
```

#### Progressive Web App (PWA) Features

| Feature | Description |
|---------|-------------|
| **Installable** | Add to home screen on iOS/Android |
| **Offline Support** | Cache critical data for offline viewing |
| **Push Notifications** | Task reminders, alerts (with permission) |
| **App-like Experience** | Full-screen mode, splash screen |
| **Background Sync** | Queue actions when offline, sync when online |

```json
// manifest.json
{
  "name": "Customer Status Tracker",
  "short_name": "CS Tracker",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f4f4f4",
  "theme_color": "#0f62fe",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

#### Offline Capabilities

| Data | Offline Access | Sync Behavior |
|------|----------------|---------------|
| **Customer List** | Cached (read-only) | Sync on reconnect |
| **Customer Profiles** | Recently viewed cached | Background sync |
| **My Tasks** | Full access, editable | Queue changes, sync on reconnect |
| **Engagement Notes** | Create offline, queue | Upload when online |
| **Dashboards** | Last fetched data | Refresh indicator |
| **Search** | Limited to cached data | Online required for full search |

### Accessibility Requirements (Carbon-Enabled)
| Requirement | Carbon Support |
|-------------|----------------|
| **Keyboard Navigation** | All components keyboard accessible |
| **Screen Readers** | ARIA labels and roles built-in |
| **Color Contrast** | Minimum 4.5:1 ratio enforced |
| **Focus Indicators** | Visible focus states on all interactive elements |
| **Motion Reduction** | Respects `prefers-reduced-motion` |

### Component Library Setup
```
Tech Stack:
├── Framework: React 18+
├── UI Library: @carbon/react (v1.x)
├── Charts: @carbon/charts-react
├── Icons: @carbon/icons-react
├── Styles: @carbon/styles (Sass)
└── Grid: Carbon 16-column grid system

Installation:
npm install @carbon/react @carbon/charts-react @carbon/icons-react
```

---

## 10. Non-Functional Requirements

### Performance
- Page load time < 2 seconds
- Search results < 500ms
- Support 50+ concurrent users
- Excel export < 10 seconds for 1000 rows
- PowerPoint generation < 15 seconds per deck

### Security
- SSO integration (SAML/OAuth)
- Role-based access control
- Audit logging for sensitive actions
- Data encryption at rest and in transit
- SOC 2 compliance ready
- Custom field-level permissions

### Availability
- 99.5% uptime SLA
- Daily automated backups
- Disaster recovery plan

### Usability
- Mobile-responsive design
- Accessibility (WCAG 2.1 AA)
- Intuitive UI requiring minimal training
- Custom field creation without IT support

---

## 11. Out of Scope (v1)

The following are explicitly **not** included in the initial release:

- Native mobile apps (iOS/Android)
- AI-powered health scoring
- Automated email sequences
- Customer-facing portal
- Real-time collaboration (simultaneous editing)
- Multi-language support
- Excel Add-in (live connection)

---

## 12. Release Phases

### Phase 1: Foundation (MVP)
- Customer profiles with core fields
- Custom fields architecture (basic types)
- Basic dashboard
- Task management
- Team access and roles
- Excel export (basic)

### Phase 2: Integration & Reporting
- TargetProcess integration
- Salesforce integration
- Management dashboard
- Report templates
- PowerPoint export
- Excel import

### Phase 3: Advanced Features
- Calendar sync
- Email logging
- Custom report builder
- Advanced custom fields (conditional logic)
- Scheduled exports

### Phase 4: AI & Intelligence
- AI-optimized data architecture (embeddings, vector storage)
- AI-suggested actions for customer engagement
- AI-suggested actions for customer success
- Semantic search across customer data
- Customer summarization
- Risk detection from engagement patterns
- Meeting prep assistance

---

## 13. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | ~~Which CRM is currently in use?~~ **Salesforce** | Product | ✅ Resolved |
| 2 | ~~What email/calendar system does the team use?~~ **Microsoft Outlook** | Product | ✅ Resolved |
| 3 | ~~Are there existing health scoring criteria to replicate?~~ **Yes - managed in Gainsight** | Product | ✅ Resolved |
| 4 | ~~What data fields are required for compliance/audit?~~ **Customer Name, Salesforce ID, Account Manager, CSM, Products Owned** | Product | ✅ Resolved |
| 5 | ~~What TargetProcess entity types need to be linked to customers?~~ **Custom entity called "Customer"** | Product | ✅ Resolved |
| 6 | ~~Is there a corporate PowerPoint template to use?~~ **Yes - corporate template will be provided** | Product | ✅ Resolved |
| 7 | ~~What custom fields are needed at launch?~~ **None pre-defined; admin ability to create as needed** | Product | ✅ Resolved |
| 8 | ~~What reports does management currently receive?~~ **Multiple PowerPoint decks (to be replicated)** | Product | ✅ Resolved |
| 9 | ~~Is Gainsight currently in use? What data should sync?~~ **Yes - health scores only for launch** | Product | ✅ Resolved |
| 10 | ~~What Slack workspace should integrate?~~ **Not required for launch - future phase** | Product | ✅ Resolved |
| 11 | ~~What task types and reminder rules are needed at launch?~~ **Follow-up tasks per customer** | Product | ✅ Resolved |
| 12 | ~~Should reminders escalate to managers?~~ **No escalation** | Product | ✅ Resolved |
| 13 | ~~Any custom Carbon theme requirements (colors, branding)?~~ **Use Carbon defaults with best practices** | Product | ✅ Resolved |
| 14 | ~~Who are the partner organizations that need access?~~ **Cprime, Rego, Merryville Consulting** | Product | ✅ Resolved |
| 15 | ~~What fields/sections should partners be able to see?~~ **Customer dashboard + edit: Status, Tasks, Milestones, Issues, Escalations** | Product | ✅ Resolved |
| 16 | ~~How often should partners submit status reports?~~ **Weekly** | Product | ✅ Resolved |
| 17 | ~~Is there a standard status report template to replicate?~~ **Existing templates exist but want improved UX - design new user-friendly approach** | Product | ✅ Resolved |
| 18 | ~~Should partner status reports require CSM approval/review?~~ **No approval required** | Product | ✅ Resolved |
| 19 | ~~Which LLM provider to use?~~ **Anthropic (Claude)** | Product | ✅ Resolved |
| 20 | ~~What AI features are highest priority for v1?~~ **None for v1; future: AI-suggested actions for engagement & success** | Product | ✅ Resolved |
| 21 | ~~Are there data privacy constraints for AI processing?~~ **No constraints at this time** | Product | ✅ Resolved |
| 22 | ~~Should embeddings be generated for historical data at launch?~~ **No - AI features are post-v1** | Product | ✅ Resolved |

---

## 14. Appendix

### A. Glossary
| Term | Definition |
|------|------------|
| ARR | Annual Recurring Revenue |
| Carbon | IBM Carbon Design System - the UI framework used for this application |
| CTA | Call-to-Action (Gainsight term for tasks/action items) |
| CSM | Customer Success Manager |
| EAV | Entity-Attribute-Value pattern for flexible data storage |
| Embedding | Vector representation of text for semantic similarity search |
| Gainsight | Customer Success platform for health scoring and workflows |
| Health Score | Indicator of customer relationship status (Red/Yellow/Green) |
| LLM | Large Language Model - AI model for text generation and analysis |
| Partner | External organization that delivers services to customers |
| pgvector | PostgreSQL extension for vector similarity search |
| QBR | Quarterly Business Review |
| RAG | Retrieval-Augmented Generation - AI pattern combining search with generation |
| Custom Field | User-defined data field added to extend the customer profile |
| TargetProcess | Agile project management tool for tracking work items |
| Vector DB | Database optimized for storing and querying embeddings |

### B. Revision History
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 8, 2026 | Product Team | Initial draft |
| 1.1 | Jan 8, 2026 | Product Team | Added: Custom fields architecture, Management dashboard/reports, PowerPoint export, Excel integration, TargetProcess integration |
| 1.2 | Jan 8, 2026 | Product Team | Added: Enhanced task & reminder management, Slack integration, Gainsight integration, IBM Carbon design system, Partner portal with status reporting |
| 1.3 | Jan 8, 2026 | Product Team | Added: AI-optimized data architecture with vector storage, RAG pipeline, embedding strategy, AI-enabled features, and API endpoints for AI access |
| 1.4 | Jan 8, 2026 | Product Team | Added: Responsive design for desktop and mobile, PWA features, offline capabilities, touch interactions, mobile-specific UI patterns |
| 1.5 | Jan 8, 2026 | Product Team | All 22 open questions resolved. Requirements complete. |
| 1.6 | Jan 8, 2026 | Product Team | Added: Customer Usage Framework with Adoption Steps (journey tracking) and Use Case Checklist |
| 1.7 | Jan 30, 2026 | Product Team | Added: Implementation Flow visualization with Sankey diagram showing assessment gaps → recommended use cases → TP features flow |
| 1.8 | Jan 30, 2026 | Product Team | Added: Ollama LLM support for cost-free AI chat, TargetProcess API integration with read/write capabilities, CS Tracker write operations via chat (update customer, task, risk) |

---

*This document is a living artifact and will be updated as requirements are refined.*
