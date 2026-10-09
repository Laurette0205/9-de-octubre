/**
 * Lógica de fecha y cuenta regresiva — pura y sin dependencias del DOM.
 * Pensada para funcionar igual en navegador y en Node (tests).
 */

/**
 * Convierte el desfase horario de una zona horaria en milisegundos
 * para un instante UTC concreto.
 * @param {number} utcMs
 * @param {string} timeZone
 * @returns {number}
 */
export function getTimeZoneOffsetMs(utcMs, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = {};
  for (const part of formatter.formatToParts(new Date(utcMs))) {
    parts[part.type] = part.value;
  }

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );

  return asUtc - utcMs;
}

/**
 * Obtiene el instante UTC de una fecha-hora "de pared" en una zona horaria.
 * @param {{year:number, month:number, day:number, hour?:number, minute?:number}} wall
 * @param {string} timeZone
 * @returns {Date}
 */
export function zonedWallTimeToDate(wall, timeZone) {
  const naive = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour ?? 0,
    wall.minute ?? 0,
    0
  );
  let offset = getTimeZoneOffsetMs(naive, timeZone);
  let instant = naive - offset;
  offset = getTimeZoneOffsetMs(instant, timeZone);
  instant = naive - offset;
  return new Date(instant);
}

/**
 * Parsea "YYYY-MM-DD" sin correr el riesgo de desfase por zona horaria.
 * @param {string} isoDate
 * @returns {{year:number, month:number, day:number}}
 */
export function parseIsoDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate).trim());
  if (!match) {
    throw new Error(`Fecha inválida (se esperaba YYYY-MM-DD): ${isoDate}`);
  }
  const [, year, month, day] = match.map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Fecha fuera de rango: ${isoDate}`);
  }
  return { year, month, day };
}

/**
 * Parsea "HH:MM".
 * @param {string} time
 * @returns {{hour:number, minute:number}}
 */
export function parseTime(time) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(time ?? '00:00').trim());
  if (!match) {
    return { hour: 0, minute: 0 };
  }
  const hour = Math.min(23, Number(match[1]));
  const minute = Math.min(59, Number(match[2]));
  return { hour, minute };
}

/**
 * Devuelve la fecha-hora objetivo del cumpleaños como instante UTC.
 * @param {{date:string, time?:string, timezone?:string}} birthday
 * @returns {Date}
 */
export function getBirthdayInstant(birthday) {
  const { year, month, day } = parseIsoDate(birthday.date);
  const { hour, minute } = parseTime(birthday.time);
  const timeZone = birthday.timezone || 'UTC';
  return zonedWallTimeToDate({ year, month, day, hour, minute }, timeZone);
}

/**
 * Componentes "de pared" de un instante en una zona horaria concreta.
 * @param {Date} date
 * @param {string} timeZone
 * @returns {{year:number, month:number, day:number, hour:number, minute:number, second:number}}
 */
export function getWallTimeParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const parts = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

/**
 * Calcula el estado y el desfase hasta el cumpleaños.
 * @param {{date:string, time?:string, timezone?:string}} birthday
 * @param {Date} [now]
 * @returns {{state:'before'|'today'|'after', days:number, hours:number, minutes:number, seconds:number, totalMs:number}}
 */
export function getCountdown(birthday, now = new Date()) {
  const timeZone = birthday.timezone || 'UTC';
  const target = getBirthdayInstant(birthday);
  const current = getWallTimeParts(now, timeZone);
  const targetWall = parseIsoDate(birthday.date);

  const isSameDay =
    current.year === targetWall.year &&
    current.month === targetWall.month &&
    current.day === targetWall.day;

  const totalMs = Math.max(0, target.getTime() - now.getTime());

  if (isSameDay) {
    return { state: 'today', days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
  }

  if (now.getTime() < target.getTime()) {
    const totalSeconds = Math.floor(totalMs / 1000);
    return {
      state: 'before',
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      totalMs
    };
  }

  return { state: 'after', days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
}

/**
 * Sustituye los marcadores {days}, {hours}, {minutes}, {seconds}.
 * @param {string} template
 * @param {{days:number, hours:number, minutes:number, seconds:number}} values
 * @returns {string}
 */
export function formatCountdownText(template, values) {
  return String(template)
    .replace('{days}', String(values.days))
    .replace('{hours}', String(values.hours))
    .replace('{minutes}', String(values.minutes))
    .replace('{seconds}', String(values.seconds));
}

/**
 * Rellena con ceros a la izquierda.
 * @param {number} value
 * @returns {string}
 */
export function pad(value) {
  return String(value).padStart(2, '0');
}
