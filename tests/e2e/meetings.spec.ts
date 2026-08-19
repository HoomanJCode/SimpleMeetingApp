import { expect } from '@playwright/test';
import { test } from '../helpers/setup';
import { loginAs } from '../helpers/auth';
import { validMeeting, invalidMeetingBlankFields, invalidMeetingBadCapacity, futureDateTime } from '../fixtures/meetings';
import { FRONTEND_URL } from '../helpers/api';

function formatDateTimeLocal(iso: string): string {
  // datetime-local expects YYYY-MM-DDTHH:mm
  return iso.slice(0, 16);
}

test.describe('Meeting CRUD', () => {
  test('authenticated user can create a meeting and land on its detail page', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await page.waitForURL(`${FRONTEND_URL}/meetings/new`);

    await page.getByLabel('Title *').fill(validMeeting.title);
    await page.getByLabel('Description *').fill(validMeeting.description);
    await page.getByLabel('Location *').fill(validMeeting.location);
    await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
    await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));

    await page.getByRole('button', { name: 'Create Meeting' }).click();

    // After creation the app navigates to the meeting detail page.
    // (?!new) so the regex can't match /meetings/new before navigation completes.
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    await expect(page.getByRole('heading', { name: validMeeting.title })).toBeVisible();
    await expect(page.getByText(validMeeting.location)).toBeVisible();
    await expect(page.getByText('Hosted by')).toBeVisible();
    await expect(page.getByText('Alice Host').first()).toBeVisible();
  });

  test('creating a meeting with blank required fields shows validation errors', async ({ page }) => {
    await loginAs(page, 'alice');
    await page.goto(`${FRONTEND_URL}/meetings/new`);

    await page.getByLabel('Title *').fill(invalidMeetingBlankFields.title ?? '');
    await page.getByLabel('Description *').fill(invalidMeetingBlankFields.description ?? '');
    await page.getByLabel('Location *').fill(invalidMeetingBlankFields.location ?? '');

    await page.getByRole('button', { name: 'Create Meeting' }).click();

    // HTML5 validation prevents the form from submitting when required fields are empty.
    await expect(page).toHaveURL(`${FRONTEND_URL}/meetings/new`);
  });

  test('creating a meeting with capacity below 2 is rejected', async ({ page }) => {
    await loginAs(page, 'alice');
    await page.goto(`${FRONTEND_URL}/meetings/new`);

    await page.getByLabel('Title *').fill(invalidMeetingBadCapacity.title);
    await page.getByLabel('Description *').fill(invalidMeetingBadCapacity.description);
    await page.getByLabel('Location *').fill(invalidMeetingBadCapacity.location);
    await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
    await page.getByLabel('Capacity *').fill(String(invalidMeetingBadCapacity.capacity));

    await page.getByRole('button', { name: 'Create Meeting' }).click();

    // The backend rejects capacity < 2; the UI shows the error both inline
    // and as a toast, so pin the first match.
    await expect(page.getByText(/invalid request data/i).first()).toBeVisible();
  });

  test('meeting appears on the home page list and can be opened', async ({ page }) => {
    await loginAs(page, 'alice');

    // Create a meeting via UI.
    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await page.getByLabel('Title *').fill(validMeeting.title);
    await page.getByLabel('Description *').fill(validMeeting.description);
    await page.getByLabel('Location *').fill(validMeeting.location);
    await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
    await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    const detailUrl = page.url();

    // Go back home and verify the meeting card is listed.
    await page.goto(`${FRONTEND_URL}/`);
    await page.getByRole('heading', { name: validMeeting.title }).first().click();

    await page.waitForURL(detailUrl);
    await expect(page.getByRole('heading', { name: validMeeting.title })).toBeVisible();
  });

  test('host can edit their own meeting', async ({ page }) => {
    await loginAs(page, 'alice');

    // Create a meeting first.
    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await page.getByLabel('Title *').fill(validMeeting.title);
    await page.getByLabel('Description *').fill(validMeeting.description);
    await page.getByLabel('Location *').fill(validMeeting.location);
    await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
    await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    await page.getByRole('link', { name: 'Edit' }).click();
    await page.waitForURL(/\/meetings\/[\w-]+\/edit/);

    const updatedTitle = `${validMeeting.title} (Updated)`;
    await page.getByLabel('Title *').fill(updatedTitle);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // [^/]+$ ensures we left the /edit page (the loose regex matches /edit too).
    await page.waitForURL(/\/meetings\/[^/]+$/);
    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
  });

  test('non-host cannot edit a meeting', async ({ page }) => {
    await loginAs(page, 'alice');

    // Alice creates a meeting.
    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await page.getByLabel('Title *').fill(validMeeting.title);
    await page.getByLabel('Description *').fill(validMeeting.description);
    await page.getByLabel('Location *').fill(validMeeting.location);
    await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
    await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    const detailUrl = page.url();

    // Bob navigates to the edit page directly.
    await loginAs(page, 'bob');
    const editUrl = `${FRONTEND_URL}/meetings/${detailUrl.split('/').pop()}/edit`;
    await page.goto(editUrl);
    await page.waitForURL(editUrl);

    // The edit page loads (GET doesn't check host), but saving triggers 403.
    // Fill in the form and attempt to save.
    await page.getByLabel('Title *').fill(`${validMeeting.title} (Bob's attempt)`);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // The backend returns 403 Forbidden; the UI shows the error both inline
    // and as a toast, so pin the first match.
    await expect(page.getByText(/forbidden|not authorized|cannot update|only the host/i).first()).toBeVisible();
  });

  test('host can cancel their own meeting', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await page.getByLabel('Title *').fill(validMeeting.title);
    await page.getByLabel('Description *').fill(validMeeting.description);
    await page.getByLabel('Location *').fill(validMeeting.location);
    await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
    await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    await page.getByRole('button', { name: 'Cancel Meeting' }).click();

    // Confirm cancellation in the modal.
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel Meeting' }).click();

    // The meeting remains visible but its status changes to Cancelled.
    // Exact match: the success toast text "Meeting cancelled." also contains
    // the word "cancelled" and would make this locator ambiguous.
    await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: validMeeting.title })).toBeVisible();
  });

  test('host can upload a gallery photo to a meeting', async ({ page }) => {
    await loginAs(page, 'alice');

    // Create a meeting first.
    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await page.getByLabel('Title *').fill(validMeeting.title);
    await page.getByLabel('Description *').fill(validMeeting.description);
    await page.getByLabel('Location *').fill(validMeeting.location);
    await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
    await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    // Upload a gallery photo through the hidden file input.
    // Path is relative to the tests/ cwd where Playwright runs.
    const fileInput = page.getByLabel('Add photo', { exact: true });
    await fileInput.setInputFiles('fixtures/test-image.png');

    // Wait for the image to render in the Photos section.
    await expect(page.locator('img[alt=""]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('No photos yet.')).not.toBeVisible();
  });

  test('search filters the meeting list', async ({ page }) => {
    await loginAs(page, 'alice');

    // Create two meetings with distinct titles.
    for (const title of ['Unique Alpha Meetup', 'Unique Beta Meetup']) {
      await page.goto(`${FRONTEND_URL}/meetings/new`);
      await page.getByLabel('Title *').fill(title);
      await page.getByLabel('Description *').fill(validMeeting.description);
      await page.getByLabel('Location *').fill(validMeeting.location);
      await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
      await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
      await page.getByRole('button', { name: 'Create Meeting' }).click();
      await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);
    }

    await page.goto(`${FRONTEND_URL}/`);
    await page.getByPlaceholder('Search meetings...').fill('Alpha');

    await expect(page.getByRole('heading', { name: 'Unique Alpha Meetup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Unique Beta Meetup' })).not.toBeVisible();
  });

  test('My Meetings page lists meetings the user hosts', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await page.getByLabel('Title *').fill(validMeeting.title);
    await page.getByLabel('Description *').fill(validMeeting.description);
    await page.getByLabel('Location *').fill(validMeeting.location);
    await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
    await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    await page.goto(`${FRONTEND_URL}/my-meetings`);
    await page.waitForURL(`${FRONTEND_URL}/my-meetings`);

    await expect(page.getByRole('heading', { name: validMeeting.title })).toBeVisible();
  });
});
