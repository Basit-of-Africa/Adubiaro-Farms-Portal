const CACHE_NAME = 'adubiaro-estate-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.jpg',
  '/manifest.json'
];

// Install Event - Pre-cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ [Service Worker] Pre-caching app shell assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('⚡ [Service Worker] Removing stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Intercept requests with a cache-first or network-first fallback
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Bypass API endpoints, uploads, Cloudinary media and non-GET requests to ensure real-time accuracy
  if (
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.startsWith('/uploads/') ||
    requestUrl.href.includes('cloudinary.com')
  ) {
    return; // Let the browser handle standard network fetching
  }

  // 2. Serve static resources with Stale-While-Revalidate caching strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch the latest copy in the background to update the cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silently ignore background refresh network errors
          });
        return cachedResponse;
      }

      // If asset is not in cache, fetch it from network and cache it
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline Fallback for html pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/');
        }
      });
    })
  );
});
