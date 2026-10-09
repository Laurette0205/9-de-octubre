import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const config = JSON.parse(await readFile(path.join(root, 'public', 'birthday.config.json'), 'utf8'));

test('la configuración contiene los bloques obligatorios', () => {
  for (const key of ['project', 'birthday', 'hero', 'sections', 'countdown', 'accessibility']) {
    assert.ok(config[key], `falta la clave "${key}"`);
  }
});

test('la fecha de cumpleaños es válida', () => {
  assert.match(config.birthday.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(config.birthday.time, /^\d{1,2}:\d{2}$/);
  assert.ok(config.birthday.timezone.length > 0);
});

test('el bloque de secciones es coherente con el HTML', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8');
  const ids = Object.values(config.sections)
    .map((section) => section.id)
    .filter(Boolean);

  assert.ok(ids.length >= 6);
  for (const id of ids) {
    assert.ok(html.includes(`id="${id}"`), `el HTML no contiene la sección "${id}"`);
  }
});

test('los assets referenciados en la configuración existen', async () => {
  const naruto = config.sections.naruto || {};
  const references = [
    ...(naruto.image ? [naruto.image] : []),
    ...(Array.isArray(naruto.images) ? naruto.images.map((image) => image.src || image) : []),
    ...(config.sections.luisMiguel?.image ? [config.sections.luisMiguel.image] : []),
    ...((config.sections.gallery?.images || []).map((image) => image.src)),
    ...((config.sections.memories?.items || []).map((item) => item.src || item.image).filter(Boolean)),
    ...((config.music?.tracks || []).map((track) => track.src))
  ];

  for (const reference of references) {
    const filePath = path.join(root, 'public', reference);
    await assert.doesNotReject(
      async () => readFile(filePath),
      `no existe el asset "${reference}"`
    );
  }
});

test('cada imagen de la galería tiene alt y categoría', () => {
  for (const image of config.sections.gallery.images) {
    assert.ok(image.alt && image.alt.trim().length > 10, `alt insuficiente en ${image.id}`);
    assert.ok(image.category, `falta categoría en ${image.id}`);
    assert.ok(image.title, `falta título en ${image.id}`);
  }
});

test('la música nunca inicia sola', () => {
  assert.ok(!('autoPlay' in config.music), 'autoPlay debe eliminarse: el audio sólo inicia con interacción');
});

test('los textos principales no están vacíos', () => {
  assert.ok(config.hero.title.trim().length > 0);
  assert.ok(config.hero.lead.trim().length > 20);
  assert.ok(config.sections.intro.paragraphs.length >= 4);
  assert.ok(config.sections.wishes.items.length >= 6);
  assert.ok(config.sections.surprise.letterContent.length >= 8);
});
