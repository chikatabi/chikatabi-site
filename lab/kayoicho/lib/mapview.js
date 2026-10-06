// 3枚目の地図（日本／世界）を SVG で描く。点＝行った空港、弧＝乗った路線。
// 何度も乗った路線ほど線が太く濃く、何度も行った空港ほど点が大きくなる。
import { DOMESTIC_CITY } from "./airports.js";

const VIEW = {
  // 日本: 沖縄・先島まで入る範囲
  japan: { lon0: 122.3, lon1: 146.6, lat0: 23.6, lat1: 46.0, w: 340 },
  // 世界: 太平洋を真ん中にする（経度を -25〜335 で扱う）
  world: { lon0: -25, lon1: 335, lat0: -50, lat1: 75, w: 340 },
};

function projector(v) {
  const k = v.lon0 > 100 ? Math.cos(35 * Math.PI / 180) : 1;
  const h = Math.round(v.w * ((v.lat1 - v.lat0) / ((v.lon1 - v.lon0) * k)));
  const X = (lon) => {
    if (v === VIEW.world && lon < v.lon0) lon += 360;
    return ((lon - v.lon0) / (v.lon1 - v.lon0)) * v.w;
  };
  const Y = (lat) => ((v.lat1 - lat) / (v.lat1 - v.lat0)) * h;
  return { X, Y, h };
}

const f1 = (n) => n.toFixed(1);

function ringPath(ring, X, Y, world) {
  let d = "", prev = null;
  for (const [lon, lat] of ring) {
    const x = X(lon), y = Y(lat);
    // 世界地図で経度の折り返しをまたぐ線は引かない（横一直線の筋が出るため）
    const jump = world && prev && Math.abs(x - prev) > 100;
    d += (d && !jump ? "L" : "M") + f1(x) + " " + f1(y);
    prev = x;
  }
  return d + "Z";
}

// mode: "japan" | "world" / v: visits() の結果
export function mapSvg(geo, v, mode, colors) {
  const view = VIEW[mode];
  const { X, Y, h } = projector(view);
  const world = mode === "world";
  const polys = world ? geo.world : geo.asia;
  const visited = new Set(Object.keys(v.countries));

  // 陸地（世界地図は行った国を塗る。日本地図は日本だけ少し濃く）
  const land = polys.map(([iso, ring]) => {
    const fill = world ? (visited.has(iso) ? colors.got : colors.land) : (iso === "JP" ? colors.landJp : colors.land);
    return `<path d="${ringPath(ring, X, Y, world)}" fill="${fill}"/>`;
  }).join("");

  // 路線の弧
  const arcs = Object.entries(v.routes).map(([key, n]) => {
    const [a, b] = key.split("-");
    const pa = geo.pos[a], pb = geo.pos[b];
    if (!pa || !pb) return "";
    let x1 = X(pa[1]), y1 = Y(pa[0]), x2 = X(pb[1]), y2 = Y(pb[0]);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const bend = len * 0.2;
    const cx = mx + (-(y2 - y1) / len) * bend, cy = my + ((x2 - x1) / len) * bend;
    const sw = Math.min(4, 1 + Math.log2(n) * 0.9);
    const op = Math.min(0.95, 0.45 + n * 0.08);
    return `<path d="M${f1(x1)} ${f1(y1)} Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}" fill="none" stroke="${colors.route}" stroke-width="${f1(sw)}" stroke-linecap="round" opacity="${op}"/>`;
  }).join("");

  // 空港の点（日本地図は、まだ行っていない国内空港も小さく描いて「制覇」の残りを見せる）
  const dots = [];
  if (!world) {
    for (const code of Object.keys(DOMESTIC_CITY)) {
      if (v.airports[code] || !geo.pos[code]) continue;
      const p = geo.pos[code];
      dots.push(`<circle cx="${f1(X(p[1]))}" cy="${f1(Y(p[0]))}" r="2.2" fill="none" stroke="${colors.empty}" stroke-width="1"/>`);
    }
  }
  for (const [code, n] of Object.entries(v.airports)) {
    const p = geo.pos[code];
    if (!p) continue;
    const r = Math.min(7, 2.8 + Math.sqrt(n) * 0.9);
    dots.push(`<circle cx="${f1(X(p[1]))}" cy="${f1(Y(p[0]))}" r="${f1(r)}" fill="${colors.dot}" stroke="#fff" stroke-width="1.2"/>`);
  }
  return `<svg viewBox="0 0 ${view.w} ${h}" width="100%" role="img" aria-label="${world ? "世界" : "日本"}の地図">${land}${arcs}${dots.join("")}</svg>`;
}
