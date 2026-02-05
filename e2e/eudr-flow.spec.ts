import { test, expect } from '@playwright/test'

test.describe('Full EUDR Compliance Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`

  test('complete journey from registration to export', async ({ page }) => {
    // 1. Register company
    await page.goto('/signup')
    await expect(page.locator('h1')).toContainText('Sign up')

    await page.fill('input[name="companyName"]', 'Coffee Corp International')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', 'SecureP@ss123!')
    await page.fill('input[name="confirmPassword"]', 'SecureP@ss123!')
    await page.selectOption('select[name="country"]', 'BR')

    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Dashboard')

    // 2. Create supplier
    await page.click('a:has-text("Suppliers")')
    await page.waitForURL(/\/dashboard\/suppliers/)
    await expect(page.locator('h1')).toContainText('Suppliers')

    await page.click('button:has-text("Add Supplier")')
    await expect(page.locator('h2')).toContainText('Add Supplier')

    await page.fill('input[name="name"]', 'Fazenda São Paulo')
    await page.selectOption('select[name="commodity"]', 'COFFEE')
    await page.fill('input[name="contactEmail"]', 'contact@fazenda.com')

    await page.click('button:has-text("Create Supplier")')

    // Should show success and supplier in list
    await expect(page.locator('text=Fazenda São Paulo')).toBeVisible({ timeout: 5000 })

    // 3. Navigate to production places
    await page.click('a:has-text("Production Places")')
    await page.waitForURL(/\/dashboard\/production-places/)
    await expect(page.locator('h1')).toContainText('Production Places')

    // 4. Add production place with polygon
    await page.click('button:has-text("Add Production Place")')
    await expect(page.locator('h2')).toContainText('Add Production Place')

    // Fill basic details
    await page.fill('input[name="name"]', 'Coffee Plot A')
    await page.fill('input[name="areaHectares"]', '15.5')
    await page.selectOption('select[name="country"]', 'BR')

    // Select supplier
    await page.selectOption('select[name="supplierId"]', { label: 'Fazenda São Paulo' })

    // Select polygon geometry
    await page.click('label:has-text("Polygon")')

    // Draw polygon on map (simplified - actual implementation depends on map component)
    // This is a placeholder for the actual map interaction
    await page.click('button[title="Draw polygon"]')

    // Enter coordinates manually as fallback
    await page.click('button:has-text("Enter coordinates manually")')
    await page.fill('textarea[name="coordinates"]', '[[-60.1, -10.1], [-60.0, -10.1], [-60.0, -10.0], [-60.1, -10.0], [-60.1, -10.1]]')

    await page.click('button:has-text("Save")')

    // Should validate and save
    await expect(page.locator('text=Coffee Plot A')).toBeVisible({ timeout: 5000 })

    // 5. Navigate to exports and generate export
    await page.click('a:has-text("Exports")')
    await page.waitForURL(/\/dashboard\/exports/)
    await expect(page.locator('h1')).toContainText('Exports')

    await page.click('button:has-text("Generate Export")')

    // Fill export options
    await expect(page.locator('h2')).toContainText('Generate Export')
    await page.check('label:has-text("Convert small plots to points")')
    await page.check('label:has-text("Include audit log")')

    // Select suppliers
    await page.click('button:has-text("Select suppliers")')
    await page.check('input[type="checkbox"]:near(:text("Fazenda São Paulo"))')
    await page.click('button:has-text("Apply")')

    // Submit export
    await page.click('button:has-text("Generate Export")')

    // Wait for processing
    await expect(page.locator('text=Export ready'), { timeout: 60000 }).toBeVisible()

    // Verify file was generated
    await expect(page.locator('a:has-text("Download ZIP")').first()).toBeVisible()

    // Verify file size is shown
    await expect(page.locator('text=KB')).toBeVisible()
  })
})

test.describe('Supplier Invitation Flow', () => {
  test('supplier receives and completes invitation', async ({ page }) => {
    // This test assumes a supplier invitation was created via API
    // In a real test, you'd either:
    // 1. Create the invitation via API call before the test
    // 2. Or use a pre-created invitation token

    const invitationToken = 'test-invitation-token-123'

    await page.goto(`/supplier/invite/${invitationToken}`)

    // Should show supplier registration form
    await expect(page.locator('h1')).toContainText('Complete')

    // Fill supplier details
    await page.fill('input[name="contactName"]', 'João Silva')
    await page.fill('input[name="contactPhone"]', '+55 11 99999-9999')
    await page.fill('input[name="address"]', 'Fazenda São Paulo, Rua Principal')

    await page.click('button[type="submit"]')

    // Should show success
    await expect(page.locator('text=complete')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Geolocation Validation', () => {
  test('validates invalid coordinates', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'SecureP@ss123!')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/)

    // Navigate to production places
    await page.click('a:has-text("Production Places")')

    await page.click('button:has-text("Add Production Place")')

    await page.fill('input[name="name"]', 'Invalid Plot')
    await page.fill('input[name="areaHectares"]', '10')

    // Enter invalid coordinates (latitude out of range)
    await page.click('button:has-text("Enter coordinates manually")')
    await page.fill('textarea[name="coordinates"]', '[[-60.123456, 95.123456]]')

    await page.click('button:has-text("Save")')

    // Should show validation error
    await expect(page.locator('text=latitude')).toBeVisible()
    await expect(page.locator('text=outside valid range')).toBeVisible()
  })
})
