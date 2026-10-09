# Auditoría

Informe final de verificación de la plataforma **9 de Octubre — Un Día Para Celebrarte**.
Combina auditoría automática (`scripts/audit.py`), pruebas unitarias, matriz de rutas
sobre el servidor real, QA en navegador (visión real, no fuente) y revisión visual.

```bash
npm run audit                          # auditoría estática
npm test                               # frontend (Node) + backend (pytest)
npm run qa                             # QA en navegador (68 comprobaciones)
npm run screenshots                    # capturas 360 / 768 / 1440 → docs/screenshots/
```

## 1. Auditoría automática

| Categoría | Qué comprueba |
| --- | --- |
| `contraste` | Ratios WCAG de los pares texto/fondo en los tres temas |
| `seo` | `<title>`, meta description, OG, canonical/`og:url`, viewport, `lang` |
| `accesibilidad` | `alt`, jerarquía de encabezados, botones con nombre, ids únicos, skip link, 44 px |
| `seguridad` | Scripts/handlers inline, recursos remotos, `noopener`, CSP y cabeceras del backend, secretos en código |
| `css` / `responsive` | Hojas presentes, breakpoints, `clamp()` |
| `pwa` | Manifest, iconos 72–512, service worker versionado, fallback sincronizado |
| `configuración` | Bloques obligatorios, fecha, timezone, audio sin autoplay |
| `contenido` | Marcadores `[NOMBRE]`/`[PLACEHOLDER]` en configuración, HTML y fallback |
| `assets` | Escenas, galería (≥ 6), favicon, og-image, peso |
| `backend` | CORS, cabeceras, rate limit, sanitización, ausencia de secretos |
| `docs` | README y los ocho documentos de `docs/` |

**Última ejecución: `PASS 99 · WARN 1 · FAIL 0`**

| Aviso | Motivo |
| --- | --- |
| `peso de assets` | `12.9 MB` por encima del objetivo de 8 MB: incluye los 3 MP3 de Luis Miguel (~10.2 MB). El audio no se precachea ni se carga hasta que el usuario pulsa reproducir; si prefieres un peso menor, deja sólo la pista principal. |

## 2. Revisión fase por fase

| Fase | Estado | Verificación |
| --- | --- | --- |
| 1. Migración a Vite (`src/` + `public/` + `dist/`) | ✔ | `npm run dev`, `npm run build` y `npm run preview` operativos; `base: './'` (rutas relativas) |
| 2. Configuración central | ✔ | `public/birthday.config.json` válido, `build:config` idempotente, fallback sincronizado, sin placeholders |
| 3. Sistema de diseño partido en 6 CSS | ✔ | Tokens en `variables.css`, 3 temas, tipografía fluida, contraste auditado; 0 líneas perdidas en el reparto |
| 4. Estructura y contenido | ✔ | 9 escenas + portada, semántica, 1 `<h1>`, landmarks, jerarquía sin saltos |
| 5. Componentes interactivos | ✔ | Portada con `inert`, carrusel 3D, carta modal con revelado progresivo, música con anterior/siguiente, confeti, toast |
| 6. Accesibilidad | ✔ | Skip link, panel de lectura, `aria-*`, foco atrapado (portada y carta), `Escape`, reduce-motion |
| 7. PWA | ✔ | Manifest + iconos + SW `v2.0.1`: activo, 31 entradas de precache (incluye chunks con hash), offline correcto |
| 8. Backend FastAPI | ✔ | 29 pruebas; `FRONTEND_DIR` → `dist/`, `CONFIG_FILE` → `public/` |
| 9. Pruebas | ✔ | `18 + 29` pruebas en verde |
| 10. Auditoría final + correcciones | ✔ | Ver secciones 3–10 |

## 3. Contraste (WCAG)

Verificado por `npm run audit` en los tres temas:

| Par | Ratio | Requisito |
| --- | --- | --- |
| Texto principal sobre fondo nocturno (`#f5f0e8` / `#0a0f1a`) | ≈ 17:1 | AAA |
| Texto secundario sobre tarjeta (`#c9c4bb` / `#111827`) | ≥ 4.5:1 | AA |
| Acento dorado sobre nocturno (`#c9a84c` / `#0a0f1a`) | ≥ 4.5:1 | AA |
| Texto en modo claro (`#111827` / `#f5f0e8`) | ≈ 17:1 | AAA |
| Alto contraste (`#ffffff` y `#ffe100` / `#000000`) | ≥ 7:1 | AAA |

## 4. Accesibilidad (QA en navegador)

68 comprobaciones, todas correctas, con **0 errores de consola**. Destacan:

- Skip link enfocable y visible al recibir foco; un solo `<h1>`, jerarquía sin
  saltos, landmarks `banner/main/footer/nav` correctos.
- Portada de entrada: visible con título y CTA correctos, y se cierra al entrar
  (el resto de la página queda oculta mientras está abierta).
