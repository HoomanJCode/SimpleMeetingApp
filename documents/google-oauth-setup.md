# Google OAuth Setup — Local Development

> **TL;DR:** In the Google Cloud Console, create a project → configure the OAuth consent screen → create a **Web-application** OAuth client ID → set the authorized redirect URI to `http://localhost:3001/api/auth/google/callback`. Copy the resulting **Client ID** (ends in `.apps.googleusercontent.com`) and **Client secret** (starts with `GOCSPX-`) — the wizard on first run of `scripts/prod.sh` / `scripts/prod.ps1` will ask for them. Full steps below.

---

## Why we need this

The application authenticates users exclusively via **Google OAuth 2.0**. The backend redirects to Google's consent screen on "Sign in with Google", exchanges the returned authorization code for tokens, and links the resulting Google profile to the app's user record. See [authentication.md](authentication.md) for the full request/response flow.

To do that we need three pieces of information, supplied as environment variables in `backend/.env`:

| Variable | What it is |
|---|---|
| `GOOGLE_CLIENT_ID` | Public identifier for the OAuth client. Format: `…apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Confidential key Google uses to authenticate our backend. Format: starts with `GOCSPX-` |
| `GOOGLE_REDIRECT_URI` | URL Google redirects users to AFTER they grant consent. Must EXACTLY match a value configured in the Cloud Console. Default: `http://localhost:3001/api/auth/google/callback` |

