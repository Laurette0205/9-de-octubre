# Personalización

Todo lo que cambia de una celebración a otra vive en **`public/birthday.config.json`**
(fuente única de verdad; Vite la copia al build).

## Flujo de trabajo

```bash
# 1. Edita la configuración
# 2. Regenera el fallback que usa la app sin backend
npm run build:config
# 3. Ver en local (recarga en caliente)
npm run dev            # → http://localhost:5173
# 4. Verifica
npm run build && npm test && npm run audit
```

> Si cambias la configuración sin regenerar el fallback, `npm run audit` marca
> `config-fallback.js desactualizado`.

---

## Fecha y zona horaria

```jsonc
"birthday": {
  "date": "2026-10-09",                  // AAAA-MM-DD (obligatorio)
  "time": "00:00",                       // HH:MM en la zona horaria
  "timezone": "America/Mexico_City"      // IANA, obligatorio
}
```

La lógica vive en `src/js/date.js` (pura, sin DOM) y está cubierta por
pruebas: cambio de día, horario de verano y cuenta atrás exacta.

## Identidad, nombre y portada

```jsonc
"project": { "name": "…", "shortName": "…", "description": "…", "version": "1.0.0" },
"birthday": { "name": "Daniel", /* … */ },
"gate":     { "kicker": "…", "title": "…", "cta": "…", "hint": "…" },   // portada de entrada
"hero":     { "title": "…", "lead": "…", "cta": "…", "scrollHint": "…" },
"footer":   { "message": "…", "shareLabel": "Compartir" }
```

- **Nombre**: `birthday.name` alimenta la portada y el «Feliz cumpleaños, …» del hero.
- También cambia el `<title>`, la meta description y las etiquetas Open Graph en
  `index.html` (son valores fijos para SEO, no se leen del JSON).

## Secciones

`sections` tiene estos bloques (id = ancla en el HTML):

| Clave | Sección | Ancla | Contenido configurable |
| --- | --- | --- | --- |
| `intro` | El gran día | `#gran-dia` | `title`, `paragraphs[]` (mínimo 4) |
| `naruto` | Camino ninja | `#camino-ninja` | `title`, `intro`, `images[]`, `values[]`, `quotes[]` |
| `chapter` | Tu nuevo capítulo | `#capitulo` | `title`, `subtitle` (cuenta regresiva) |
| `memories` | Recuerdos | `#recuerdos` | `title`, `items[]` (cita + imagen) |
| `gallery` | Galería | `#galeria` | `title`, `images[]`, `emptyState` |
| `surprise` | Carta | `#sorpresa` | `letterTitle`, `letterContent[]`, `triggerText` |
| `wishes` | Frases | `#deseos` | `title`, `items[]` (mínimo 6) |
| `luisMiguel` | Noche de estrellas | `#noche-estrellas` | `title`, `now`, `values[]` |
| `final` | Final | `#final` | `title`, `replayLabel`, `message` |

### Galería

```jsonc
"images": [
  {
    "id": "g1",
    "src": "assets/images/gallery-01.svg",   // relativo a public/
    "alt": "Descripción larga y útil",        // obligatorio, > 10 caracteres
    "title": "Título visible",
    "category": "infancia",                   // alimenta los filtros
    "year": "2015"
  }
]
```

- Sustituye los SVG por tus fotos: `src` puede ser `assets/images/mi-foto.jpg`.
- Cada `category` nueva crea un filtro automáticamente.
- El alt es obligatorio: `npm run audit` falla si falta o es demasiado corto.

## Música

```jsonc
"music": {
  "enabled": true,
  "title": "Luis Miguel",
  "tracks": [
    { "id": "gloria", "title": "La gloria eres tú", "artist": "Luis Miguel",
      "src": "assets/audio/la-gloria-eres-tu.mp3", "type": "audio/mpeg" }
  ]
}
```

- **Pista principal**: la primera de la lista (`gloria` → *La gloria eres tú*):
  es la que suena al pulsar reproducir; el reproductor muestra `1 / 3` y ◀ ▶
  cambia a *Sabes una cosa* y *Soy yo*.
- Los MP3 están en `public/assets/audio/` (`la-gloria-eres-tu.mp3`,
  `sabes-una-cosa.mp3`, `soy-yo.mp3`), agregados por el dueño del regalo para
  uso personal; el build los copia a `dist/assets/audio/` y **no** se
  precachean (pesan ~10 MB en total y se descargan al reproducir).
- `artist` es opcional: si existe, el reproductor lo muestra como
  `Luis Miguel — La gloria eres tú`.
- **No existe `autoPlay`**: el audio arranca únicamente con un gesto del usuario
  y esa regla está cubierta por pruebas (`config.test.mjs`).
- Los WAV originales (`main-theme.wav`, `starlight.wav`) quedan como respaldo;
  puedes borrarlos sin romper nada si dejas `music.tracks` apuntando a los MP3.