- Todas las imágenes con `alt`; ningún `a`/`button` sin nombre accesible.
- Panel de lectura: tamaño 18 → 20 px, modo lectura y reduce animaciones persisten.
- Carta: revelado progresivo, foco dentro del diálogo, `Escape` devuelve el foco.
- Carrusel 3D: botones Anterior/Siguiente, teclado y swipe (pointer/touch).
- Reproductor: playlist con anterior/siguiente, indicador `N / M`, volumen.
- Menú móvil: abre y cierra con `Escape`.
- Sin overflow horizontal a 360 px; escena final con «volver a ver».
- Service worker activo, precache ≥ 20 rutas y **recarga sin conexión** correcta.

## 5. Rutas y API (servidor real)

Ejecutado contra `uvicorn` en desarrollo (puerto 8000) y en modo producción
(`ENVIRONMENT=production FORCE_HTTPS=true ALLOWED_ORIGINS=…`, puerto 8002):

| Grupo | Resultado |
| --- | --- |
| `GET /api`, `/api/health`, `/api/config`, `/api/config/validate` | ✔ 200, sin claves sensibles |
| `POST /api/greetings` válido → 201 | ✔ |
| Entrada con `<script>`/`<b>` | ✔ sanitizada (`alert(1)` se elimina) |
| Entrada vacía / < 5 caracteres / > 500 | ✔ 422 |
| `GET /api/greetings`, `/{id}`, `/{id}` inexistente | ✔ 200 / 200 / 404 |
| Ruta desconocida / método no permitido | ✔ 404 / 405 |
| Rate limit (12/min por IP) | ✔ 429 a partir de la 13.ª petición |
| Cabeceras | ✔ CSP estricta, `nosniff`, `DENY`, `no-referrer`, `Permissions-Policy`, `COOP`; sin HSTS por defecto |
| HSTS con `FORCE_HTTPS=true` | ✔ `max-age=31536000; includeSubDomains` |
| CORS | ✔ permite `ALLOWED_ORIGINS`, rechaza orígenes ajenos |
| Producción | ✔ `/api/docs` y `/api/openapi.json` → 404, frontend servido |
| Estáticos | ✔ `/`, CSS, JS, manifest, sw, imágenes, `robots.txt`, `birthday.config.json` → 200; inexistente → 404 |

## 6. Consola y red

- **0** errores de consola y **0** peticiones fallidas, también durante la
  **prueba sin conexión**: no existe ninguna petición externa (tipografías
  autoalojadas), así que nada puede quedar bloqueado por `connect-src 'self'`.
- Rendimiento de la primera carga (medido en QA): `DOMContentLoaded ≈ 60 ms`,
  `load ≈ 70 ms`, `transferSize ≈ 300 B` (app shell desde caché).

## 7. Rendimiento y peso

| Métrica | Valor |
| --- | --- |
| Peso total de `public/` + `src/` | **1771 KB** (presupuesto < 8 MB) |
| Build (`dist/`) | **1734 KB**, de los cuales 1137 KB son las 2 pistas `.wav` |
| Render crítico (`dist/index.html` + CSS + JS) | ≈ 113 KB (22 + 56 + 35) |
| Audio `.wav` | 1137 KB (carga perezosa, `preload="none"`, sólo con gesto) |
| Recursos externos | **ninguno** (tipografías autoalojadas: 8 `.woff2`, 309 KB) |
| PWA | precache de 31 rutas (incluye JS/CSS con hash); funciona sin conexión |

## 8. PWA

- Service worker `v2.0.1`: instala con `Promise.allSettled` (una ruta ausente no
  invalida el precache), el plugin de Vite rellena las rutas con hash y
  `birthday.config.json` usa `network-first`.
- Búsquedas en caché con `ignoreVary: true`: sirve con `Vary: Origin` y sin él
  (evita que el modo sin conexión devuelva `index.html` para un `.js`).
- Verificado en navegador: registro activo, 31 entradas en caché y **recarga sin
  conexión con contenido servido desde caché** (sin errores de MIME).

## 9. Revisión visual

Capturas generadas con `npm run screenshots` en `docs/screenshots/`
(360 × 800, 768 × 900 y 1440 × 900; estado de la portada y de la portada cerrada
verificado por script en cada captura):

| Escenario | Resultado |
| --- | ✔ |
| Portada (gate) en 360 / 768 / 1440: kicker, título, nombre dorado, CTA, pista de audio | ✔ animaciones asentadas, sin solapes |
| Inicio en 360 / 768 / 1440: h1 con el nombre, CTAs, toast, reproductor | ✔ sin overflow; en 360 el reductor oculta título/volumen |
| Escena 03 (contador) a 1440 | ✔ tarjeta con 4 bloques de tiempo |
| Escena 08 (noche/escenario) a 360 | ✔ botón de música dentro del viewport (estado `stageBtnWidth` verificado por script) |
| Escena 09 (final) a 1440 | ✔ título, círculos concéntricos y toast de cierre |
| Modo claro / alto contraste | ✔ tokens auditados (`npm run audit`) |

