# Sistema de diseño

Paleta nocturna, elegante y masculina: azul profundo, carbón, dorado cálido y
blanco tibio. Tipografía editorial para los títulos, sans legible para el cuerpo.

## Tokens

Todos los tokens viven en `src/css/variables.css` dentro de `:root`.
**Nunca** se escriben colores, tamaños o tiempos en bruto en el resto de hojas.

### Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-night-blue` | `#0a0f1a` | Fondo principal (dark) |
| `--color-navy-blue` | `#111827` | Fondo secundario |
| `--color-charcoal` | `#1a1f2e` | Fondo terciario / tarjetas oscuras |
| `--color-graphite` | `#2d3342` | Superficies elevadas |
| `--color-warm-white` | `#f5f0e8` | Texto principal y fondo (light) |
| `--color-elegant-gold` | `#c9a84c` | Acento primario |
| `--color-deep-gold` | `#b8963d` | Acento sobre fondos claros |
| `--color-soft-gold` | `#d4b85c` | Acento secundario |
| `--color-champagne` | `#e8d5b7` | Texto de acento suave |
| `--color-electric-blue` | `#3b82f6` | Foco y detalles tecnológicos |
| `--color-success/warning/error` | `#10b981` / `#f59e0b` / `#ef4444` | Estados semánticos |

Alias semánticos (`--color-bg-*`, `--color-text-*`, `--color-border-*`,
`--color-focus*`) apuntan a los tokens base; el tema se cambia reasignando alias,
no editando componentes.

### Tipografía

```css
--font-primary:  "Inter", system-ui, sans-serif;   /* cuerpo */
--font-display:  "Playfair Display", Georgia, serif; /* títulos */
--font-mono:     "JetBrains Mono", monospace;       /* etiquetas numéricas */
```

Escala fluida con `clamp()`:

| Token | Rango |
| --- | --- |
| `--font-size-xs` … `--font-size-lg` | 12 → 20 px |
| `--font-size-xl` … `--font-size-3xl` | 20 → 48 px |
| `--font-size-4xl` | 40 → 64 px |
| `--font-size-5xl` | 48 → 80 px |

`--font-size-base` es **18 px** por defecto y el panel de lectura altera este token
(16, 18, 20, 22, 24 px) sin romper la escala.

Pesos 300–700, interlineado `--line-height-*` (1.2 → 2) y tracking
`--letter-spacing-*` (−0.02em → 0.2em, usado en los rótulos en versalitas).

### Espaciado, radios y sombras

- Espaciado en múltiplos de 4 px: `--spacing-1` (4 px) … `--spacing-32` (128 px).
- Radios: `--radius-sm` 4 px … `--radius-2xl` 24 px, `--radius-full` para píldoras.
- Sombras: `--shadow-sm` … `--shadow-2xl`, más `--shadow-gold`, `--shadow-gold-lg`
  y `--shadow-electric` para los resplandores característicos.

### Movimiento

```css
--transition-fast:    150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal:  250ms …
--transition-slow:    350ms …
--transition-slower:  500ms …
--transition-spring:  600ms cubic-bezier(0.34, 1.56, 0.64, 1);
```

Todas las animaciones se anulan con `prefers-reduced-motion: reduce` y con el
interruptor **Reducir animaciones** (`html[data-motion="reduced"]`).

### Capas

`--z-index-dropdown: 100`, más tokens para cabecera, panel de accesibilidad,
modal y toast. No se usan valores de `z-index` fuera de estos tokens.

## Temas

| Tema | Selector | Descripción |
| --- | --- | --- |
| Oscuro | `[data-theme="dark"]` (por defecto) | Nocturno con dorado |
| Claro | `[data-theme="light"]` | Papel cálido, texto azul marino |
| Alto contraste | `[data-theme="high-contrast"]` | Negro puro + blanco + amarillo (`#ffe100`) |

- `@media (prefers-color-scheme: light)` aplica luz sólo si no hay `data-theme`.
- El tema se aplica **antes del primer pintado** por `js/theme-boot.js`, para
  evitar parpadeos (FOUC).
