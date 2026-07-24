#!/usr/bin/env node
/**
 * Cross-platform dev orchestrator.
 *
 * Default mode = TEST (no setup needed):
 *   - Backend runs with test secrets + windows compat env.
 *   - Frontend binds to 127.0.0.1:5173 (avoids Windows IPv4/IPv6 mismatch).
 *
 * Flags:
 *   --be    only the backend
 *   --fe    only the frontend
 *   --real  run the backend with your real backend/.env (test routes disabled)
 *           You still need a valid backend/.env (GOOGLE_CLIENT_ID/SECRET/
 *           REDIRECT_URI + a real JWT_SECRET) to use this mode.
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
const concurrently = require('concurrently');
const { windowsCompat, testSecrets } = require('./test-env.cjs');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

const args = new Set(process.argv.slice(2));
const onlyBe = args.has('--be');
const onlyFe = args.has('--fe');
const realMode = args.has('--real');

if (onlyBe && onlyFe) {
  console.error('✗ --be and --fe cannot be combined');
  process.exit(1);
}

// Build the per-command env. windowsCompat is layered on top in every mode
// so the Windows IPv4/IPv6 fix survives `dev:real` as well.
function backendEnv() {
  if (realMode) {
    // Real mode: load backend/.env (already done by tsx via dotenv), and
    // overlay only the Windows-compat pins on top so we don't regress that
    // gotcha. Test secrets stay OFF.
    return { ...process.env, ...windowsCompat };
  }
  return { ...process.env, ...windowsCompat, ...testSecrets };
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
