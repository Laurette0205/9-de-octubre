# Mapa de navegación y estructura DOM

## Árbol de documento

```
html[data-theme]
└─ head
   ├─ meta SEO / OG / Twitter / theme-color / color-scheme
   ├─ link icon · apple-touch-icon · manifest
   ├─ link fuentes (no bloqueante, media="print" data-fonts) + noscript
   ├─ link css/design-system.css · base.css · sections.css
   ├─ script js/theme-boot.js        (sincrónico, bloqueante: tema y tipografía)
   └─ script js/app.js (module)
└─ body
   ├─ a.skip-link                    → #contenido-principal
   ├─ div.scroll-progress > #scroll-progress-bar
   ├─ header#site-header
   │  └─ nav.site-nav[aria-label="Navegación principal"]
   │     ├─ a.site-nav__brand → #inicio
   │     ├─ button#nav-toggle[aria-expanded][aria-controls=nav-menu]
   │     ├─ div#nav-menu
   │     │  ├─ ul#nav-list (6 enlaces)
   │     │  └─ button#a11y-toggle[aria-controls=a11y-panel]
   │     └─ aside#a11y-panel[hidden]
   │        ├─ h2#a11y-panel-title
   │        ├─ #font-decrease · #font-size-value[aria-live=polite] · #font-increase
   │        ├─ .chip-toggle #toggle-contrast / #toggle-dark / #toggle-reading / #toggle-motion
   │        ├─ #a11y-close
   │        └─ #a11y-reset
   └─ main#contenido-principal[tabindex=-1]
      ├─ section#inicio   (.hero, aria-labelledby=hero-title)
      │  ├─ canvas#hero-canvas[aria-hidden]
      │  ├─ h1#hero-title
      │  ├─ #countdown[role=timer][hidden]
      │  │  ├─ #countdown-label · #countdown-grid · #countdown-status
      │  └─ a#hero-cta → #gran-dia
      ├─ section#gran-dia      (El gran día)
      ├─ section#deseos        (Deseos)      → #wishes-grid · #wishes-empty
      ├─ section#camino-ninja  (Camino ninja)→ #ninja-image · #ninja-values · #ninja-quotes
      ├─ section#noche-estrellas (Noche de estrellas)
      │  └─ #stage-image · #stage-values · #stage-quotes · #stage-music-btn
      ├─ section#galeria       (Galería)     → #gallery-filters · #gallery-grid · #gallery-empty
      └─ section#sorpresa      (Sorpresa)    → #surprise-trigger · #secret-star
   ├─ footer.site-footer       → #share-btn
   ├─ div#music-player[hidden] → #music-toggle · #music-volume · #music-title
   ├─ div#letter-overlay[hidden] → #letter-dialog[role=dialog][aria-modal]
   ├─ div#toast[role=status][aria-live=polite]
   ├─ div#confetti-layer[aria-hidden]
   └─ audio#audio-player[preload=none]
```

## Secciones y rutas

| # | Sección | `id` | Enlace de navegación | Contenido |
| --- | --- | --- | --- | --- |
| — | Inicio / hero | `inicio` | `#inicio` | Título, entradilla, cuenta regresiva, CTA |
| 01 | El gran día | `gran-dia` | `#gran-dia` | Prólogo narrativo (párrafos de la config) |
| 02 | Deseos | `deseos` | `#deseos` | Rejilla de deseos de cumpleaños |
| 03 | Camino ninja | `camino-ninja` | `#camino-ninja` | Escena ninja, valores y citas |
| 04 | Noche de estrellas | `noche-estrellas` | `#noche-estrellas` | Escena de escenario, valores, citas, botón de música |
| 05 | Galería | `galeria` | `#galeria` | Láminas filtrables por categoría |
| 06 | Sorpresa | `sorpresa` | *(no está en la barra)* | Carta final + estrella secreta |

> **Por qué `sorpresa` no aparece en el menú:** es el desenlace; la navegación
> debe construir el misterio. Se llega desde el final del recorrido y desde el
> scrollspy (`data-nav` sólo para los seis primeros).

## Flujo del usuario

```
Entrar (#inicio)
  → leer el prólogo (#gran-dia)
  → deseos (#deseos)
  → homenaje ninja (#camino-ninja)
  → homenaje de escenario (#noche-estrellas)  ← aquí puede arrancar la música
  → galería (#galeria)
  → sorpresa (#sorpresa) → carta modal → confeti
```

## Estados de navegación

| Estado | Cómo se expone |
| --- | --- |
| Menú móvil abierto | `#nav-toggle[aria-expanded="true"]` + clase `is-open` |
| Sección activa | `#nav-list a[aria-current="true"]` + `.is-active` |
| Progreso de lectura | `#scroll-progress-bar` (`transform: scaleX`), `aria-hidden` |
| Sección revelada | `.reveal.is-visible` (IntersectionObserver, desactivada con reduce-motion) |

## Atajos de teclado

| Tecla | Acción |
| --- | --- |
| `Tab` | Primera parada: **Saltar al contenido principal** |
| `Escape` | Cierra el panel de ajustes, el menú y el modal de la carta |
| Flechas / `Enter` en filtros | Navegación nativa dentro del `role="group"` |
| Konami · `910` · `hokage` | Easter eggs (ver `easter-eggs.js`) |

## Superficies flotantes (orden de capas)

| Superficie | Elemento | Disparador |
| --- | --- | --- |
| Panel de lectura | `#a11y-panel` | `#a11y-toggle` |
| Reproductor | `#music-player` | Automático tras habilitar música / `#stage-music-btn` |
| Modal de carta | `#letter-overlay` | `#surprise-trigger` |
| Avisos | `#toast` | Cualquier acción con resultado |
| Confeti | `#confetti-layer` | Carta, easter eggs, compartir |

## Persistencia

| Clave | Se guarda cuando |
| --- | --- |
| `9oct:a11y` | Cambia cualquier ajuste de lectura o se pulsa «Restablecer» |
| `9oct:wishes` | El visitante añade un deseo (si la sección lo permite) |
