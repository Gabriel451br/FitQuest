// Service worker: rede primeiro (versão sempre atual) com cache para uso offline.
const VERSION = 'fitquest-v2.8.0';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/style.css', './icons/icon.svg',
  './vendor/preact.js', './vendor/preact-hooks.js', './vendor/htm.js', './vendor/supabase.js', './js/config.js', './js/cloud.js', './js/views/auth.js',
  './js/app.js', './js/lib.js', './js/nav.js', './js/store.js', './js/selectors.js', './js/calc.js',
  './js/util.js', './js/foods.js', './js/game.js', './js/training.js', './js/dietgen.js',
  './js/photos.js', './js/cardio.js', './js/views/cardio.js', './js/ui.js', './js/charts.js', './js/actions.js', './js/sound.js', './js/views/scanner.js', './js/barcode.js', './js/gps.js', './js/gpslive.js', './js/plans.js', './js/livecoach.js', './js/data/menus.js', './js/social.js', './js/views/social.js',
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
    // Rede primeiro (sempre a versão mais nova quando há internet); sem rede, usa o cache.
    // Timeout curto para não travar em conexão ruim.
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const key = e.request.mode === 'navigate' ? './index.html' : e.request;
        try {
          const r = await Promise.race([
            fetch(e.request, { cache: 'no-cache' }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
          ]);
          if (r.ok) c.put(key, r.clone());
          return r;
        } catch {
          const hit = await c.match(key);
          if (hit) return hit;
          throw new Error('offline sem cache');
        }
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
