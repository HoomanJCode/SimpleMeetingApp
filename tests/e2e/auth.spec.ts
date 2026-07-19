import { test, expect } from '../helpers/setup';
import { loginAs } from '../helpers/auth';

test.describe('Unauthenticated state', () => {
  test('home page shows Sign in with Google when logged out', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Sign in with Google')).toBeVisible();
    await expect(page.getByText('Sign Out')).not.toBeVisible();
  });

  test('protected routes redirect to home when not authenticated', async ({ page }) => {
    await page.goto('/meetings/new');
    await page.waitForURL('/');
  });

  test('auth callback with invalid tokens falls back to home unauthenticated', async ({ page }) => {
    await page.goto('/auth/callback?token=fake&refreshToken=fake');
    await page.waitForURL('/');

    await expect(page.getByText('Sign in with Google')).toBeVisible();
  });
});

test.describe('Authentication via loginAs', () => {
  test('shows user name and Sign Out after signing in as alice', async ({ page }) => {
    await loginAs(page, 'alice');

    await expect(page.getByText('Alice Host', { exact: true })).toBeVisible();
    await expect(page.getByText('Sign Out')).toBeVisible();
    await expect(page.getByText('Sign in with Google')).not.toBeVisible();
  });

  test('renders the Create Meeting CTA when signed in', async ({ page }) => {
    await loginAs(page, 'alice');

    // The header's "+ Create Meeting" link only appears for authenticated users.
    await expect(page.getByRole('link', { name: /Create Meeting/i })).toBeVisible();
  });

  test('authenticated user can navigate to /meetings/new without redirect', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.goto('/meetings/new');
    await expect(page).toHaveURL(/\/meetings\/new$/);
    await expect(page.getByText('Create a New Meeting')).toBeVisible();
  });

  test('authenticated user can navigate to /my-meetings without redirect', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.goto('/my-meetings');
    await expect(page).toHaveURL(/\/my-meetings$/);
  });
});

test.describe('Sign out', () => {
  test('signing out returns the user to the unauthenticated home', async ({ page }) => {
    await loginAs(page, 'alice');
    await expect(page.getByText('Alice Host', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/$/);

    await expect(page.getByText('Sign in with Google')).toBeVisible();
    await expect(page.getByText('Sign Out')).not.toBeVisible();
  });
});
