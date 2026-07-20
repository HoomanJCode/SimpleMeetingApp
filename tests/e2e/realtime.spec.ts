import { expect, type BrowserContext, type Page } from '@playwright/test';
import { test } from '../helpers/setup';
import { loginAs } from '../helpers/auth';
import { validMeeting, futureDateTime } from '../fixtures/meetings';
import { FRONTEND_URL } from '../helpers/api';

function formatDateTimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

function meetingIdFromUrl(url: string): string {
  return url.split('/').pop()!;
}

/**
 * Helper: run a multi-user scenario with two isolated browser contexts.
 * Contexts are guaranteed to be closed in a finally block.
 */
async function withTwoUsers<T>(
  browser: { newContext: () => Promise<BrowserContext> },
  fn: (alice: { page: Page; ctx: BrowserContext }, bob: { page: Page; ctx: BrowserContext }) => Promise<T>,
): Promise<T> {
  const aliceCtx = await browser.newContext();
  const bobCtx = await browser.newContext();
  const alicePage = await aliceCtx.newPage();
  const bobPage = await bobCtx.newPage();
  try {
    return await fn(
      { page: alicePage, ctx: aliceCtx },
      { page: bobPage, ctx: bobCtx },
    );
  } finally {
    await aliceCtx.close();
    await bobCtx.close();
  }
}

/** Helper shared by several tests: Alice creates a meeting and returns its URL. */
async function aliceCreatesMeeting(page: Page, title: string): Promise<string> {
  await page.goto(`${FRONTEND_URL}/meetings/new`);
  await page.getByLabel('Title *').fill(title);
  await page.getByLabel('Description *').fill(validMeeting.description);
  await page.getByLabel('Location *').fill(validMeeting.location);
  await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
  await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
  await page.getByRole('button', { name: 'Create Meeting' }).click();
  await page.waitForURL(/\/meetings\/[\w-]+/);
  return page.url();
}

test.describe('Realtime WebSocket Updates', () => {
  test('connection state indicator shows connected state on meeting detail page', async ({ page }) => {
    await loginAs(page, 'alice');
    await aliceCreatesMeeting(page, validMeeting.title);

    // Connection status should show "Live"
    await expect(page.getByText(/live|connected/i)).toBeVisible({ timeout: 10_000 });
  });

  test('when another user joins, participant count and name update in real time', async ({ browser }) => {
    await withTwoUsers(browser, async (alice, bob) => {
      await loginAs(alice.page, 'alice');
      const meetingUrl = await aliceCreatesMeeting(alice.page, 'Realtime Join Test');

      await loginAs(bob.page, 'bob');
      await bob.page.goto(meetingUrl);
      await bob.page.waitForURL(`**/meetings/${meetingIdFromUrl(meetingUrl)}`);

      // Bob joins
      await bob.page.getByRole('button', { name: /join meeting/i }).click();
      await expect(bob.page.getByRole('button', { name: /leave meeting/i })).toBeVisible({ timeout: 10_000 });

      // Alice sees updated participant count and Bob's name
      await expect(alice.page.getByText(/2\/10/)).toBeVisible({ timeout: 15_000 });
      await expect(alice.page.getByText('Bob Participant')).toBeVisible({ timeout: 10_000 });
    });
  });

  test('when host edits meeting title, all viewers see the update in real time', async ({ browser }) => {
    await withTwoUsers(browser, async (alice, bob) => {
      await loginAs(alice.page, 'alice');
      const meetingUrl = await aliceCreatesMeeting(alice.page, 'Original Title');

      await loginAs(bob.page, 'bob');
      await bob.page.goto(meetingUrl);
      await bob.page.waitForURL(`**/meetings/${meetingIdFromUrl(meetingUrl)}`);

      // Alice edits the title
      await alice.page.getByRole('link', { name: 'Edit' }).click();
      await alice.page.waitForURL(/\/meetings\/[\w-]+\/edit/);
      await alice.page.getByLabel('Title *').fill('Updated Title');
      await alice.page.getByRole('button', { name: 'Save Changes' }).click();
      await alice.page.waitForURL(/\/meetings\/[\w-]+/);
      await expect(alice.page.getByRole('heading', { name: 'Updated Title' })).toBeVisible();

      // Bob should see the updated title via WebSocket
      await expect(bob.page.getByRole('heading', { name: 'Updated Title' })).toBeVisible({ timeout: 15_000 });
    });
  });

  test('when host deletes meeting, viewers are redirected to home', async ({ browser }) => {
    await withTwoUsers(browser, async (alice, bob) => {
      await loginAs(alice.page, 'alice');
      const meetingUrl = await aliceCreatesMeeting(alice.page, 'Delete Test Meeting');

      await loginAs(bob.page, 'bob');
      await bob.page.goto(meetingUrl);
      await bob.page.waitForURL(`**/meetings/${meetingIdFromUrl(meetingUrl)}`);

      // Alice deletes the meeting
      await alice.page.getByRole('button', { name: 'Delete' }).click();
      await alice.page.getByRole('button', { name: 'Delete' }).click();
      await alice.page.waitForURL(`${FRONTEND_URL}/`);

      // Bob should be redirected to home via meeting:deleted event
      await bob.page.waitForURL(`${FRONTEND_URL}/`, { timeout: 15_000 });
    });
  });
});
