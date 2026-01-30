# Customer Status Tracker (CS Tracker)

A comprehensive customer success tracking application built with FastAPI and PostgreSQL, designed to help teams manage customer relationships, track use cases, and monitor engagement.

## Features

- **Customer Management**: Track customer details, health scores, and key contacts
- **Use Case Tracking**: Monitor SPM Framework use case adoption across solution areas (WFM, HPM, EAP, POM, FPM)
- **Task Management**: Create and track customer-related tasks
- **Engagement History**: Log and review customer interactions
- **Risk Management**: Track and manage customer risks with severity levels and mitigation plans
- **Meeting Notes**: Document customer meetings with attendees, notes, and action items
- **Assessment Templates**: Create and manage assessment templates for customer evaluations
- **Admin Dashboard**: Manage use cases, categories, and system settings
- **AI Chat Assistant**: LLM-powered chat interface for querying and acting on customer data
- **MCP Server**: Model Context Protocol server for Claude Desktop and Claude Code integration

## Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL with SQLAlchemy async ORM
- **Cache**: Redis (for session management)
- **Frontend**: HTML/CSS/JavaScript (Carbon Design System inspired)
- **AI/LLM**: Anthropic Claude API
- **MCP Server**: TypeScript with Model Context Protocol SDK
- **Containerization**: Podman/Docker

## Project Structure

```
CS Tracker/
├── backend/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── core/         # Configuration and database setup
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic services (LLM, etc.)
│   └── requirements.txt
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── prototype/
│   ├── css/              # Stylesheets (including chat.css)
│   ├── js/               # JavaScript files (including chat.js)
│   └── *.html            # HTML pages
├── cs-tracker-mcp/       # MCP Server for Claude Desktop/Code
│   ├── src/
│   │   ├── index.ts      # MCP server entry point
│   │   ├── api-client.ts # CS Tracker REST API client
│   │   └── tools/        # MCP tool definitions
│   └── package.json
├── .env.example          # Environment variables template
└── podman-compose.yml    # Container orchestration
```

## Getting Started

### Prerequisites

- Podman or Docker
- Python 3.11+ (for local development)

### Running with Containers

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Build and start the containers:
   ```bash
   # Create network
   podman network create cst-network

   # Start database
   podman run -d --name cst-db --network cst-network \
     -p 5432:5432 \
     -e POSTGRES_DB=cstracker \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     postgres:15

   # Build and start backend
   podman build -t cs-tracker-backend -f docker/Dockerfile.backend .
   podman run -d --name cst-backend --network cst-network \
     -p 8000:8000 \
     -e DATABASE_URL="postgresql+asyncpg://postgres:postgres@cst-db:5432/cstracker" \
     cs-tracker-backend

   # Build and start frontend
   podman build -t cs-tracker-frontend -f docker/Dockerfile.frontend .
   podman run -d --name cst-frontend --network cst-network \
     -p 3000:80 \
     cs-tracker-frontend
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## AI Chat Assistant

The application includes an LLM-powered chat assistant that can query and act on customer data. The chat interface appears as a floating button on all pages.

### Configuration

To enable the AI chat assistant, add your Anthropic API key to the environment:

```bash
# In .env file or environment variables
ANTHROPIC_API_KEY=sk-ant-...
```

Or add it to the backend service in `podman-compose.yml`:

```yaml
backend:
  environment:
    - ANTHROPIC_API_KEY=sk-ant-...
