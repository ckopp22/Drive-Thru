import * as audio from './audio.js';
import { go } from './screens.js';

// Block pinch / multi-touch zoom and iOS gesture events.
['gesturestart', 'gesturechange', 'gestureend'].forEach(t =>
  document.addEventListener(t, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// First tap anywhere unlocks audio (iOS).
document.addEventListener('pointerdown', audio.unlock);

audio.initToggles();
go('menu');

if ('serviceWorker' in navigator) {
  let updating = false;
  // A new version is installed and waiting: offer a banner; tapping it activates it and reloads.
  const offerUpdate = worker => {
    if (document.querySelector('.update-banner')) return;
    const b = document.createElement('button');
    b.className = 'update-banner';
    b.textContent = '⬆️ Tap to Update';
    b.addEventListener('click', () => {
      updating = true;
      b.textContent = 'Updating…';
      worker.postMessage('skip');
    });
    document.body.appendChild(b);
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (updating) location.reload(); });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
        });
      });
      // The home-screen app rarely reloads, so look for a new version whenever it comes back to the foreground.
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    }).catch(() => {});
  });
}

function setFullH() {
  const standalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  if (!standalone) return;
  const portrait = window.innerHeight >= window.innerWidth;
  const h = Math.max(window.innerHeight, portrait ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height));
  document.documentElement.style.setProperty('--full-h', h + 'px');
}
setFullH();
window.addEventListener('resize', setFullH);
window.addEventListener('orientationchange', setFullH);