## 10. Correcciones aplicadas en esta pasada

1. **Migración a Vite**: `frontend/` → `src/` + `public/` con salida en `dist/`;
   CSS repartido en 6 ficheros (sin pérdida de líneas) y JS en módulos con
   componentes nuevos (`intro-gate`, `memory-carousel`, `final-scene`).
2. **Modo sin conexión roto por `Vary: Origin`**: las respuestas del servidor de
   preview incluyen esa cabecera, por lo que `caches.match()` no encontraba los
   assets precacheados y devolvía `index.html` para el `.js` (error de MIME).
   Solución: `ignoreVary: true` en las tres estrategias del service worker.
3. **Precache incompleto**: se añadieron al precache los chunks con hash y
   `js/theme-boot.js` (antes sólo se listaban las rutas citadas en el HTML).
4. **Contraste del CTA primario**: `a:hover` (champagne) ganaba a `.btn-primary`
   (noche) al pasar el ratón; ahora el hover genérico excluye a los `.btn`.
5. **Reproductor en móvil ≤480 px**: se desbordaba del contenedor; se ocultan
   título y volumen y se permite el ajuste de línea.
6. **Rutas migradas en las herramientas**: `scripts/audit.py` (raíz, `src/`,
   `public/`, `dist/`), `scripts/set-url.mjs`, `tests/frontend/*.test.mjs`,
   `backend/config/settings.py` (`CONFIG_FILE` → `public/`, `DIST_DIR` → `dist/`).
7. **QA**: de 44 a 67 comprobaciones, con captura de respuestas servidas con
   MIME `text/html` para detectar este tipo de regresiones; `npm run qa` es un
   envoltorio que lanza la skill de navegador.
8. **Auditoría senior (P0/P1, ver `docs/UX-AUDIT.md`)**:
   - *P0* · el botón de música de la escena 08 medía 430 px en un viewport de 360
     y quedaba recortado; el CTA del gate medía 323 px en 320. `.btn` ya no
     fuerza `white-space: nowrap` (usa envoltura equilibrada y `max-width: 100%`),
     la rejilla del gate usa `minmax(0, 1fr)` y el tracking del título del gate
     se controla con `--gate-title-tracking` (el keyframe `gate-title-in` fija
     `letter-spacing` con `fill-mode: both`, por lo que una regla normal no bastaba).
   - *P1* · mínimo tipográfico a 14 px (`--font-size-xs` 0.78 rem y
     `.countdown__key` 0.78 rem), target táctil del volumen a 44 px de alto y
     captura de regresión `08-escena-noche-360.png`.
   - Verificación: 0 desbordes en 320/360/414/768/1440 (gate y página), 0 textos
     por debajo de 14 px en móvil, QA 67/67, `npm test` 18 + 29, audit `PASS 96`.
9. **Recursos reales integrados (imágenes + música)**:
   - 4 fotos de Naruto (`naruto-01..04.jpg`) y 3 de Luis Miguel
     (`luismiguel-01..03.jpg`) copiadas a `public/assets/images/`, reescaladas
     con Pillow a ≤1280 px de lado largo y JPEG progresivo q82 (~724 KB total).
   - Reparto: tira ninja (4), escena 08 (`luismiguel-01`), recuerdos
     (r1 `naruto-03`, r3 `luismiguel-02`) y galería (`naruto-01`, `naruto-04`,
     `luismiguel-03`); los `alt` describen cada foto.
   - 3 MP3 de Luis Miguel en `public/assets/audio/` (~10.2 MB). Pista principal:
     *La gloria eres tú* (la primera de `music.tracks`); *Sabes una cosa* y
     *Soy yo* son alternativas con ◀ ▶. Campo nuevo `artist`, mostrado en el
     reproductor como «Luis Miguel — La gloria eres tú».
   - Sin autoplay y `preload="none"`: el MP3 sólo se descarga al pulsar
     reproducir (verificado: respuesta `206 audio/mpeg`, duración 202.8 s).
   - El service worker precachea las imágenes (38 rutas) pero no el audio.
   - Verificación: QA 68/68, `npm test` 18 + 29, audit `PASS 99 · FAIL 0`
     (WARN esperado de peso por los MP3).

## 11. Pendientes antes de publicar

1. ✔ URL pública fijada: `seo.url = https://laurette0205.github.io/9-de-octubre`
   aplicada con `npm run publish:url`. Si cambias de dominio, repítelo.
2. Desplegar con HTTPS (proxy inverso) y `backend/.env`:
   `ALLOWED_ORIGINS=https://tu-dominio.com`, `FORCE_HTTPS=true`.
3. Releer [`CHECKLISTS.md`](CHECKLISTS.md): quedan elementos que sólo se pueden
   verificar en el entorno real (NVDA/VoiceOver, Lighthouse, iOS/Android).
