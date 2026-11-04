const CACHE_NAME = 'finonest-pwa-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/login',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
  '/logo96.png',
  '/logo192.png',
  '/logo512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Skip caching for API requests entirely so dynamic data is always fresh from the network
  if (
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.pathname.includes('/api/')
  ) {
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // Skip caching for Vite HMR, dev server assets, and JS/CSS modules so hot reload works
  if (
    requestUrl.pathname.startsWith('/@') ||
    requestUrl.pathname.startsWith('/node_modules') ||
    requestUrl.search.includes('t=') ||
    requestUrl.pathname.endsWith('.tsx') ||
    requestUrl.pathname.endsWith('.ts') ||
    requestUrl.pathname.endsWith('.jsx') ||
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css')
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
