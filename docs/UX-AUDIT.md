# Auditoría senior de frontend / UX / UI / motion

Fecha: 2026-10-07 · Alcance: `dist/` servido por `npm run preview` (`http://localhost:4173`),
auditoría estática `npm run audit`, QA de navegador (68 checks), capturas responsive y lectura de fuente.

Leyenda de veredictos: **BIEN** · **REGULAR** · **MAL** · **FALTA** · **MEJORAR** · **ELIMINAR**.

> Nota sobre la referencia: el video de referencia nunca se pudo leer en esta sesión
> (el material no llegó legible). La comparación se hace contra el **brief funcional**
> documentado en `docs/PLAN-IMPLEMENTACION.md` (9 escenas), que es lo que el proyecto
> se comprometió a construir.

---

## 1. Resumen ejecutivo

| Área | Veredicto | Evidencia clave |
|---|---|---|
| Consola / JS | **BIEN** | 0 errores, 0 warnings, 0 peticiones fallidas en todas las corridas |
| Rendimiento | **BIEN** | FCP 116 ms · LCP 392 ms · DCL 61 ms · CLS 0.069 (0 tras el gate) · 0 overflow X en 320/360/414/768/1440 |
| Accesibilidad | **BIEN** | contraste ≥ 7.7:1 en pares reales · focus ring 3 px · `prefers-reduced-motion` con 16 bloques y 0 animaciones infinitas al emular |
| Móvil | **MAL** | botón `#stage-music-btn` mide 430 px en viewport de 360 (recortado); CTA del gate 323 px en 320 |
| Tipografía | **MEJORAR** | escalera coherente (99 → 68 → 22.5 → 18) pero `--font-size-xs` cae a 12.6–13.5 px en móvil |
| SEO | **FALTA** | sin `canonical`, sin `og:url`, sin `sitemap.xml`, `seo.url` vacío |
| Seguridad | **REGULAR** | CSP estricta en el backend, 0 dependencias runtime; sin cabeceras al servir `dist` estático |
| Dependencias | **BIEN** | única dependencia `vite` (dev), 0 libs runtime |

---

## 2. Auditoría por dimensión (25)

### 1 · Diseño — **BIEN**
Sistema visual completo y consistente: gate cinematográfico → hero editorial → 7 escenas →
final con confeti. SVG propios, 0 imágenes externas, 0 copyright.

### 2 · Colorimetría — **BIEN**
Paleta efectiva coherente: `warmWhite #f5f0e8` (378 usos) · `gold #c9a84c` (71) ·
`champagne #e8d5b7` · `nightBlue #0a0f1a` · `charcoal #1a1f2e`. Sin colores huérfanos.

### 3 · Tipografía — **MEJORAR**
Playfair Display (h1 99 px → 49.5 px en 360, h2 68 px) + Inter (body 18 px/1.6, lead 22.5 px).
Problema: `--font-size-xs: clamp(0.75rem…)` con raíz 18 px → 13.5 px (y `0.7rem` = 12.6 px en
`.countdown__key`): 12 nodos por debajo de 14 px en móvil. → **P1**.

### 4 · Jerarquía — **BIEN**
Índice de sección (oro, 18 px, tracking amplio) → título display → subtítulo → filete.
Orden de encabezados correcto salvo el `H2` del panel de ajustes que precede al `H1` en el DOM
(→ P2, es un diálogo).

### 5 · Espaciado — **REGULAR**
Ritmo constante y correcto: 9 secciones con `padding-block: 144px`, contenedores acotados
(`max-width` 780 px en `.narrow`, lead 625 px ≈ 66 caracteres). Es correcto pero **monótono**:
la escena final debería respirar distinto que una lista de frases (→ P3).

### 6 · Animaciones — **BIEN**
94 `getAnimations`, 22 keyframes. Entradas escalonadas (`gate-*` 0.7–1 s con delays 0.12/0.26/0.52 s),
`ember-drift` ambiental de 9–17 s (×16), `memory-swap` con easing elástico.
Bajo `prefers-reduced-motion`: **0 animaciones infinitas en ejecución** (`data-reduced-motion="true"`).

