import { expect } from '@playwright/test';
import { test } from '../helpers/setup';
import { loginAs } from '../helpers/auth';
import { validMeeting, futureDateTime } from '../fixtures/meetings';
import { FRONTEND_URL } from '../helpers/api';

function formatDateTimeLocal(iso: string): string {
  // datetime-local expects YYYY-MM-DDTHH:mm
  return iso.slice(0, 16);
}

async function fillMeetingForm(page: import('@playwright/test').Page, title: string): Promise<void> {
  await page.getByLabel('Title *').fill(title);
  await page.getByLabel('Description *').fill(validMeeting.description);
  await page.getByLabel('Location *').fill(validMeeting.location);
  await page.getByLabel('Date & Time *').fill(formatDateTimeLocal(futureDateTime()));
  await page.getByLabel('Capacity *').fill(String(validMeeting.capacity));
}

test.describe('Tags & Timeline', () => {
  test('create a meeting with tags and see them on the list and detail pages', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await fillMeetingForm(page, validMeeting.title);

    // Select two tags in the picker.
    await page.getByRole('button', { name: 'Workshop', exact: true }).click();
    await page.getByRole('button', { name: 'Online', exact: true }).click();

    await page.getByRole('button', { name: 'Create Meeting' }).click();
    // (?!new) so the regex can't match /meetings/new before navigation completes.
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    // Tags appear on the detail page.
    await expect(page.getByText('Workshop', { exact: true })).toBeVisible();
    await expect(page.getByText('Online', { exact: true })).toBeVisible();

    // Tags appear on the meeting card on the home page list. Filter by the
    // tag so the assertion targets this meeting even if other tests left
    // same-titled meetings behind.
    await page.goto(`${FRONTEND_URL}/`);
    const card = page
      .getByRole('link', { name: new RegExp(validMeeting.title) })
      .filter({ hasText: 'Workshop' });
    await expect(card).toBeVisible();
    await expect(card.getByText('Workshop', { exact: true })).toBeVisible();
    await expect(card.getByText('Online', { exact: true })).toBeVisible();
  });

  test('filter the home list by a tag chip and clear it by clicking again', async ({ page }) => {
    await loginAs(page, 'alice');

    // Tagged meeting.
    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await fillMeetingForm(page, 'Tagged Workshop Meetup');
    await page.getByRole('button', { name: 'Workshop', exact: true }).click();
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    // Untagged meeting.
    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await fillMeetingForm(page, 'Untagged Meetup');
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    await page.goto(`${FRONTEND_URL}/`);

    // Click the Workshop filter chip: only the tagged meeting remains.
    await page.getByRole('button', { name: 'Workshop', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tagged Workshop Meetup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untagged Meetup' })).not.toBeVisible();

    // Clicking the active chip clears the filter.
    await page.getByRole('button', { name: 'Workshop', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tagged Workshop Meetup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Untagged Meetup' })).toBeVisible();
  });

  test('navigate to /timeline and see meetings on the line', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await fillMeetingForm(page, 'Timeline Meetup');
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    await page.goto(`${FRONTEND_URL}/timeline`);

    await expect(page.getByRole('heading', { name: 'Event Timeline' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Timeline Meetup' })).toBeVisible();
    // The "Today" marker appears before the first future meeting.
    await expect(page.getByText('Today', { exact: true })).toBeVisible();
  });

  test('tag chips and the timeline render in dark mode', async ({ page }) => {
    await loginAs(page, 'alice');

    await page.goto(`${FRONTEND_URL}/meetings/new`);
    await fillMeetingForm(page, 'Dark Mode Meetup');
    await page.getByRole('button', { name: 'Tech Talk', exact: true }).click();
    await page.getByRole('button', { name: 'Create Meeting' }).click();
    await page.waitForURL(/\/meetings\/(?!new)[\w-]+/);

    // Toggle dark mode.
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();

    // Tag chips still render on the detail page in dark mode.
    await expect(page.getByText('Tech Talk', { exact: true })).toBeVisible();

    // The timeline renders in dark mode.
    await page.goto(`${FRONTEND_URL}/timeline`);
    await expect(page.getByRole('heading', { name: 'Dark Mode Meetup' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  });
});
