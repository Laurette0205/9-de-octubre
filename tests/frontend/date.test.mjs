import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatCountdownText,
  getCountdown,
  getBirthdayInstant,
  getWallTimeParts,
  pad,
  parseIsoDate,
  getTimeZoneOffsetMs
} from '../../src/js/date.js';

const BIRTHDAY = {
  date: '2026-10-09',
  time: '00:00',
  timezone: 'America/Mexico_City'
};

test('parseIsoDate acepta un formato válido', () => {
  assert.deepEqual(parseIsoDate('2026-10-09'), { year: 2026, month: 10, day: 9 });
});

test('parseIsoDate rechaza formatos inválidos', () => {
  assert.throws(() => parseIsoDate('09-10-2026'));
  assert.throws(() => parseIsoDate('2026-13-01'));
  assert.throws(() => parseIsoDate(''));
});

test('getBirthdayInstant devuelve el instante UTC correcto', () => {
  const instant = getBirthdayInstant(BIRTHDAY);
  // Medianoche en Ciudad de México (UTC-6 en 2026) = 06:00 UTC
  assert.equal(instant.toISOString(), '2026-10-09T06:00:00.000Z');
});

test('getCountdown devuelve el estado "before" con la diferencia exacta', () => {
  const now = new Date('2026-10-07T07:30:00.000Z'); // 01:30 del 7 de octubre en CDMX
  const result = getCountdown(BIRTHDAY, now);

  assert.equal(result.state, 'before');
  assert.equal(result.days, 1);
  assert.equal(result.hours, 22);
  assert.equal(result.minutes, 30);
  assert.equal(result.seconds, 0);
});

test('getCountdown devuelve "today" durante el día del cumpleaños', () => {
  const morning = getCountdown(BIRTHDAY, new Date('2026-10-09T15:00:00.000Z'));
  const lateNight = getCountdown(BIRTHDAY, new Date('2026-10-10T04:59:00.000Z'));

  assert.equal(morning.state, 'today');
  assert.equal(lateNight.state, 'today'); // 22:59 del 9 de octubre en CDMX
});

test('getCountdown devuelve "after" cuando la fecha ya pasó', () => {
  const result = getCountdown(BIRTHDAY, new Date('2026-10-10T06:01:00.000Z'));
  assert.equal(result.state, 'after');
});

test('getCountdown cruza correctamente el cambio de día en la zona horaria configurada', () => {
  // 05:59 UTC = 23:59 del 8 de octubre en Ciudad de México → aún antes
  const before = getCountdown(BIRTHDAY, new Date('2026-10-09T05:59:00.000Z'));
  // 06:01 UTC = 00:01 del 9 de octubre en Ciudad de México → hoy
  const today = getCountdown(BIRTHDAY, new Date('2026-10-09T06:01:00.000Z'));

  assert.equal(before.state, 'before');
  assert.equal(today.state, 'today');
});

test('getTimeZoneOffsetMs refleja el horario de verano cuando aplica', () => {
  const winter = getTimeZoneOffsetMs(Date.UTC(2026, 0, 15, 12), 'America/New_York');
  const summer = getTimeZoneOffsetMs(Date.UTC(2026, 6, 15, 12), 'America/New_York');

  assert.equal(winter, -5 * 3600_000);
  assert.equal(summer, -4 * 3600_000);
});

test('getWallTimeParts traduce un instante UTC a la zona horaria local', () => {
  const parts = getWallTimeParts(new Date('2026-10-09T06:00:00.000Z'), 'America/Mexico_City');
  assert.deepEqual(parts, { year: 2026, month: 10, day: 9, hour: 0, minute: 0, second: 0 });
});

test('formatCountdownText sustituye todos los marcadores', () => {
  const text = formatCountdownText('Faltan {days} días {hours} horas {minutes} minutos y {seconds} segundos.', {
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5
  });
  assert.equal(text, 'Faltan 2 días 3 horas 4 minutos y 5 segundos.');
});

test('pad rellena con ceros', () => {
  assert.equal(pad(7), '07');
  assert.equal(pad(12), '12');
  assert.equal(pad(0), '00');
});
