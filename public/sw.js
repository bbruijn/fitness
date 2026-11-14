// Offline support: the app shell is fetched network-first (so updates arrive), hashed assets cache-first.
const CACHE = 'volt-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(['./', './manifest.webmanifest', './img/dumbbell.webp', './img/trophy.webp']))
      .then(() => self.skipWaiting()),
  )
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

  const put = (res) => {
    if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
    return res
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(put)))
    return
  }
  event.respondWith(
    fetch(req)
      .then(put)
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./'))),
  )
})
