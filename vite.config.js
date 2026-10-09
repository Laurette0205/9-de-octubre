import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));

/** Rutas relativas (./…) que el service worker debe precachear en cada build. */
function collectPrecacheUrls(distDir) {
  const urls = new Set([
    './',
    './index.html',
    './manifest.json',
    './birthday.config.json',
    './assets/fonts/fonts.css'
  ]);

  const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)) {
    urls.add(`./${match[1]}`);
  }
  for (const match of html.matchAll(/src="\.\/(js\/[^"]+)"/g)) {
    urls.add(`./${match[1]}`);
  }

  // Todos los assets con hash (incluye chunks importados dinámicamente).
  const assetsDir = path.join(distDir, 'assets');
  if (existsSync(assetsDir)) {
    for (const file of readdirSync(assetsDir)) {
      if (/\.(js|css)$/.test(file)) urls.add(`./assets/${file}`);
    }
  }

  const jsDir = path.join(distDir, 'js');
  if (existsSync(jsDir)) {
    for (const file of readdirSync(jsDir)) {
      urls.add(`./js/${file}`);
    }
  }

  const fontsDir = path.join(distDir, 'assets', 'fonts');
  if (existsSync(fontsDir)) {
    for (const file of readdirSync(fontsDir)) {
      if (file.endsWith('.woff2')) urls.add(`./assets/fonts/${file}`);
    }
  }

  const imagesDir = path.join(distDir, 'assets', 'images');
  if (existsSync(imagesDir)) {
    for (const file of readdirSync(imagesDir)) {
      urls.add(`./assets/images/${file}`);
    }
  }

  return [...urls].sort();
}

/**
 * Inyecta en dist/sw.js la lista real de assets emitidos (con hash), para que
 * el precache funcione tanto en `vite preview` como en cualquier despliegue.
 */
function serviceWorkerPrecache() {
  return {
    name: 'service-worker-precache',
    apply: 'build',
    closeBundle() {
      const distDir = path.join(root, 'dist');
      const swPath = path.join(distDir, 'sw.js');
      if (!existsSync(swPath)) return;

      const urls = collectPrecacheUrls(distDir);
      const source = readFileSync(swPath, 'utf8');
      const updated = source.replace(
        /const PRECACHE_BUILD = \[[\s\S]*?\];/,
        `const PRECACHE_BUILD = [\n${urls.map((url) => `  '${url}'`).join(',\n')}\n];`
      );
      writeFileSync(swPath, updated, 'utf8');
      console.log(`[sw] precache: ${urls.length} rutas`);
    }
  };
}

/**
 * Configuración de build para la experiencia "9 de Octubre".
 *
 * - `base: './'` genera rutas relativas para que el sitio funcione igual en
 *   dominio propio, GitHub Pages (subcarpeta), Netlify o Vercel.
 * - `public/` se copia tal cual al final del build (config, PWA, assets).
 * - El código fuente vive en `src/` y se empaqueta con hashes.
 */
export default defineConfig({
  base: './',
  publicDir: 'public',
  plugins: [serviceWorkerPrecache()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2019',
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false
  },
  preview: {
    port: 4173,
    strictPort: false,
    open: false
  }
});
