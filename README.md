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
- **AI/LLM**: Ollama (local/free) or Anthropic Claude API
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

The AI chat supports two providers: **Ollama** (free/local) and **Anthropic** (paid API).

#### Option 1: Ollama (Recommended - Free)

Run Ollama in a Docker/Podman container:

```bash
# Start Ollama container
podman run -d --name ollama -p 11434:11434 ollama/ollama

# Pull a model (e.g., llama3.1:8b)
podman exec -it ollama ollama pull llama3.1:8b
```

Configure in `.env`:
```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

#### Option 2: Anthropic Claude (Paid)

```bash
# In .env file
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

The system automatically falls back to Anthropic if Ollama is unavailable.

### Capabilities

The chat assistant can:

| Action | Description | Example Query |
|--------|-------------|---------------|
| **Query Data** | | |
| Search customers | Find customers by name, health status, or CSM | "Show me all red health customers" |
| Get customer details | View full customer context with tasks, risks, engagements | "Tell me about Acme Corp" |
| Portfolio summary | Get overview of your customer portfolio | "How is my portfolio doing?" |
| List tasks | View tasks with filters | "What are my overdue tasks?" |
| View renewals | See upcoming renewal dates | "Which customers have renewals this quarter?" |
| Search meeting notes | Find meeting notes by content | "Find meeting notes about migration" |
| **Create/Update CS Tracker Data** | | |
| Create tasks | Create follow-up tasks | "Create a task to follow up with Acme Corp" |
| Update tasks | Change task status, priority, assignee | "Mark task #123 as completed" |
| Log engagements | Record customer interactions | "Log a call with Acme Corp about renewal" |
| Create risks | Add customer risks | "Create a critical risk for Acme Corp" |
| Update risks | Change risk severity, status | "Resolve the renewal risk for Acme Corp" |
| Update customer | Modify health status, notes, adoption stage | "Set Acme Corp health to yellow" |
| **TargetProcess Integration** | | |
| Search TP items | Find UserStories, Bugs, Tasks, Features | "Search TargetProcess for open bugs" |
| Get TP details | View detailed TP item information | "Get details for TP item #12345" |
| Create TP items | Create new TP work items | "Create a feature request in TP" |
| Update TP items | Modify TP item state, description | "Update TP story #123 state" |
| Add TP comments | Add comments to TP items | "Add comment to TP bug #456" |

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
| **Customer Data** | |
| `search_customers` | Search customers by name, health status, or CSM |
| `get_customer_details` | Get full customer details with tasks and risks |
| `update_customer` | Update customer health status, notes, adoption stage |
| `get_renewals_upcoming` | Get customers with upcoming renewals |
| `get_portfolio_summary` | Get portfolio overview |
| **Tasks** | |
| `list_tasks` | List tasks with filters |
| `create_task` | Create a new task |
| `update_task` | Update task status, priority, due date, assignee |
| `complete_task` | Mark a task as completed |
| **Engagements** | |
| `list_engagements` | List engagements for a customer |
| `log_engagement` | Log a customer engagement |
| **Risks** | |
| `list_risks` | List risks with filters |
| `create_risk` | Create a new risk |
| `update_risk` | Update risk severity, status, mitigation plan |
| `get_risk_summary` | Get risk summary statistics |
| **Meeting Notes** | |
| `search_meeting_notes` | Search meeting notes |
| `create_meeting_note` | Create a meeting note |
| **TargetProcess Integration** | |
| `tp_search` | Search TP work items (UserStory, Bug, Task, Feature, Epic) |
| `tp_get_details` | Get detailed TP item information |
| `tp_create` | Create new TP items linked to a project |
| `tp_update` | Update TP item name, description, state |
| `tp_add_comment` | Add comment to a TP item |
| `tp_get_comments` | Get comments from a TP item |

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
| **LLM Configuration** | | |
| `LLM_PROVIDER` | LLM provider: "ollama" or "anthropic" | No (defaults to "ollama") |
| `LLM_MAX_TOKENS` | Max tokens for LLM responses | No (defaults to 4096) |
| **Ollama (Free/Local)** | | |
| `OLLAMA_BASE_URL` | Ollama API URL | No (defaults to http://localhost:11434) |
| `OLLAMA_MODEL` | Ollama model name | No (defaults to llama3.1:8b) |
| `OLLAMA_TIMEOUT` | Request timeout in seconds | No (defaults to 120) |
| **Anthropic (Paid)** | | |
| `ANTHROPIC_API_KEY` | Anthropic API key | No (required if using Anthropic) |
| `ANTHROPIC_MODEL` | Claude model to use | No (defaults to claude-sonnet-4-20250514) |
| **TargetProcess Integration** | | |
| `TARGETPROCESS_API_TOKEN` | TargetProcess API token | No (TP features disabled if not set) |
| `TARGETPROCESS_BASE_URL` | TargetProcess instance URL | No (defaults to https://tpondemand.tpondemand.com) |

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
