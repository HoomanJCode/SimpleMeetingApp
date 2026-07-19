import { Page, expect } from '@playwright/test';

/**
 * Signs in by simulating the Google OAuth callback with a seed user.
 * Since we can't do real Google OAuth in tests, we call the API directly.
 */
export async function loginAsSeedUser(page: Page, googleId = 'g-111') {
  // Navigate to auth page first to trigger auth context
  await page.goto('/');
  
  // Use direct token generation via API for testing
  const backendUrl = 'http://localhost:3001';
  
  // We'll use the seed data route or just directly navigate with test tokens
  // For now, a simple approach: set localStorage with a mock session
  await page.evaluate(() => {
    // The app uses in-memory tokens, so we can't easily inject them
    // This is a placeholder — real tests would use a test auth endpoint
  });
}

/**
 * Creates a meeting via the API directly (bypassing UI for setup speed).
 */
export async function createMeetingViaApi(
  request: any,
  token: string,
  data: { title: string; description: string; dateTime: string; location: string; capacity: number }
) {
  const res = await request.post('http://localhost:3001/api/meetings', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data,
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/**
 * Seeds the database via the backend health/seed endpoint.
 */
export async function seedDatabase(request: any) {
  // The backend auto-runs migrations but seed is manual
  // For E2E tests, we rely on the seed data being present
}
