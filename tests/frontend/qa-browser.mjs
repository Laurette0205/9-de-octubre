export default async function run(page, ui) {
  const result = { steps: [], errors: [] };

  // Diagnóstico: cualquier recurso servido con MIME inesperado se reporta.
  const badResponses = [];
  const stepCount = { n: 0 };
  const phase = { name: 'inicio' };
  page.on('response', (res) => {
    const type = res.headers()['content-type'] || '';
    if (res.request().resourceType() === 'script' && type.includes('text/html')) {
      badResponses.push(`fase=${phase.name} paso=${stepCount.n} sw=${res.fromServiceWorker()} ${res.status()} ${type} ${res.url()}`);
    }
  });
  result.badResponses = badResponses;

  const check = (name, ok, extra = '') => {
    stepCount.n += 1;
    result.steps.push(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
    if (!ok) result.errors.push(name);
  };

  // Estado limpio: sin service worker ni caché de iteraciones anteriores.
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if (window.caches) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }
    localStorage.clear();
    sessionStorage.clear();
  });

  phase.name = 'recarga-inicial';
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  phase.name = 'interacciones';

  // 0. Portada de entrada (escena 1)
  const gateVisible = await page.locator('#intro-gate').isVisible();
  check('portada de entrada visible', gateVisible);
  const gateTitle = await page.locator('#intro-gate-title').textContent();
  check('título de la portada', Boolean(gateTitle && gateTitle.trim().length > 3), gateTitle?.trim());
  const gateCta = await page.locator('#intro-enter').textContent();
  check('CTA "entrar a tu regalo"', /entrar a tu regalo/i.test(gateCta || ''), gateCta?.trim());

  await page.locator('#intro-enter').click();
  await page.waitForTimeout(1200);
  const gateState = await page.evaluate(() => ({
    hidden: document.getElementById('intro-gate')?.hidden === true,
    attr: document.documentElement.getAttribute('data-gate')
  }));
  check('la portada se cierra al entrar', gateState.hidden && gateState.attr === null, JSON.stringify(gateState));

  // 1. Skip link: enfocable y visible al recibir foco
  await page.locator('.skip-link').focus();
  await page.waitForTimeout(350);
  const skipState = await page.evaluate(() => {
    const el = document.querySelector('.skip-link');
    const rect = el.getBoundingClientRect();
    return {
      focused: document.activeElement === el,
      visible: rect.width > 0 && rect.height > 0 && rect.top >= 0
    };
  });
  check('skip link enfocable y visible', skipState.focused && skipState.visible, JSON.stringify(skipState));
  await page.locator('#contenido-principal').focus();

  // 2. Secciones (9 escenas) presentes y con contenido
  const sections = ['inicio', 'gran-dia', 'camino-ninja', 'capitulo', 'recuerdos', 'galeria', 'sorpresa', 'deseos', 'noche-estrellas', 'final'];
  for (const id of sections) {
    const count = await page.locator(`#${id}`).count();
    check(`sección #${id}`, count === 1);
  }

  // 3. Contenido renderizado desde la configuración
  const introParagraphs = await page.locator('#intro-prose p').count();
  check('párrafos de la intro', introParagraphs >= 4, `${introParagraphs} párrafos`);
  check('cita destacada visible', await page.locator('.pull-quote').isVisible());

  const wishes = await page.locator('.wish-card').count();
  check('frases motivacionales', wishes === 6, `${wishes} frases`);

  const ninjaCards = await page.locator('#ninja-strip .ninja-strip__card').count();
  check('láminas ninja (3 o más)', ninjaCards >= 3, `${ninjaCards} láminas`);

  // 4. Cuenta regresiva dentro de la escena "Tu nuevo capítulo"
  const countdownVisible = await page.locator('#countdown').isVisible();
  check('cuenta regresiva visible', countdownVisible);
  const days = await page.locator('[data-unit="days"]').textContent();
  check('días de cuenta regresiva', Boolean(days && days.trim().length > 0), `días=${days}`);
  const chapterTitle = await page.locator('#chapter-title').textContent();
  check('título de la escena de contador', /capítulo/i.test(chapterTitle || ''), chapterTitle?.trim());

  // 5. Imágenes (scroll para disparar lazy loading)
  for (const id of ['camino-ninja', 'capitulo', 'recuerdos', 'galeria', 'noche-estrellas', 'final']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  const ninjaLoaded = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#ninja-strip img'))
      .filter((img) => img.complete && img.naturalWidth > 0).length
  );
  check('láminas ninja cargadas', ninjaLoaded === ninjaCards, `${ninjaLoaded}/${ninjaCards}`);

  const stageOk = await page.evaluate(() => {
    const img = document.getElementById('stage-image');
    return Boolean(img && img.complete && img.naturalWidth > 0);
  });
  check('imagen escenario cargada', stageOk);

  const galleryLoaded = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('#gallery-grid img'));
    return images.filter((img) => img.complete && img.naturalWidth > 0).length;
  });
  const galleryTotal = await page.locator('#gallery-grid img').count();
  check('galería cargada', galleryLoaded === galleryTotal, `${galleryLoaded}/${galleryTotal}`);
  check('sin imágenes rotas', (await page.locator('#gallery-grid .is-broken').count()) === 0);

  // 6. Filtros de galería
  const narutoFilter = page.getByRole('button', { name: 'Naruto', exact: true });
  await narutoFilter.click();
  await page.waitForTimeout(200);
  const visibleAfterFilter = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#gallery-grid > li')).filter((li) => !li.hidden).length
  );
  check('filtro Naruto aplica', visibleAfterFilter === 1, `${visibleAfterFilter} visibles`);
  check('aria-pressed del filtro', (await narutoFilter.getAttribute('aria-pressed')) === 'true');
  await page.getByRole('button', { name: 'Todas', exact: true }).click();

  // 7. Galería 3D de recuerdos: botones, teclado y swipe
  await page.locator('#recuerdos').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const firstMemory = await page.locator('#memory-current').textContent();
  check('carrusel en el recuerdo 1', firstMemory?.trim() === '1', firstMemory);

  await page.locator('#memory-next').click();
  await page.waitForTimeout(600);
  const secondMemory = await page.locator('#memory-current').textContent();
  check('botón Siguiente avanza', secondMemory?.trim() === '2', secondMemory);
  const activeMemory = await page.locator('.memory-card.is-active .memory-card__title').textContent();
  check('tarjeta activa distinta', Boolean(activeMemory && activeMemory.trim().length > 0), activeMemory?.trim());

  await page.locator('#memory-stage').focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(500);
  check('flechas del teclado', (await page.locator('#memory-current').textContent())?.trim() === '1');

  const stageBox = await page.locator('#memory-stage').boundingBox();
  if (stageBox) {
    await page.mouse.move(stageBox.x + stageBox.width * 0.7, stageBox.y + stageBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(stageBox.x + stageBox.width * 0.25, stageBox.y + stageBox.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const afterSwipe = await page.locator('#memory-current').textContent();
    check('swipe avanza de recuerdo', afterSwipe?.trim() === '2', afterSwipe);
  }

  // 8. Carta "PARA TI": apertura, revelado progresivo y cierre
  await page.locator('#sorpresa').scrollIntoViewIfNeeded();
  await page.locator('#surprise-trigger').click();
  await page.waitForTimeout(700);
  check('carta abierta', await page.locator('#letter-overlay').isVisible());
  const letterTitle = await page.locator('#letter-title').textContent();
  check('título de la carta PARA TI', (letterTitle || '').trim() === 'PARA TI', letterTitle?.trim());
  const letterParagraphs = await page.locator('#letter-body p').count();
  check('contenido de la carta', letterParagraphs >= 14, `${letterParagraphs} líneas`);
  const revealed = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#letter-body p')).filter((p) => p.classList.contains('is-in')).length
  );
  check('revelado progresivo en marcha', revealed > 0, `${revealed} líneas animándose`);
  const focusId = await page.evaluate(() => document.activeElement?.id || '');
  check('foco en el diálogo', focusId === 'letter-dialog', `foco=${focusId}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('carta cerrada con Escape', !(await page.locator('#letter-overlay').isVisible()));

  // 9. Reproductor: playlist con anterior / siguiente
  const playerVisible = await page.locator('#music-player').isVisible();
  check('reproductor visible', playerVisible);
  if (playerVisible) {
    const initialTrack = (await page.locator('#music-track').textContent())?.trim();
    const total = initialTrack?.split('/')[1]?.trim() || '1';
    check('indicador de playlist', initialTrack === `1 / ${total}`, initialTrack);
    const trackTitle = (await page.locator('#music-title').textContent())?.trim();
    check('artista en el reproductor', /luis miguel/i.test(trackTitle || ''), trackTitle);
    if (Number(total) > 1) {
      await page.locator('#music-next').click();
      await page.waitForTimeout(500);
      check('siguiente canción', (await page.locator('#music-track').textContent())?.trim() === `2 / ${total}`);
      await page.locator('#music-prev').click();
      await page.waitForTimeout(500);
      check('canción anterior', (await page.locator('#music-track').textContent())?.trim() === `1 / ${total}`);
    }
    const volumeEnabled = await page.locator('#music-volume').isEnabled();
    check('control de volumen', volumeEnabled);
    const toggleLabel = await page.locator('#music-label').textContent();
    check('play / pausa con nombre accesible', /reproducir|pausar/i.test(toggleLabel || ''), toggleLabel?.trim());
  }

  // 10. Panel de accesibilidad
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.locator('#a11y-toggle').click();
  await page.waitForTimeout(300);
  check('panel de accesibilidad', await page.locator('#a11y-panel').isVisible());

  const beforeSize = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--font-size-base').trim()
  );
  await page.locator('#font-increase').click();
  const afterSize = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--font-size-base').trim()
  );
  check('aumentar texto', beforeSize !== afterSize, `${beforeSize} → ${afterSize}`);

  await page.locator('#toggle-reading').click();
  check('modo lectura', (await page.evaluate(() => document.documentElement.getAttribute('data-reading-mode'))) === 'true');
  await page.locator('#toggle-reading').click();

  await page.locator('#toggle-motion').click();
  check('reducir animaciones', (await page.evaluate(() => document.documentElement.getAttribute('data-reduced-motion'))) === 'true');
  await page.locator('#toggle-motion').click();
  await page.locator('#a11y-close').click();

  // 11. Navegación por anclas y scrollspy
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.locator('#nav-list a[href="#capitulo"]').click();
  await page.waitForTimeout(800);
  const hash = await page.evaluate(() => window.location.hash);
  check('navegación por secciones', hash === '#capitulo', hash);
  const activeLink = await page.evaluate(() =>
    document.querySelector('.site-nav__link.is-active')?.getAttribute('data-nav') || ''
  );
  check('scrollspy activo', activeLink.length > 0, activeLink);

  // 12. Escena final y "Volver a ver"
  await page.locator('#final').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const finalTitle = await page.locator('#final-title').textContent();
  check('escena final', /gracias/i.test(finalTitle || ''), finalTitle?.trim());
  await page.locator('#final-replay').click();
  await page.waitForTimeout(600);
  const replayed = await page.evaluate(() => ({
    gateHidden: document.getElementById('intro-gate')?.hidden === true,
    attr: document.documentElement.getAttribute('data-gate')
  }));
  check('"Volver a ver" reabre la portada', replayed.gateHidden === false && replayed.attr === 'open', JSON.stringify(replayed));
  await page.locator('#intro-enter').click();
  await page.waitForTimeout(1000);

  // 13. Overflow horizontal y menú móvil (360 px)
  await page.setViewportSize({ width: 360, height: 740 });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  check('sin overflow horizontal', overflow.scrollWidth <= overflow.clientWidth + 1,
    `${overflow.scrollWidth} vs ${overflow.clientWidth}`);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const toggle = page.locator('#nav-toggle');
  const toggleVisible = await toggle.isVisible();
  check('menú móvil disponible', toggleVisible);
  if (toggleVisible) {
    await toggle.click();
    await page.waitForTimeout(300);
    check('menú móvil abre', await page.locator('#nav-menu').isVisible());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    check('menú móvil cierra con Escape', !(await page.locator('#nav-menu').isVisible()));
  }

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(400);

  // 14. Rendimiento de la primera carga
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    return {
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      transferSize: Math.round(nav.transferSize || 0)
    };
  });
  if (perf) {
    check('carga rápida (< 3 s)', perf.load < 3000, `${perf.load} ms`);
    check('DOMContentLoaded razonable (< 1.5 s)', perf.domContentLoaded < 1500, `${perf.domContentLoaded} ms`);
    result.performance = perf;
  }

  // 15. Jerarquía de títulos y landmarks
  const headingOrder = await page.evaluate(() =>
    Array.from(document.querySelectorAll('h1, h2, h3, h4')).map((h) => Number(h.tagName[1]))
  );
  const h1Count = headingOrder.filter((level) => level === 1).length;
  check('un solo h1', h1Count === 1, `${h1Count} h1`);
  const skips = headingOrder.filter((level, index) => index > 0 && level - headingOrder[index - 1] > 1);
  check('jerarquía de encabezados sin saltos', skips.length === 0, `${skips.length} saltos`);

  const landmarks = await page.evaluate(() => ({
    banner: document.querySelectorAll('body > header').length,
    main: document.querySelectorAll('main').length,
    footer: document.querySelectorAll('footer').length,
    nav: document.querySelectorAll('nav').length
  }));
  check('landmarks semánticos', landmarks.main === 1 && landmarks.banner === 1 && landmarks.footer === 1,
    JSON.stringify(landmarks));

  // 16. Imágenes con alt y controles con nombre accesible
  const imagesWithoutAlt = await page.evaluate(() =>
    Array.from(document.images).filter((img) => !img.hasAttribute('alt')).length
  );
  check('todas las imágenes con alt', imagesWithoutAlt === 0, `${imagesWithoutAlt} sin alt`);

  const emptyLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a, button')).filter((el) => {
      const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
      return name.length === 0;
    }).length
  );
  check('sin controles sin nombre accesible', emptyLinks === 0, `${emptyLinks} sin nombre`);

  // 17. PWA: service worker, precache y modo sin conexión
  let swInfo = { active: false, entries: 0, caches: 0 };
  phase.name = 'bucle-sw';
  for (let attempt = 0; attempt < 3 && !swInfo.active; attempt += 1) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    swInfo = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { active: false, entries: 0, caches: 0, state: 'sin soporte', paths: [] };
      }
      const stale = await navigator.serviceWorker.getRegistrations();
      await Promise.all(stale.filter((r) => !r.active).map((r) => r.unregister()));
      let registerError = '';
      try {
        await navigator.serviceWorker.register('sw.js');
      } catch (error) {
        registerError = String(error);
      }
      let registration = null;
      for (let tick = 0; tick < 40 && !registration?.active; tick += 1) {
        registration = await navigator.serviceWorker.getRegistration();
        if (registration?.active) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const keys = await caches.keys();
      const paths = [];
      for (const key of keys) {
        const cache = await caches.open(key);
        for (const req of await cache.keys()) paths.push(new URL(req.url).pathname);
      }
      return {
        active: Boolean(registration?.active),
        entries: paths.length,
        caches: keys.length,
        state: registration
          ? (registration.active ? 'active' : registration.installing ? 'installing'
            : registration.waiting ? 'waiting' : 'sin estado')
          : 'ninguna',
        registerError,
        paths
      };
    });
  }
  check('service worker activo', swInfo.active === true,
    `cachés=${swInfo.caches} estado=${swInfo.state}${swInfo.registerError ? ` error=${swInfo.registerError}` : ''}`);
  check('precache poblado', swInfo.entries >= 20,
    `${swInfo.entries} entradas: ${JSON.stringify((swInfo.paths || []).slice(0, 12))}`);

  await page.waitForTimeout(800);
  let offlineOk = false;
  let offlineDetail = '';
  try {
    phase.name = 'offline';
    await page.context().setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    offlineOk = await page.evaluate(() => Boolean(document.querySelector('#inicio')?.textContent?.trim()));
    offlineDetail = offlineOk ? 'contenido servido desde caché' : 'sin contenido';
  } catch (error) {
    offlineDetail = String(error);
  } finally {
    await page.context().setOffline(false).catch(() => undefined);
    phase.name = 'final';
  }
  check('funciona sin conexión', offlineOk, offlineDetail);

  result.summary = result.errors.length === 0
    ? `TODAS LAS COMPROBACIONES CORRECTAS (${result.steps.length})`
    : `FALLAN ${result.errors.length} de ${result.steps.length}: ${result.errors.join(', ')}`;

  return result;
}
