var CACHE_NAME = 'tv-senegal-v1';
var STATIC_ASSETS = [
  '/', '/index.html', '/channels.json', '/css/style.css', 
  '/js/i18n.js', '/js/remote.js', '/js/player.js', '/js/app.js', 
  '/locales/fr.json', '/locales/en.json', '/locales/it.json', '/locales/wo.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function(c) { return c.addAll(STATIC_ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.map(function(k) { if (k !== CACHE_NAME) return caches.delete(k); }));
  }));
  return self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.url.indexOf('/api/') !== -1 || e.request.url.indexOf('.m3u8') !== -1 || e.request.url.indexOf('.ts') !== -1) return;
  e.respondWith(caches.match(e.request).then(function(res) { return res || fetch(e.request); }));
});
