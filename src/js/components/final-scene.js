/**
 * Escena 09 · sorpresa final.
 * Dispara el confeti al entrar en la sección y permite "Volver a ver"
 * la experiencia desde el principio (reabre la portada de entrada).
 */

import { qs } from '../dom.js';
import { burstConfetti } from './confetti.js';

/**
 * @param {{announce?:(msg:string)=>void, onReplay?:()=>void}} options
 */
export function initFinalScene({ announce = () => {}, onReplay = () => {} }) {
  const section = qs('#final');
  const replay = qs('#final-replay');

  if (!section || !replay) return null;

  let celebrated = false;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || celebrated) return;
          celebrated = true;
          burstConfetti({ count: 70, durationMs: 4600 });
          announce('Final de la experiencia. Puedes volver a verla cuando quieras.');
          observer.disconnect();
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(section);
  }

  const celebrate = () => burstConfetti({ count: 54, durationMs: 3600 });

  replay.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    onReplay();
    celebrate();
  });

  return { celebrate };
}
