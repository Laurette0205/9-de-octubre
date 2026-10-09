/**
 * Partículas discretas de la portada: polvo dorado que asciende.
 * Canvas ligero, sin librerías, pausado fuera de pantalla y con
 * renderizado estático cuando se reducen las animaciones.
 */

const GOLD = 'rgba(201, 168, 76,';
const BLUE = 'rgba(120, 170, 255,';

function createParticle(width, height, random) {
  const warm = random() > 0.25;
  return {
    x: random() * width,
    y: height + random() * height,
    radius: 0.7 + random() * 1.9,
    speed: 0.12 + random() * 0.42,
    drift: (random() - 0.5) * 0.25,
    alpha: 0.18 + random() * 0.5,
    color: warm ? GOLD : BLUE
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 */
export function initParticles(canvas) {
  if (!canvas) return null;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const random = Math.random;
  let particles = [];
  let width = 0;
  let height = 0;
  let frameId = 0;
  let running = false;
  let visible = true;

  const reduced = () =>
    document.documentElement.getAttribute('data-reduced-motion') === 'true'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const targetCount = Math.min(70, Math.round((width * height) / 16000));
    particles = Array.from({ length: targetCount }, () => createParticle(width, height, random));
    draw();
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    for (const particle of particles) {
      context.beginPath();
      context.fillStyle = `${particle.color}${particle.alpha})`;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }
  };

  const step = () => {
    if (!running) return;
    for (const particle of particles) {
      particle.y -= particle.speed;
      particle.x += particle.drift;
      if (particle.y < -8) {
        particle.y = height + 8;
        particle.x = random() * width;
      }
    }
    draw();
    frameId = window.requestAnimationFrame(step);
  };

  const start = () => {
    if (running || reduced() || !visible || document.hidden) return;
    running = true;
    frameId = window.requestAnimationFrame(step);
  };

  const stop = () => {
    running = false;
    window.cancelAnimationFrame(frameId);
  };

  const refresh = () => {
    if (reduced()) {
      stop();
      draw();
    } else {
      start();
    }
  };

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 180);
  });

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  const hero = canvas.closest('.hero');
  if (hero && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        visible ? start() : stop();
      },
      { threshold: 0.05 }
    );
    observer.observe(hero);
  }

  const mutation = new MutationObserver(refresh);
  mutation.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-reduced-motion']
  });

  resize();
  start();

  return { refresh, destroy: stop };
}
