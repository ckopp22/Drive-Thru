const CACHE = 'drive-thru-v52';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './lib/three.module.min.js',
  './js/main.js',
  './js/screens.js',
  './js/game.js',
  './js/scene.js',
  './js/orders.js',
  './js/audio.js',
  './js/save.js',
  './js/levels.js',
  './js/shops.js',
  './js/hospital.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
// Big file: cached after the core assets, and a failed download never blocks the install.
const MUSIC = './audio/drive-thru-music.mp3';
const SIZZLE = './audio/sizzle.mp3';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).then(() => c.add(MUSIC).then(() => c.add(SIZZLE)).catch(() => {}))));
});

// A new version waits until the player taps "Tap to Update" in the app.
self.addEventListener('message', e => {
  if (e.data === 'skip') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Audio elements ask for byte ranges (iOS needs real 206 replies), so serve slices of the cached full file.
async function rangeResponse(req) {
  const cache = await caches.open(CACHE);
  let full = await cache.match(req.url);
  if (!full) {
    full = await fetch(req.url);
    if (!full.ok) return full;
    await cache.put(req.url, full.clone());
  }
  const buf = await full.arrayBuffer(), size = buf.byteLength;
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  let start = m && m[1] ? +m[1] : 0, end = m && m[2] ? +m[2] : size - 1;
  if (m && !m[1] && m[2]) { start = size - +m[2]; end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' }
  });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.headers.has('range') && new URL(e.request.url).pathname.endsWith('.mp3')) {
    e.respondWith(rangeResponse(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
