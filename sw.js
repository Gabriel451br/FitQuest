// Service worker: app shell offline (stale-while-revalidate).
const VERSION = 'fitquest-v2.3.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css', './icons/icon.svg',
  './vendor/preact.js', './vendor/preact-hooks.js', './vendor/htm.js', './vendor/supabase.js', './js/config.js', './js/cloud.js', './js/views/auth.js',
  './js/app.js', './js/lib.js', './js/nav.js', './js/store.js', './js/selectors.js', './js/calc.js',
  './js/util.js', './js/foods.js', './js/game.js', './js/training.js', './js/dietgen.js',
  './js/photos.js', './js/cardio.js', './js/views/cardio.js', './js/ui.js', './js/charts.js', './js/actions.js',
  './js/data/taco.js', './js/data/exercises.js',
  './js/views/onboarding.js', './js/views/today.js', './js/views/training.js', './js/views/diet.js',
  './js/views/body.js', './js/views/journey.js', './js/views/settings.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    // HTML: rede primeiro. Demais arquivos: cache imediato + atualização em segundo plano.
    if (e.request.mode === 'navigate') {
      e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
      return;
    }
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(e.request);
        const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }
  if (url.host.includes('fonts.googleapis.com') || url.host.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(e.request);
        const net = fetch(e.request).then((r) => { c.put(e.request, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      }),
    );
  }
});
