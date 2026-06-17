import { test, expect } from '@playwright/test'

/**
 * End-to-end smoke tests covering the public surface and authentication
 * routing of the app. These assertions are deterministic and do not require
 * seeded data. Full authenticated journeys (creating suppliers, generating
 * exports) require a provisioned PostgreSQL database and seeded account and
 * are intended to run against a staging environment.
 */

test.describe('Marketing landing page', () => {
  test('renders the hero and primary calls to action', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('EUDR Geolocation Data')
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
  })
})

test.describe('Authentication pages', () => {
  test('sign-up page shows the registration form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText('Create your account')).toBeVisible()
    await expect(page.locator('input[name="companyName"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('login page shows the sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Sign in to manage your suppliers')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('can navigate from login to sign-up', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Sign up' }).click()
    await page.waitForURL(/\/signup/)
    await expect(page.getByText('Create your account')).toBeVisible()
  })
})

test.describe('Protected routes', () => {
  test('unauthenticated access to the dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/)
    await expect(page.getByText('Sign in to manage your suppliers')).toBeVisible()
  })

  test('unauthenticated API requests are rejected with 401', async ({ request }) => {
    const response = await request.get('/api/suppliers')
    expect(response.status()).toBe(401)
  })
})

test.describe('Health check', () => {
  test('exposes a public health endpoint', async ({ request }) => {
    const response = await request.get('/api/health')
    // 200 when the database is reachable, 503 when it is not — both are valid
    // responses from the endpoint itself (i.e. the route is wired up).
    expect([200, 503]).toContain(response.status())
    const body = await response.json()
    expect(body).toHaveProperty('status')
  })
})
