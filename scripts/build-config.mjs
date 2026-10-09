#!/usr/bin/env node
/**
 * Genera src/js/config-fallback.js a partir de public/birthday.config.json.
 *
 * La página funciona con el JSON en vivo; este módulo es sólo el respaldo
 * para cuando no haya red o se abra el archivo directamente (file://).
 *
 * Uso:  node scripts/build-config.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public', 'birthday.config.json');
const target = path.join(root, 'src', 'js', 'config-fallback.js');

const raw = await readFile(source, 'utf8');
JSON.parse(raw);

const banner = [
  '// AUTOGENERADO por scripts/build-config.mjs — no editar a mano.',
  '// Fuente única de verdad: birthday.config.json',
  ''
].join('\n');

await writeFile(target, `${banner}export default ${JSON.stringify(JSON.parse(raw), null, 2)};\n`, 'utf8');
console.log(`✔ Fallback generado: ${path.relative(root, target)}`);
