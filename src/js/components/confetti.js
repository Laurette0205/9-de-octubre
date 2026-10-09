/**
 * Confeti discreto para momentos clave (carta, día del cumpleaños).
 * Se apaga automáticamente si el usuario redujo las animaciones.
 */

const PALETTE = ['#c9a84c', '#e8d5b7', '#3b82f6', '#f5f0e8', '#b8963d'];

function reducedMotion() {
  return document.documentElement.getAttribute('data-reduced-motion') === 'true'
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Lanza una lluvia breve de partículas de papel.
 * @param {{count?:number, durationMs?:number}} [options]
 */
export function burstConfetti(options = {}) {
  if (reducedMotion()) return;

  const layer = document.getElementById('confetti-layer');
  if (!layer) return;

  const count = Math.min(options.count ?? 46, 90);
  const duration = options.durationMs ?? 3200;
  const fragment = document.createDocumentFragment();
  const pieces = [];

  for (let index = 0; index < count; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = PALETTE[index % PALETTE.length];
    piece.style.animationDuration = `${(duration / 1000 + Math.random() * 1.4).toFixed(2)}s`;
    piece.style.animationDelay = `${(Math.random() * 0.45).toFixed(2)}s`;
    piece.style.width = `${6 + Math.random() * 7}px`;
    piece.style.height = `${10 + Math.random() * 10}px`;
    fragment.appendChild(piece);
    pieces.push(piece);
  }

  layer.appendChild(fragment);
  window.setTimeout(() => pieces.forEach((piece) => piece.remove()), duration + 2600);
}
