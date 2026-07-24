#!/usr/bin/env node
/**
 * Cross-platform dev orchestrator.
 *
 * Default mode = TEST (no setup needed):
 *   - Backend runs with test secrets + windows compat env.
 *   - Frontend binds to 127.0.0.1:5173 (avoids Windows IPv4/IPv6 mismatch).
 *
 * Flags:
 *   --be         only the backend
 *   --fe         only the frontend
 *   --real       run the backend with your real backend/.env
 *                (test routes disabled). If backend/.env is missing AND
 *                we are running in an interactive terminal, the env
 *                wizard launches automatically first. In non-TTY
 *                contexts (CI, piped) we bail with a clear error so
 *                the run can't hang.
 *   --no-wizard  skip the auto-wizard in --real mode even if .env is
 *                missing; useful in deployment scripts that populate
 *                .env some other way (Docker secret, k8s, etc.).
 *
 * Important: `windowsCompat` env vars (HOST=127.0.0.1, FRONTEND_URL) are
 * ALWAYS applied — including in `--real` mode — because they fix a Windows
 * bug, not a test-mode concern. Only the test secrets (dummy OAuth, JWT)
 * are gated by mode.
 *
 * Why `concurrently` and not a hand-rolled child_process.spawn:
 *   SIGINT propagation through nested child processes is broken on Windows
 *   Git-Bash (Ctrl+C leaves zombie node.exe blocking the ports). concurrently
 *   owns the process group and tears both children down reliably.
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');
const concurrently = require('concurrently');
const { windowsCompat, testSecrets } = require('./test-env.cjs');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const ENV_PATH = path.join(BACKEND, '.env');
const WIZARD_PATH = path.join(__dirname, 'env-wizard.js');

const args = new Set(process.argv.slice(2));
const onlyBe = args.has('--be');
const onlyFe = args.has('--fe');
const realMode = args.has('--real');
const forceNoWizard = args.has('--no-wizard');

if (onlyBe && onlyFe) {
  console.error('✗ --be and --fe cannot be combined');
  process.exit(1);
}

/**
 * In `--real` mode, ensure backend/.env exists before the backend boots.
 *
 *   - present      → no-op (user already set up credentials)
 *   - missing + TTY → launch scripts/env-wizard.js as a child with stdio
 *                     inherited so readline gets the real terminal; we
 *                     block until the wizard finishes, then verify the
 *                     file landed before proceeding.
 *   - missing + non-TTY → exit 1 with a clear, no-hang message. CI /
 *                     piped invocations should write .env themselves
 *                     (Docker secret, k8s, deploy script) and pass
 *                     `--no-wizard` to suppress this check.
 *   - missing + --no-wizard → exit 1 with a "create it manually" hint.
 *
 * Cross-platform by design: process.stdin.isTTY works on Windows + Unix,
 * child_process.spawnSync works the same everywhere, and the wizard
 * itself is pure Node so there's nothing Linux-specific to handle.
 */
function ensureEnvForRealMode() {
  if (fs.existsSync(ENV_PATH)) return;

  if (forceNoWizard) {
    console.error('✗ backend/.env not found and `--no-wizard` was passed.');
    console.error('  Either create backend/.env manually (copy from backend/.env.example)');
    console.error('  or drop `--no-wizard` to let the wizard run.');
    process.exit(1);
  }

  if (!process.stdin.isTTY) {
    console.error('✗ backend/.env not found.');
    console.error('  This run is non-interactive (CI or piped), so the wizard cannot run.');
    console.error('  Create backend/.env yourself, then re-run. Two paths:');
    console.error('');
    console.error('    1. Fast manual route (e.g. Docker secret, k8s, deploy script):');
    console.error('         Create backend/.env by copying from backend/.env.example,');
    console.error('         then fill in your real credentials.');
    console.error('');
    console.error('    2. Run the wizard in a real terminal:');
    console.error('         npm run env:wizard   # walks you through each variable');
    console.error('         npm run dev:real     # then starts the backend + frontend');
    console.error('');
    console.error('    (Tip: pass `--no-wizard` if your deploy script will create .env before this run.)');
    process.exit(1);
  }

  console.log('▶ backend/.env not found — launching `npm run env:wizard` first.\n');
  const result = spawnSync(
    process.execPath, // 'node' on PATH; resolves identically on Win/Linux/macOS
    [WIZARD_PATH],
    { stdio: 'inherit', cwd: ROOT },
  );

  if (result.error) {
    console.error('✗ failed to launch env wizard:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(
      `✗ env wizard exited with status ${result.status}; ` +
        `backend/.env was not created — aborting before starting servers.`,
    );
    process.exit(result.status || 1);
  }
  // Defensive: even on exit 0, make sure the file really landed.
  if (!fs.existsSync(ENV_PATH)) {
    console.error('✗ env wizard reported success but backend/.env still missing — aborting.');
    process.exit(1);
  }
  console.log('▶ env wizard complete — now starting backend + frontend in REAL mode.\n');
}

// Build the per-command env. windowsCompat is layered on top in every mode
// so the Windows IPv4/IPv6 fix survives `dev:real` as well.
function backendEnv() {
  if (realMode) {
    // Real mode: tsx + dotenv will read backend/.env at boot, and overlay
    // only the Windows-compat pins on top so we don't regress that gotcha.
    // Test secrets stay OFF.
    return { ...process.env, ...windowsCompat };
  }
  return { ...process.env, ...windowsCompat, ...testSecrets };
}

// Real mode requires backend/.env — make sure it exists BEFORE we hand off
// to concurrently, so the backend's dotenv load sees a real file rather
// than toiling through placeholder strings.
if (realMode && !onlyFe) {
  ensureEnvForRealMode();
}

const commands = [];

if (!onlyFe) {
  commands.push({
    name: 'backend',
    command: 'npm run dev',
    cwd: BACKEND,
    env: backendEnv(),
    prefixColor: 'blue',
  });
}

if (!onlyBe) {
  commands.push({
    name: 'frontend',
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    cwd: FRONTEND,
    prefixColor: 'green',
  });
}

console.log(
  realMode
    ? '▶ Starting in REAL mode (backend uses .env, test routes disabled, Windows env still pinned)'
    : '▶ Starting in TEST mode (ENABLE_TEST_ROUTES=1, dummy OAuth/JWT, Windows env pinned)',
);

concurrently(commands, {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 0,
}).then(
  () => process.exit(0),
  (err) => {
    console.error('✗ Dev process failed:', err && err.message ? err.message : err);
    process.exit(1);
  },
);
