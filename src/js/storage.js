/**
 * Utilidades de persistencia segura en el navegador.
 * Nunca lanza: si el almacenamiento no está disponible (modo privado,
 * file://, cuotas agotadas) la app sigue funcionando sin recordar ajustes.
 */

const PREFIX = '9oct:';

/**
 * @param {string} key
 * @param {any} fallback
 * @returns {any}
 */
export function readSetting(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {any} value
 * @returns {boolean} true si se guardó correctamente
 */
export function writeSetting(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 */
export function clearSetting(key) {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function clearAllSettings() {
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* almacenamiento no disponible */
  }
}
