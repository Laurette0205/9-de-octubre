/**
 * Navegación: menú móvil, barra de progreso, cabecera auto-ocultable,
 * scrollspy y gestión del foco al saltar entre secciones.
 */

import { qs, qsa } from './dom.js';

const NAV_IDS = [
  'inicio',
  'gran-dia',
  'camino-ninja',
  'capitulo',
  'recuerdos',
  'galeria',
  'sorpresa',
  'deseos',
  'noche-estrellas',
  'final'
];
const HEADER_HEIGHT = 76;

function prefersReducedMotion() {
  return document.documentElement.getAttribute('data-reduced-motion') === 'true'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * @param {{announce?:(msg:string)=>void}} [options]
 */
export function initNavigation(options = {}) {
  const announce = options.announce || (() => {});
  const header = qs('#site-header');
  const toggle = qs('#nav-toggle');
  const menu = qs('#nav-menu');
  const links = qsa('.site-nav__link');
  const progressBar = qs('#scroll-progress-bar');
  const sections = NAV_IDS.map((id) => document.getElementById(id)).filter(Boolean);

  /* Menú móvil -------------------------------------------------------- */
  const closeMenu = () => {
    if (!menu || !toggle) return;
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    const label = toggle.querySelector('.visually-hidden');
    if (label) label.textContent = 'Abrir menú';
  };

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    menu?.classList.toggle('is-open', !open);
    const label = toggle.querySelector('.visually-hidden');
    if (label) label.textContent = open ? 'Abrir menú' : 'Cerrar menú';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof Node && menu?.classList.contains('is-open')
      && !menu.contains(target) && target !== toggle && !toggle?.contains(target)) {
      closeMenu();
    }
  });

  /* Navegación por anclas con gestión de foco ------------------------- */
  const anchorTargets = qsa('a[href^="#"]');

  anchorTargets.forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;

      event.preventDefault();
      closeMenu();

      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });

      const name = anchor.textContent?.trim() || target.getAttribute('aria-label') || '';
      if (name) announce(`Sección ${name}.`);

      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', href);
      }
    });
  });

  /* Cabecera oculta al bajar, pero siempre visible si recibe el foco ---- */
  header?.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  /* Barra de progreso + ocultar cabecera ------------------------------ */
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, y / max) : 0;

    if (progressBar) progressBar.style.width = `${(ratio * 100).toFixed(2)}%`;

    if (header) {
      const goingDown = y > lastY && y > 240;
      const focusInside = header.contains(document.activeElement);
      header.classList.toggle('is-hidden', goingDown && !focusInside);
    }

    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });

  update();

  /* Scrollspy --------------------------------------------------------- */
  const setActive = (id) => {
    links.forEach((link) => {
      const active = link.getAttribute('data-nav') === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  if ('IntersectionObserver' in window && sections.length > 0) {
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        let bestId = null;
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });
        if (bestId) setActive(bestId);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((section) => observer.observe(section));
  }

  setActive('inicio');
}
