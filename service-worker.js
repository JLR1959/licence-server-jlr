/* ======================================================
MODULE 01
CONFIG VERSION CACHE
====================================================== */

const CACHE_NAME = "vpi-cache-v2";

/* fichiers à cacher (adapté à ton projet réel) */
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/licenceManager.js",
  "/manifest.json",
  "/logo_jlr.png"
];

/* ======================================================
MODULE 02
INSTALLATION
====================================================== */

self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();

});

/* ======================================================
MODULE 03
ACTIVATION (NETTOYAGE)
====================================================== */

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );

  self.clients.claim();

});

/* ======================================================
MODULE 04
FETCH (STRATÉGIE INTELLIGENTE)
====================================================== */

self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  /* ======================================================
  NE JAMAIS CACHER API / SERVEUR RENDER
  ====================================================== */
  if (url.hostname.includes("onrender.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* ======================================================
  NE PAS CACHER REQUÊTES NON-GET
  ====================================================== */
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  /* ======================================================
  STRATÉGIE : CACHE FIRST + UPDATE
  ====================================================== */
  event.respondWith(

    caches.match(event.request).then(cachedResponse => {

      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(networkResponse => {

          /* sécuriser cache uniquement si OK */
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });

          return networkResponse;

        })
        .catch(() => {

          /* fallback offline */
          return new Response("Mode hors ligne", {
            status: 503,
            statusText: "Offline"
          });

        });

    })

  );

});
