#!/usr/bin/env node
/**
 * Fija la URL pública del sitio en los metadatos estáticos (SEO).
 *
 * Uso:
 *   node scripts/set-url.mjs https://ejemplo.com          # URL directa
 *   node scripts/set-url.mjs                              # lee seo.url de birthday.config.json
 *   npm run publish:url -- https://ejemplo.com
 *
 * Qué actualiza en index.html:
 *   - <link rel="canonical">
 *   - <meta property="og:url"> y <meta name="twitter:url">
 *   - <meta property="og:image"> y <meta name="twitter:image"> (las vuelve absolutas)
 *
 * Sin argumentos y con seo.url vacío no hace nada (modo local / desarrollo).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'index.html');
const configPath = path.join(root, 'public', 'birthday.config.json');

function normalizeBaseUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);
  return url.origin + (url.pathname === '/' ? '' : url.pathname.replace(/\/$/, ''));
}

function upsertMeta(html, attribute, name, content) {
  const existing = new RegExp(`<meta[^>]*${attribute}="${name}"[^>]*>`, 'i');

  if (existing.test(html)) {
    return html.replace(existing, (tag) => {
      if (tag.includes('content="')) {
        return tag.replace(/content="[^"]*"/, `content="${content}"`);
      }
      return tag.replace(/^\s*<meta/, `<meta content="${content}"`);
    });
  }

  const insertion = `  <meta ${attribute}="${name}" content="${content}">`;
  // Los metadatos nuevos se agrupan con el resto, justo antes de los <link>.
  const anchor = /(\n\s*<link\s+rel="icon")/;
  if (anchor.test(html)) return html.replace(anchor, `\n${insertion}$1`);
  return html.replace(/(\n<\/head>)/, `\n${insertion}$1`);
}

function upsertCanonical(html, href) {
  if (/<link\s+rel="canonical"[^>]*>/i.test(html)) {
    return html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${href}">`);
  }
  return html.replace(/(\n\s*<link\s+rel="manifest"[^>]*>)/, `$1\n  <link rel="canonical" href="${href}">`);
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
const baseUrl = normalizeBaseUrl(process.argv[2] || config.seo?.url);

if (!baseUrl) {
  console.log('ℹ️  Sin URL pública: no se modificó index.html.');
  console.log('   Define "seo.url" en birthday.config.json o pasa la URL como argumento.');
  process.exit(0);
}

let html = await readFile(htmlPath, 'utf8');
const original = html;

html = upsertCanonical(html, `${baseUrl}/`);
html = upsertMeta(html, 'property', 'og:url', `${baseUrl}/`);
html = upsertMeta(html, 'name', 'twitter:url', `${baseUrl}/`);

// Las imágenes sociales deben ser absolutas para que los rastreadores las lean.
for (const [attribute, name] of [
  ['property', 'og:image'],
  ['name', 'twitter:image']
]) {
  const tag = new RegExp(`<meta[^>]*${attribute}="${name}"[^>]*>`, 'i');
  const match = html.match(tag);
  if (!match) continue;
  const content = match[0].match(/content="([^"]*)"/);
  if (!content) continue;
  const absolute = new URL(content[1], `${baseUrl}/`).href;
  html = html.replace(tag, match[0].replace(/content="[^"]*"/, `content="${absolute}"`));
}

if (html === original) {
  console.log(`ℹ️  Los metadatos ya apuntaban a ${baseUrl}`);
} else {
  await writeFile(htmlPath, html, 'utf8');
  console.log(`✔ URL pública fijada en index.html → ${baseUrl}/`);
}
