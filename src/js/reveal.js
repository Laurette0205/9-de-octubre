/**
 * Aparición progresiva de bloques al hacer scroll.
 * Usa IntersectionObserver y desaparece de forma segura si no hay soporte
 * o si el usuario pidió reducir animaciones.
 */

import { qsa } from './dom.js';

export function initReveal() {
  const elements = qsa('.reveal, [data-reveal]');

  const showAll = () => elements.forEach((el) => el.classList.add('is-visible'));

  const reduced = document.documentElement.getAttribute('data-reduced-motion') === 'true'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Activa el estado oculto de .reveal SÓLO con JS vivo; si el script falla
  // el contenido sigue siendo legible (mejora progresiva).
  document.documentElement.setAttribute('data-reveal-ready', 'true');

  if (reduced || !('IntersectionObserver' in window)) {
    showAll();
    return { showAll };
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );

  elements.forEach((element) => observer.observe(element));

  return {
    showAll,
    observe(element) {
      observer.observe(element);
    }
  };
}

/**
 * Parallax moderado para las imágenes de sección.
 * Se desactiva con animaciones reducidas.
 */
export function initParallax() {
  const reduced = () =>
    document.documentElement.getAttribute('data-reduced-motion') === 'true'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const targets = qsa('[data-parallax]');
  if (targets.length === 0) return;

  let ticking = false;

  const update = () => {
    if (reduced()) {
      targets.forEach((el) => el.style.setProperty('--parallax', '0px'));
      ticking = false;
      return;
    }
    const viewport = window.innerHeight;
    targets.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewport) return;
      const progress = (rect.top + rect.height / 2 - viewport / 2) / viewport;
      const offset = Math.max(-26, Math.min(26, progress * -34));
      element.style.setProperty('--parallax', `${offset.toFixed(1)}px`);
    });
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }, { passive: true });

  update();
}
