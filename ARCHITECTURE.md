# CS Tracker Architecture

## Overview

CS Tracker (Customer Status Tracker) is a Customer Success Management application designed to help Customer Success Managers (CSMs) track and manage customer relationships, health, adoption, and engagement.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.13+)
- **Database**: PostgreSQL with asyncpg driver
- **ORM**: SQLAlchemy 2.0 (async)
- **Vector Search**: pgvector extension (future semantic search)
- **Caching**: Redis
- **Authentication**: JWT tokens with IBM w3id SSO support
- **Excel Processing**: openpyxl

### Frontend
- **Type**: Static HTML/CSS/JavaScript prototype
- **Styling**: IBM Carbon Design System (custom CSS implementation)
- **Charts**: Chart.js for visualizations
- **API Client**: Vanilla JavaScript fetch API

---

## Project Structure

```
CS Tracker/
├── backend/
│   └── app/
│       ├── api/           # FastAPI route handlers
│       ├── core/          # Configuration, database, auth
│       ├── models/        # SQLAlchemy ORM models
│       ├── schemas/       # Pydantic validation schemas
│       ├── main.py        # FastAPI application entry
│       └── db_init.py     # Database initialization & seeding
├── prototype/
│   ├── css/
│   │   └── styles.css     # Carbon-inspired styling
│   ├── js/
│   │   ├── api.js         # API client wrapper
│   │   ├── auth.js        # Authentication handling
│   │   └── *.js           # Page-specific JavaScript
│   └── *.html             # HTML pages
└── ARCHITECTURE.md
```

---

## Data Model

### Core Entities

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Customer  │────<│    Task     │     │    User     │
│             │     │             │>────│             │
│             │────<│ Engagement  │>────│             │
│             │     └─────────────┘     └─────────────┘
│             │                               │
│             │────<│    Risk     │>──────────┘
│             │     └─────────────┘
│             │
│             │────<│  Contact    │
│             │     └─────────────┘
│             │
│             │────<│ CustomerUseCase │>───┐
│             │     └─────────────────┘    │
│             │                            │
│             │────<│ CustomerAssessment │ │
│             │     └───────────────────┘  │
│             │                            │
│             │────<│    Roadmap   │       │
└─────────────┘     └──────────────┘       │
                           │               │
                    ┌──────┴──────┐        │
                    │ RoadmapItem │        │
                    └─────────────┘        │
                                          │
                    ┌─────────────┐        │
                    │   UseCase   │<───────┘
                    └─────────────┘

┌─────────────┐     ┌─────────────────────┐
│   Partner   │────<│     PartnerUser     │
└─────────────┘     └─────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│ AssessmentTemplate  │────<│ AssessmentDimension │
│                     │     └─────────────────────┘
│                     │────<│ AssessmentQuestion  │
└─────────────────────┘     └─────────────────────┘
```

### Key Entity Descriptions

| Entity | Purpose |
|--------|---------|
| **Customer** | Core entity representing a customer account with health, adoption, and financial data |
| **User** | Internal users (CSMs, managers, admins) and partner users |
| **Task** | Actionable items assigned to users for customer follow-up |
| **Engagement** | Log of customer interactions (meetings, calls, emails) |
| **Risk** | Customer risks with severity, status, and mitigation tracking |
| **Contact** | Customer-side stakeholders and contacts |
| **UseCase** | Master list of product use cases/features |
| **CustomerUseCase** | Tracks adoption status of use cases per customer |
| **Roadmap/RoadmapItem** | Product roadmap planning per customer |
| **AssessmentTemplate** | SPM maturity assessment templates |
| **CustomerAssessment** | Assessment instances completed for customers |
| **Partner** | External partner organizations |

### Key Enumerations

```python
# Customer Health
HealthStatus: RED | YELLOW | GREEN

# Adoption Journey
AdoptionStage: ONBOARDING | ADOPTION | VALUE_REALIZATION | EXPANSION | RENEWAL

# Use Case Status
UseCaseStatus: NOT_STARTED | IN_PROGRESS | IMPLEMENTED | OPTIMIZED

# Risk Severity
RiskSeverity: LOW | MEDIUM | HIGH | CRITICAL

# Risk Status
RiskStatus: OPEN | MITIGATING | RESOLVED | ACCEPTED

# User Roles
UserRole: ADMIN | MANAGER | CSM | READ_ONLY
```

---

## API Design

### RESTful Endpoints

All APIs follow RESTful conventions under `/api/v1/`:

| Resource | Endpoints |
|----------|-----------|
| Customers | `GET/POST /customers`, `GET/PATCH/DELETE /customers/{id}` |
| Tasks | `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/{id}` |
| Engagements | `GET/POST /engagements`, `GET/PATCH/DELETE /engagements/{id}` |
| Users | `GET/POST /users`, `GET/PATCH /users/{id}` |
| Risks | `GET/POST /risks`, `GET/PATCH/DELETE /risks/{id}` |
| Use Cases | `GET/POST /use-cases`, customer-specific: `/use-cases/customer/{id}` |
| Roadmaps | `GET/POST /roadmaps`, items: `/roadmaps/{id}/items` |
| Assessments | Templates & customer assessments management |
| Partners | `GET/POST /partners`, partner user management |
| Admin | Settings management, auth configuration |
| Auth | Login, token refresh, w3id SSO callbacks |

### API Patterns

1. **Pagination**: `skip` and `limit` query parameters
2. **Filtering**: Query parameters matching model fields
3. **Sorting**: `sort_by` and `sort_order` parameters
4. **Eager Loading**: SQLAlchemy `selectinload` for relationships
5. **Validation**: Pydantic schemas for request/response

### Response Format

```python
# List responses
{
    "items": [...],
    "total": 100,
    "skip": 0,
    "limit": 50
}

