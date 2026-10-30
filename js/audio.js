// WebAudio only: one shared context, a synthesized sound-effect set, and the music track routed through the same graph
// (the only audio file; it can't be synthesized). SFX and music toggles are separate and persisted via save.js.
import * as save from './save.js';

const MUSIC_SRC = './audio/drive-thru-music.mp3';
const SIZZLE_SRC = './audio/sizzle.mp3', SIZZLE_VOL = .35; // quiet background cooking loop
let sizzleBuf = null;
const TRASH_SRC = './audio/trash.mp3', TRASH_VOL = .8;
let trashBuf = null, trashOnset = 0; // trashOnset: seconds of leading silence to skip
const MUSIC_VOL = .55, DUCK_VOL = .25, MAX_VOICES = 10, MAX_LOOPS = 4;
const GAP = { walk: 260, tick: 400, tap: 30 }; // minimum ms between plays of the same effect (default 25)

let ctx = null, sfxBus = null, musicBus = null, music = null, noiseBuf = null;
let tapped = false, hidden = typeof document !== 'undefined' && document.hidden, gamePaused = false, ducked = false;
let voices = 0, musicStopT = 0;
const loops = new Map(); // id -> { stop() }
const lastAt = {};

export const soundOn = () => save.get().sound;
export const musicOn = () => save.get().music;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); // keeps stacked effects from clipping
    comp.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = soundOn() ? .9 : 0;
    sfxBus.connect(comp);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(comp);
    music = new Audio(MUSIC_SRC);
    music.loop = true;
    music.preload = 'none';
    try { ctx.createMediaElementSource(music).connect(musicBus); } catch (e) { music.volume = MUSIC_VOL; musicBus.gain.value = 1; }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Decode the cooking recording; until it's ready (or if it fails) the synthesized sizzle plays.
    fetch(SIZZLE_SRC).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { sizzleBuf = buf; }).catch(() => {});
    fetch(TRASH_SRC).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => {
      // Find the first audible sample so the sound starts the instant it's played.
      let first = buf.length;
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < first; i++) if (Math.abs(d[i]) > .01) { first = i; break; }
      }
      trashOnset = Math.max(0, first / buf.sampleRate - .003);
      trashBuf = buf;
    }).catch(() => {});
  } catch (e) { ctx = null; }
  return ctx;
}

const stopped = () => hidden || gamePaused;

function syncMusic() {
  if (!ctx || !music) return;
  const want = tapped && musicOn() && !stopped();
  clearTimeout(musicStopT);
  if (want) {
    music.play().catch(() => {});
    musicBus.gain.setTargetAtTime(ducked ? DUCK_VOL : MUSIC_VOL, ctx.currentTime, .15);
  } else {
    // Fade out, then pause, so toggling off never clicks.
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, .05);
    musicStopT = setTimeout(() => music.pause(), 200);
  }
}

// Suspend everything while hidden or the game is paused; resume (no duplicate loops: they're keyed) afterwards.
function apply() {
  if (!ctx) return;
  if (stopped()) {
    music.pause();
    ctx.suspend().catch(() => {});
  } else {
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    syncMusic(); // play() right here so it still counts as part of the tap (iOS)
  }
}

// Called on every tap: creates the context on the first one (iOS autoplay rule) and wakes it if iOS suspended or interrupted it.
export function unlock() {
  if (!ensure()) return;
  tapped = true;
  if (ctx.state === 'running' && (music.paused ? !musicOn() : true)) return;
  apply();
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; apply(); });
}

export function setGamePaused(on) {
  gamePaused = on;
  apply();
}

// Music tempo (endless mode speeds up in later waves); 1 = normal.
export function setMusicRate(r) {
  if (music) music.playbackRate = r;
}

// Lower the music a little (Results screen).
export function duckMusic(on) {
  ducked = on;
  if (ctx && music && !music.paused) musicBus.gain.setTargetAtTime(on ? DUCK_VOL : MUSIC_VOL, ctx.currentTime, .2);
}

// ---- sound effects ----
function env(g, t, vol, dur, delay = 0) {
  g.gain.setValueAtTime(.0001, t + delay);
  g.gain.linearRampToValueAtTime(vol, t + delay + .005);
  g.gain.exponentialRampToValueAtTime(.0001, t + delay + dur);
}

function tone(f0, f1, dur, type, vol, delay = 0) {
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t + delay);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur);
  env(g, t, vol, dur, delay);
  o.connect(g).connect(sfxBus);
  o.start(t + delay);
  o.stop(t + delay + dur + .02);
}

function noise(dur, filter, freq, vol, delay = 0) {
  const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf;
  f.type = filter;
  f.frequency.value = freq;
  env(g, t, vol, dur, delay);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t + delay, Math.random() * .5);
  s.stop(t + delay + dur + .02);
}

