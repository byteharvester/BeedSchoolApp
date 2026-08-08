var CACHE_NAME = 'smi-v3.1.0';
var ASSETS = [
  '/school-management-app/',
  '/school-management-app/index.html',
  '/school-management-app/styles.css',
  '/school-management-app/app.js',
  '/school-management-app/manifest.json',
  'https://raw.githubusercontent.com/byteharvester/BeedSchoolApp/main/logo.png'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cache) {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;
  
  // Never cache the Google Apps Script API calls
  if (request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(request).then(function(cached) {
      return cached || fetch(request);
    })
  );
});
