# Arquitectura

## Principios

1. **Configuración primero.** `public/birthday.config.json` es la única fuente de
   verdad de textos, fecha, galería, música y ajustes de accesibilidad. El HTML
   contiene la estructura semántica y marcadores `data-render`/`data-i18n` que el
   motor rellena en tiempo de ejecución.
2. **Sin frameworks ni CDNs.** JS en módulos ES nativos, CSS propio y Vite sólo
   como herramienta de desarrollo/build: cero dependencias en tiempo de ejecución.
3. **Backend opcional.** FastAPI añade API, cabeceras y CSP; si no está, la app
   usa `src/js/config-fallback.js` (generado).
4. **Accesibilidad por defecto.** Semántica, foco, ARIA y contraste no son una
   capa posterior: forman parte de cada componente.

## Estructura

```
index.html                   Estructura semántica (entrada de Vite), SEO/OG
vite.config.js               base './', outDir dist, precache del service worker
package.json                 scripts: dev / build / preview / test / audit / qa
src/
├── css/
│   ├── variables.css        Tokens, temas (dark/light/high-contrast), utilidades
│   ├── base.css             Reset, tipografía, layout, reglas globales
│   ├── animations.css       Entradas del gate, reveals, keyframes
│   ├── components.css       Botones, cabecera, carta, música, toast, gate
│   ├── sections.css         Hero y secciones cinematográficas
│   └── responsive.css       Breakpoints 360–1440 y objetivos táctiles
├── js/
│   ├── main.js              Orquestador: arranque, wiring, ciclo de vida
│   ├── config.js            Carga de configuración (red → fallback → defaults)
│   ├── config-fallback.js   [generado] copia del JSON de configuración
│   ├── render.js            Renderiza textos/listas desde la configuración
│   ├── date.js              Lógica de fecha/zona horaria pura (sin DOM)
│   ├── countdown.js         Cuenta regresiva accesible (role=timer)
│   ├── navigation.js        Menú, scrollspy, progreso de lectura, reveal
│   ├── reveal.js            Revelado por scroll con data-reveal-ready
│   ├── accessibility.js     Panel de lectura y persistencia de preferencias
│   ├── easter-eggs.js       Konami, 910, hokage, estrella secreta
│   ├── particles.js         Canvas del hero (respeta reduce-motion)
│   ├── dom.js / storage.js  Ayudantes de DOM y localStorage con prefijo 9oct
│   └── components/
│       ├── intro-gate.js    Portada de entrada (inert, foco atrapado)
│       ├── final-scene.js   Escena final: confeti + “volver a ver”
│       ├── memory-carousel.js Carrusel 3D con botones, teclado y swipe
│       ├── music-player.js  Reproductor con anterior/siguiente y volumen
│       ├── gallery.js       Galería con filtros por categoría
│       ├── surprise-letter.js Modal de la carta (foco atrapado)
│       ├── confetti.js / toast.js
public/
├── assets/                  images/ icons/ audio/ fonts/ (se copian al build)
├── js/theme-boot.js         Bloqueante en <head>: aplica tema antes del paint
├── birthday.config.json     Fuente única de verdad
├── manifest.json / robots.txt
└── sw.js                    Service worker (precache + network-first config)
dist/                        Salida de `npm run build` (rutas relativas)
```

```
backend/
├── main.py                 App FastAPI: CORS, seguridad, montaje de frontend
├── config/settings.py      Settings desde entorno + .env propio (sin dependencias)
├── core/security.py        CSP, cabeceras, sanitización, limitador de tasa
├── api/
│   ├── routes_health.py    GET /api/health, GET /api
│   ├── routes_config.py    GET /api/config, GET /api/config/validate
│   └── routes_greetings.py POST/GET /api/greetings
├── models/greeting.py      Modelo de saludo
├── schemas/                Modelos Pydantic de entrada/salida
├── services/               Lógica de negocio (config y saludos)
├── tests/                  29 pruebas pytest (incluye cliente ASGI propio)
└── requirements.txt
```

