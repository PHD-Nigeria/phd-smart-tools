/**
 * Springboard service worker
 * Cache-first strategy for the app shell and page art, so a colleague who
 * opened the issue once can keep flipping through it with no signal.
 *
 * NOTE: bump CACHE_VERSION whenever assets change (new edition, new pages,
 * generate_pages.py handles this automatically when you rerun the build).
 */
const CACHE_VERSION = "springboard-v1";
const TOTAL_PAGES = 18;

const CORE_ASSETS = [
  "./",
  "index.html",
  "css/style.css",
  "js/app.js",
  "js/pages-data.js",
  "manifest.json",
  "assets/favicon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
];

function pageAssets(){
  const list = [];
  for (let i=1;i<=TOTAL_PAGES;i++){
    const n = String(i).padStart(2,"0");
    list.push(`assets/pages/page-${n}.webp`);
    list.push(`assets/thumbs/page-${n}.webp`);
  }
  return list;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll([...CORE_ASSETS, ...pageAssets()]).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
    })
  );
});
