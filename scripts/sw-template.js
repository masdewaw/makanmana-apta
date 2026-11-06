/* Generated during production build. No caching or replay of private API calls. */
const CACHE_PREFIX = 'makanmana-shell-';
const CACHE_NAME = CACHE_PREFIX + '__BUILD_VERSION__';
const PRECACHE = __PRECACHE_URLS__;
const ASSETS = new Set(PRECACHE);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
  // Updates stay waiting until the user explicitly chooses to apply them.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = (await caches.keys()).filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME);
    // Keep the previous shell's immutable assets for tabs still finishing work.
    await Promise.all(names.slice(0, -1).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && !/^\/(api|auth\/v1|rest\/v1|storage\/v1)(\/|$)/.test(url.pathname)) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => (await cache.match('/index.html')) || fetch(request)));
    return;
  }
  // Only exact build assets are eligible. Supabase, proof images, map tiles,
  // signed URLs, and arbitrary same-origin data are always network-only.
  if ((!ASSETS.has(url.pathname) && !url.pathname.startsWith('/assets/')) || url.search) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const current = await cache.match(url.pathname);
    if (current) return current;
    if (url.pathname.startsWith('/assets/')) {
      for (const name of await caches.keys()) {
        if (!name.startsWith(CACHE_PREFIX) || name === CACHE_NAME) continue;
        const previous = await (await caches.open(name)).match(url.pathname);
        if (previous) return previous;
      }
    }
    return fetch(request);
  })());
});