- El color de cabecera es propio por tema: `--color-header-bg`.

### Modo lectura

`html[data-reading="on"]` colapsa la estética cinematográfica: secciones con fondo
plano, sin partículas, sin confeti, ancho de línea de 66–75 caracteres y jerarquía
tipográfica reforzada. Pensado para leer cómodamente en móvil a la cama.

## Componentes

| Componente | Archivo | Notas de accesibilidad |
| --- | --- | --- |
| Botones `.btn` (`primary`, `secondary`, `ghost`) | `components.css` | Contraste ≥ 4.5:1, foco visible, área ≥ 44 px |
| `.chip-toggle` | `base.css` | `aria-pressed` sincronizado con el estado |
| Cabecera `.site-header` | `sections.css` | `aria-expanded`/`aria-controls` en el menú |
| Panel `.a11y-panel` | `sections.css` | `role="dialog"` implícito, foco al abrir, `Escape` cierra |
| Cuenta regresiva `.countdown` | `sections.css` | `role="timer"`, `aria-live="off"` (evita ruido) |
| Tarjetas de deseos | `sections.css` | Lista real (`<ul>`), no `div` con rol |
| Galería `.gallery-*` | `sections.css` | Filtros con `role="group"` y `aria-pressed` |
| Modal `.letter-dialog` | `sections.css` | Foco atrapado, `Escape`, foco devuelto al disparador |
| Toast `.toast` | `components/toast.js` | `aria-live="polite"` |
| Reproductor `.music-player` | `sections.css` | `aria-pressed`, nunca autoplay |

## Layout

- Contenedores `--container-md/lg/xl` con `margin-inline: auto`.
- Grids responsivos: deseos (1 → 2 → 3 columnas), galería (1 → 2 → 3 → 4),
  escenas (apilado → 2 columnas a ≥ 900 px).
- Breakpoints usados: 480, 640, 768, 900, 1023, 1024, 1280 px.
- El hero ocupa `100svh` (`svh` evita el salto de la barra de URL móvil).

## Accesibilidad visual

| Escenario | Resultado |
| --- | --- |
| Texto principal sobre fondo nocturno (`#f5f0e8` / `#0a0f1a`) | ≈ 17:1 (AAA) |
| Texto secundario sobre tarjeta (`#c9c4bb` / `#111827`) | ≥ 4.5:1 (AA) |
| Acento dorado sobre fondo nocturno (`#c9a84c` / `#0a0f1a`) | ≥ 4.5:1 (AA) |
| Texto sobre fondo claro (`#111827` / `#f5f0e8`) | ≈ 17:1 (AAA) |
| Alto contraste (`#ffffff` y `#ffe100` / `#000000`) | ≥ 7:1 (AAA) |

Estos valores se verifican en cada ejecución de `npm run audit`.

## Tipografías (autoalojadas, sin CDN)

Inter y Playfair Display se sirven desde `public/assets/fonts/`:

```
assets/fonts/
├── fonts.css                     8 reglas @font-face generadas
├── inter-{400,500,600,700}-normal-latin.woff2
├── inter-400-italic-latin.woff2
├── playfair-display-{700,800}-normal-latin.woff2
└── playfair-display-400-italic-latin.woff2
```

- Se regeneran con `npm run build:fonts` (`scripts/build_fonts.py`), que descarga
  el subconjunto `latin` desde Google Fonts y lo escribe localmente.
- Licencia **SIL OFL 1.1**: permite la redistribución.
- `font-display: swap` + `unicode-range`: el texto aparece enseguida y sólo se
  descargan los glifos usados.
- **Cero peticiones a terceros**: la CSP puede ser `style-src 'self'`,
  `font-src 'self'` y `connect-src 'self'` sin excepciones (éste era el origen
  del error «violates connect-src 'self'» que emitía el service worker).

## Recursos externos

Ninguno. No hay imágenes, scripts, hojas de estilo ni analítica de terceros:
toda la red sale del propio origen (`'self'`).
