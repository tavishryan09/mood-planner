const CACHE_NAME = 'new-mood-v1';
const STATIC_CACHE = 'new-mood-static-v1';
const DYNAMIC_CACHE = 'new-mood-dynamic-v1';

// Install event - skip precaching to avoid auth issues
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
            console.log('Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip non-GET requests (let them pass through normally)
  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();

        // Don't cache API requests or non-successful responses
        if (
          !request.url.includes('/api/') &&
          response.status === 200
        ) {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Network request failed, try cache
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }

          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/');
          }

          return new Response('Offline - No cached version available', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});