const SFX = {
  tap: () => tone(700, 420, .05, 'triangle', .25),
  start: () => tone(300, 640, .12, 'square', .1),
  walk: () => noise(.06, 'lowpass', 300, .22),
  ready: () => { tone(880, 880, .4, 'sine', .3); tone(1320, 1320, .4, 'sine', .18, .08); },
  pickup: () => tone(420, 820, .08, 'sine', .3),
  place: () => tone(520, 300, .09, 'sine', .28),
  deliver: () => { tone(500, 900, .07, 'sine', .3); tone(900, 1300, .06, 'sine', .2, .06); },
  trash: () => {
    if (!trashBuf) { noise(.2, 'lowpass', 1200, .3); tone(260, 90, .18, 'triangle', .15); return; }
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = trashBuf;
    g.gain.value = TRASH_VOL;
    s.connect(g).connect(sfxBus);
    s.start(0, trashOnset);
  },
  burn: () => { tone(150, 80, .3, 'sawtooth', .22); noise(.25, 'highpass', 2500, .1); },
  cash: () => { tone(1568, 1568, .1, 'square', .1); tone(2093, 2093, .1, 'square', .1, .08); tone(2637, 2637, .35, 'square', .1, .16); },
  angry: () => { tone(330, 300, .3, 'square', .16); tone(392, 350, .3, 'square', .12); },
  tick: () => tone(1100, 1100, .03, 'square', .12),
  heartBreak: () => { noise(.08, 'highpass', 3000, .2); tone(520, 180, .35, 'sawtooth', .16); tone(260, 90, .4, 'triangle', .14, .08); },
  waveUp: () => [523, 659, 880].forEach((f, i) => tone(f, f * 1.02, .14, 'triangle', .26, i * .08)),
  levelPass: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .28, 'triangle', .28, i * .13));
    [523, 659, 784].forEach(f => tone(f, f, .7, 'triangle', .14, .55));
  },
  levelFail: () => { tone(392, 330, .4, 'sawtooth', .13); tone(330, 247, .6, 'sawtooth', .13, .35); tone(262, 196, .8, 'triangle', .16, .7); }
};

export function playSfx(name) {
  if (!soundOn() || !ctx || !tapped || ctx.state !== 'running' || stopped() || !SFX[name]) return;
  const now = performance.now();
  if (now - (lastAt[name] || 0) < (GAP[name] || 25) || voices >= MAX_VOICES) return;
  lastAt[name] = now;
  voices++;
  setTimeout(() => { voices--; }, 900);
  try { SFX[name](); } catch (e) {}
}

// ---- loops while a station is working: kind 'fill' (bubbling) or 'sizzle'; null stops it ----
function startLoop(kind) {
  const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
  s.buffer = kind === 'sizzle' && sizzleBuf ? sizzleBuf : noiseBuf; // a source's buffer can only be set once
  s.loop = true;
  lfo.connect(depth);
  if (kind === 'sizzle' && sizzleBuf) {
    g.gain.value = .0001; g.gain.linearRampToValueAtTime(SIZZLE_VOL, t + .3);
  } else if (kind === 'fill') {
    f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 4;
    lfo.frequency.value = 5; depth.gain.value = 350; depth.connect(f.frequency);
    g.gain.value = .0001; g.gain.linearRampToValueAtTime(.16, t + .1);
  } else {
    f.type = 'highpass'; f.frequency.value = 3500;
    lfo.type = 'square'; lfo.frequency.value = 13; depth.gain.value = .05; depth.connect(g.gain);
    g.gain.value = .0001; g.gain.linearRampToValueAtTime(.07, t + .1);
  }
  const rec = kind === 'sizzle' && sizzleBuf;
  (rec ? s.connect(g) : s.connect(f).connect(g)).connect(sfxBus);
  if (rec) s.start(t, Math.random() * sizzleBuf.duration);
  else s.start(t);
  lfo.start(t);
  return {
    stop() {
      const e = ctx.currentTime;
      try {
        g.gain.cancelScheduledValues(e);
        g.gain.setTargetAtTime(0, e, .04);
        s.stop(e + .25);
        lfo.stop(e + .25);
      } catch (err) {}
    }
  };
}

export function setLoop(id, kind) {
  const cur = loops.get(id);
  if (!kind || !ctx || !tapped || !soundOn()) {
    if (cur) { cur.stop(); loops.delete(id); }
    return;
  }
  if (cur && cur.kind === kind) return;
  if (cur) { cur.stop(); loops.delete(id); }
  if (loops.size >= MAX_LOOPS) return;
  try {
    const l = startLoop(kind);
    l.kind = kind;
    loops.set(id, l);
  } catch (e) {} // a sound problem must never stop the game
}

export function stopLoops() {
  loops.forEach(l => l.stop());
  loops.clear();
}

export function initToggles() {
  const sound = document.getElementById('btn-sound');
  const music = document.getElementById('btn-music');
  const sync = () => {
    sound.classList.toggle('off', !soundOn());
    music.classList.toggle('off', !musicOn());
  };
  sound.addEventListener('click', () => {
    unlock();
    save.set({ sound: !soundOn() });
    if (sfxBus) sfxBus.gain.value = soundOn() ? .9 : 0;
    if (!soundOn()) stopLoops();
    sync();
  });
  music.addEventListener('click', () => {
    unlock();
    save.set({ music: !musicOn() });
    syncMusic();
    sync();
  });
  sync();
}
