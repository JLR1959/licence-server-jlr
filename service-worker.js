/* ======================================================
MODULE 01
CONFIG VERSION CACHE
====================================================== */

const CACHE_NAME = "vpi-cache-v1";

/* fichiers à cacher */
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css"
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
FETCH (STRATÉGIE PROPRE)
====================================================== */

self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  /* 🔥 NE JAMAIS CACHER LE SERVEUR LICENCE */
  if (url.hostname.includes("onrender.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* 🔥 NE PAS CACHER configClient.js */
  if (url.pathname.includes("configClient.js")) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* stratégie cache + fallback réseau */
  event.respondWith(

    caches.match(event.request).then(response => {

      if (response) {
        return response;
      }

      return fetch(event.request)
        .then(networkResponse => {

          /* ne pas cacher les requêtes API */
          if (event.request.method !== "GET") {
            return networkResponse;
          }

          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });

        })
        .catch(() => {
          return new Response("Offline", {
            status: 503,
            statusText: "Offline"
          });
        });

    })

  );

});
