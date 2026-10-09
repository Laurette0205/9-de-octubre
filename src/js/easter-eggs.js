/**
 * Huevos de Pascua: discretos, opcionales y sin interferir con la
 * accesibilidad (todos anuncian su resultado mediante el toast).
 */

import { burstConfetti } from './components/confetti.js';

const SEQUENCES = [
  {
    keys: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
    id: 'konami'
  },
  {
    keys: ['9', '1', '0'],
    id: 'nine'
  },
  {
    keys: ['h', 'o', 'k', 'a', 'g', 'e'],
    id: 'hokage'
  }
];

/**
 * @param {{config:object, announce?:(msg:string)=>void}} options
 */
export function initEasterEggs({ config, announce = () => {} }) {
  const settings = config.easterEggs || {};
  if (settings.enabled === false) return null;

  let buffer = [];
  const unlocked = new Set();

  const trigger = (id) => {
    if (unlocked.has(id)) return;
    unlocked.add(id);
    burstConfetti({ count: 54, durationMs: 3600 });

    const messages = {
      konami: settings.konamiMessage || 'Código ninja aceptado.',
      hokage: settings.secretMessage || 'Modo especial activado.',
      nine: settings.starMessage || 'Encontraste la estrella.'
    };

    announce(messages[id]);
  };

  const onKey = (event) => {
    const target = event.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
    }

    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    buffer = [...buffer, key].slice(-12);

    for (const sequence of SEQUENCES) {
      const { keys, id } = sequence;
      if (buffer.length >= keys.length) {
        const tail = buffer.slice(-keys.length);
        if (tail.every((value, index) => value === keys[index])) trigger(id);
      }
    }
  };

  window.addEventListener('keydown', onKey);

  const star = document.getElementById('secret-star');
  star?.addEventListener('click', () => trigger('star'));

  return {
    unlock: trigger,
    destroy() {
      window.removeEventListener('keydown', onKey);
    }
  };
}
