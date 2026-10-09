/**
 * Capturas responsive de la experiencia (360 / 768 / 1440 px).
 *
 * Uso:  node "…/browser.mjs" http://localhost:4173/ --script tests/frontend/screenshots.mjs
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'screenshots');
const WIDTHS = [360, 768, 1440];

export default async function run(page, ui) {
  await mkdir(OUT_DIR, { recursive: true });
  const saved = [];
  const states = [];

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: width === 360 ? 800 : 900 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await page.mouse.move(10, 10);

    const gateFile = path.join(OUT_DIR, `01-portada-${width}.png`);
    await page.screenshot({ path: gateFile });
    saved.push(gateFile);
    states.push({
      file: path.basename(gateFile),
      gateVisible: await page.locator('#intro-gate').isVisible()
    });

    await page.locator('#intro-enter').click();
    await page.waitForFunction(
      () => document.getElementById('intro-gate')?.hidden === true,
      null,
      { timeout: 5000 }
    );
    await page.waitForTimeout(1400);
    const homeFile = path.join(OUT_DIR, `02-inicio-${width}.png`);
    await page.screenshot({ path: homeFile });
    saved.push(homeFile);
    states.push({
      file: path.basename(homeFile),
      gateVisible: await page.locator('#intro-gate').isVisible(),
      h1: (await page.locator('main h1').first().textContent())?.trim().slice(0, 40)
    });

    if (width === 360) {
      await page.evaluate(() => {
        document.getElementById('stage-music-btn')?.scrollIntoView({ block: 'center' });
      });
      await page
        .waitForFunction(
          () => document.querySelector('.stage__cta')?.classList.contains('is-visible'),
          null,
          { timeout: 5000 }
        )
        .catch(() => {});
      await page
        .waitForFunction(() => document.getElementById('toast')?.hidden !== false, null, { timeout: 6000 })
        .catch(() => {});
      await page.waitForTimeout(700);
      const nightFile = path.join(OUT_DIR, '08-escena-noche-360.png');
      await page.screenshot({ path: nightFile });
      saved.push(nightFile);
      const stageBtnWidth = await page.evaluate(() => {
        const button = document.getElementById('stage-music-btn');
        if (!button || button.hidden) return null;
        return Math.round(button.getBoundingClientRect().width);
      });
      if (stageBtnWidth !== null && stageBtnWidth > width) {
        throw new Error(`botón de música recortado: ${stageBtnWidth}px > ${width}px`);
      }
      states.push({ file: path.basename(nightFile), stageBtnWidth });
    }

    if (width === 1440) {
      for (const [index, id] of ['capitulo', 'recuerdos', 'final'].entries()) {
        await page.evaluate((sectionId) => {
          const target = sectionId === 'recuerdos'
            ? document.getElementById('memory-stage')
            : document.getElementById(sectionId);
          target?.scrollIntoView({ block: sectionId === 'recuerdos' ? 'center' : 'start' });
        }, id);
        await page.waitForTimeout(900);
        const file = path.join(OUT_DIR, `0${index + 3}-escena-${id}-${width}.png`);
        await page.screenshot({ path: file });
        saved.push(file);
      }

      await page.evaluate(() => {
        document.getElementById('noche-estrellas')?.scrollIntoView({ block: 'start' });
      });
      await page.waitForTimeout(900);
      const stageFile = path.join(OUT_DIR, '06-escena-luismiguel-1440.png');
      await page.screenshot({ path: stageFile });
      saved.push(stageFile);

      await page.locator('#music-toggle').click();
      await page.waitForTimeout(700);
      const playerFile = path.join(OUT_DIR, '07-reproductor-1440.png');
      await page.screenshot({ path: playerFile });
      saved.push(playerFile);
      states.push({
        file: path.basename(playerFile),
        playerTitle: (await page.locator('#music-title').textContent())?.trim(),
        playerTrack: (await page.locator('#music-track').textContent())?.trim()
      });
      await page.locator('#music-toggle').click().catch(() => {});
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  ui?.log?.(`capturas guardadas: ${saved.length}`);
  return { saved: saved.map((file) => path.basename(file)), states };
}