## Cuenta regresiva

```jsonc
"countdown": {
  "label": "Cuenta regresiva",
  "templateBefore": "Faltan {days} días {hours} horas {minutes} minutos y {seconds} segundos.",
  "todayMessage": "¡Hoy es el día!",
  "afterMessage": "¡Qué buenos momentos vivimos!"
}
```

Los marcadores admitidos: `{days}`, `{hours}`, `{minutes}`, `{seconds}`.

## Accesibilidad

```jsonc
"accessibility": {
  "fontSteps": [16, 18, 20, 22, 24],
  "defaultFontStep": 1,
  "skipLinkText": "Saltar al contenido principal",
  "panelTitle": "Ajustes de lectura",
  "labels": { "increase": "…", "decrease": "…", "contrast": "…", "dark": "…",
              "reading": "…", "motion": "…", "reset": "…" }
}
```

## Huevos de pascua

```jsonc
"easterEggs": {
  "enabled": true,
  "konamiEnabled": true,
  "konamiMessage": "…",
  "starMessage": "…",
  "secretMessage": "…"
}
```

Secuencias actuales (`src/js/easter-eggs.js`): Konami, `910`, `hokage` y el
botón `#secret-star`. Para añadir una, agrega una entrada a `SEQUENCES`.

## Colores

```jsonc
"colors": {
  "nightBlue": "#0a0f1a",
  "elegantGold": "#c9a84c"
}
```

Estos valores **documentan** la paleta; la implementación real son los tokens CSS
de `src/css/variables.css`. Si cambias un color:

1. Edita el token en `:root` (y los alias correspondientes).
2. Revisa los tres temas (`dark`, `light`, `high-contrast`).
3. Ejecuta `npm run audit`: el desglose de contraste fallará si algún par baja
   del mínimo WCAG.

## PWA

```jsonc
"pwa": { "name": "…", "shortName": "…", "description": "…",
         "themeColor": "#0a0f1a", "backgroundColor": "#0a0f1a" }
```

Tras cambiar nombre o colores: actualiza `public/manifest.json` y la etiqueta
`<meta name="theme-color">`. Regenera iconos con `npm run build:icons`.

## URL pública (SEO)

```jsonc
"seo": {
  "title": "9 de Octubre — Feliz Cumpleaños",
  "url": "",                    // dominio de producción, vacío en desarrollo
  "description": "…",
  "lang": "es"
}
```

```bash
npm run publish:url -- https://tu-dominio.com   # o define seo.url y ejecútalo sin argumentos
```

El script reescribe en `index.html` `<link rel="canonical">`,
`og:url`, `twitter:url` y vuelve absolutas `og:image`/`twitter:image`.
Es idempotente: repetirlo sólo actualiza los valores. Dejar `seo.url` vacío
mantiene el HTML sin metadatos de dominio (modo local).

## Assets

| Generador | Comando | Resultado |
| --- | --- | --- |
| Iconos PWA | `npm run build:icons` | `public/assets/icons/*.png` + `favicon.svg` |
| Tipografías | `npm run build:fonts` | `public/assets/fonts/*.woff2` + `fonts.css` |
| Audio | `npm run build:audio` | `public/assets/audio/*.wav` |
| Escenas ninja | `npm run build:scenes` | `public/assets/images/ninja-0{1,2,3}.svg` |
| Fallback | `npm run build:config` | `src/js/config-fallback.js` |
| Build completo | `npm run build` | `dist/` (rutas relativas, listo para desplegar) |

Los SVG de escena y galería se editan a mano en `public/assets/images/`.

## Fotografías

1. Copia tus fotos a `public/assets/images/` (`.jpg`/`.png`/`.webp`/`.svg`).
2. Apunta a ellas desde `sections.gallery.images[].src`, `sections.memories.items[].src`
   y `sections.naruto.images[].src` (y `sections.luisMiguel.image` para la escena 08).
3. Escribe un `alt` descriptivo (> 10 caracteres): `npm run audit` lo exige.
4. `npm run build && npm run audit` para verificar que todos los assets existen.

### Fotos ya integradas

| Archivo | Contenido | Uso actual |
| --- | --- | --- |
| `naruto-01.jpg` | Naruto mirando el cielo | tira ninja + galería (Naruto) |
| `naruto-02.jpg` | Naruto con energía dorada | tira ninja (principal) |
| `naruto-03.jpg` | Hokage con bocetos del equipo | tira ninja + recuerdos r1 |
| `naruto-04.jpg` | Edición urbana entre rascacielos | tira ninja + galería (Recuerdos) |
| `luismiguel-01.jpg` | Retrato con traje negro | imagen de la escena 08 |
| `luismiguel-02.jpg` | Collage de retratos | recuerdos r3 (Luces y música) |
| `luismiguel-03.jpg` | Retrato sonriendo | galería (Música) |
