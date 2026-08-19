/**
 * Screenshot capture script (NOT part of the E2E suite).
 *
 * Seeds the app with realistic demo data via the dev-only test API, then
 * walks through the main pages and saves full-page PNG screenshots into
 * documents/screenshots/ for use in the README.
 *
 * Run from the tests/ directory:
 *   npx playwright test screenshots/screenshots.spec.ts --config playwright.config.ts
 *
 * The playwright.config.ts webServer entries auto-start backend + frontend.
 * Generated photo fixtures (tests/fixtures/shot-*.png) are throwaway —
 * they are re-created on every run and deleted afterwards by the script.
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { FRONTEND_URL, getTokensFor, authedFetch, resetDb } from '../helpers/api';
import { loginAs } from '../helpers/auth';
import { testUsers } from '../fixtures/users';

const ROOT = path.resolve(__dirname, '..', '..');
const SHOT_DIR = path.join(ROOT, 'documents', 'screenshots');
const FIXTURE_DIR = path.join(ROOT, 'tests', 'fixtures');

// ---------------------------------------------------------------------------
// Tiny pure-Node PNG encoder (no extra deps needed) — used to fabricate
// gallery/cover photos so the meeting detail page looks alive.
// ---------------------------------------------------------------------------
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number],
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = colorAt(x, y);
      const o = rowStart + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Diagonal-stripe pattern over a gradient so each "photo" looks intentional.
function stripedGradient(from: [number, number, number], to: [number, number, number]) {
  return (x: number, y: number): [number, number, number] => {
    const t = (x / 899 + y / 599) / 2;
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    const stripe = ((x + y) % 90) < 12 ? 0.88 : 1;
    return [
      Math.round(r * stripe),
      Math.round(g * stripe),
      Math.round(b * stripe),
    ];
  };
}

// ---------------------------------------------------------------------------
// Date helpers — keep every seeded meeting inside the CURRENT calendar month
// so the Calendar view shows a full grid, while staying in the future so the
// backend's "dateTime must be in the future" validation passes on create.
// ---------------------------------------------------------------------------
function slotsInCurrentMonth(count: number, hour = 18): string[] {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const remaining = lastDay - today;
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const day = today + Math.max(1, Math.round((i * remaining) / (count + 1)));
    const d = new Date(now.getFullYear(), now.getMonth(), day, hour, 0, 0, 0);
    out.push(d.toISOString());
  }
  return out;
}

function pastDateTime(): string {
  const d = new Date();
  d.setDate(d.getDate() - 5);
  d.setHours(18, 0, 0, 0);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// API helpers (dev-only test routes)
// ---------------------------------------------------------------------------
interface SeedMeeting {
  title: string;
  description: string;
  dateTime: string;
  location: string;
  capacity: number;
  tagIds?: string[];
}

async function createMeeting(token: string, data: SeedMeeting): Promise<{ id: string }> {
  const res = await authedFetch('/api/meetings', {
    token,
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`createMeeting failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as { id: string };
}

async function joinMeeting(token: string, id: string): Promise<void> {
  const res = await authedFetch(`/api/meetings/${id}/join`, { token, method: 'POST' });
  if (!res.ok) throw new Error(`joinMeeting failed (${res.status}): ${await res.text()}`);
}

async function updateMeeting(token: string, id: string, data: Record<string, unknown>): Promise<void> {
  const res = await authedFetch(`/api/meetings/${id}`, {
    token,
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`updateMeeting failed (${res.status}): ${await res.text()}`);
}

async function cancelMeeting(token: string, id: string): Promise<void> {
  const res = await authedFetch(`/api/meetings/${id}/cancel`, { token, method: 'POST' });
  if (!res.ok) throw new Error(`cancelMeeting failed (${res.status}): ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// The capture run
// ---------------------------------------------------------------------------
test.setTimeout(300_000);

test('capture screenshots of the main pages', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  fs.mkdirSync(SHOT_DIR, { recursive: true });

  // Clean slate, then seed users.
  await resetDb();
  const aliceTok = (await getTokensFor(testUsers.alice)).accessToken;
  const bobTok = (await getTokensFor(testUsers.bob)).accessToken;
  const charlieTok = (await getTokensFor(testUsers.charlie)).accessToken;

  // ------------------------------------------------------------------
  // Seed meetings (all inside the current calendar month).
  // ------------------------------------------------------------------
  const slots = slotsInCurrentMonth(8);

  const coffee = await createMeeting(bobTok, {
    title: 'Coffee & Code Morning',
    description: 'Casual morning session. Bring your laptop, grab a coffee, and pair up on whatever you are hacking on.',
    dateTime: slots[0],
    location: 'St. Oberholz, Berlin',
    capacity: 12,
    tagIds: ['tag-networking'],
  });

  const featured = await createMeeting(aliceTok, {
    title: 'React & TypeScript Deep Dive',
    description: 'Hands-on workshop covering advanced React patterns and TypeScript type gymnastics, with plenty of live coding and Q&A.',
    dateTime: slots[1],
    location: 'Tech Hub Berlin',
    capacity: 30,
    tagIds: ['tag-tech', 'tag-workshop'],
  });

  const social = await createMeeting(bobTok, {
    title: 'Friday Community Social',
    description: 'End-of-week drinks and snacks with the local developer community. No talks, no slides — just good conversations.',
    dateTime: slots[2],
    location: 'Café Central, Berlin',
    capacity: 40,
    tagIds: ['tag-social', 'tag-networking'],
  });

  const websockets = await createMeeting(aliceTok, {
    title: 'WebSockets from Scratch',
    description: 'A live-coded tour from raw TCP sockets up to Socket.IO: heartbeats, reconnects, and scaling realtime apps.',
    dateTime: slots[3],
    location: 'Online',
    capacity: 100,
    tagIds: ['tag-tech', 'tag-online'],
  });

  const hackNight = await createMeeting(aliceTok, {
    title: 'Hack Night: Side Projects',
    description: 'Bring your unfinished side project and ship something. Mentors on site for frontend, backend, and deployment help.',
    dateTime: slots[4],
    location: 'co.up Kreuzberg',
    capacity: 20,
    tagIds: ['tag-workshop', 'tag-tech'],
  });

  const aiMeetup = await createMeeting(aliceTok, {
    title: 'AI Product Meetup',
    description: 'Founders and engineers building LLM-powered products share what actually works in production, followed by demos.',
    dateTime: slots[5],
    location: 'Factory Görlitzer Park',
    capacity: 25,
    tagIds: ['tag-tech'],
  });

  const sunday = await createMeeting(bobTok, {
    title: 'Sunday Morning Networking',
    description: 'A relaxed Sunday brunch meetup to start the week with new connections in the community.',
    dateTime: slots[6],
    location: 'Riverside Café',
    capacity: 20,
    tagIds: ['tag-social'],
  });

  const retro = await createMeeting(aliceTok, {
    title: 'Q3 Retro & Planning',
    description: 'Community organizers review what worked last quarter and brainstorm the roadmap for the next one.',
    dateTime: slots[7],
    location: 'Tech Hub Berlin',
    capacity: 15,
    tagIds: ['tag-tech', 'tag-social'],
  });

  // ------------------------------------------------------------------
  // Participants + statuses (mirrors what real usage looks like).
  // ------------------------------------------------------------------
  await joinMeeting(charlieTok, coffee.id);
  await joinMeeting(bobTok, featured.id);
  await joinMeeting(charlieTok, featured.id);
  await joinMeeting(aliceTok, social.id);
  await joinMeeting(bobTok, hackNight.id);
  await joinMeeting(charlieTok, hackNight.id);

  await updateMeeting(aliceTok, hackNight.id, { status: 'ongoing' });
  await cancelMeeting(bobTok, sunday.id);
  await updateMeeting(aliceTok, retro.id, { dateTime: pastDateTime(), status: 'ended' });

  // ------------------------------------------------------------------
  // Fabricate gallery photos + upload them to the featured meeting,
  // then promote the first one to cover photo.
  // ------------------------------------------------------------------
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  const photoFiles = [
    path.join(FIXTURE_DIR, 'shot-1.png'),
    path.join(FIXTURE_DIR, 'shot-2.png'),
    path.join(FIXTURE_DIR, 'shot-3.png'),
  ];
  fs.writeFileSync(photoFiles[0], makePng(900, 600, stripedGradient([59, 130, 246], [139, 92, 246])));
  fs.writeFileSync(photoFiles[1], makePng(900, 600, stripedGradient([245, 158, 11], [236, 72, 153])));
  fs.writeFileSync(photoFiles[2], makePng(900, 600, stripedGradient([16, 185, 129], [14, 165, 233])));

  // Login as alice via the UI flow.
  await loginAs(page, 'alice');

  // Upload the three photos through the real UI (host only).
  await page.goto(`${FRONTEND_URL}/meetings/${featured.id}`);
  await page.waitForLoadState('networkidle');
  for (const file of photoFiles) {
    await page.getByLabel('Add photo', { exact: true }).setInputFiles(file);
    await expect(page.locator('img[alt=""]').first()).toBeVisible({ timeout: 10_000 });
  }

  // Use the first uploaded photo as the cover photo.
  const firstPhotoUrl = await page.locator('img[alt=""]').first().getAttribute('src');
  if (firstPhotoUrl) {
    await updateMeeting(aliceTok, featured.id, { coverPhotoUrl: firstPhotoUrl });
  }
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForSelector(`img[alt="React & TypeScript Deep Dive"]`, { timeout: 10_000 });

  // ------------------------------------------------------------------
  // Screenshot helper.
  // ------------------------------------------------------------------
  const shot = async (name: string, dark = false): Promise<void> => {
    if (dark) {
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    } else {
      const lightBtn = page.getByRole('button', { name: 'Switch to light mode' });
      if (await lightBtn.count()) await lightBtn.click();
    }
    await page.waitForTimeout(700); // let the theme transition settle
    await page.screenshot({
      path: path.join(SHOT_DIR, name),
      fullPage: true,
      animations: 'disabled',
    });
  };

  // 1. Home page (meeting list + tag filter + search) — light and dark.
  await page.goto(`${FRONTEND_URL}/`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'React & TypeScript Deep Dive' }).first()).toBeVisible();
  await shot('home.png');
  await shot('home-dark.png', true);

  // 2. Meeting detail (cover photo, gallery, tags, participants).
  await page.goto(`${FRONTEND_URL}/meetings/${featured.id}`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector(`img[alt="React & TypeScript Deep Dive"]`, { timeout: 10_000 });
  await expect(page.getByText('Hosted by').first()).toBeVisible();
  await shot('meeting-detail.png');

  // 3. Create meeting form (pre-filled).
  await page.goto(`${FRONTEND_URL}/meetings/new`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Title *').fill('Launch Party: IrMeetingApp v2');
  await page.getByLabel('Description *').fill('Celebrate the v2 release with lightning talks, demos, and community networking.');
  await page.getByLabel('Location *').fill('Tech Hub Berlin');
  const launchDate = new Date();
  launchDate.setDate(launchDate.getDate() + 7);
  launchDate.setHours(18, 0, 0, 0);
  await page.getByLabel('Date & Time *').fill(launchDate.toISOString().slice(0, 16));
  await page.getByLabel('Capacity *').fill('50');
  await page.getByRole('button', { name: 'Tech Talk' }).click();
  await page.getByRole('button', { name: 'Social' }).click();
  await shot('create-meeting.png');

  // 4. Calendar view.
  await page.goto(`${FRONTEND_URL}/calendar`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Meeting Calendar' })).toBeVisible();
  await shot('calendar.png');

  // 5. Event timeline (all statuses: upcoming / ongoing / ended / cancelled).
  await page.goto(`${FRONTEND_URL}/timeline`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Event Timeline' })).toBeVisible();
  await shot('timeline.png');

  // 6. My Meetings (hosting tab).
  await page.goto(`${FRONTEND_URL}/my-meetings`);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'My Meetings' })).toBeVisible();
  await shot('my-meetings.png');

  // Throwaway photo fixtures are gitignored-adjacent; remove them so the
  // repo stays clean (backend/uploads/ is already covered by .gitignore).
  for (const file of photoFiles) {
    fs.rmSync(file, { force: true });
  }
});
