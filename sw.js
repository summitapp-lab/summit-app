// Summit · service worker: la app abre sin conexión. Los datos van siempre a Supabase.
const VERSION = 'summit-1.3.1';
const SHELL = [
  './', 'index.html', 'styles.css?v=1.3.1', 'app.js?v=1.3.1', 'config.js?v=1.3.1', 'supabase.min.js', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'logo.svg',
  'figtree-latin-400-normal.woff2', 'figtree-latin-500-normal.woff2', 'figtree-latin-600-normal.woff2', 'figtree-latin-700-normal.woff2',
  'bricolage-grotesque-latin-600-normal.woff2', 'bricolage-grotesque-latin-700-normal.woff2',
  'ibm-plex-mono-latin-400-normal.woff2', 'ibm-plex-mono-latin-500-normal.woff2',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Supabase: siempre red
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put('index.html', cp)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
    if (r.ok) { const cp = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); }
    return r;
  })));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((cs) => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
