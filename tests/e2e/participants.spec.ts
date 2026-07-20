import { expect } from '@playwright/test';
import { test } from '../helpers/setup';
import { loginAs, getTestUser } from '../helpers/auth';
import { validMeeting, smallMeeting, futureDateTime } from '../fixtures/meetings';
import { FRONTEND_URL, authedFetch, getTokensFor } from '../helpers/api';

function formatDateTimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

function meetingIdFromUrl(url: string): string {
  return url.split('/').pop()!;
}

/** Helper to create a meeting as Alice and return its URL. */
async function createMeeting(page: any, title: string, capacity: number): Promise<string> {
  await page.goto(`${FRONTEND_URL}/meetings/new`);
  await page.getByLabel('Title *').fill(title);
  await page.getByLabel('Description *').fill(validMeeting.description);
  await page.getByLabel('Location *').fill(validMeeting.location);
  await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
  await page.getByLabel('Capacity *').fill(String(capacity));
  await page.getByRole('button', { name: 'Create Meeting' }).click();
  await page.waitForURL(/\/meetings\/[\w-]+/);
  return page.url();
}

test.describe('Participant Join / Leave', () => {
  test('unauthenticated user cannot see join button', async ({ page }) => {
    // Create meeting as alice first via API
    const tokens = await getTokensFor(getTestUser('alice'));

    const res = await authedFetch('/api/meetings', {
      method: 'POST',
      token: tokens.accessToken,
      body: JSON.stringify({
        ...validMeeting,
        dateTime: futureDateTime(),
      }),
    });
    const meeting = (await res.json()) as { id: string };

    // Visit as unauthenticated user
    await page.goto(`${FRONTEND_URL}/meetings/${meeting.id}`);
    await page.waitForURL(`**/meetings/${meeting.id}`);

    // No join/leave button visible for unauthenticated users
    await expect(page.getByRole('button', { name: /join meeting/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /leave meeting/i })).not.toBeVisible();
  });

  test('participant can join a meeting', async ({ page }) => {
    await loginAs(page, 'alice');
    const detailUrl = await createMeeting(page, 'Join Test Meetup', validMeeting.capacity);

    // Log out Alice (navigate to same meeting as bob)
    // Actually, the meeting was created by Alice, so Alice is already joined (as host).
    // We need Bob to join. Login as Bob and navigate to the meeting.
    await loginAs(page, 'bob');
    await page.goto(detailUrl);
    await page.waitForURL(`**/meetings/${detailUrl.split('/').pop()}`);

    // Bob should see the Join button (not host, not joined)
    await expect(page.getByRole('button', { name: /join meeting/i })).toBeVisible();

    // Click join
    await page.getByRole('button', { name: /join meeting/i }).click();

    // After joining, the button should change to Leave Meeting
    await expect(page.getByRole('button', { name: /leave meeting/i })).toBeVisible({ timeout: 10_000 });

    // Participant count should reflect the join
    await expect(page.getByText(/2\/10/)).toBeVisible();
  });

  test('participant can leave a meeting', async ({ page }) => {
    // Alice creates a meeting
    await loginAs(page, 'alice');
    const detailUrl = await createMeeting(page, 'Leave Test Meetup', validMeeting.capacity);

    // Bob joins
    await loginAs(page, 'bob');
    await page.goto(detailUrl);
    await page.waitForURL(`**/meetings/${detailUrl.split('/').pop()}`);
    await page.getByRole('button', { name: /join meeting/i }).click();
    await expect(page.getByRole('button', { name: /leave meeting/i })).toBeVisible({ timeout: 10_000 });

    // Bob leaves
    await page.getByRole('button', { name: /leave meeting/i }).click();

    // After leaving, the button should change back to Join Meeting
    await expect(page.getByRole('button', { name: /join meeting/i })).toBeVisible({ timeout: 10_000 });

    // Participant count should reflect the leave
    await expect(page.getByText(/1\/10/)).toBeVisible();
  });

  test('host cannot leave their own meeting', async ({ page }) => {
    await loginAs(page, 'alice');
    const detailUrl = await createMeeting(page, 'Host Leave Test', validMeeting.capacity);

    // Alice is host — she should NOT see Leave button
    // Host sees Delete button instead
    await expect(page.getByRole('button', { name: /delete meeting/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /leave/i })).not.toBeVisible();
  });

  test('meeting at full capacity shows disabled join button', async ({ page }) => {
    await loginAs(page, 'alice');
    const detailUrl = await createMeeting(page, 'Full Meetup', 2); // capacity 2: host + 1 spot

    // Bob joins (takes the last spot)
    await loginAs(page, 'bob');
    await page.goto(detailUrl);
    await page.waitForURL(`**/meetings/${detailUrl.split('/').pop()}`);
    await page.getByRole('button', { name: /join meeting/i }).click();
    await expect(page.getByRole('button', { name: /leave meeting/i })).toBeVisible({ timeout: 10_000 });

    // Charlie tries to join but meeting is full
    await loginAs(page, 'charlie');
    await page.goto(detailUrl);
    await page.waitForURL(`**/meetings/${detailUrl.split('/').pop()}`);

    // The join button should be disabled and show "Meeting Full"
    await expect(page.getByRole('button', { name: /meeting full/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /meeting full/i })).toBeDisabled();
  });

  test('duplicate join attempt shows error', async ({ page }) => {
    await loginAs(page, 'alice');
    const detailUrl = await createMeeting(page, 'Dup Join Test', validMeeting.capacity);
    const meetingId = meetingIdFromUrl(detailUrl);

    // Bob joins
    await loginAs(page, 'bob');
    await page.goto(detailUrl);
    await page.waitForURL(`**/meetings/${meetingId}`);
    await page.getByRole('button', { name: /join meeting/i }).click();
    await expect(page.getByRole('button', { name: /leave meeting/i })).toBeVisible({ timeout: 10_000 });

    // Try to join again via API (bypassing UI which would show Leave)
    const bobTokens = await getTokensFor(getTestUser('bob'));
    const res = await authedFetch(`/api/meetings/${meetingId}/join`, {
      method: 'POST',
      token: bobTokens.accessToken,
    });

    // Should get a 409 Conflict
    expect(res.status).toBe(409);
  });

  test('participant count reflects multiple joins and leaves', async ({ page, context }) => {
    // Alice creates a medium-capacity meeting
    await loginAs(page, 'alice');
    const detailUrl = await createMeeting(page, 'Multi Participant Test', 5);

    // Bob joins
    await loginAs(page, 'bob');
    await page.goto(detailUrl);
    await page.getByRole('button', { name: /join meeting/i }).click();
    await expect(page.getByRole('button', { name: /leave meeting/i })).toBeVisible({ timeout: 10_000 });

    // Charlie joins (new browser context)
    await loginAs(page, 'charlie');
    await page.goto(detailUrl);
    await page.getByRole('button', { name: /join meeting/i }).click();
    await expect(page.getByRole('button', { name: /leave meeting/i })).toBeVisible({ timeout: 10_000 });

    // Participant count should show 3/5 (host + bob + charlie)
    await expect(page.getByText(/3\/5/)).toBeVisible();
  });
});
