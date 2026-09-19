/* Play Count service worker — makes the app open with no signal.
   Bump CACHE when you change index.html so phones pick up the new version. */
var CACHE = "play-count-v5";
var SHELL = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(SHELL);
    }).catch(function () {})
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  var url = new URL(e.request.url);
  var sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    /* App shell: serve from cache first so it opens instantly and offline,
       but refresh the copy in the background when there is a connection. */
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        var live = fetch(e.request).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || live;
      })
    );
    return;
  }

  /* Fonts and anything else off-origin: use the network, fall back to a
     cached copy, and if neither works let it fail quietly — the app is
     built to degrade to system fonts. */
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res && (res.ok || res.type === "opaque")) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
