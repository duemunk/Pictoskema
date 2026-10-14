// Offline support: network first, cached copy when offline. Query strings are ignored for
// the cache key. Plain ES2017 for iOS 12.
var CACHE = "pictoskema";
var NETWORK_TIMEOUT_IN_MS = 4000;
var FILES = ["./", "index.html", "app.js", "style.css", "sealed.json", "manifest.json", "icon-180.png"];

function keyFor(url) {
  var clean = new URL(url, self.location.href);
  clean.search = "";
  clean.hash = "";
  if (clean.pathname.slice(-1) === "/") clean.pathname += "index.html";
  return clean.href;
}

function fetchWithTimeout(url) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error("timeout")); }, NETWORK_TIMEOUT_IN_MS);
    fetch(url, { cache: "no-store" }).then(function (response) {
      clearTimeout(timer);
      resolve(response);
    }, function (error) {
      clearTimeout(timer);
      reject(error);
    });
  });
}

self.addEventListener("install", function (event) {
  var base = self.registration.scope;
  event.waitUntil(Promise.all(FILES.map(function (file) {
    return fetchWithTimeout(base + file).then(function (response) {
      if (!response.ok) return;
      return caches.open(CACHE).then(function (cache) { return cache.put(keyFor(base + file), response); });
    }).catch(function () {});
  })).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET" || request.url.indexOf(self.registration.scope) !== 0) return;
  var key = keyFor(request.url);
  event.respondWith(
    fetchWithTimeout(request.url).then(function (response) {
      if (response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(key, copy); });
        return response;
      }
      return caches.match(key).then(function (cached) { return cached || response; });
    }).catch(function () {
      return caches.match(key).then(function (cached) {
        if (cached) return cached;
        if (request.mode === "navigate") return caches.match(keyFor(self.registration.scope));
        return new Response("", { status: 504 });
      });
    })
  );
});
