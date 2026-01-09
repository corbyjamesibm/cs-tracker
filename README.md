# Customer Status Tracker (CS Tracker)

A comprehensive customer success tracking application built with FastAPI and PostgreSQL, designed to help teams manage customer relationships, track use cases, and monitor engagement.

## Features

- **Customer Management**: Track customer details, health scores, and key contacts
- **Use Case Tracking**: Monitor SPM Framework use case adoption across solution areas (WFM, HPM, EAP, POM, FPM)
- **Task Management**: Create and track customer-related tasks
- **Engagement History**: Log and review customer interactions
- **Admin Dashboard**: Manage use cases, categories, and system settings

## Tech Stack

- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL with SQLAlchemy async ORM
- **Frontend**: HTML/CSS/JavaScript (Carbon Design System inspired)
- **Containerization**: Podman/Docker

## Project Structure

```
CS Tracker/
├── backend/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   ├── core/         # Configuration and database setup
│   │   ├── models/       # SQLAlchemy models
│   │   └── schemas/      # Pydantic schemas
│   └── requirements.txt
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── nginx.conf
├── prototype/
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   └── *.html            # HTML pages
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

## API Endpoints

- `GET /api/v1/customers` - List customers
- `GET /api/v1/customers/{id}` - Get customer details
- `GET /api/v1/use-cases` - List use cases
- `GET /api/v1/use-cases/customer/{id}` - Get customer use case statuses
- `GET /api/v1/tasks` - List tasks
- `GET /api/v1/engagements` - List engagements

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
