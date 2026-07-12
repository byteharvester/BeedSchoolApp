/**
 * Matimand Nivasi Vidyalay - Service Worker
 * Cache-first with auto-update
 */

const CACHE_NAME = 'mnv-pwa-v2.0.0';
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  'https://raw.githubusercontent.com/byteharvester/BeedSchoolApp/main/logo.png'
];

// Install - Cache assets
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(ASSETS);
      })
      .catch(function(err) {
        console.error('Cache install error:', err);
      })
  );
});

// Activate - Clean old caches
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

// Fetch - Cache-first strategy
self.addEventListener('fetch', function(event) {
  var request = event.request;
  
  // Skip Google Apps Script
  if (request.url.includes('script.google.com')) {
    return;
  }

  // Handle navigation requests (for SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function(response) {
          // Cache the new version
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

  // Static assets - Cache first
  event.respondWith(
    caches.match(request)
      .then(function(cached) {
        if (cached) {
          // Return cached, but update in background
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
        // Fallback
        if (request.destination === 'image') {
          return new Response('', { status: 404, statusText: 'Not Found' });
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
  );
});

// Message listener for update check
self.addEventListener('message', function(event) {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
