// Service Worker: macht die App offline nutzbar.
// Bei Änderungen an der App die Versionsnummer erhöhen, dann holen sich alle Geräte die neuen Dateien.
const CACHE = 'essensplaner-v2';

const ASSETS = [
  './',
  'index.html',
  'style.css',
  'script.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // Einzeln laden: fehlt eine Datei (z. B. ein Icon), werden die anderen trotzdem gespeichert.
      Promise.all(ASSETS.map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Aus dem Cache sofort anzeigen, im Hintergrund aktualisieren.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);

      if (cached) return cached;
      const fresh = await network;
      if (fresh) return fresh;
      if (request.mode === 'navigate') return cache.match('index.html');
      return Response.error();
    })
  );
});
