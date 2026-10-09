/**
 * Escena 05 · galería 3D de recuerdos.
 * Carrusel con perspectiva: tarjeta activa al centro, anterior/siguiente
 * giradas a los lados, botones "Anterior"/"Siguiente", deslizar con el dedo
 * (swipe) y navegación con teclado.
 */

import { qs, createElement, setText } from '../dom.js';

const SWIPE_THRESHOLD = 44;

/**
 * @param {{config:object, announce?:(msg:string)=>void}} options
 */
export function initMemoryCarousel({ config, announce = () => {} }) {
  const stage = qs('#memory-stage');
  const track = qs('#memory-track');
  const prevButton = qs('#memory-prev');
  const nextButton = qs('#memory-next');
  const currentEl = qs('#memory-current');
  const totalEl = qs('#memory-total');
  const emptyBox = qs('#memory-empty');

  if (!stage || !track || !prevButton || !nextButton) return null;

  const memories = (config.sections && config.sections.memories) || {};
  const items = Array.isArray(memories.items) ? memories.items : [];

  if (items.length === 0) {
    stage.hidden = true;
    prevButton.hidden = true;
    nextButton.hidden = true;
    if (emptyBox) {
      emptyBox.hidden = false;
      setText(emptyBox, memories.emptyText || 'Pronto habrá recuerdos aquí.');
    }
    return null;
  }

  const cards = items.map((item, index) => {
    const card = createElement('li', { className: 'memory-card' });

    if (item.src) {
      const figure = createElement('figure', { className: 'memory-card__media' });
      figure.appendChild(createElement('img', {
        attrs: {
          src: item.src,
          alt: item.alt || item.title || '',
          loading: index === 0 ? 'eager' : 'lazy',
          decoding: 'async',
          width: '960',
          height: '540'
        }
      }));
      card.appendChild(figure);
    }

    if (item.date) card.appendChild(createElement('span', { className: 'memory-card__date', text: item.date }));
    card.appendChild(createElement('h3', { className: 'memory-card__title', text: item.title || '' }));
    if (item.text) card.appendChild(createElement('p', { className: 'memory-card__text', text: item.text }));

    track.appendChild(card);
    return card;
  });

  let index = 0;

  const render = (options = {}) => {
    const { announceChange = false } = options;
    const total = cards.length;

    cards.forEach((card, position) => {
      card.classList.remove('is-active', 'is-prev', 'is-next', 'is-hidden');
      card.setAttribute('aria-hidden', 'true');

      if (position === index) {
        void card.offsetWidth;
        card.classList.add('is-active');
        card.setAttribute('aria-hidden', 'false');
      } else if (position === (index - 1 + total) % total && total > 1) {
        card.classList.add('is-prev');
      } else if (position === (index + 1) % total && total > 1) {
        card.classList.add('is-next');
      } else {
        card.classList.add('is-hidden');
      }
    });

    setText(currentEl, String(index + 1));
    setText(totalEl, String(total));
    const single = total <= 1;
    prevButton.toggleAttribute('disabled', single);
    nextButton.toggleAttribute('disabled', single);

    if (announceChange) {
      const item = items[index] || {};
      announce(`Recuerdo ${index + 1} de ${total}${item.title ? `: ${item.title}` : ''}.`);
    }
  };

  const go = (step) => {
    index = (index + step + cards.length) % cards.length;
    render({ announceChange: true });
  };

  prevButton.addEventListener('click', () => go(-1));
  nextButton.addEventListener('click', () => go(1));

  stage.setAttribute('tabindex', '0');
  stage.setAttribute('aria-roledescription', 'carrusel');
  stage.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    }
  });

  /* Swipe con el dedo (táctil) y arrastre con el ratón ------------------- */
  let startX = null;
  let startY = null;

  const pointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    startX = event.clientX;
    startY = event.clientY;
    stage.classList.add('is-dragging');
  };

  const pointerUp = (event) => {
    if (startX === null) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    startX = null;
    startY = null;
    stage.classList.remove('is-dragging');
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaY) > Math.abs(deltaX)) return;
    go(deltaX < 0 ? 1 : -1);
  };

  const pointerCancel = () => {
    startX = null;
    startY = null;
    stage.classList.remove('is-dragging');
  };

  stage.addEventListener('pointerdown', pointerDown);
  stage.addEventListener('pointerup', pointerUp);
  stage.addEventListener('pointercancel', pointerCancel);
  stage.addEventListener('pointerleave', pointerCancel);
  stage.addEventListener('dragstart', (event) => event.preventDefault());

  render();

  return {
    next: () => go(1),
    prev: () => go(-1),
    get index() {
      return index;
    }
  };
}