The first two come from a single "Create OAuth client" flow in Google Cloud Console. The third is something **you** enter symmetrically in BOTH places (the Cloud Console's "Authorized redirect URIs" field AND the local `GOOGLE_REDIRECT_URI` env var).

---

## Prerequisites

- A **Google account** (any Gmail account works; you don't need a paid Workspace).
- A modern browser.
- ~5 minutes of click-through, no coding required.

> **You don't need a Google Workspace** organization. Personal Gmail accounts work — the OAuth Consent Screen will display "**Unverified app**" until you publish (which isn't required for local dev; see [Testing-mode caveats](#testing-mode-and-unverified-app-warning) below).

---

## Step-by-step walkthrough

### Step 0 — Sign in to Google Cloud Console

Open <https://console.cloud.google.com/> in your browser. Sign in with the Google account you want to own the OAuth client (typically your personal Gmail).

> First time? Google will ask you to **accept the Terms of Service** and may prompt you to pick a country. Pick your country. You do NOT need to enable billing; OAuth client credentials are free of charge.

### Step 1 — Create (or select) a project

OAuth credentials live inside a **project**. You'll want a fresh project for this app so it's isolated from anything else in your Google account.

1. Look at the **top bar**, just to the right of the "Google Cloud" logo. There is a project dropdown that says something like "Select a project".
2. Click that dropdown → a modal pops up. Click **"New Project"** in the top-right of the modal.
3. **Project name:** type something memorable, e.g. `IrMeetingApp Local`.
4. **Location:** leave as "No organization" unless you have a Workspace org and want to put the project inside it.
5. Click **Create**.
6. After ~5 seconds you're back to the dashboard. **Use the top-bar project dropdown again** to make sure your new project is selected (it should be, but confirm).

### Step 2 — Configure the OAuth consent screen

Google wants to know what your app's "consent screen" looks like — the popup users see before granting permission. Until you set this up, you cannot create OAuth client IDs (the "Create" button will be greyed out).

1. In the **top search bar** (the one with the magnifying-glass icon), type `OAuth consent screen`. Click the matching result that appears under "Marketplace" / "APIs & Services".
2. **User type:** pick **External**. (Internal requires a Google Workspace org; we want any Gmail user to be able to log in.)
3. Click **Create**.
4. **App information** section:
   - **App name:** `IrMeetingApp` (or whatever you like; users will see this on the consent screen).
   - **User support email:** pick your Gmail from the dropdown.
   - **App logo:** optional, skip it.
   - **Application home page / privacy policy / terms of service links:** optional, skip them for local dev.
   - **Authorized domains:** leave empty for local dev (the OAuth client's URI will be `localhost`, which isn't an "authorized domain").
   - **Developer contact information:** enter your Gmail in the Email field.
5. Click **Save and Continue**.
6. **Scopes** step: click **Save and Continue** without adding scopes. (Defaults are fine; IrMeetingApp only requests `openid profile email`, which is implicit.)
7. **Test users** step: click **+ Add Users**, type **your own Gmail address** (the one you're using right now), click **Add**, then **Save and Continue**.
   > While your app is in "Testing" status (the default), only test users you add here can complete the OAuth flow. This is fine for local dev — just remember to add each test account you'll log in with.
8. **Summary** step: click **Back to Dashboard**.

### Step 3 — Create an OAuth client ID

Now the actual credentials.

1. In the top search bar, type `Credentials`. Click **APIs & Services → Credentials**.
2. Click **+ Create Credentials** (top of page) → **OAuth client ID**.
3. **Application type:** select **Web application** from the dropdown.
   > This is the critical choice. "Desktop app" or "TV / Input" types don't accept redirect URIs the way our backend expects.
4. **Name:** `IrMeetingApp Local` (or anything).
5. **Authorized JavaScript origins:** click **+ Add URI** and type:
   ```
   http://localhost:5173
   ```
   (This is the frontend's URL — needed by Google for CORS preflight on the OAuth redirect.)
6. **Authorized redirect URIs:** click **+ Add URI** and type:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
   > **This URL must EXACTLY match** the `GOOGLE_REDIRECT_URI` you will enter into the wizard (or put in `backend/.env` manually). Trailing slash difference, http vs https, port mismatch — all cause `redirect_uri_mismatch` errors at Google.
7. Click **Create**.

### Step 4 — Copy your credentials

A modal pops up titled **"OAuth client created"** with two pieces of information:

- **Your Client ID** — looks like `123456789-abc123def456.apps.googleusercontent.com`
- **Your Client secret** — looks like `GOCSPX-XxXxXxXxXxXxXxXx`

> **The Client secret is shown EXACTLY ONCE.** If you close the modal without copying it you'll have to either (a) re-create the OAuth client OR (b) click the client in the Credentials list and hit "Reset secret". Copy it now!

The values are also available later under **APIs & Services → Credentials → click your OAuth client → "Client ID" and "Client secret (click to reveal)"**.

### Step 5 — Paste into the wizard (or backend/.env)

You've already got `backend/.env.example` and may want to copy that to `backend/.env` and paste the values in by hand. **OR**, more convenient: just run the application in production-like mode and the inline wizard will ask for both values:

```bash
# Linux / macOS
bash scripts/prod.sh

# Windows (PowerShell)
pwsh -NoProfile -File scripts/prod.ps1
```

When the wizard asks:

- `GOOGLE_CLIENT_ID (required):` — paste your **Client ID**.
- `GOOGLE_CLIENT_SECRET (required):` — paste your **Client secret**.
- `GOOGLE_REDIRECT_URI` — accept the default `http://localhost:3001/api/auth/google/callback` (must match what you entered in Step 3.6).

The wizard writes `backend/.env` and launches the app in production-like mode.

---

## After setup — what to expect

In your default browser, navigate to <http://localhost:5173>. Click **Sign in with Google**. Google's consent screen will appear:

- It will display your app name (whatever you set in Step 2.4) and your Gmail.
- **First time only**, it will say **"Google hasn't verified this app"** (see below).
- It will request scopes: `openid`, `email`, `profile`.
- Click **Continue / Allow**.

You'll be redirected back to `http://localhost:5173/auth/callback?token=…&refreshToken=…`, the frontend stores the tokens in memory, and you'll see the home page as a logged-in user.

Subsequent logins from the same browser are 1-click — you skip the consent screen (provided the access token's still valid or you successfully refresh it).

---

## <a id="testing-mode-and-unverified-app-warning"></a>Testing mode and "unverified app" warning

A new OAuth app is by default in **"Testing"** status and may only be used by **test users** (Step 2.7). When your app is unverified, Google's consent screen shows a **"Google hasn't verified this app"** warning. Two ways to handle this:

1. **Recommended for local dev — just click through.** When the warning appears:
   - Click **"Advanced"** (small link).
   - Click **"Go to IrMeetingApp (unsafe)"**.
   - Continue to the consent screen.
2. **Production deploy** — you would submit the app for **Google verification** (screenshots + scope justification). Out of scope for local dev; not covered here.

The "unverified app" warning is harmless for personal development. It exists because Google hasn't reviewed your specific OAuth client yet.

> If you have **multiple users** who need to log in (e.g. you're demoing to a colleague), add **their** Gmail addresses as test users via **APIs & Services → OAuth consent screen → Test users → + Add Users**.

---

## Troubleshooting

### `redirect_uri_mismatch` from Google

The redirect URI in `backend/.env` doesn't match any of the "Authorized redirect URIs" configured in the Cloud Console. Common causes:

- Trailing slash mismatches (`/callback` vs `/callback/`).
- `http` vs `https`.
- Port mismatch (`3001` vs `3000`).
- Path mismatch (`/api/auth/google/callback` vs `/auth/google/callback`).

Fix: either edit `backend/.env`'s `GOOGLE_REDIRECT_URI` to exactly match your Cloud Console entry, or add a new entry to "Authorized redirect URIs" that matches what's in `backend/.env`. **String-comparison is byte-exact — Google does not normalize.**

### `invalid_client` from Google

Your Client ID or Client secret is wrong. Most common cause: pasting in an extra space / newline / BOM character.

Fix: re-copy both values from the Cloud Console (Credentials → click the OAuth client → click "Reset secret" if needed, then re-copy). Paste them carefully into the wizard or `backend/.env` — **no surrounding quotes, no escaping**.

### `access_denied` from Google

User declined to grant consent, OR your Gmail is not in the OAuth consent screen's test users list.

Fix: add your Gmail under **APIs & Services → OAuth consent screen → Test users**.

### Backend returns 500 with "OAuth callback failed"

Open `backend/.env` and check `JWT_SECRET` exists and is ≥ 32 characters. The backend's `env.ts` (Zod schema) requires it; some `OAuth callback failed` errors are really `JWT_SECRET missing`. Re-run the wizard to regenerate (option `g` for "generate").

### Nothing happens when I click Sign in with Google

The backend may not be running. Hit `http://localhost:3001/api/health` in your browser; if you see a JSON health response, the backend is up. If you see an error or timeout, check the terminal that ran `scripts/prod.sh`.

### Browser opens but stays on a blank page

Vite (the frontend dev server) hasn't finished its initial compile yet. Wait ~3–5 seconds and reload. The terminal that ran the script prints Vite's progress; you should see "ready in XXX ms".

---

## How to rotate / delete your OAuth client later

Under **APIs & Services → Credentials**:

- **Rotate the Client secret:** click the OAuth client → **Reset secret**. You'll get a new value shown once. Update `backend/.env`'s `GOOGLE_CLIENT_SECRET` to match.
- **Delete the OAuth client:** click the trash-can icon on the right.
- **Delete the whole project:** IAM & Admin → Settings → Delete project. This wipes everything irrevocable.

If you regenerate only the **Client secret**: existing sessions continue working until the access token expires (15 min). After expiry, refresh-token rotation kicks in and the user will silently re-login smoothly.

If you regenerate or replace the **OAuth client ID**: existing access tokens AND refresh tokens become invalid (Google-side signature mismatch). All users will need to sign in again from scratch — clean cutover.

---

## Related docs

- [authentication.md](authentication.md) — backend's OAuth code-exchange + JWT issuance flow.
- [api-design.md](api-design.md) — the three auth endpoints (`/api/auth/google`, `/api/auth/google/callback`, `/api/auth/refresh`).
- [../README.md](../README.md#quick-start) — top-level setup-and-run narrative.
