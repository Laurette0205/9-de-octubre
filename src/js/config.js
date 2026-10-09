/**
 * Carga y normaliza la configuración central de la experiencia.
 *
 * Fuente única de verdad: public/birthday.config.json (copiada al build).
 * Orden de resolución:
 *   1. birthday.config.json           (ruta relativa al documento)
 *   2. ./birthday.config.json         (explícita)
 *   3. /birthday.config.json          (absoluta, dominios con la raíz)
 *   4. js/config-fallback.js          (generado por `npm run build:config`,
 *                                      permite abrir la página aunque falle la red)
 */

const CANDIDATE_PATHS = ['birthday.config.json', './birthday.config.json', '/birthday.config.json'];

/**
 * Ordena las fuentes para evitar peticiones que sabemos que van a fallar.
 * @returns {string[]}
 */
function candidatePaths() {
  return CANDIDATE_PATHS;
}

/** Valores mínimos para que la experiencia nunca quede vacía. */
const DEFAULTS = {
  project: { name: '9 de Octubre', shortName: '9 de Octubre', description: '' },
  birthday: { name: '', date: '2026-10-09', time: '00:00', timezone: 'America/Mexico_City' },
  gate: {
    kicker: 'Una experiencia creada especialmente para ti…',
    title: 'Un día para celebrarte',
    name: '',
    cta: 'Entrar a tu regalo',
    hint: 'Sube el volumen: hay una canción esperándote.'
  },
  hero: {
    dateLabel: '9 DE OCTUBRE',
    title: 'Feliz cumpleaños.',
    name: '',
    lead: '',
    tagline: '',
    ctaText: 'Entrar a la celebración',
    scrollHint: 'Desliza para descubrir'
  },
  countdown: { enabled: true, beforeText: '', shortBeforeText: '{days}d {hours}h {minutes}m {seconds}s', dayText: '', afterText: '', label: '' },
  music: { enabled: false, title: '', tracks: [] },
  gallery: { categories: [], images: [] },
  easterEggs: { enabled: false },
  accessibility: {
    fontSteps: [16, 18, 20, 22, 24],
    defaultFontStep: 1,
    panelTitle: 'Ajustes de lectura',
    labels: {}
  },
  sections: {},
  footer: {}
};

/**
 * Combina el valor por defecto con la configuración cargada (shallow por clave
 * de primer nivel, profundo sólo para objetos anidados conocidos).
 * @param {object} raw
 * @returns {object}
 */
export function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const merged = { ...DEFAULTS, ...source };

  merged.project = { ...DEFAULTS.project, ...(source.project || {}) };
  merged.birthday = { ...DEFAULTS.birthday, ...(source.birthday || {}) };
  merged.gate = { ...DEFAULTS.gate, ...(source.gate || {}) };
  merged.hero = { ...DEFAULTS.hero, ...(source.hero || {}) };
  merged.countdown = { ...DEFAULTS.countdown, ...(source.countdown || {}) };
  merged.music = { ...DEFAULTS.music, ...(source.music || {}) };
  merged.gallery = { ...DEFAULTS.gallery, ...(source.gallery || {}) };
  merged.easterEggs = { ...DEFAULTS.easterEggs, ...(source.easterEggs || {}) };
  merged.accessibility = { ...DEFAULTS.accessibility, ...(source.accessibility || {}) };
  merged.accessibility.labels = {
    ...DEFAULTS.accessibility.labels,
    ...((source.accessibility && source.accessibility.labels) || {})
  };
  merged.sections = source.sections || {};
  merged.footer = { ...DEFAULTS.footer, ...(source.footer || {}) };

  return merged;
}

async function fetchConfig(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path} → ${response.status}`);
  return response.json();
}

/**
 * Carga la configuración con la mejor fuente disponible.
 * @returns {Promise<object>}
 */
export async function loadConfig() {
  for (const path of candidatePaths()) {
    try {
      const raw = await fetchConfig(path);
      if (raw && typeof raw === 'object') {
        return normalizeConfig(raw);
      }
    } catch {
      /* probamos la siguiente fuente */
    }
  }

  try {
    const fallback = await import('./config-fallback.js');
    return normalizeConfig(fallback.default);
  } catch (error) {
    console.error('[9oct] No fue posible cargar la configuración.', error);
    return normalizeConfig({});
  }
}

export { DEFAULTS as CONFIG_DEFAULTS };
