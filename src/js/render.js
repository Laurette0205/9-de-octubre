/**
 * Renderizado del contenido a partir de birthday.config.json.
 * El HTML define la estructura semántica; la configuración define el texto.
 */

import { qs, qsa, setText, createElement, getByPath } from './dom.js';

/**
 * Rellena todos los elementos con atributo data-render="ruta.de.config".
 * @param {object} config
 */
function renderBoundText(config) {
  qsa('[data-render]').forEach((element) => {
    const value = getByPath(config, element.getAttribute('data-render'));
    if (typeof value === 'string' && value.trim().length > 0) {
      element.textContent = value;
    }
  });

  qsa('[data-i18n]').forEach((element) => {
    const value = getByPath(config, element.getAttribute('data-i18n'));
    if (typeof value === 'string' && value.trim().length > 0) {
      element.textContent = value;
    }
  });
}

/**
 * Escena 01 · puerta de entrada.
 * @param {object} config
 */
function renderGate(config) {
  const gate = config.gate || {};
  const name = typeof gate.name === 'string' && gate.name.trim()
    ? gate.name
    : (config.birthday?.name || '').trim().split(/\s+/)[0] || '';
  setText(qs('#intro-gate-name'), name);
}

function renderHero(config) {
  const hero = config.hero || {};
  setText(qs('.hero__date'), hero.dateLabel || '9 DE OCTUBRE');

  const title = hero.title || 'Feliz cumpleaños.';
  setText(qs('#hero-title'), title);

  // La línea dorada muestra el nombre sólo si el título no lo incluye ya.
  const name = typeof hero.name === 'string' && hero.name.trim()
    ? hero.name
    : (config.birthday?.name || '');
  const firstName = name.trim().split(/\s+/)[0] || '';
  const duplicated = firstName.length > 0 && title.toLowerCase().includes(firstName.toLowerCase());
  setText(qs('.hero__name'), duplicated ? '' : name);

  setText(qs('.hero__lead'), hero.lead || '');
  setText(qs('.hero__tagline'), hero.tagline || '');
  setText(qs('.hero__scroll-text'), hero.scrollHint || 'Desliza para descubrir');

  const cta = qs('#hero-cta');
  setText(cta, hero.ctaText || 'Entrar a la celebración');
  if (cta instanceof HTMLAnchorElement && hero.ctaTarget) {
    cta.setAttribute('href', `#${hero.ctaTarget}`);
  }
}

/**
 * @param {object} intro configuración de la sección "intro"
 */
function renderIntro(intro) {
  const prose = qs('#intro-prose');
  if (!prose) return;
  prose.replaceChildren();

  const paragraphs = Array.isArray(intro.paragraphs) ? intro.paragraphs : [];
  if (paragraphs.length === 0) {
    prose.appendChild(createElement('p', { text: 'Este día merece celebrarse.' }));
  } else {
    paragraphs.forEach((text) => prose.appendChild(createElement('p', { text })));
  }

  const quote = qs('.pull-quote');
  if (quote) {
    quote.textContent = intro.pullQuote ? `«${intro.pullQuote}»` : '';
    quote.hidden = !intro.pullQuote;
  }
}

function renderListSection(section, { listSelector, valuesSelector }) {
  const list = listSelector ? qs(listSelector) : null;
  if (list) {
    list.replaceChildren();
    (section.items || []).forEach((text, index) => {
      const item = createElement('li', { className: 'wish-card reveal' });
      item.style.transitionDelay = `${Math.min(index * 60, 540)}ms`;
      item.style.transitionDelay = `${Math.min(index * 60, 540)}ms`;
      const number = createElement('span', {
        className: 'wish-card__index',
        text: String(index + 1).padStart(2, '0')
      });
      const body = createElement('p', { className: 'wish-card__text', text });
      item.append(number, body);
      list.appendChild(item);
    });
  }

  const values = valuesSelector ? qs(valuesSelector) : null;
  if (values) {
    values.replaceChildren();
    (section.values || []).forEach((value) => {
      values.appendChild(createElement('li', { text: value }));
    });
  }
}

function renderQuotes(section, containerSelector) {
  const container = qs(containerSelector);
  if (!container) return;
  container.replaceChildren();

  (section.quotes || []).forEach((quoteText, index) => {
    const figure = createElement('figure', { className: 'reveal' });
    figure.style.transitionDelay = `${Math.min(index * 120, 480)}ms`;
    const blockquote = createElement('blockquote', { text: `«${quoteText}»` });
    figure.appendChild(blockquote);
    container.appendChild(figure);
  });
}

