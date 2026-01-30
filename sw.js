const CACHE_NAME = 'lightbeam-v1-secure';

// We cache all local assets AND the specific CDN versions we used.
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './sender.html',
    './receiver.html',
    './css/style.css',
    './js/app-sender.js',
    './js/app-receiver.js',
    './manifest.json',
    './favicon.svg',
    // External Libraries (Cached for offline usage)
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
];

// 1. INSTALL: Cache everything
self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installing...');
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Caching all files');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Activate immediately
});

// 2. ACTIVATE: Cleanup old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// 3. FETCH: Serve from Cache, fall back to Network
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
