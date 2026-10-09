/**
 * Cuenta regresiva hacia el cumpleaños.
 * Respeta la zona horaria configurada y los tres estados posibles:
 * antes · hoy · después.
 */

import { qs, setText, createElement } from './dom.js';
import { getCountdown, formatCountdownText, pad } from './date.js';

/**
 * @param {{config:object, announce?:(msg:string)=>void}} options
 */
export function initCountdown({ config, announce = () => {} }) {
  const box = qs('#countdown');
  if (!box) return null;

  const settings = config.countdown || {};
  if (settings.enabled === false) {
    box.hidden = true;
    return null;
  }

  const label = qs('#countdown-label');
  const grid = qs('#countdown-grid');
  const status = qs('#countdown-status');

  setText(label, settings.label || 'Cuenta regresiva');

  let a11yLine = box.querySelector('.visually-hidden');
  if (!a11yLine) {
    a11yLine = createElement('p', { className: 'visually-hidden' });
    box.appendChild(a11yLine);
  }

  let lastState = null;

  const render = () => {
    const result = getCountdown(config.birthday, new Date());
    const units = {
      days: pad(result.days),
      hours: pad(result.hours),
      minutes: pad(result.minutes),
      seconds: pad(result.seconds)
    };

    box.hidden = false;
    box.classList.toggle('countdown--today', result.state === 'today');
    box.setAttribute('aria-label', settings.label || 'Cuenta regresiva');

    if (result.state === 'before') {
      grid.hidden = false;
      for (const [unit, value] of Object.entries(units)) {
        const node = box.querySelector(`[data-unit="${unit}"]`);
        setText(node, value);
      }
      setText(status, '');
      status.hidden = true;
      setText(
        a11yLine,
        formatCountdownText(settings.beforeText || 'Faltan {days} días {hours} horas {minutes} minutos y {seconds} segundos.', units)
      );
    } else if (result.state === 'today') {
      grid.hidden = true;
      status.hidden = false;
      setText(status, settings.dayText || '¡Hoy es el gran día!');
      setText(a11yLine, settings.dayText || '¡Hoy es el gran día!');
    } else {
      grid.hidden = true;
      status.hidden = false;
      setText(status, settings.afterText || 'Tu día ya pasó, pero los buenos deseos permanecen.');
      setText(a11yLine, settings.afterText || 'Tu día ya pasó, pero los buenos deseos permanecen.');
    }

    if (lastState && lastState !== result.state) {
      if (result.state === 'today') announce(settings.dayText || '¡Hoy es el gran día!');
      if (result.state === 'after') announce(settings.afterText || 'El día ya pasó.');
    }
    lastState = result.state;
  };

  render();

  const interval = window.setInterval(() => {
    if (document.hidden) return;
    render();
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });

  return {
    destroy() {
      window.clearInterval(interval);
    },
    render
  };
}
