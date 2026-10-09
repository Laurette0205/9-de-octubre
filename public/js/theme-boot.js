/**
 * Arranque temprano: aplica los ajustes guardados antes del primer pintado.
 * Se mantiene fuera de los módulos para poder ejecutarse en <head>
 * y para no requerir 'unsafe-inline' en la CSP.
 */
(function () {
  try {
    var stored = JSON.parse(localStorage.getItem('9oct:a11y') || 'null');
    if (stored) {
      var root = document.documentElement;
      root.setAttribute('data-theme', stored.contrast ? 'high-contrast' : stored.dark ? 'dark' : 'light');
      root.setAttribute('data-reading-mode', String(!!stored.reading));
      root.setAttribute('data-reduced-motion', String(!!stored.motion));
      var steps = [16, 18, 20, 22, 24];
      var size = steps[typeof stored.fontStep === 'number' ? stored.fontStep : 1];
      if (size) root.style.setProperty('--font-size-base', size + 'px');
    }
  } catch (error) {
    /* almacenamiento no disponible: se usan los valores por defecto */
  }
})();
