import { test, expect } from '@playwright/test';

/**
 * API Integration Tests via Playwright
 *
 * These tests verify API endpoints directly without UI interaction.
 * Useful for testing API responses, error handling, and edge cases.
 */

test.describe('Health API', () => {
  test('should return healthy status', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('should check database health', async ({ request }) => {
    const response = await request.get('/api/v1/health/db');
    // May be 200 or 503 depending on DB
    expect([200, 503]).toContain(response.status());
  });
});

test.describe('Customers API', () => {
  test('should list customers', async ({ request }) => {
    const response = await request.get('/api/v1/customers');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test('should filter customers by health status', async ({ request }) => {
    const response = await request.get('/api/v1/customers?health_status=green');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    data.items.forEach(customer => {
      expect(customer.health_status).toBe('green');
    });
  });

  test('should paginate customers', async ({ request }) => {
    const response = await request.get('/api/v1/customers?skip=0&limit=5');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.items.length).toBeLessThanOrEqual(5);
    expect(data.skip).toBe(0);
    expect(data.limit).toBe(5);
  });

  test('should search customers by name', async ({ request }) => {
    const response = await request.get('/api/v1/customers?search=test');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  test('should return 404 for non-existent customer', async ({ request }) => {
    const response = await request.get('/api/v1/customers/99999');
    expect(response.status()).toBe(404);
  });

  test('should create customer with valid data', async ({ request }) => {
    const response = await request.post('/api/v1/customers', {
      data: {
        name: `API Test Customer ${Date.now()}`,
        health_status: 'green',
        adoption_stage: 'onboarding'
      }
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.name).toContain('API Test Customer');
    expect(data.id).toBeDefined();
  });

  test('should reject customer without name', async ({ request }) => {
    const response = await request.post('/api/v1/customers', {
      data: {
        health_status: 'green'
      }
    });

    expect(response.status()).toBe(422);
  });
});

test.describe('Tasks API', () => {
  test('should list tasks', async ({ request }) => {
    const response = await request.get('/api/v1/tasks');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
  });

  test('should filter tasks by status', async ({ request }) => {
    const response = await request.get('/api/v1/tasks?status=open');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    data.items.forEach(task => {
      expect(task.status).toBe('open');
    });
  });

  test('should filter tasks by priority', async ({ request }) => {
    const response = await request.get('/api/v1/tasks?priority=high');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    data.items.forEach(task => {
      expect(task.priority).toBe('high');
    });
  });
});

test.describe('Users API', () => {
  test('should list users', async ({ request }) => {
    const response = await request.get('/api/v1/users');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  test('should create user with valid data', async ({ request }) => {
    const email = `apitest${Date.now()}@example.com`;
    const response = await request.post('/api/v1/users', {
      data: {
        email: email,
        first_name: 'API',
        last_name: 'Test'
      }
    });

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.email).toBe(email);
  });

  test('should reject invalid email format', async ({ request }) => {
    const response = await request.post('/api/v1/users', {
      data: {
        email: 'invalid-email',
        first_name: 'Test',
        last_name: 'User'
      }
    });

    expect(response.status()).toBe(422);
  });
});

test.describe('Risks API', () => {
  test('should list risks', async ({ request }) => {
    const response = await request.get('/api/v1/risks');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
  });

  test('should get risk summary', async ({ request }) => {
    const response = await request.get('/api/v1/risks/summary');
    expect(response.ok()).toBeTruthy();
  });

  test('should filter risks by severity', async ({ request }) => {
    const response = await request.get('/api/v1/risks?severity=critical');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    data.items.forEach(risk => {
      expect(risk.severity).toBe('critical');
    });
  });

  test('should filter risks by status', async ({ request }) => {
    const response = await request.get('/api/v1/risks?status=open');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    data.items.forEach(risk => {
      expect(risk.status).toBe('open');
    });
  });
});

test.describe('Engagements API', () => {
  test('should list engagements', async ({ request }) => {
    const response = await request.get('/api/v1/engagements');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('items');
  });

  test('should filter engagements by type', async ({ request }) => {
    const response = await request.get('/api/v1/engagements?engagement_type=meeting');
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Partners API', () => {
  test('should list partners', async ({ request }) => {
    const response = await request.get('/api/v1/partners');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('items');
  });
});

test.describe('Lookups API', () => {
  test('should list lookup categories', async ({ request }) => {
    const response = await request.get('/api/v1/lookups/categories');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('should get category values', async ({ request }) => {
    const response = await request.get('/api/v1/lookups/category/industry');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });
});

test.describe('Admin API', () => {
  test('should get admin stats', async ({ request }) => {
    const response = await request.get('/api/v1/admin/stats');
    // May require admin auth
    expect([200, 401, 403]).toContain(response.status());
  });

  test('should get settings', async ({ request }) => {
    const response = await request.get('/api/v1/admin/settings');
    // May require admin auth
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Auth API', () => {
  test('should get auth status', async ({ request }) => {
    const response = await request.get('/api/v1/auth/status');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('auth_enabled');
    expect(data).toHaveProperty('password_available');
  });

  test('should reject login with invalid credentials', async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      }
    });

    expect(response.status()).toBe(401);
  });
});

test.describe('Meeting Notes API', () => {
  test('should list meeting notes', async ({ request }) => {
    const response = await request.get('/api/v1/meeting-notes');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('items');
  });
});