## Flujo de arranque

```
index.html
  └─ js/theme-boot.js (head, sincrónico)    → aplica tema, contraste y tamaño de fuente
  └─ src/js/main.js (module, diferido)
       ├─ intro-gate.js: portada (inert en el resto de la página)
       ├─ config.js: fetch('birthday.config.json') o rutas relativas
       │     └─ si todo falla → config-fallback.js
       ├─ render.js: pinta textos, listas, galería, deseos, valores, citas
       ├─ date.js + countdown.js: cuenta regresiva según timezone
       ├─ navigation.js: menú, scrollspy, reveal, progreso
       ├─ accessibility.js: panel + persistencia
       ├─ gallery.js / memory-carousel.js / music-player.js / surprise-letter.js
       └─ easter-eggs.js: escucha de teclado y estrella
```

### Orden de búsqueda de la configuración (`src/js/config.js`)

1. `birthday.config.json` (ruta relativa al documento)
2. `./birthday.config.json` (explícita)
3. `/birthday.config.json` (absoluta, dominios con la raíz)
4. `config-fallback.js` (import dinámico; garantiza arranque offline)

## Datos persistentes

Prefijo `9oct:` en `localStorage`:

| Clave | Contenido |
| --- | --- |
| `9oct:a11y` | `{fontStep, contrast, dark, reading, reduceMotion}` |
| `9oct:wishes` | Deseos añadidos por el visitante (si la sección lo permite) |

Todo el acceso pasa por `storage.js`, que captura excepciones (modo privado,
`file://`, cuotas agotadas) y devuelve valores por defecto.

## API

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api` | Índice de endpoints |
| GET | `/api/health` | Estado del servicio |
| GET | `/api/config` | Configuración pública (sólo secciones permitidas) |
| GET | `/api/config/validate` | Valida campos obligatorios del JSON |
| POST | `/api/greetings` | Crea un saludo (rate limit + sanitización) |
| GET | `/api/greetings` | Lista saludos (paginación básica) |
| GET | `/api/greetings/{id}` | Saludo concreto |
| GET | `/birthday.config.json` | Archivo de configuración servido por la API |

**Seguridad:** CSP estricta (`script-src 'self'`, sin `unsafe-inline`),
`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
`Permissions-Policy`, `COOP`, CORS restringido por `ALLOWED_ORIGINS` (alias:
`CORS_ORIGINS`), `Strict-Transport-Security` cuando `FORCE_HTTPS=true`, limitador
de tasa por IP en `/api/greetings` y sanitización de HTML en las entradas.

## Estrategia de pruebas

| Capa | Herramienta | Comando |
| --- | --- | --- |
| Lógica pura de fecha | `node:test` | `npm run test:frontend` |
| Configuración y assets | `node:test` | `npm run test:frontend` |
| API, seguridad, config | `pytest` | `npm run test:backend` |
| UI real en navegador | Playwright/Chromium vía skill de QA | ver `tests/frontend/qa-browser.mjs` |
| Estática (contraste, SEO, PWA) | `scripts/audit.py` | `npm run audit` |

`backend/tests/_client.py` implementa un transporte ASGI síncrono propio para no
depender de la compatibilidad `starlette`/`httpx`.

## Rendimiento

- Sin peticiones a terceros: tipografías autoalojadas (`public/assets/fonts/`) y
  ningún recurso remoto; la CSP es `style-src/font-src/connect-src 'self'` sin
  excepciones.
- `loading="lazy"` + `decoding="async"` en imágenes fuera de pantalla.
- Canvas de partículas limitado a `devicePixelRatio` y pausado fuera de pantalla.
- Audio cargado de forma perezosa en el primer `play` (evita `ERR_ABORTED`).
- Service worker con precache (rutas con hash incluidas), `network-first` sólo
  para la configuración y `ignoreVary` en las búsquedas (los servidores con
  `Vary: Origin` no deben romper el modo sin conexión).
