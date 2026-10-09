/**
 * Ayudas de DOM sin dependencias externas.
 */

/**
 * @template {Element} T
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {T|null}
 */
export function qs(selector, scope = document) {
  return /** @type {T|null} */ (scope.querySelector(selector));
}

/**
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {Element[]}
 */
export function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/**
 * Establece el texto de forma segura (sin interpretar HTML).
 * @param {Element|null} element
 * @param {string} text
 */
export function setText(element, text) {
  if (element) element.textContent = text;
}

/**
 * Crea un elemento con atributos y texto.
 * @param {string} tag
 * @param {{className?:string, text?:string, attrs?:Record<string,string>}} [options]
 * @returns {HTMLElement}
 */
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      element.setAttribute(name, value);
    }
  }
  return element;
}

/**
 * Busca el valor de una ruta "a.b.c" dentro de un objeto.
 * @param {any} source
 * @param {string} path
 * @param {any} [fallback]
 */
export function getByPath(source, path, fallback = undefined) {
  const value = path
    .split('.')
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
  return value === undefined ? fallback : value;
}
