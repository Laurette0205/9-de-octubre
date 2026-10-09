# 9 de Octubre — Un Día Para Celebrarte

Micrositio de cumpleaños: una experiencia cinematográfica de **9 escenas**,
completamente accesible, sin frameworks ni CDNs en tiempo de ejecución.
Vite sólo se usa para desarrollo y build; el resultado es HTML + CSS + JS puros.

```
Capitulo_0910/
├── index.html             Entrada de la app (semántica, SEO/OG)
├── vite.config.js         base './', outDir dist, precache del service worker
├── package.json           Scripts de Node
├── src/                   Código fuente (css/ + js/)
├── public/                Assets estáticos + birthday.config.json + sw.js
├── dist/                  Salida de `npm run build` (lo que se despliega)
├── backend/               API opcional (FastAPI)
├── scripts/               Generadores y auditoría
├── tests/                 Pruebas (node:test + pytest + QA en navegador)
└── docs/                  Documentación completa
```

## Requisitos

- Node.js ≥ 18 (probado con v22) y npm
- Python 3.11+ (sólo para el backend opcional, la auditoría y los generadores)

## Arranque rápido

```bash
npm install        # una vez
npm run dev        # → http://localhost:5173 (recarga en caliente)

npm run build      # genera dist/ (configuración + iconos + Vite)
npm run preview    # → http://localhost:4173 sirve dist/ igual que producción
```

Con backend opcional (API + cabeceras de seguridad + sirve `dist/`):

```bash
pip install -r backend/requirements.txt
npm run serve:backend    # → http://localhost:8000
```

> El sitio funciona **sin backend**. La API añade `/api/health`, `/api/config`,
> `/api/greetings` y cabeceras de seguridad/CSP.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Vite) en el puerto 5173 |
| `npm run build` | `build:config` + `build:icons` + build de Vite → `dist/` |
| `npm run preview` | Sirve `dist/` en el puerto 4173 (validación de producción) |
| `npm run build:config` | Sincroniza `src/js/config-fallback.js` desde la configuración |
| `npm run build:fonts` | Autoaloja Inter + Playfair en `public/assets/fonts/` |
| `npm run build:audio` | Regenera las pistas WAV sintéticas |
| `npm run build:scenes` | Regenera las láminas SVG de la escena ninja |
| `npm run build:icons` | Regenera los iconos PWA (72–512 px) |
| `npm run publish:url -- <url>` | Fija canonical + `og:url`/`twitter:url` en `index.html` |
| `npm test` | Pruebas de frontend (18) y backend (29) |
| `npm run audit` | Auditoría estática (contraste, SEO, accesibilidad, PWA, docs) |
| `npm run qa` | QA en navegador real (68 comprobaciones) vía skill de navegador |
| `npm run serve:backend` | Uvicorn con recarga en el puerto 8000 |

## Despliegue

El build usa `base: './'`, así que `dist/` funciona en un dominio raíz, en una
subcarpeta (GitHub Pages) y en cualquier hosting estático.

```bash
# 0. URL pública (canonical + Open Graph) — opcional en desarrollo
npm run publish:url -- https://tu-dominio.com

# 1. Verificación completa
npm run build && npm test && npm run audit

# 2. Publicar dist/
```

**GitHub Pages (Actions)** — workflow listo en `.github/workflows/deploy.yml`:
`Settings → Pages → Source: GitHub Actions`, y cada push a `main` compila
(`npm ci` + Pillow), ejecuta `npm run audit` y `npm run test:frontend`, y
despliega `dist/` con `actions/deploy-pages`.

```bash
gh repo create 9-de-octubre --public --source . --push
gh api --method POST repos/{owner}/9-de-octubre/pages -f build_type=workflow
```

**Netlify** (archivo `netlify.toml` o panel):

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

**Vercel** (`vercel.json` o CLI): framework *Vite*, build `npm run build`,
output `dist`. No hace falta reescribir nada: las rutas ya son relativas.

> Después de desplegar, registra la URL con `npm run publish:url -- <url>` y
> vuelve a compilar para que el service worker instale el precache definitivo.

## Personalización

