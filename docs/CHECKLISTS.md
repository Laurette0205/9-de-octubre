# Checklists de calidad

Marcas: `[x]` verificado, `[ ]` pendiente. Las casillas se revisan antes de dar
la experiencia por terminada; `npm run audit` automatiza lo marcado con 🔧.

## Accesibilidad (WCAG 2.1 AA)

- [x] 🔧 Un único `<h1>` y jerarquía de encabezados sin saltos
- [x] 🔧 Todas las `<img>` con `alt` descriptivo
- [x] 🔧 `<main>`, `<header>`, `<nav>`, `<footer>` como landmarks
- [x] 🔧 Skip link como primer foco, visible al recibir foco
- [x] 🔧 `lang="es"` en el documento
- [x] 🔧 Texto alternativo en botones e iconos (`visually-hidden`)
- [x] 🔧 Estados expuestos con `aria-pressed` / `aria-expanded` / `aria-current`
- [x] 🔧 Avisos dinámicos en `aria-live="polite"` (toast, valor de texto)
- [x] 🔧 Modal con `role="dialog"`, `aria-modal`, foco inicial, foco atrapado y
      devolución del foco al disparador; `Escape` cierra
- [x] 🔧 Sin manejadores inline ni `<script>` inline (CSP `script-src 'self'`)
- [x] 🔧 Foco visible en todos los controles (`:focus-visible` + anillo dorado/azul)
- [x] 🔧 Contraste AA en los tres temas (verificado por auditoría)
- [x] 🔧 Navegación completa con teclado (menú, filtros, galería, modal, música)
- [x] 🔧 Superficies táctiles ≥ 44 px en los controles principales
- [x] 🔧 `prefers-reduced-motion` respetado **y** interruptor manual de animaciones
- [x] 🔧 Tamaño de texto ajustable 16–24 px sin pérdida de contenido
- [x] 🔧 Modo lectura con medida de línea de 66–75 caracteres
- [ ] Nada de información expresada sólo por color
- [ ] Verificación con lector de pantalla real (NVDA/VoiceOver) y zoom al 200 %

## Seguridad

- [x] 🔧 CSP estricta: `default-src 'self'`, sin `unsafe-inline` en scripts
- [x] 🔧 Cabeceras: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
      `Referrer-Policy: no-referrer`, `Permissions-Policy`, `COOP`
- [x] 🔧 CORS restringido por `ALLOWED_ORIGINS` (alias `CORS_ORIGINS`; nunca `*` con credenciales)
- [x] 🔧 HSTS disponible con `FORCE_HTTPS=true` para despliegues con proxy TLS
- [x] 🔧 Sin secretos en el repositorio (`.env.example` documenta las claves)
- [x] 🔧 Entradas sanitizadas y límite de longitud en `/api/greetings`
- [x] 🔧 Limitación de tasa por IP en la API
- [x] 🔧 Sin `target="_blank"` sin `rel="noopener"`
- [x] 🔧 Sin ningún recurso remoto: tipografías autoalojadas en `assets/fonts/`
- [x] 🔧 CSP sin dominios externos (`style-src`/`font-src`/`connect-src` = `'self'`)
- [x] 🔧 El service worker no intenta salir de la red (origen del error `connect-src`)
- [x] 🔧 `form-action 'self'`, `base-uri 'self'`, `frame-ancestors 'none'`
- [x] Datos locales: nada de analítica, publicidad ni rastreo (confirmado en el pie)
- [ ] Prueba de penetración básica (SQLi/XSS con payloads) en `/api/greetings`
- [ ] HTTPS obligatorio en despliegue público

## Responsive

- [x] 🔧 Meta `viewport` con `viewport-fit=cover`
- [x] 🔧 Breakpoints cubiertos: 480, 640, 768, 900, 1023, 1024, 1280 px
- [x] 🔧 Tipografía fluida con `clamp()` (sin cortes ni scroll horizontal)
- [x] 🔧 Rejillas: deseos 1→2→3, galería 1→2→3→4, escenas apiladas → 2 columnas
- [x] 🔧 Menú colapsado con botón y `aria-expanded` por debajo de 1024 px
- [x] Hero con `100svh` (sin salto por la barra de URL del móvil)
- [x] Prueba visual a 360 × 800, 768 × 900 y 1440 × 900 (`docs/screenshots/`, `npm run screenshots`)
- [ ] Prueba en iOS Safari y Android Chrome reales

## Rendimiento

- [x] 🔧 Cero frameworks y cero JS de terceros
- [x] 🔧 Fuentes cargadas de forma no bloqueante (`media="print"` + `<noscript>`)
- [x] 🔧 `loading="lazy"` y `decoding="async"` en imágenes fuera de pantalla
- [x] 🔧 Audio `preload="none"` y carga perezosa en el primer play
- [x] 🔧 Canvas de partículas limitado a `devicePixelRatio` y pausado sin visible
- [x] 🔧 Service worker con precache y `network-first` sólo para configuración
- [x] 🔧 🔧 Tamaño total de `public/` + `src/` < 8 MB (auditoría)
- [x] 🔧 Sin errores de consola ni peticiones fallidas (QA en navegador)
- [ ] Presupuesto: First Contentful Paint < 1,5 s en 4G
- [ ] Lighthouse ≥ 95 en Performance / Best Practices / SEO

## Contenido y SEO

- [x] 🔧 `<title>` y meta description descriptivos
- [x] 🔧 Open Graph y Twitter Card con imagen (`og-image.png`)
- [x] 🔧 `robots.txt` y `manifest.json`
- [x] 🔧 Textos sin marcadores de posición (configuración, HTML y fallback)
- [x] 🔧 Frases largas revisadas ortográficamente (español neutro)
- [x] Sin marcadores `[NOMBRE]` en configuración, HTML ni fallback
- [ ] Fijar `seo.url` y ejecutar `npm run publish:url -- <url>` cuando exista dominio

## PWA e instalación

- [x] 🔧 Manifest con `name`, `short_name`, `start_url`, `display`, `icons`
- [x] 🔧 Iconos 72–512 px generados localmente
- [x] 🔧 Service worker versionado (`VERSION` en `sw.js`)
- [x] 🔧 `theme-color` coincide con el manifest
- [x] Service worker activo, precache completo (31 rutas) y recarga sin conexión verificadas en QA
- [ ] Prueba de instalación en dispositivo real

## Pruebas y entrega

- [x] `npm run test:frontend` → 18/18
- [x] `npm run test:backend` → 20/20
- [x] `npm run audit` → 0 fallos
- [x] QA de navegador (`tests/frontend/qa-browser.mjs`) → 67/67 sin errores de consola
- [x] Matriz de rutas API (14 endpoints + estáticos + CORS + rate limit + HSTS) verificada
- [x] Revisión visual de temas oscuro / claro / alto contraste / modo lectura
- [x] Documentación: README + 6 documentos en `docs/`
- [ ] Revisar la checklist en cada release

## Datos personales y privacidad

- [x] Sin cookies de terceros, sin trackers, sin publicidad
- [x] Persistencia limitada a `localStorage` bajo el prefijo `9oct:` (y borrable)
- [x] La API no almacena nada salvo los saludos enviados voluntariamente
- [ ] Aviso de privacidad si la página se publica con formulario activo
