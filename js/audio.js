// Stub: toggles + persistence only. WebAudio music/SFX come in a later stage.
import * as save from './save.js';

let ctx = null;

// Create/resume the AudioContext on the first user tap (iOS autoplay rule).
export function unlock() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {}
}

export const soundOn = () => save.get().sound;
export const musicOn = () => save.get().music;

export function initToggles() {
  const sound = document.getElementById('btn-sound');
  const music = document.getElementById('btn-music');
  const sync = () => {
    sound.classList.toggle('off', !soundOn());
    music.classList.toggle('off', !musicOn());
  };
  sound.addEventListener('click', () => { unlock(); save.set({ sound: !soundOn() }); sync(); });
  music.addEventListener('click', () => { unlock(); save.set({ music: !musicOn() }); sync(); });
  sync();
}
