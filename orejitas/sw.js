// Orejitas · service worker: guarda la app para que funcione sin conexión.
// Estrategia: primero red (siempre la última versión si hay conexión) y,
// si falla, la copia guardada. La lista se regenera con tools/precache.mjs.

const VERSION = '28488a2764';
const CACHE = `orejitas-${VERSION}`;
const ASSETS = [
  './',
  'app.js',
  'catalog.js',
  'engine.js',
  'fonts/fredoka-latin.woff2',
  'i18n.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon.svg',
  'instruments.js',
  'levels.js',
  'manifest.webmanifest',
  'sounds/_ambient.js',
  'sounds/_animals.js',
  'sounds/_machines.js',
  'sounds/_musical.js',
  'sounds/farm.js',
  'sounds/home.js',
  'sounds/lullabies.js',
  'sounds/music.js',
  'sounds/nature.js',
  'sounds/sleep.js',
  'sounds/toys.js',
  'sounds/transport.js',
  'sounds/wild.js',
  'styles.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('orejitas-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./'))),
  );
});
