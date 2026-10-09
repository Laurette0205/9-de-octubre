/**
 * Punto de entrada de la experiencia "9 de Octubre".
 * Orden: configuración → render → accesibilidad → navegación → módulos.
 */

import { loadConfig } from './config.js';
import { renderAll } from './render.js';
import { initAccessibility } from './accessibility.js';
import { initNavigation } from './navigation.js';
import { initReveal, initParallax } from './reveal.js';
import { initCountdown } from './countdown.js';
import { initParticles } from './particles.js';
import { initEasterEggs } from './easter-eggs.js';
import { getCountdown } from './date.js';
import { initGallery } from './components/gallery.js';
import { initMemoryCarousel } from './components/memory-carousel.js';
import { initMusicPlayer } from './components/music-player.js';
import { initSurpriseLetter } from './components/surprise-letter.js';
import { initIntroGate } from './components/intro-gate.js';
import { initFinalScene } from './components/final-scene.js';
import { showToast } from './components/toast.js';
import { burstConfetti } from './components/confetti.js';

const announce = (message) => showToast(message);

async function initShare(config) {
  const button = document.getElementById('share-btn');
  if (!button) return;

  const footer = config.footer || {};
  const shareData = {
    title: config.seo?.title || config.project?.name || '9 de Octubre',
    text: footer.shareText || 'Una celebración digital.',
    url: window.location.href
  };

  button.addEventListener('click', async () => {
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      announce('Enlace copiado al portapapeles.');
    } catch {
      announce('No fue posible compartir en este navegador.');
    }
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!window.location.protocol.startsWith('http')) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.info('[9oct] Service worker no disponible.', error);
    });
  });
}

function celebrateIfBirthday(config, announceFn) {
  const result = getCountdown(config.birthday, new Date());
  if (result.state !== 'today') return;

  const dayText = config.countdown?.dayText || '¡Hoy es el gran día!';
  window.setTimeout(() => {
    announceFn(dayText);
    burstConfetti({ count: 64, durationMs: 4200 });
  }, 1200);
}

async function main() {
  // La portada se arma antes de cargar la configuración para bloquear el
  // scroll desde el primer instante.
  let config = null;
  const gate = initIntroGate({
    announce,
    onEnter: () => {
      initReveal();
      initParallax();
      if (config) celebrateIfBirthday(config, announce);
    }
  });

  config = await loadConfig();

  renderAll(config);
  initAccessibility({ config, announce });
  initNavigation({ announce });

  const countdown = initCountdown({ config, announce });
  initParticles(/** @type {HTMLCanvasElement|null} */ (document.getElementById('hero-canvas')));
  initGallery({ config });
  initMemoryCarousel({ config, announce });
  initMusicPlayer({ config, announce });
  initSurpriseLetter({ announce });
  initFinalScene({ announce, onReplay: () => gate?.open() });
  initEasterEggs({ config, announce });

  await initShare(config);
  registerServiceWorker();

  document.documentElement.setAttribute('data-app-ready', 'true');

  // Guardia de diagnóstico en consola (sin errores silenciosos).
  window.addEventListener('error', (event) => {
    console.error('[9oct] Error de la experiencia:', event.error || event.message);
  });

  return { config, countdown };
}

main();