```

### Capabilities

The chat assistant can:

| Action | Description | Example Query |
|--------|-------------|---------------|
| Search customers | Find customers by name, health status, or CSM | "Show me all red health customers" |
| Get customer details | View full customer context with tasks, risks, engagements | "Tell me about Acme Corp" |
| Portfolio summary | Get overview of your customer portfolio | "How is my portfolio doing?" |
| List/create tasks | View and create follow-up tasks | "Create a task to follow up with Acme Corp" |
| Log engagements | Record customer interactions | "Log a call with Acme Corp about renewal" |
| Manage risks | View and create customer risks | "What are the critical risks in my portfolio?" |
| Search meeting notes | Find meeting notes by content | "Find meeting notes about migration" |
| View renewals | See upcoming renewal dates | "Which customers have renewals this quarter?" |

### Usage

1. Click the chat button (bottom-right corner of any page)
2. Type your question or request
3. The assistant will query the database and respond with relevant information
4. Actions taken (tasks created, engagements logged, etc.) will be displayed with links

## MCP Server (Claude Desktop/Code Integration)

The MCP (Model Context Protocol) server enables Claude Desktop and Claude Code to interact directly with CS Tracker data.

### Setup

```bash
cd cs-tracker-mcp
npm install
npm run build
```

### Configuration for Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cs-tracker": {
      "command": "node",
      "args": ["/path/to/cs-tracker-mcp/dist/index.js"],
      "env": {
        "CS_TRACKER_API_URL": "http://localhost:8000/api/v1",
        "CS_TRACKER_API_TOKEN": "your-jwt-token-here"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_customers` | Search customers by name, health status, or CSM |
| `get_customer_details` | Get full customer details with tasks and risks |
| `get_renewals_upcoming` | Get customers with upcoming renewals |
| `list_tasks` | List tasks with filters |
| `create_task` | Create a new task |
| `complete_task` | Mark a task as completed |
| `list_engagements` | List engagements for a customer |
| `log_engagement` | Log a customer engagement |
| `list_risks` | List risks with filters |
| `create_risk` | Create a new risk |
| `get_risk_summary` | Get risk summary statistics |
| `get_portfolio_summary` | Get portfolio overview |
| `search_meeting_notes` | Search meeting notes |
| `create_meeting_note` | Create a meeting note |

## API Endpoints

### Core Endpoints
- `GET /api/v1/customers` - List customers
- `GET /api/v1/customers/{id}` - Get customer details
- `GET /api/v1/use-cases` - List use cases
- `GET /api/v1/use-cases/customer/{id}` - Get customer use case statuses
- `GET /api/v1/tasks` - List tasks
- `GET /api/v1/engagements` - List engagements

### Risk Management
- `GET /api/v1/risks` - List risks with filters
- `POST /api/v1/risks` - Create a new risk
- `GET /api/v1/risks/summary` - Get risk summary statistics

### Meeting Notes
- `GET /api/v1/meeting-notes` - List meeting notes
- `POST /api/v1/meeting-notes` - Create a meeting note

### Assessments
- `GET /api/v1/assessments/templates` - List assessment templates
- `POST /api/v1/assessments` - Create a customer assessment

### AI Chat
- `POST /api/v1/chat` - Send a message to the AI assistant

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SECRET_KEY` | JWT signing key | Yes |
| `REDIS_URL` | Redis connection string | No (defaults to localhost) |
| `ANTHROPIC_API_KEY` | Anthropic API key for chat assistant | No (chat disabled if not set) |
| `LLM_MODEL` | Claude model to use | No (defaults to claude-sonnet-4-20250514) |
| `LLM_MAX_TOKENS` | Max tokens for LLM responses | No (defaults to 4096) |

For the MCP server:

| Variable | Description | Required |
|----------|-------------|----------|
| `CS_TRACKER_API_URL` | CS Tracker API base URL | Yes |
| `CS_TRACKER_API_TOKEN` | JWT token for API authentication | Yes |

## SPM Framework Use Cases

The application tracks use case adoption across the SPM (Strategic Portfolio Management) Framework:

- **WFM** - Workforce Management
- **HPM** - Hybrid Portfolio Management
- **EAP** - Enterprise Agile Planning
- **POM** - Product Operations Management
- **FPM** - Financial Planning Management

Each solution area covers four domains:
- Strategic Planning
- Portfolio Management
- Resource Management
- Financial Management

## License

MIT
