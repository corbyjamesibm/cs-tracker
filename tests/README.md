# CS Tracker Test Suite

Comprehensive test suite for the CS Tracker application, covering both backend API testing and end-to-end UI testing.

## Test Structure

```
tests/
├── backend/              # Backend API tests (pytest)
│   ├── conftest.py       # Test fixtures and configuration
│   ├── test_health.py    # Health check endpoint tests
│   ├── test_auth.py      # Authentication tests
│   ├── test_customers.py # Customer CRUD tests
│   ├── test_users.py     # User management tests
│   ├── test_tasks.py     # Task management tests
│   ├── test_risks.py     # Risk tracking tests
│   ├── test_engagements.py # Engagement tests
│   ├── test_partners.py  # Partner management tests
│   ├── test_admin.py     # Admin functionality tests
│   ├── test_lookups.py   # Lookup values tests
│   └── test_meeting_notes.py # Meeting notes tests
├── e2e/                  # End-to-end tests (Playwright)
│   ├── .auth/            # Authentication state storage
│   ├── reports/          # Test reports (generated)
│   ├── auth.setup.ts     # Authentication setup
│   ├── login.spec.ts     # Login page tests
│   ├── dashboard.spec.ts # Dashboard tests
│   ├── customers.spec.ts # Customers page tests
│   ├── customer-detail.spec.ts # Customer detail tests
│   ├── tasks.spec.ts     # Tasks page tests
│   ├── admin.spec.ts     # Admin page tests
│   └── api.spec.ts       # API integration tests
└── README.md             # This file
```

## Prerequisites

### Backend Tests
- Python 3.11+
- pytest and pytest-asyncio (included in requirements.txt)
- SQLite with aiosqlite for testing (no database setup required)

### E2E Tests
- Node.js 18+
- Playwright browsers (installed via npm)

## Quick Start

### Install Dependencies

```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# E2E dependencies
cd ..
npm install
npx playwright install --with-deps chromium
```

### Run All Tests

```bash
./run_tests.sh
```

### Run Backend Tests Only

```bash
./run_tests.sh --backend-only

# Or directly with pytest:
cd backend
python -m pytest ../tests/backend -v
```

### Run E2E Tests Only

```bash
./run_tests.sh --e2e-only

# Or directly with Playwright:
npx playwright test --project=chromium
```

## Backend Tests

### Running Tests

```bash
# Run all backend tests
cd backend
python -m pytest ../tests/backend -v

# Run specific test file
python -m pytest ../tests/backend/test_customers.py -v

# Run specific test
python -m pytest ../tests/backend/test_customers.py::TestCustomerCreate::test_create_customer_minimal -v

# Run with coverage
python -m pytest ../tests/backend -v --cov=app --cov-report=html
```

### Test Categories

Tests are organized by API module:

- **test_health.py**: Application and database health checks
- **test_auth.py**: Login, logout, token validation
- **test_customers.py**: Customer CRUD, contacts, adoption tracking
- **test_users.py**: User management, roles
- **test_tasks.py**: Task CRUD, status updates
- **test_risks.py**: Risk tracking, resolution, summary
- **test_engagements.py**: Customer engagement logging
- **test_partners.py**: Partner and partner user management
- **test_admin.py**: Admin settings, statistics
- **test_lookups.py**: Configurable dropdown values
- **test_meeting_notes.py**: Meeting notes CRUD

### Fixtures

The `conftest.py` file provides shared fixtures:

- `client`: Async HTTP test client
- `db_session`: Database session with automatic rollback
- `test_user`: Standard test user
- `admin_user`: Admin test user
- `auth_headers`: JWT auth headers for test user
- `test_customer`, `test_task`, `test_risk`: Sample entities
- `data_factory`: Factory for creating multiple test objects

## E2E Tests (Playwright)

### Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run with UI mode (interactive)
npx playwright test --ui

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/e2e/customers.spec.ts

# Run specific project (browser)
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Debug mode
npx playwright test --debug
```

### Viewing Reports

```bash
# After test run, view HTML report
npx playwright show-report tests/e2e/reports
```

### Test Files

- **auth.setup.ts**: Sets up authentication state for all tests
- **login.spec.ts**: Login page validation, authentication flows
- **dashboard.spec.ts**: Dashboard metrics, navigation
- **customers.spec.ts**: Customer list, filtering, CRUD
- **customer-detail.spec.ts**: Customer detail page, tabs, editing
- **tasks.spec.ts**: Task management, filtering
- **admin.spec.ts**: Admin settings, user management
- **api.spec.ts**: Direct API endpoint testing

### Browser Projects

Tests run on multiple browsers:
- **chromium**: Google Chrome/Edge
- **firefox**: Mozilla Firefox
- **webkit**: Safari
- **mobile-chrome**: Mobile viewport

## CI/CD Integration

The test suite is integrated with GitHub Actions (`.github/workflows/test.yml`):

1. **Backend Tests**: Run on every push/PR with PostgreSQL service
2. **E2E Tests**: Run after backend tests pass
3. **Lint**: Python code quality checks

### GitHub Actions Features

- Parallel test execution
- Coverage reporting to Codecov
- Playwright report artifacts
- Trace artifacts on failure

## Test Data

Backend tests create isolated data per test using pytest fixtures. Each test gets a fresh in-memory SQLite database that is automatically rolled back after the test completes.

E2E tests run against the actual application with the configured database.

## Best Practices

### Writing Backend Tests

1. Use provided fixtures for common entities
2. Test both success and error cases
3. Verify response structure and data
4. Use `pytest.mark.asyncio` for async tests
5. Group related tests in classes

```python
class TestCustomerCreate:
    @pytest.mark.asyncio
    async def test_create_customer_success(self, client, test_user):
        response = await client.post("/api/v1/customers", json={...})
        assert response.status_code == 201
```

### Writing E2E Tests

1. Use meaningful test descriptions
2. Wait for elements before interacting
3. Handle dynamic content gracefully
4. Use page objects for complex pages
5. Test user flows, not just clicks

```typescript
test('should create new customer', async ({ page }) => {
  await page.goto('/prototype/customers.html');
  await page.click('button:has-text("Add")');
  await page.fill('input[name="name"]', 'Test Customer');
  await page.click('button:has-text("Save")');
  await expect(page.locator('.success')).toBeVisible();
});
```

## Troubleshooting

### Backend Tests

**Database connection errors**: Tests use SQLite in-memory by default. Ensure `aiosqlite` is installed.

**Import errors**: Run tests from the project root or ensure `backend` is in the Python path.

### E2E Tests

**Browser not found**: Run `npx playwright install --with-deps`

**Timeout errors**: Increase timeout in test or wait for specific elements.

**Auth issues**: Check that `tests/e2e/.auth/user.json` exists (created by setup).

## Contributing

1. Add tests for new features
2. Maintain test coverage above 80%
3. Follow existing test patterns
4. Update this README for significant changes
