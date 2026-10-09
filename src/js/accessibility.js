/**
 * Panel de accesibilidad: tamaño de texto, contraste alto, modo oscuro,
 * modo lectura y reducción de animaciones. Persiste en localStorage.
 */

import { qs, setText } from './dom.js';
import { readSetting, writeSetting, clearAllSettings } from './storage.js';

const STORAGE_KEY = 'a11y';

const DEFAULT_STEPS = [16, 18, 20, 22, 24];

const DEFAULT_STATE = {
  fontStep: 1,
  contrast: false,
  dark: true,
  reading: false,
  motion: false
};

let state = { ...DEFAULT_STATE };
let steps = [...DEFAULT_STEPS];
let announceFn = () => {};

/**
 * Aplica el estado a <html> y a los controles del panel.
 */
function apply() {
  const root = document.documentElement;
  const size = steps[state.fontStep] ?? steps[1] ?? 18;
  root.style.setProperty('--font-size-base', `${size}px`);

  const theme = state.contrast ? 'high-contrast' : state.dark ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-reading-mode', String(state.reading));
  root.setAttribute('data-reduced-motion', String(state.motion));

  const sizeValue = qs('#font-size-value');
  setText(sizeValue, `${size} px`);

  syncToggle('#toggle-contrast', state.contrast);
  syncToggle('#toggle-dark', state.dark);
  syncToggle('#toggle-reading', state.reading);
  syncToggle('#toggle-motion', state.motion);

  const decrease = /** @type {HTMLButtonElement|null} */ (qs('#font-decrease'));
  const increase = /** @type {HTMLButtonElement|null} */ (qs('#font-increase'));
  if (decrease) decrease.disabled = state.fontStep <= 0;
  if (increase) increase.disabled = state.fontStep >= steps.length - 1;
}

function syncToggle(selector, pressed) {
  const button = qs(selector);
  if (button) button.setAttribute('aria-pressed', String(pressed));
}

function save() {
  writeSetting(STORAGE_KEY, state);
}

function changeFontStep(delta) {
  const next = Math.min(steps.length - 1, Math.max(0, state.fontStep + delta));
  if (next === state.fontStep) return;
  state.fontStep = next;
  apply();
  save();
  announceFn(`Tamaño de texto: ${steps[next]} píxeles.`);
}

function toggle(key, label) {
  state[key] = !state[key];
  apply();
  save();
  announceFn(`${label}: ${state[key] ? 'activado' : 'desactivado'}.`);
}

function reset() {
  state = {
    ...DEFAULT_STATE,
    motion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
  apply();
  clearAllSettings();
  announceFn('Ajustes restablecidos.');
}

/**
 * Inicializa el panel de accesibilidad.
 * @param {{config:object, announce?:(msg:string)=>void}} options
 */
export function initAccessibility({ config, announce = () => {} }) {
  announceFn = announce;
  const a11y = config.accessibility || {};
  if (Array.isArray(a11y.fontSteps) && a11y.fontSteps.length > 0) {
    steps = [...a11y.fontSteps];
  }

  const stored = readSetting(STORAGE_KEY, null);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  state = {
    ...DEFAULT_STATE,
    fontStep: typeof (stored && stored.fontStep) === 'number' ? stored.fontStep : (a11y.defaultFontStep ?? 1),
    contrast: Boolean(stored && stored.contrast),
    dark: stored && typeof stored.dark === 'boolean' ? stored.dark : true,
    reading: Boolean(stored && stored.reading),
    motion: stored && typeof stored.motion === 'boolean' ? stored.motion : prefersReducedMotion
  };

  if (state.fontStep < 0 || state.fontStep >= steps.length) state.fontStep = 1;

  apply();

  qs('#font-increase')?.addEventListener('click', () => changeFontStep(1));
  qs('#font-decrease')?.addEventListener('click', () => changeFontStep(-1));

  qs('#toggle-contrast')?.addEventListener('click', () =>
    toggle('contrast', a11y.labels?.contrast || 'Contraste alto'));
  qs('#toggle-dark')?.addEventListener('click', () =>
    toggle('dark', a11y.labels?.dark || 'Modo oscuro'));
  qs('#toggle-reading')?.addEventListener('click', () =>
    toggle('reading', a11y.labels?.reading || 'Modo lectura'));
  qs('#toggle-motion')?.addEventListener('click', () =>
    toggle('motion', a11y.labels?.motion || 'Reducir animaciones'));

  qs('#a11y-reset')?.addEventListener('click', reset);

  const panel = qs('#a11y-panel');
  const opener = qs('#a11y-toggle');
  const closer = qs('#a11y-close');

  const openPanel = () => {
    if (!panel || !opener) return;
    panel.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    closer?.focus();
  };

  const closePanel = () => {
    if (!panel || !opener) return;
    panel.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    opener.focus();
  };

  opener?.addEventListener('click', () => {
    if (panel?.hidden) openPanel();
    else closePanel();
  });
  closer?.addEventListener('click', closePanel);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel && !panel.hidden) closePanel();
  });

  document.addEventListener('click', (event) => {
    if (!panel || panel.hidden) return;
    const target = event.target;
    if (target instanceof Node && !panel.contains(target) && target !== opener && !opener?.contains(target)) {
      closePanel();
    }
  });

  return { getState: () => ({ ...state }) };
}
