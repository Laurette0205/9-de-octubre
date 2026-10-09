/**
 * Galería adaptable con filtros por categoría, estados vacíos,
 * carga diferida y textos alternativos desde la configuración.
 */

import { qs, createElement, setText } from '../dom.js';

/**
 * @param {{config:object, onImageError?:(img:HTMLImageElement)=>void}} options
 */
export function initGallery({ config, onImageError }) {
  const gallery = (config.sections && config.sections.gallery) || config.gallery || {};
  const grid = qs('#gallery-grid');
  const filtersBox = qs('#gallery-filters');
  const emptyBox = qs('#gallery-empty');
  if (!grid || !filtersBox) return null;

  const images = Array.isArray(gallery.images) ? gallery.images : [];
  const categories = ['Todas', ...(Array.isArray(gallery.categories) ? gallery.categories.filter((c) => c !== 'Todas') : [])];

  const renderEmpty = () => {
    if (!emptyBox) return;
    emptyBox.hidden = images.length > 0;
    setText(qs('#gallery-empty-title'), gallery.emptyTitle || 'Aún no hay fotos aquí');
    setText(qs('#gallery-empty-text'), gallery.emptyText || '');
  };

  const renderItem = (image) => {
    const item = createElement('li', { className: 'gallery-item' });
    const figure = createElement('figure');
    const img = createElement('img', {
      attrs: {
        src: image.src,
        alt: image.alt || image.title || '',
        loading: 'lazy',
        decoding: 'async',
        width: '800',
        height: '600'
      }
    });
    img.addEventListener('error', () => {
      if (onImageError) onImageError(img);
      item.classList.add('is-broken');
    });

    const caption = createElement('figcaption');
    caption.appendChild(createElement('span', { className: 'gallery-item__title', text: image.title || '' }));
    caption.appendChild(createElement('span', { className: 'gallery-item__category', text: image.category || '' }));

    figure.append(img, caption);
    item.appendChild(figure);
    item.dataset.category = image.category || '';
    return item;
  };

  const applyFilter = (category) => {
    const items = Array.from(grid.children);
    let visible = 0;
    items.forEach((item) => {
      const match = category === 'Todas' || item.dataset.category === category;
      item.hidden = !match;
      if (match) visible += 1;
    });

    filtersBox.querySelectorAll('.chip-toggle').forEach((button) => {
      const active = button.getAttribute('data-category') === category;
      button.setAttribute('aria-pressed', String(active));
    });

    if (emptyBox && images.length > 0) {
      emptyBox.hidden = visible > 0;
      setText(qs('#gallery-empty-title'), 'Esta categoría está vacía');
      setText(qs('#gallery-empty-text'), 'Pronto se agregarán más recuerdos aquí.');
    }
  };

  const renderFilters = () => {
    filtersBox.replaceChildren();
    const available = categories.filter(
      (category) => category === 'Todas' || images.some((image) => image.category === category)
    );
    if (available.length <= 1 && images.length > 0) {
      filtersBox.hidden = true;
      return;
    }
    filtersBox.hidden = images.length === 0;
    available.forEach((category, index) => {
      const button = createElement('button', {
        className: 'chip-toggle',
        text: category,
        attrs: { type: 'button', 'data-category': category, 'aria-pressed': String(index === 0) }
      });
      button.addEventListener('click', () => applyFilter(category));
      filtersBox.appendChild(button);
    });
  };

  grid.replaceChildren();
  images.forEach((image) => grid.appendChild(renderItem(image)));
  renderFilters();
  renderEmpty();

  if (images.length > 0) applyFilter('Todas');

  return { applyFilter };
}
