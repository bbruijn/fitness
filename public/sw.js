// Offline support. On install the worker reads index.html, finds the hashed bundles it points to
// (and the fonts those reference) and caches them, so the app works offline after the first visit.
// Afterwards: the app shell is fetched network-first (so updates arrive), hashed assets cache-first.
const CACHE = 'volt-v1'
const STATIC = ['./', './manifest.webmanifest', './img/dumbbell.webp', './img/trophy.webp', './apple-touch-icon.png']

async function precache() {
  const cache = await caches.open(CACHE)
  await cache.addAll(STATIC)
  const html = await (await fetch('./', { cache: 'no-store' })).text()
  const assets = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1])
  await Promise.all(
    assets.map(async (path) => {
      const res = await fetch(path)
      if (!res.ok) return
      await cache.put(path, res.clone())
      if (!path.endsWith('.css')) return
      // Fonts are only referenced from the stylesheet.
      const css = await res.text()
      const fonts = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map((m) => new URL(m[1].replace(/["']/g, ''), res.url).href)
      await Promise.all(fonts.map((f) => cache.add(f).catch(() => {})))
    }),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return

  // Static files are identical for every requester, so a `Vary: Origin` from the host must not cause a miss.
  const cached = (key) => caches.match(key, { ignoreVary: true })

  const keep = (res) => {
    if (res.ok) {
      // Clone now: once the page starts reading the body it can no longer be copied.
      const copy = res.clone()
      event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)))
    }
    return res
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(cached(req).then((hit) => hit || fetch(req).then(keep)))
    return
  }
  event.respondWith(
    fetch(req)
      .then(keep)
      .catch(() => cached(req).then((hit) => hit || cached('./'))),
  )
})
