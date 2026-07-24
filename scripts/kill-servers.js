#!/usr/bin/env node
/**
 * Cross-platform port killer for stuck dev servers.
 *
 * Frees 3001 (backend) and 5173 (frontend). Safe to run repeatedly — it
 * no-ops when nothing is bound. Use this when an interrupted `npm run dev`
 * left zombie node.exe processes holding the ports.
 *
 * Implementation note: `kill-port` works on Windows + Unix without shelling
 * out to netstat / lsof, which is what makes it cross-platform and stable.
 */
const killPort = require('kill-port');

const PORTS = [3001, 5173];

(async () => {
  try {
    console.log('▶ Killing processes on dev ports');
    for (const port of PORTS) {
      try {
        await killPort(port, 'tcp');
        console.log(`  ✔ freed ${port}`);
      } catch (err) {
        // kill-port rejects when nothing is bound. That's the happy path here.
        console.log(`  · ${port} was already free`);
      }
    }
    console.log('  Done.');
  } catch (err) {
    console.error('✗ Failed to free dev ports:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
