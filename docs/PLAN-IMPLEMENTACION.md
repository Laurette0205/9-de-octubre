# Plan de implementación — Micrositio de cumpleaños (v2)

## 1. Análisis

### Referencia (video)
El video adjunto no llegó legible en este chat; se ha tomado como referencia
**funcional** la estructura solicitada en el brief (intro cinematográfica →
presentación → mundo ninja → contador → recuerdos 3D → carta → frases → música →
sorpresa final), con identidad visual propia: nada del diseño literal.

### Estado previo (v1)
Micrositio ya funcional en `frontend/` (HTML semántico, sistema de diseño con 3
temas, 7 secciones, countdown con timezone, galería filtrable, carta modal,
reproductor, partículas, PWA, backend FastAPI, 47 pruebas, auditoría 86 PASS).
Lo que **falta** respecto al brief:

| # | Requerimiento | Estado v1 | Acción |
|---|---|---|---|
| 1 | Escena de entrada «ENTRAR A TU REGALO» | no existe | nuevo gate intro |
| 2 | Escena de presentación con nombre y dos frases | parcial | copy + sección |
| 3 | Naruto con 3 placeholders `[NARUTO_IMAGE_0x]` | 1 imagen | galería de 3 láminas |
| 4 | Sección «TU NUEVO CAPÍTULO COMIENZA» + contador grande | contador en hero | nueva sección (se mueve) |
| 5 | Galería **3D** con Anterior/Siguiente + swipe | rejilla con filtros | nuevo carrusel 3D |
| 6 | Carta «PARA TI» + «ABRIR CARTA» + revelado progresivo | modal, revelado por bloques | copy + revelado línea a línea |
| 7 | Frases motivacionales animadas | deseos genéricos | 6 frases del brief |
| 8 | Reproductor con PLAY/PAUSE/NEXT/PREVIOUS/VOLUME + playlist | play/pause/volume | + anterior/siguiente e info de pista |
| 9 | Sorpresa final con confeti + «VOLVER A VER» | carta final | nueva pantalla final |
| 10 | Estructura `src/` + `public/` + `npm run dev/build/preview` | estático plano | migración a **Vite** |

### Decisiones de arquitectura

**Opción elegida: B (HTML5 + CSS3 + JS ES6+ con Vite).**

| Opción | Veredicto | Motivo |
|---|---|---|
| A (sin build) | descartada | sin minificación/hashing, sin HMR, despliegue manual |
| **B (Vite)** | ✔ | arranque instantáneo, build con hashes y minificación, `base` configurable para GitHub Pages, cero dependencias en runtime, mismo código que ya está probado |
| C (React) | descartada | no aporta: la página es lineal y dirigida por datos; React añadiría ~140 KB y complejidad a animaciones que ya son CSS |

**Librerías: ninguna en runtime.** GSAP/Anime.js/tsParticles se descartan porque
el sistema existente de keyframes + `IntersectionObserver` + canvas propio ya
cubre todo con menos peso y sin depender de CDNs. Sólo `vite` como dependencia
de desarrollo.

### Mapa de escenas (v2)

| Escena | `id` | Origen |
|---|---|---|
| 1 · Intro (gate) | `#intro-gate` | **nuevo** |
| 2 · Presentación | `#inicio` (hero) + `#gran-dia` | existente, copy nuevo |
| 3 · Mundo ninja | `#camino-ninja` | existente + 3 placeholders |
| 4 · Tu nuevo capítulo | `#capitulo` | **nuevo** (contador se mueve del hero) |
| 5 · Recuerdos 3D | `#recuerdos` | **nuevo** carrusel con Anterior/Siguiente |
| 6 · Carta «PARA TI» | `#sorpresa` | existente, revelado progresivo |
| 7 · Frases | `#deseos` | copy nuevo + animación de ascua |
| 8 · Música | reproductor + `#noche-estrellas` | + NEXT/PREVIOUS |
| 9 · Sorpresa final | `#final` | **nuevo** + «VOLVER A VER» |
| — | `#galeria` | rejilla filtrable (se mantiene) |

## 2. Estructura objetivo

```
Capitulo_0910/
├── index.html                 # entrada de Vite
├── vite.config.js             # base './', outDir dist
├── package.json               # dev · build · preview · test · audit
├── public/
│   ├── birthday.config.json   # fuente única de verdad
│   ├── manifest.json · sw.js · robots.txt
│   ├── js/theme-boot.js       # script clásico (CSP sin inline)
│   └── assets/                # images · icons · audio · fonts
├── src/
│   ├── css/  variables · base · animations · components · sections · responsive
│   ├── js/   main · config · render · date · countdown · navigation ·
│   │         reveal · particles · accessibility · easter-eggs ·
│   │         gallery3d · theme-boot(skip) · dom · storage ·
│   │         components/{confetti,toast,gallery,music-player,surprise-letter}
│   └── (config-fallback.js generado)
├── backend/                   # FastAPI sirve dist/
├── scripts/                   # build-config · build-fonts · icons · audio · audit · set-url
├── tests/                     # node:test + qa-browser
└── docs/                      # plan · arquitectura · diseño · guías
```

## 3. Fases

1. **Scaffold Vite** — `vite.config.js`, scripts, instalación.
2. **Migración de estructura** — mover `frontend/` → `src/` + `public/`, partir CSS
   en 6 ficheros, actualizar importaciones y rutas de scripts/tests/backend.
3. **Escenas nuevas** — gate de entrada, sección de contador, carrusel 3D,
   pantalla final; copy nuevo de carta y frases; NEXT/PREVIOUS del reproductor.
4. **QA** — `npm run build` + `preview`, auditoría, pruebas Node/pytest, QA en
   navegador (consola, botones, countdown, audio, swipe, teclado), capturas
   360/768/1440.
5. **Correcciones + documentación** — README (install/dev/build/preview,
   sustituir fotos/música/nombre/fecha/frases, publicar en GitHub Pages,
   Netlify y Vercel), auditoría final y lista de ficheros.

## 4. Riesgos y control

| Riesgo | Control |
|---|---|
| Romper QA/auditoría al mover ficheros | actualizo rutas y reejecuto todo al final de cada fase |
| Rutas absolutas en subpáginas (GitHub Pages) | `base: './'` + rutas relativas en config |
| CSP sin `unsafe-inline` | todo JS externo o módulo; nada de handlers inline |
| Audio comercial sin licencia | sólo pista sintética generada; playlist configurable |
| Imágenes con copyright | placeholders SVG originales sustituibles |
