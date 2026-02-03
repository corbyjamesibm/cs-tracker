# CS Tracker MCP Server

An MCP (Model Context Protocol) server that enables Claude Desktop and Claude Code to interact with CS Tracker.

## Features

- **Customer Management**: Search customers, get details, view upcoming renewals
- **Task Management**: List, create, and complete tasks
- **Engagement Logging**: Log customer interactions
- **Risk Management**: List, create risks, view risk summaries
- **Portfolio Analytics**: Get portfolio summaries and search meeting notes

## Installation

```bash
cd cs-tracker-mcp
npm install
npm run build
```

## Configuration

Set the following environment variables:

```bash
export CS_TRACKER_API_URL=http://localhost:8000/api/v1
export CS_TRACKER_API_TOKEN=<your-jwt-token>
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cs-tracker": {
      "command": "node",
      "args": ["/path/to/cs-tracker-mcp/dist/index.js"],
      "env": {
        "CS_TRACKER_API_URL": "http://localhost:8000/api/v1",
        "CS_TRACKER_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Available Tools

### Customers
- `search_customers` - Search customers by name, health status, or CSM
- `get_customer_details` - Get full customer details with tasks and risks
- `get_renewals_upcoming` - Get customers with upcoming renewals

### Tasks
- `list_tasks` - List tasks with filters
- `create_task` - Create a new task
- `complete_task` - Mark a task as completed

### Engagements
- `list_engagements` - List engagements for a customer
- `log_engagement` - Log a customer engagement

### Risks
- `list_risks` - List risks with filters
- `create_risk` - Create a new risk
- `get_risk_summary` - Get risk summary statistics

### Analytics
- `get_portfolio_summary` - Get portfolio overview
- `search_meeting_notes` - Search meeting notes
- `create_meeting_note` - Create a meeting note

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```