### 7 · Transiciones — **BIEN**
7 familias, todas sobre `color/opacity/transform/filter`, 0.12–0.7 s, dos easings coherentes
(`cubic-bezier(0,0,0.2,1)` y `cubic-bezier(0.34,1.56,0.64,1)`). Nada sobre `top/left/width`
(gasta layout): sólo `width 0.12s` en la barra de progreso → admisible (P3).

### 8 · Fluidez — **BIEN**
`scroll-behavior: smooth` con anulación en reduced-motion, `will-change: transform` sólo en 2
nodos, 3 áreas con scroll propio, 8 elementos `fixed`. Sin jank observable en capturas.

### 9 · Responsividad — **MAL**
0 overflow de documento en 320/360/414/768/1440, pero **el recorte ocurre dentro de los
contenedores**: `#stage-music-btn` (430 px en 360) y CTA del gate (323 px en 320) se cortan sin
crear scroll → el usuario no puede leer ni pulsar cómodamente. → **P0**.

### 10 · Móvil — **MAL** (mismos P0)
Hamburger con `aria-expanded` y cierre con Escape (QA ✓), reproductor fijo sin desbordes
(right 302 < 320), tipografía mínima 13.5 px (P1), volumen 84×16 px (P1).

### 11 · Escritorio — **BIEN**
Cabecera fija 86 px con barra de progreso, scrollspy con `aria-current="true"`, 1440 px sin
quejas de layout, gate y hero con ritmo correcto.

### 12 · Botones — **MEJORAR**
`min-height: 48px`, foco visible 3 px oro + offset, variantes primaria/secundaria/ghost,
estado `aria-pressed` en toggles. Defecto raíz de los P0: `white-space: nowrap` + `padding-inline`
amplio en `.btn` impide que una etiqueta larga quepa en pantallas pequeñas.

### 13 · Navegación — **BIEN**
Skip link, menú móvil (abre/cierra/Escape verificados), scrollspy + hash, progreso de scroll,
9 anclas con `aria-labelledby`.

### 14 · Galería — **BIEN**
6 chips con `aria-pressed`, grid semántico `<ul>`, lightbox con `role="dialog"`, empty state,
imágenes con `width/height` + `loading="lazy"` (12/14; las 2 restantes son above-the-fold →
correcto).

### 15 · Countdown — **BIEN**
`role="timer"` + `aria-live="off"` (evita spamear lectores de pantalla), tick correcto, unidades
visibles. Sólo la etiqueta `días/horas` a 12.6 px (P1).

### 16 · Carta — **BIEN**
Revelado progresivo 4/16 líneas a los 0.4 s → 16/16 a los ~3 s, foco movido a `#letter-dialog`,
Escape cierra, foco restaurado.

### 17 · Música — **BIEN**
`preload="none"`, **sin autoplay**, reproducción iniciada por gesto, 2 pistas, reproductor
oculto ≤480 px (decisión deliberada de espacio). Volumen: target de 16 px → P1.

### 18 · Accesibilidad — **BIEN**
`lang="es"`, 14/14 imágenes con `alt`, 0 botones sin nombre, 4 `aria-live`, focus ring 3 px,
contraste real: 16.89:1 (texto principal), 8.38:1 (oro sobre noche), 7.76:1 (pie), 7.05:1
(enlace de nav sobre su fondo compuesto).

### 19 · Rendimiento — **BIEN**
`dist` 1.8 MB total (imágenes incluidas), JS+CSS 111 KB, 6 woff2 subset `latin` con
`font-display: swap`, LCP 392 ms, CLS 0.069, 0 desbordes de `will-change`.

### 20 · JS / consola — **BIEN**
0 errores y 0 warnings en gate, entrada, scroll, carta, música, filtros, modo reducido y modo
offline.

### 21 · Carga de recursos — **BIEN**
Service Worker v2.0.1 con precache de 31 rutas (incluye hashes), `ignoreVary` para Vite preview,
modo offline verificado, `birthday.config.json` en 16 ms.

