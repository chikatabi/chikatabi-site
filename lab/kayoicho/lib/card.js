// 思い出の1枚（写真＋便名・区間・日付・地図）を canvas に描く。
// 地図のデータ（lib/geo.js、約270KB）は重いので、描くときに初めて読み込む。
import { airportName } from "./airports.js";

export const CARD_W = 1080, CARD_H = 1440;
let geoPromise = null;
const loadGeo = () => (geoPromise ||= import("./geo.js").then((m) => m.GEO));

const SANS = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", system-ui, sans-serif';
const LATIN = '"Avenir Next", "Avenir", "Helvetica Neue", system-ui, sans-serif';
const BLUE = "#4FA3FF", SHU = "#E8553F";

// 写真が無いときの空（夕暮れのグラデーション）
function drawSky(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0E2347");
  g.addColorStop(0.45, "#2D5D9A");
  g.addColorStop(0.72, "#E9B98F");
  g.addColorStop(0.78, "#5B6B86");
  g.addColorStop(1, "#1E2633");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// 写真を枠いっぱいに（はみ出す分は切る）
function drawCover(ctx, img, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

// 飛行機の形（絵文字は端末で見た目が変わるので、線で描く）
function plane(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(22, 12); ctx.lineTo(13, 10.6); ctx.lineTo(8.5, 2); ctx.lineTo(6.6, 2); ctx.lineTo(9, 10.4);
  ctx.lineTo(4.4, 10); ctx.lineTo(2.6, 7.4); ctx.lineTo(1.2, 7.4); ctx.lineTo(2.4, 12);
  ctx.lineTo(1.2, 16.6); ctx.lineTo(2.6, 16.6); ctx.lineTo(4.4, 14); ctx.lineTo(9, 13.6);
  ctx.lineTo(6.6, 22); ctx.lineTo(8.5, 22); ctx.lineTo(13, 13.4); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// 地図の挿絵。2つの空港が入るように範囲を決め、陸地・点線の航路・2つの点を描く。
function drawMap(ctx, geo, a, b, box) {
  const pa = geo.pos[a], pb = geo.pos[b];
  if (!pa || !pb) return false;
  let [lat1, lon1] = pa, [lat2, lon2] = pb;
  // 日付変更線をまたぐ路線（ホノルルなど）は経度を連続させる
  if (Math.abs(lon1 - lon2) > 180) { if (lon1 < 0) lon1 += 360; else lon2 += 360; }
  const span = Math.max(Math.abs(lat1 - lat2), Math.abs(lon1 - lon2));
  const pad = Math.max(2.6, span * 0.4);
  let lat0 = Math.min(lat1, lat2) - pad, latN = Math.max(lat1, lat2) + pad;
  let lon0 = Math.min(lon1, lon2) - pad, lonN = Math.max(lon1, lon2) + pad;
  const k = Math.cos(((lat0 + latN) / 2) * Math.PI / 180);
  // 枠の縦横比に合わせて範囲を広げる
  const want = box.w / box.h, have = ((lonN - lon0) * k) / (latN - lat0);
  if (have < want) { const add = ((latN - lat0) * want / k - (lonN - lon0)) / 2; lon0 -= add; lonN += add; }
  else { const add = ((lonN - lon0) * k / want - (latN - lat0)) / 2; lat0 -= add; latN += add; }
  const X = (lon) => box.x + ((lon - lon0) / (lonN - lon0)) * box.w;
  const Y = (lat) => box.y + ((latN - lat) / (latN - lat0)) * box.h;

  ctx.save();
  const polys = span > 25 ? geo.world : geo.asia.concat(geo.world.filter(() => span > 12));
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  for (const ring of polys) {
    for (const shift of [0, 360]) {
      let inView = false;
      ctx.beginPath();
      ring.forEach(([lon, lat], i) => {
        const x = X(lon + shift), y = Y(lat);
        if (x > box.x - 50 && x < box.x + box.w + 50 && y > box.y - 50 && y < box.y + box.h + 50) inView = true;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      if (inView) { ctx.fill(); ctx.stroke(); }
    }
  }
  // 航路: 少しふくらませた点線
  const x1 = X(lon1), y1 = Y(lat1), x2 = X(lon2), y2 = Y(lat2);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
  const bend = len * 0.18 * (ny < 0 ? 1 : -1);
  ctx.setLineDash([3, 14]);
  ctx.lineCap = "round";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(mx + nx * bend, my + ny * bend, x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 出発（青）と到着（朱）の点
  for (const [x, y, c] of [[x1, y1, BLUE], [x2, y2, SHU]]) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  return true;
}

function fmtDate(d) {
  return d ? d.replaceAll("-", ".") : "";
}

// 便名の間をあける: "NH1078" → "NH 1078"
function spacedFlight(fn) {
  const m = /^([A-Z0-9]{2})(\d+)$/.exec(fn || "");
  return m ? `${m[1]} ${m[2]}` : (fn || "");
}

// card = { flightNo, fromCode, toCode, date, photo(ImageBitmap|HTMLImageElement|null) }
export async function drawCard(canvas, card, scale = 1) {
  const W = CARD_W * scale, H = CARD_H * scale;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(scale, scale);
  const w = CARD_W, h = CARD_H;

  if (card.photo) drawCover(ctx, card.photo, w, h); else drawSky(ctx, w, h);

  // 文字が読めるように、上と下を少し暗くする
  let g = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  g.addColorStop(0, "rgba(6,14,30,0.62)");
  g.addColorStop(1, "rgba(6,14,30,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.42);
  g = ctx.createLinearGradient(0, h * 0.8, 0, h);
  g.addColorStop(0, "rgba(6,14,30,0)");
  g.addColorStop(1, "rgba(6,14,30,0.45)");
  ctx.fillStyle = g; ctx.fillRect(0, h * 0.8, w, h * 0.2);

  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";

  const L = 64;
  ctx.font = `700 92px ${LATIN}`;
  ctx.fillText(spacedFlight(card.flightNo), L, 160);

  ctx.font = `700 92px ${LATIN}`;
  const a = card.fromCode || "---", b = card.toCode || "---";
  ctx.fillText(a, L, 272);
  const aw = ctx.measureText(a).width;
  plane(ctx, L + aw + 26, 200, 74, "#fff");
  ctx.fillText(b, L + aw + 126, 272);

  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(airportName(card.fromCode), L, 336);
  const nameY = 384;
  plane(ctx, L, nameY - 30, 32, "#fff");
  ctx.fillText(airportName(card.toCode), L + 46, nameY);
  ctx.font = `600 32px ${LATIN}`;
  ctx.fillText(fmtDate(card.date), L, 440);
  ctx.shadowBlur = 0;

  // 地図（右上）
  if (card.fromCode && card.toCode) {
    try {
      const geo = await loadGeo();
      const mw = 470, mh = 420;
      const off = document.createElement("canvas");
      off.width = mw; off.height = mh;
      const octx = off.getContext("2d");
      if (drawMap(octx, geo, card.fromCode, card.toCode, { x: 0, y: 0, w: mw, h: mh })) {
        // 地図の端を写真に溶け込ませる（四角い枠に見えないように）
        // 左右と上下を順に薄くする（2回かけると四隅がいちばん薄くなる）
        octx.globalCompositeOperation = "destination-in";
        const fx = octx.createLinearGradient(0, 0, mw, 0);
        fx.addColorStop(0, "rgba(0,0,0,0)"); fx.addColorStop(0.28, "rgba(0,0,0,1)");
        fx.addColorStop(0.85, "rgba(0,0,0,1)"); fx.addColorStop(1, "rgba(0,0,0,0)");
        octx.fillStyle = fx; octx.fillRect(0, 0, mw, mh);
        const fy = octx.createLinearGradient(0, 0, 0, mh);
        fy.addColorStop(0, "rgba(0,0,0,0)"); fy.addColorStop(0.18, "rgba(0,0,0,1)");
        fy.addColorStop(0.78, "rgba(0,0,0,1)"); fy.addColorStop(1, "rgba(0,0,0,0)");
        octx.fillStyle = fy; octx.fillRect(0, 0, mw, mh);
        ctx.drawImage(off, w - 40 - mw, 30);
      }
    } catch {}
  }

  // 右下の印（空の通い帳）
  const sx = w - 64, sy = h - 64;
  ctx.font = `600 30px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 10;
  ctx.fillText("空の通い帳", sx, sy);
  const tw = ctx.measureText("空の通い帳").width;
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.translate(sx - tw - 34, sy - 11);
  ctx.rotate(-0.07);
  ctx.strokeStyle = SHU; ctx.lineWidth = 4;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath(); ctx.roundRect(-24, -24, 48, 48, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = SHU; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `700 30px "Hiragino Mincho ProN", serif`;
  ctx.fillText("通", 0, 1);
  ctx.restore();
  ctx.restore();
}