Todo el contenido vive en **`public/birthday.config.json`** (fuente única de verdad):

| Qué cambiar | Dónde |
| --- | --- |
| **Nombre** | `birthday.name` (portada y «Feliz cumpleaños, …») |
| **Fecha y zona horaria** | `birthday.date`, `birthday.time`, `birthday.timezone` |
| **Textos de las 9 escenas** | `sections.intro / naruto / chapter / memories / gallery / surprise / wishes / luisMiguel / final` |
| **Frases y deseos** | `sections.wishes.items[]` (mínimo 6) |
| **Carta** | `sections.surprise.letterContent[]` |
| **Fotos** | Copia a `public/assets/images/` y apunta desde `gallery.images[].src`, `memories.items[].src`, `naruto.images[].src` (ya integradas 4 de Naruto y 3 de Luis Miguel) |
| **Música** | `music.tracks[]` (3 pistas MP3 de Luis Miguel; la principal es *La gloria eres tú*) + archivos en `public/assets/audio/` |
| **Colores y tipografía** | `src/css/variables.css` (tokens en `:root`) |
| **Portada de entrada** | `gate` (kicker, título, CTA, pista) |

Tras cada edición:

```bash
npm run build:config     # regenera el fallback (auditoría lo exige)
npm run dev              # comprobar en local
npm run build && npm test && npm run audit
```

Guía completa: [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md).

## Calidad

```bash
npm run audit   # contraste WCAG, SEO, accesibilidad, PWA, assets, docs
npm test        # 18 pruebas node:test + 29 pruebas pytest
npm run qa      # navegador real: portada, 9 escenas, carrusel, carta,
                # música, panel de a11y, móvil 360 px, offline/PWA
```

Capturas responsive (360/768/1440): [`docs/screenshots/`](docs/screenshots/).

## Accesibilidad

- Panel de lectura: tamaño de texto (16–24 px), contraste alto, modo oscuro,
  modo lectura y «reducir animaciones», persistido en `localStorage`.
- Skip link, landmarks, foco visible, `aria-live` para avisos, sin sonido
  automático, sin destellos frecuentes, respeto de `prefers-reduced-motion`.
- Portada de entrada con `inert` en el resto de la página y foco atrapado.
- Contraste verificado (WCAG AA/AAA) por `scripts/audit.py`.
- El audio **nunca** se reproduce solo: requiere gesto del usuario.

## PWA

`public/manifest.json` + `public/sw.js`: precache del shell y de los assets con
hash, `network-first` sólo para la configuración y modo sin conexión verificado
en el QA (`ignoreVary` para servidores con `Vary: Origin`).
Iconos de 72 a 512 px generados con `scripts/generate_icons.py`.

## Easter eggs

Konami, `910`, `hokage` y el botón `#secret-star` desbloquean confeti y un mensaje
anunciado por toast. Configurables y desactivables en `birthday.config.json`.

## Documentación

| Documento | Contenido |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Estructura, módulos, flujo de datos, API |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | Tokens, tipografía, temas, componentes |
| [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md) | Textos, fecha, fotos, música, colores |
| [`docs/NAV-MAP.md`](docs/NAV-MAP.md) | Mapa de secciones, rutas y árbol DOM |
| [`docs/AUDIT.md`](docs/AUDIT.md) | Resultados de la auditoría automática y manual |
| [`docs/UX-AUDIT.md`](docs/UX-AUDIT.md) | Auditoría senior (25 dimensiones) y plan de mejoras P0–P3 |
| [`docs/CHECKLISTS.md`](docs/CHECKLISTS.md) | Checklist de accesibilidad, seguridad, responsive y rendimiento |
| [`docs/PLAN-IMPLEMENTACION.md`](docs/PLAN-IMPLEMENTACION.md) | Plan de la entrega cinematográfica (9 escenas) |

## Licencia de los assets

Todos los gráficos, iconos y la banda sonora están **generados por scripts locales**
(`scripts/generate_*.py`) y son originales: no se usan imágenes, fuentes ni audio de
terceros con derechos de autor. El audio es una pista sintética libre de derechos.
