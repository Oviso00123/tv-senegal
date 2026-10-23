/* Service Worker: cache dello "guscio" dell'app per uso offline e avvio rapido.
   Strategia: rete prima, cache come ripiego (così gli aggiornamenti arrivano subito). */
var CACHE_NAME = 'tv-senegal-v2';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/channels.json',
  '/css/style.css',
  '/js/i18n.js',
  '/js/remote.js',
  '/js/player.js',
  '/js/app.js',
  '/locales/fr.json',
  '/locales/en.json',
  '/locales/it.json',
  '/locales/wo.json',
  '/img/icon-192.png',
  '/img/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = req.url;

  // Solo GET della stessa origine; mai video, API o funzioni
  if (req.method !== 'GET') return;
  if (url.indexOf(self.location.origin) !== 0) return;
  if (url.indexOf('/api/') !== -1 || url.indexOf('.m3u8') !== -1 || url.indexOf('.ts') !== -1) return;

  event.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(req);
      })
  );
});