### 22 · Dependencias — **ELIMINAR** (ya eliminado)
0 dependencias de runtime; sólo `vite` en devDependencies. Nada que degradar.

### 23 · SEO — **FALTA**
Título, descripción, `og:*` y `twitter:*` con imagen locales, `robots.txt` (bloquea `/backend/`),
manifest con iconos. **Faltan**: `link rel=canonical`, `og:url`, `sitemap.xml`, y `seo.url` vacío
(único WARN esperado de `npm run audit`). → **P2**.

### 24 · Seguridad — **REGULAR**
Backend con CSP estricta (`script-src 'self'`, `frame-ancestors 'none'`), sin claves ni
eval/inline scripts, 0 recursos externos. Al desplegar `dist` estático (Pages/Netlify/Vercel) esas
cabeceras no existen → añadir cabeceras por plataforma (P2).

### 25 · Comparación con la referencia / brief — **BIEN**
Las 9 escenas del brief están implementadas: gate, presentación, mundo ninja, contador, recuerdos
(galería + carrusel con transform 3D), carta, frases, música y sorpresa final. Los marcadores
`[NOMBRE]`/`[FECHA]` del brief se sustituyeron por `birthday.config.json`.

---

## 3. Plan P0–P3

### P0 — bloquea el uso (aplicado)

| # | Hallazgo | Evidencia | Fix |
|---|---|---|---|
| P0-1 | `#stage-music-btn` mide 430 px en viewport de 360 px → texto "REPRODUCIR: BANDA SONORA DEL…" recortado y botón pegado al borde izquierdo | medición `w:430 · right:457 · vw:360` + captura | `.btn` deja de forzar `white-space: nowrap`: `white-space: normal` + `text-wrap: balance` + `max-width: 100%`, para que la etiqueta se envuelva en vez de recortarse |
| P0-2 | CTA del gate mide 323 px en 320 px (desborda el viewport); además el título "celebrarte" se partía a media palabra al intentar ajustarlo | `ctaW:323 · vw:320`; `celebrarte` = 302 px con `letter-spacing: 0.18em` | rejilla del gate a `grid-template-columns: minmax(0, 1fr)` + `min-width: 0` en el contenido; tracking del título parametrizado en `--gate-title-tracking` y bajado a `0.08em` ≤360 px. **Detalle**: el keyframe `gate-title-in` fija `letter-spacing` con `fill-mode: both`, por lo que una regla normal no podía ganarle (hay que cambiar la variable, no la declaración) |

### P1 — calidad y accesibilidad (aplicado)

| # | Hallazgo | Evidencia | Fix |
|---|---|---|---|
| P1-1 | Textos por debajo de 14 px en móvil (12.6–13.5 px) | 12 nodos medidos a 360 px | `--font-size-xs` mínimo 0.78 rem (14.04 px) y `.countdown__key` 0.78 rem |
| P1-2 | Control de volumen 84×16 px (<44 px de target táctil) | probe `TAPS <44` | `height: 44 px` en `input[type=range]` del reproductor |
| P1-3 | Sin regresión visual del escenario nocturno en móvil | — | captura `08-escena-noche-360.png` con el ancho del botón como estado verificable |

### P2 — siguiente lote

- `canonical` + `og:url` inyectados desde `birthday.config.json → seo.url` + `sitemap.xml`.
- Cabeceras de seguridad para despliegue estático (`_headers` / `vercel.json`).
- Orden de encabezados: mover el panel de ajustes tras el `H1` (o `aria-labelledby` del diálogo).
- Pausar `ember-drift` fuera de pantalla (IntersectionObserver).
- Ampliar `padding-block` de secciones según peso narrativo (romper la monotonía de 144 px).

### P3 — pulido

- Micro-ajustes de ritmo tipográfico (tracking del `section-index`, medida del lead).
- Transición de `width` de la barra de progreso → `transform: scaleX`.
- Detalles de motion: stagger más fino en la galería, paleta de sombras por sección.