# Single item responses
{
    "id": 1,
    "name": "...",
    ...
}
```

---

## Frontend Architecture

### Page Structure

| Page | Purpose |
|------|---------|
| `index.html` | Dashboard with metrics overview |
| `customers.html` | Customer list with filtering |
| `customer-detail.html` | Single customer view with all details |
| `tasks.html` | Task management |
| `admin.html` | Admin settings, user/partner management |
| `login.html` | Authentication |

### JavaScript Organization

```javascript
// api.js - Centralized API client
const API_BASE_URL = 'http://localhost:8000/api/v1';

const CustomerAPI = {
    getAll(params) { ... },
    getById(id) { ... },
    create(data) { ... },
    update(id, data) { ... },
    delete(id) { ... }
};

// Page-specific JS files handle UI logic
// auth.js handles authentication state
```

### CSS Architecture

Two modal patterns exist for historical reasons:

1. **`.modal-overlay` pattern** (admin, tasks, customers pages):
   ```html
   <div class="modal-overlay" id="myModal">
     <div class="modal">...</div>
   </div>
   ```
   - Uses `.modal-overlay.active` to show

2. **`.modal.open` pattern** (customer-detail page):
   ```html
   <div class="modal" id="myModal">
     <div class="modal__overlay"></div>
     <div class="modal__container">...</div>
   </div>
   ```
   - Uses `.modal.open` to show

---

## Authentication

### Supported Methods

1. **IBM w3id SSO** (Primary)
   - OAuth 2.0 / OpenID Connect
   - Configured via `w3id_*` settings

2. **Password Authentication** (Fallback)
   - bcrypt password hashing
   - JWT token generation

### Auth Flow

```
1. User visits protected page
2. auth.js checks for valid JWT token
3. If no token/expired → redirect to login
4. Login via w3id SSO or password
5. Backend validates, returns JWT
6. Frontend stores token, includes in API requests
7. Backend validates JWT on each request
```

### App Settings

Authentication can be toggled via `AppSetting`:
- `auth_enabled`: Enable/disable auth requirement
- `auth_default_method`: "w3id" or "password"

---

## Key Design Decisions

### 1. Async-First Backend
- All database operations use async SQLAlchemy
- Enables high concurrency for API requests
- PostgreSQL with asyncpg for native async support

### 2. Static Frontend Prototype
- Vanilla HTML/CSS/JS for rapid prototyping
- No build step required
- Served directly by FastAPI static files mount
- Future: Consider React/Vue migration for complex state

### 3. Pydantic for Validation
- Separate schemas for Create, Update, Response
- Type safety between API layer and models
- Automatic OpenAPI documentation

### 4. JSONB for Flexibility
- `custom_fields` column on Customer
- `products_owned` as JSON array
- Allows schema flexibility without migrations

### 5. Soft Relationships via IDs
- Partner users linked via `partner_id`
- CSM ownership via `csm_owner_id`
- Enables flexible multi-tenancy

### 6. Use Case Hierarchy
- Solution Area → Domain → Use Case
- Supports SPM product suite organization (WFM, HPM, etc.)

### 7. Assessment Versioning
- Templates with dimensions and questions
- Customer assessments reference specific template version
- Historical tracking for maturity progression

---

## Integration Points

### Current
- **PostgreSQL**: Primary data store
- **Redis**: Session/cache store (configured, not heavily used)

### Planned/Configured
- **Salesforce**: Customer sync (`salesforce_id` field)
- **Gainsight**: Health data sync (`gainsight_id` field)
- **TargetProcess**: Roadmap sync (`targetprocess_id` field)
- **Anthropic**: AI-powered insights (`anthropic_api_key`)
- **pgvector**: Semantic search on customer data

---

## Development Workflow

### Running Locally

```bash
# Backend
cd backend
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Database init (first time)
python3 -m app.db_init

# Frontend served at: http://localhost:8000/prototype/
```

### Database

- PostgreSQL required with pgvector extension
- Connection: `postgresql+asyncpg://postgres:postgres@db:5432/cstracker`
- Auto-creates tables on startup via `init_db()`

### Environment Variables

Create `.env` in backend directory:
```
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
SECRET_KEY=your-secret-key
W3ID_CLIENT_ID=...
W3ID_CLIENT_SECRET=...
```

---

## Future Considerations

1. **Frontend Framework Migration**: Consider React/Vue for complex state management
2. **Real-time Updates**: WebSocket support for live dashboards
3. **Multi-tenancy**: Proper tenant isolation for SaaS deployment
4. **Audit Logging**: Track all data changes with user attribution
5. **API Versioning**: Prepare for v2 API with breaking changes
6. **Testing**: Expand unit and integration test coverage
7. **CI/CD**: Automated testing and deployment pipeline
