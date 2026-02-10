# CS Tracker - Claude Code Instructions

## Container Architecture

This project runs in Podman containers. The UI is served by an Nginx container that copies static files at build time.

### Applying Frontend Changes

**IMPORTANT: Changes to frontend files (HTML, CSS, JavaScript) in the `prototype/` directory require a container rebuild to take effect.**

When modifying frontend files:

1. Make changes to files in `prototype/`
2. Rebuild and restart the frontend container:
   ```bash
   podman-compose build --no-cache cst-frontend && podman-compose up -d cst-frontend
   ```

Or rebuild all containers:
```bash
podman-compose down && podman-compose build --no-cache && podman-compose up -d
```

### Container Names (runtime)
- **cst-frontend** - Nginx serving static frontend files
- **cst-backend** - FastAPI backend server
- **cst-db** - PostgreSQL database
- **cst-redis** - Redis cache

### Docker Compose Service Names (for commands)
- **frontend** - Use with podman-compose commands
- **backend** - Use with podman-compose commands
- **db** - Use with podman-compose commands
- **redis** - Use with podman-compose commands

Example: `podman-compose build --no-cache frontend` (not cst-frontend)

### Database Name
- Database name: `cstracker` (not `cs_tracker`)

### Verifying Changes Are Applied

To verify a frontend file change is in the container:
```bash
podman exec cst-frontend grep -n "search_term" /usr/share/nginx/html/path/to/file.js
```

### Backend Changes

Backend Python changes typically require restarting the backend container:
```bash
podman-compose restart cst-backend
```

Or rebuild if dependencies changed:
```bash
podman-compose build --no-cache cst-backend && podman-compose up -d cst-backend
```

## API Base URL

The backend API is available at `http://localhost:8000/api/v1/`

## Enhancement Workflow

**IMPORTANT: Every enhancement must include an E2E UI test to validate it.**

When implementing enhancements:
1. Implement the feature (backend API, frontend UI, database changes)
2. Rebuild containers as needed
3. Create Playwright E2E test in `tests/e2e/` that validates the enhancement
4. Run the test to confirm the feature works correctly
5. Commit both the feature code and the test together

Test files should:
- Use authenticated state: `test.use({ storageState: 'tests/e2e/.auth/user.json' });`
- Cover the happy path and key edge cases
- Use meaningful assertions that verify the feature behavior
- Check for JavaScript console errors when testing UI changes

## Testing

Run Playwright E2E tests:
```bash
npx playwright test
```

Run specific test file:
```bash
npx playwright test tests/e2e/filename.spec.ts
```

Run auth setup before tests if needed:
```bash
npx playwright test tests/e2e/auth.setup.ts --project=setup
```