function renderThemeSection(section, { imageSelector, valuesSelector, quotesSelector }) {
  const image = qs(imageSelector);
  if (image instanceof HTMLImageElement && section.image) {
    image.src = section.image;
    if (section.imageAlt) image.alt = section.imageAlt;
  }
  renderListSection(section, { listSelector: null, valuesSelector });
  renderQuotes(section, quotesSelector);
}

function renderSurprise(config) {
  const surprise = (config.sections && config.sections.surprise) || {};
  const trigger = qs('#surprise-trigger');
  setText(trigger, surprise.triggerText || 'ABRIR CARTA');
  if (trigger) trigger.setAttribute('aria-label', surprise.triggerAriaLabel || 'Abrir la carta sorpresa');

  const body = qs('#letter-body');
  if (body) {
    body.replaceChildren();
    (surprise.letterContent || []).forEach((line) => {
      body.appendChild(createElement('p', { text: line }));
    });
  }

  setText(qs('#letter-title'), surprise.letterTitle || 'PARA TI');
  setText(qs('#letter-signature'), surprise.signature || '');
  setText(qs('#letter-final'), surprise.finalMessage || '');
  setText(qs('#letter-close'), surprise.closeLabel || 'Cerrar la carta');
}

/**
 * Escena 03 · tira de tres láminas ninja con placeholders sustituibles.
 * @param {object} section configuración de la sección "naruto"
 */
function renderNinjaStrip(section) {
  const strip = qs('#ninja-strip');
  if (!strip) return;

  const fallback = section.image
    ? [{ src: section.image, alt: section.imageAlt || '', caption: '' }]
    : [];
  const images = Array.isArray(section.images) && section.images.length > 0
    ? section.images
    : fallback;

  strip.replaceChildren();
  images.forEach((image, index) => {
    const item = createElement('li', { className: 'ninja-strip__card reveal' });
    item.style.transitionDelay = `${Math.min(index * 90, 420)}ms`;
    item.appendChild(createElement('img', {
      attrs: {
        src: image.src,
        alt: image.alt || '',
        loading: index === 0 ? 'eager' : 'lazy',
        decoding: 'async',
        width: '960',
        height: '720'
      }
    }));
    if (image.caption) {
      item.appendChild(createElement('figcaption', { className: 'ninja-strip__caption', text: image.caption }));
    }
    strip.appendChild(item);
  });
}

/**
 * Escena 07 · ascuas animadas detrás de las frases.
 * Se generan con JS para no inflar el HTML; se apagan con movimiento reducido.
 */
function renderWishesEmbers() {
  const box = qs('.wishes__embers');
  if (!box || box.childElementCount > 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 14; index += 1) {
    const ember = document.createElement('span');
    ember.style.left = `${(index * 7 + Math.random() * 6).toFixed(1)}%`;
    ember.style.animationDuration = `${(9 + Math.random() * 9).toFixed(1)}s`;
    ember.style.animationDelay = `${(Math.random() * 10).toFixed(1)}s`;
    ember.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2);
    fragment.appendChild(ember);
  }
  box.appendChild(fragment);
}

function renderMetadata(config) {
  const seo = config.seo || {};
  if (seo.title) document.title = seo.title;

  const description = seo.description || config.project?.description;
  if (description) {
    const meta = qs('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
  }

  const nameInput = config.birthday?.name;
  if (nameInput && !/^\[.*\]$/.test(nameInput)) {
    const title = qs('meta[property="og:title"]');
    if (title) title.setAttribute('content', `${seo.title || document.title} — ${nameInput}`);
  }
}

/**
 * Punto de entrada del renderizado.
 * @param {object} config
 */
export function renderAll(config) {
  renderBoundText(config);
  renderGate(config);
  renderHero(config);

  const sections = config.sections || {};
  renderIntro(sections.intro || {});
  renderListSection(sections.wishes || {}, {
    listSelector: '#wishes-grid',
    valuesSelector: null
  });
  renderNinjaStrip(sections.naruto || {});
  renderThemeSection(sections.naruto || {}, {
    imageSelector: '#ninja-image',
    valuesSelector: '#ninja-values',
    quotesSelector: '#ninja-quotes'
  });
  renderThemeSection(sections.luisMiguel || {}, {
    imageSelector: '#stage-image',
    valuesSelector: '#stage-values',
    quotesSelector: '#stage-quotes'
  });
  renderSurprise(config);
  renderWishesEmbers();
  renderMetadata(config);

  const empty = qs('#wishes-empty');
  if (empty) {
    const items = (sections.wishes && sections.wishes.items) || [];
    empty.hidden = items.length > 0;
    setText(empty, 'Pronto encontrarás aquí tus deseos.');
  }
}
