// Wochenblatt als Web-App: Ausgaben offline lesbar halten.
// Seiten: erst Netz (neue Ausgabe), sonst gespeicherte Fassung. Alles andere: gespeichert, im Hintergrund erneuert.
const CACHE = 'wochenblatt-v1';
const GRUND = ['./', 'index.html', 'archiv.json', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
const FREMD = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(GRUND)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  const eigen = url.origin === self.location.origin;
  if (!eigen && !FREMD.some((f) => r.url.startsWith(f))) return;

  // Ausgaben und Archivliste: neueste Fassung bevorzugen
  if (r.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('archiv.json')) {
    e.respondWith(
      fetch(r).then((antwort) => {
        if (antwort.ok) { const kopie = antwort.clone(); caches.open(CACHE).then((c) => c.put(r, kopie)); }
        return antwort;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match('index.html')))
    );
    return;
  }
  // Schriften, Symbole, Manifest: aus dem Speicher, im Hintergrund auffrischen
  e.respondWith(
    caches.match(r).then((m) => {
      const netz = fetch(r).then((antwort) => {
        if (antwort.ok || antwort.type === 'opaque') { const kopie = antwort.clone(); caches.open(CACHE).then((c) => c.put(r, kopie)); }
        return antwort;
      }).catch(() => m);
      return m || netz;
    })
  );
});
