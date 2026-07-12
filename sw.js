/**
 * Matimand Nivasi Vidyalay - Service Worker
 * Cache-first with auto-update
 */

var CACHE_NAME = 'mnv-pwa-v2.1.0';
var ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  'https://raw.githubusercontent.com/byteharvester/BeedSchoolApp/main/logo.png'
];

// Install
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(ASSETS);
      })
      .catch(function(err) {
        console.error('Cache error:', err);
      })
  );
});

// Activate
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

// Fetch
self.addEventListener('fetch', function(event) {
  var request = event.request;
  
  // Skip Google Apps Script
  if (request.url.includes('script.google.com')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(function() {
          return caches.match('/index.html');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(function(cached) {
        if (cached) {
          // Update in background
          fetch(request).then(function(response) {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(request, response);
              });
            }
          }).catch(function() {});
          return cached;
        }
        return fetch(request);
      })
      .catch(function() {
        if (request.destination === 'image') {
          return new Response('', { status: 404 });
        }
        return new Response('Offline', { status: 503 });
      })
  );
});
