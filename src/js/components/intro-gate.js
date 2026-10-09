/**
 * Puerta de entrada (escena 01).
 * Bloquea la página con una portada cinematográfica y sólo libera el
 * contenido cuando la persona pulsa "Entrar a tu regalo".
 *
 * - Respeta movimiento reducido (sin transición de salida).
 * - Mantiene el foco dentro del diálogo mientras está abierto.
 * - Puede reabrirse desde la escena final ("Volver a ver").
 */

import { qs } from '../dom.js';

const PROTECTED_SELECTORS = ['#site-header', '#contenido-principal', '.site-footer', '.music-player'];

function prefersReducedMotion() {
  return document.documentElement.getAttribute('data-reduced-motion') === 'true'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {{announce?:(msg:string)=>void, onEnter?:(index:number)=>void}} [options]
 */
export function initIntroGate({ announce = () => {}, onEnter = () => {} }) {
  const gate = qs('#intro-gate');
  const enter = qs('#intro-enter');
  if (!gate || !enter) return null;

  const protectedNodes = PROTECTED_SELECTORS.map((selector) => qs(selector)).filter(Boolean);
  let visits = 0;
  let open = true;

  const lock = () => {
    open = true;
    document.documentElement.setAttribute('data-gate', 'open');
    gate.hidden = false;
    gate.classList.remove('is-leaving');
    protectedNodes.forEach((node) => {
      node.inert = true;
      node.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = 'hidden';
    window.requestAnimationFrame(() => enter.focus({ preventScroll: true }));
  };

  const unlock = () => {
    open = false;
    document.documentElement.removeAttribute('data-gate');
    protectedNodes.forEach((node) => {
      node.inert = false;
      node.removeAttribute('aria-hidden');
    });
    document.body.style.overflow = '';
  };

  const leave = () => {
    if (!open) return;
    const delay = prefersReducedMotion() ? 0 : 720;

    if (delay > 0) gate.classList.add('is-leaving');
    announce('Bienvenido a la experiencia.');

    window.setTimeout(() => {
      gate.hidden = true;
      gate.classList.remove('is-leaving');
      unlock();
      visits += 1;
      onEnter(visits);

      const main = qs('#contenido-principal');
      if (main instanceof HTMLElement) main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, delay);
  };

  enter.addEventListener('click', leave);

  // El foco no puede salir del diálogo mientras la portada está abierta.
  gate.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      enter.focus();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      leave();
    }
  });

  lock();

  return {
    open: lock,
    close: leave,
    isOpen: () => open
  };
}
