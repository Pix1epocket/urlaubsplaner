const APP_CACHE = 'urlaubsplaner-app-v3';
const TILE_CACHE = 'urlaubsplaner-tiles-v1';
const MAX_TILES = 3000;

const APP_FILES = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/app.css',
    './js/app.js',
    './js/dates.js',
    './js/forms.js',
    './js/links.js',
    './js/routing.js',
    './js/sample-data.js',
    './js/store.js',
    './js/theme.js',
    './js/ui.js',
    './js/weather.js',
    './js/views/days.js',
    './js/views/map.js',
    './js/views/settings.js',
    './js/views/trips.js',
    './js/views/weather.js',
    './vendor/leaflet/leaflet.css',
    './vendor/leaflet/leaflet.js',
    './vendor/leaflet/images/layers.png',
    './vendor/leaflet/images/layers-2x.png',
    './vendor/leaflet/images/marker-icon.png',
    './vendor/leaflet/images/marker-icon-2x.png',
    './vendor/leaflet/images/marker-shadow.png',
    './icons/icon.svg',
    './icons/apple-touch-icon.png',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then((cache) => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    const keep = [APP_CACHE, TILE_CACHE];
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

async function trimTiles() {
    const cache = await caches.open(TILE_CACHE);
    const keys = await cache.keys();
    const excess = keys.length - MAX_TILES;
    for (let i = 0; i < excess; i++) {
        await cache.delete(keys[i]);
    }
}

async function tileFirst(request) {
    const cache = await caches.open(TILE_CACHE);
    const cached = await cache.match(request);
    if (cached) {
        return cached;
    }
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
        await cache.put(request, response.clone());
        trimTiles();
    }
    return response;
}

function fetchWithTimeout(request, ms) {
    return Promise.race([
        fetch(request, { cache: 'no-cache' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
}

// Network first keeps the app up to date; the cache is the offline fallback.
// The timeout keeps the app usable on very slow mobile connections.
async function appNetworkFirst(request) {
    const cache = await caches.open(APP_CACHE);
    try {
        const response = await fetchWithTimeout(request, 4000);
        if (response.ok) {
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) {
            return cached;
        }
        if (request.mode === 'navigate') {
            return cache.match('./index.html');
        }
        throw error;
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    if (url.hostname === 'tile.openstreetmap.org') {
        event.respondWith(tileFirst(request));
        return;
    }
    if (url.origin === self.location.origin) {
        event.respondWith(appNetworkFirst(request));
    }
});
