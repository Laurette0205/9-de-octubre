/**
 * Reproductor de música opcional (escena 08).
 * - Nunca reproduce sin una acción explícita del usuario.
 * - Carga el archivo sólo al primer intento de reproducción (rendimiento).
 * - Playlist configurable: anterior / siguiente, volumen e indicador de pista.
 * - Se oculta si el audio no existe o no puede reproducirse.
 * - Mantiene el estado ARIA correcto (aria-pressed) en el botón.
 */

import { qs, setText } from '../dom.js';

/**
 * @param {{config:object, announce?:(msg:string)=>void, onPlay?:()=>void}} options
 */
export function initMusicPlayer({ config, announce = () => {}, onPlay = () => {} }) {
  const settings = config.music || {};
  const player = qs('#music-player');
  const audio = qs('#audio-player');
  const toggle = qs('#music-toggle');
  const icon = qs('#music-icon');
  const label = qs('#music-label');
  const volume = qs('#music-volume');
  const stageButton = qs('#stage-music-btn');
  const prevButton = qs('#music-prev');
  const nextButton = qs('#music-next');
  const titleEl = qs('#music-title');
  const trackEl = qs('#music-track');

  if (!player || !audio || !toggle) return null;

  const tracks = (Array.isArray(settings.tracks) ? settings.tracks : []).filter((track) => track && track.src);

  const hide = () => {
    player.hidden = true;
    if (stageButton) stageButton.hidden = true;
    try {
      audio.pause();
      audio.removeAttribute('src');
    } catch {
      /* elemento ya destruido */
    }
    setPlaying(false);
  };

  if (settings.enabled === false || tracks.length === 0) {
    hide();
    return null;
  }

  audio.volume = 0.7;
  audio.preload = 'none';

  let index = 0;
  let sourceLoaded = false;

  const currentTrack = () => tracks[index];

  const ensureSource = () => {
    const track = currentTrack();
    if (sourceLoaded && audio.dataset.trackId === String(track.id ?? index)) return;
    audio.src = track.src;
    audio.loop = track.loop !== false && tracks.length === 1;
    audio.dataset.trackId = String(track.id ?? index);
    sourceLoaded = true;
  };

  const setPlaying = (playing) => {
    toggle.setAttribute('aria-pressed', String(playing));
    setText(icon, playing ? '⏸' : '▶');
    setText(label, playing ? 'Pausar' : 'Reproducir');
    if (stageButton) {
      const track = currentTrack();
      setText(stageButton, playing
        ? 'Pausar la música'
        : `Reproducir: ${track.title || settings.title || 'la banda sonora'}`);
    }
  };

  const renderTrackInfo = () => {
    const track = currentTrack();
    const trackTitle = track.title || settings.title || '';
    setText(titleEl, track.artist ? `${track.artist} — ${trackTitle}` : trackTitle);
    setText(trackEl, tracks.length > 1 ? `${index + 1} / ${tracks.length}` : '');
    const single = tracks.length <= 1;
    prevButton?.toggleAttribute('disabled', single);
    nextButton?.toggleAttribute('disabled', single);
    if (stageButton && track && track.title) {
      setText(stageButton, `Reproducir: ${track.title}`);
    }
  };

  const play = async () => {
    ensureSource();
    try {
      await audio.play();
      setPlaying(true);
      announce(`Reproduciendo ${currentTrack().title || 'la pista'}.`);
      onPlay();
    } catch {
      setPlaying(false);
      announce('No fue posible reproducir el audio.');
    }
  };

  const pause = () => {
    audio.pause();
    setPlaying(false);
    announce('Música en pausa.');
  };

  const togglePlayback = () => {
    if (audio.paused) play();
    else pause();
  };

  const goTo = (step, autoplay) => {
    if (tracks.length <= 1) return;
    index = (index + step + tracks.length) % tracks.length;
    sourceLoaded = false;
    renderTrackInfo();
    if (autoplay || !audio.paused) {
      audio.pause();
      play();
    } else {
      audio.removeAttribute('src');
      audio.load();
    }
  };

  player.hidden = false;
  if (stageButton) stageButton.hidden = false;
  renderTrackInfo();
  setPlaying(false);

  toggle.addEventListener('click', togglePlayback);
  stageButton?.addEventListener('click', togglePlayback);
  prevButton?.addEventListener('click', () => goTo(-1, true));
  nextButton?.addEventListener('click', () => goTo(1, true));

  volume?.addEventListener('input', () => {
    const value = Number(volume.value);
    audio.volume = Math.min(1, Math.max(0, value / 100));
  });

  audio.addEventListener('ended', () => {
    if (tracks.length > 1 && !currentTrack().loop) {
      goTo(1, true);
      return;
    }
    setPlaying(false);
  });

  audio.addEventListener('error', () => {
    if (!sourceLoaded) return;
    console.info(`[9oct] No se pudo cargar el audio: ${currentTrack().src}`);
    announce('La pista de audio no está disponible.');
    hide();
  });

  return { play, pause, next: () => goTo(1, true), prev: () => goTo(-1, true), element: audio };
}
