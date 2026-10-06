// 電波の無いところ（機内など）でも開けるように、ファイル一式を端末にしまっておく。
// 更新を出すときは VERSION を上げる（上げないと古いファイルが出続ける）。
const VERSION = "kayoicho-2026-10-06-4";
const FILES = [
  "./", "index.html", "app.js", "style.css", "manifest.webmanifest",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
  "lib/airports.js", "lib/backup.js", "lib/bcbp.js", "lib/calc.js", "lib/card.js", "lib/domestic.js",
  "lib/geo.js", "lib/intl.js", "lib/log.js", "lib/photos.js", "lib/plan.js", "lib/rating.js",
  "lib/rules.js", "lib/signpad.js",
  "vendor/zxing-reader.js", "vendor/zxing_reader.wasm",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// しまってあるものを先に出す（電波が無くても開ける）。無いものだけ取りに行く。
self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  ev.respondWith(
    caches.match(ev.request, { ignoreSearch: true }).then((hit) => hit || fetch(ev.request))
  );
});
