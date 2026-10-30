import * as audio from './audio.js';
import { go } from './screens.js';

// Block pinch / multi-touch zoom and iOS gesture events.
['gesturestart', 'gesturechange', 'gestureend'].forEach(t =>
  document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// First tap anywhere unlocks audio (iOS).
document.addEventListener('pointerdown', audio.unlock, { once: true });

audio.initToggles();
go('menu');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
