#!/usr/bin/env node
/**
 * Envoltorio de `npm run qa`.
 *
 * Lanza el QA en navegador real (tests/frontend/qa-browser.mjs) a través de la
 * skill de browser-automation. Variables:
 *
 *   QA_URL                   URL a probar (por defecto http://localhost:4173)
 *   BROWSER_AUTOMATION_PATH  ruta a browser.mjs (skill de browser-automation)
 *
 * Uso:
 *   npm run preview            # en otra terminal
 *   npm run qa
 *   npm run screenshots
 *   QA_URL=http://localhost:5173 npm run qa
 *   node tests/frontend/qa.mjs tests/frontend/screenshots.mjs
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const candidates = [
  process.env.BROWSER_AUTOMATION_PATH,
  'C:\\Users\\laura\\.claude\\skills\\browser-automation\\browser.mjs',
  '/Users/laura/.claude/skills/browser-automation/browser.mjs'
].filter(Boolean);

const browser = candidates.find((candidate) => existsSync(candidate));
if (!browser) {
  console.error('No encuentro browser.mjs de la skill browser-automation.');
  console.error('Define BROWSER_AUTOMATION_PATH=/ruta/a/browser.mjs');
  process.exit(2);
}

const url = process.env.QA_URL || 'http://localhost:4173/';
const scriptArg = process.argv[2] || 'tests/frontend/qa-browser.mjs';
const script = path.isAbsolute(scriptArg) ? scriptArg : path.join(root, scriptArg);

if (!existsSync(script)) {
  console.error(`No existe el script de QA: ${script}`);
  process.exit(2);
}

const child = spawn(process.execPath, [browser, url, '--script', script], {
  stdio: 'inherit',
  cwd: root
});
child.on('exit', (code) => process.exit(code ?? 1));
