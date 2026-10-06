// 電波の無いところ（機内など）でも開けるように、ファイル一式を端末にしまっておく。
// 電波があるときは必ず最新を取りに行き、取れたらしまい直す。取れないときだけ、しまってあるものを出す。
// （最初は「しまってあるものを先に出す」作りにしていて、更新がiPhoneに届かなかった。2026-10-06 CHIKA指摘）
// 更新を出すときは VERSION を上げる。
const VERSION = "kayoicho-2026-10-06-10";
const FILES = [
  "./", "index.html", "app.js", "style.css", "manifest.webmanifest",
  "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
  "lib/airports.js", "lib/backup.js", "lib/bcbp.js", "lib/calc.js", "lib/card.js", "lib/domestic.js",
  "lib/fleet.js", "lib/silhouette.js", "lib/geo.js", "lib/intl.js", "lib/log.js", "lib/mapview.js",
  "lib/visits.js", "lib/photos.js", "lib/plan.js", "lib/rating.js", "lib/rules.js", "lib/signpad.js",
  "vendor/zxing-reader.js", "vendor/zxing_reader.wasm",
];

self.addEventListener("install", (ev) => {
  // ブラウザが一時的に覚えている古いファイルを使わず、必ずサーバーから取り直してしまう
  ev.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 機内Wi-Fiのつながりかけ（ログイン画面に止められる等）で待たされないよう、4秒で見切る
function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    // ページそのもの（navigate）は Request に設定を足せないので、URLから作り直す
    const fresh = req.mode === "navigate" ? new Request(req.url, { cache: "no-cache", credentials: "same-origin" }) : new Request(req, { cache: "no-cache" });
    fetch(fresh).then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith((async () => {
    const cache = await caches.open(VERSION);
    try {
      const res = await fetchWithTimeout(req, 4000);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      throw new Error("offline");
    }
  })());
});
