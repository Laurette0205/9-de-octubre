/**
 * Service worker de la experiencia "9 de Octubre".
 *
 * Estrategia:
 *  - App shell: cache-first con actualización en segundo plano.
 *  - birthday.config.json: network-first para que los cambios de texto
 *    se vean sin reinstalar, con respaldo en caché.
 *  - Tipografías autoalojadas: stale-while-revalidate.
 *  - Todo lo demás: network-first con respaldo en caché.
 */

const VERSION = 'v2.0.1';
const STATIC_CACHE = `9oct-static-${VERSION}`;
const RUNTIME_CACHE = `9oct-runtime-${VERSION}`;
const FONT_CACHE = `9oct-fonts-${VERSION}`;

/**
 * Assets con hash emitidos por Vite: se rellenan en cada `npm run build`
 * (ver plugin serviceWorkerPrecache en vite.config.js).
 */
const PRECACHE_BUILD = [];

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './birthday.config.json',
  './assets/fonts/fonts.css',
  ...PRECACHE_BUILD
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // allSettled: una ruta inexistente no invalida todo el precache
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE && key !== FONT_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isConfig = url.pathname.endsWith('birthday.config.json');
  const isFont = url.pathname.startsWith('/assets/fonts/');

  if (isFont) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  if (isConfig) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }

  event.respondWith(cacheFirst(request, RUNTIME_CACHE));
});

async function cacheFirst(request, cacheName) {
  // ignoreVary: sirv/vite preview envían `Vary: Origin`; sin ignorarlo, la
  // respuesta precacheada no coincide con las peticiones del navegador en offline.
  const cached = await caches.match(request, { ignoreVary: true });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const fallback = await caches.match('./index.html', { ignoreVary: true });
    if (fallback) return fallback;
    throw error;
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { ignoreSearch: false, ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  // Busca en TODAS las cachés: los assets del precache viven en STATIC_CACHE.
  const cached = await caches.match(request, { ignoreVary: true });
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await network) || Response.error();
}
