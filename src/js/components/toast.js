/**
 * Mensajes flotantes (toasts) con anuncio para lectores de pantalla.
 */

import { qs, setText } from '../dom.js';

let hideTimer = 0;

/**
 * @param {string} message
 * @param {{durationMs?:number}} [options]
 */
export function showToast(message, options = {}) {
  const toast = qs('#toast');
  if (!toast) return;

  setText(toast, message);
  toast.hidden = false;
  toast.style.animation = 'none';
  // reinicia la animación de entrada
  void toast.offsetWidth;
  toast.style.animation = '';

  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    toast.hidden = true;
    setText(toast, '');
  }, options.durationMs ?? 3600);
}
