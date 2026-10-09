/**
 * Carta sorpresa: modal accesible con trap de foco, cierre con Escape,
 * fondo atenuado y aparición escalonada del texto.
 */

import { qs, qsa } from '../dom.js';
import { burstConfetti } from './confetti.js';

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function initSurpriseLetter({ announce = () => {} }) {
  const overlay = qs('#letter-overlay');
  const dialog = qs('#letter-dialog');
  const trigger = qs('#surprise-trigger');
  const close = qs('#letter-close');

  if (!overlay || !dialog || !trigger || !close) return null;

  let lastFocused = null;

  const open = () => {
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    const paragraphs = qsa('#letter-body p', overlay);
    paragraphs.forEach((paragraph, index) => {
      paragraph.style.animationDelay = `${Math.min(index * 90, 1400)}ms`;
      paragraph.classList.remove('is-in');
      void paragraph.offsetWidth;
      paragraph.classList.add('is-in');
    });

    dialog.focus({ preventScroll: true });
    announce('Carta abierta. Usa Tab para leerla y Escape para cerrar.');
    window.setTimeout(() => burstConfetti({ count: 40 }), 420);
  };

  const hide = () => {
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
    announce('Carta cerrada.');
  };

  trigger.addEventListener('click', open);
  close.addEventListener('click', hide);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) hide();
  });

  document.addEventListener('keydown', (event) => {
    if (overlay.hidden) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusables = qsa(FOCUSABLE, dialog).filter(
      (element) => element instanceof HTMLElement && element.offsetParent !== null
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return { open, close: hide };
}
