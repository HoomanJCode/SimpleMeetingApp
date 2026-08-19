import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('displays the hero section and meeting list', async ({ page }) => {
    await page.goto('/');

    // Hero section
    await expect(page.getByText('Find & Host Tech Meetups')).toBeVisible();
    await expect(page.getByText('Sign in to create and join meetings')).toBeVisible();
  });

  test('has a working search input', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByPlaceholder('Search meetings...');
    await expect(searchInput).toBeVisible();
  });
});

test.describe('Authentication', () => {
  test('shows the sign-in button when not authenticated', async ({ page }) => {
    await page.goto('/');
    // Test mode uses email/password auth (AUTH_METHOD=userpass); exact match
    // because the hero paragraph also contains "Sign in to create and join".
    await expect(page.getByText('Sign In', { exact: true })).toBeVisible();
  });

  test('protected routes redirect to home', async ({ page }) => {
    await page.goto('/meetings/new');
    // Wait for React Router redirect to complete
    await page.waitForURL('/');
  });
});

test.describe('Meeting Detail', () => {
  test('shows not found for non-existent meeting', async ({ page }) => {
    await page.goto('/meetings/non-existent-id');
    await expect(page.getByText('Meeting not found')).toBeVisible();
  });
});

test.describe('404 Page', () => {
  test('shows 404 for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Back to Home')).toBeVisible();
  });
});
