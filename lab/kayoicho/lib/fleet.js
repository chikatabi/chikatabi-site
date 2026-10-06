// 機材の図鑑。乗った機材に印を付けて「制覇」を目指す。純粋関数のみ。
// 出典（2026-10-06 に画面で確認）:
//   機種コード一覧[国内線] https://www.ana.co.jp/ja/jp/guide/prepare/seatmap/domestic/code/
//   機種・シートマップ[国際線] https://www.ana.co.jp/ja/jp/guide/prepare/seatmap/international/
// group: "ana" = ANA・ANAウイングスの機材 / "partner" = コードシェア便で乗れる他社の機材
// len: 全長（m、おおよそ）。シルエットの大きさをそろえるためだけに使う。
// shape: シルエットの形（lib/silhouette.js）
export const FLEET = [
  { id: "B787-10", name: "ボーイング787-10", code: "781", group: "ana", len: 68.3, shape: "wide" },
  { id: "B787-9", name: "ボーイング787-9", code: "789", group: "ana", len: 62.8, shape: "wide" },
  { id: "B787-8", name: "ボーイング787-8", code: "788", group: "ana", len: 56.7, shape: "wide" },
  { id: "B777-300ER", name: "ボーイング777-300ER", code: "77W", group: "ana", len: 73.9, shape: "wide" },
  { id: "B777-300", name: "ボーイング777-300", code: "773", group: "ana", len: 73.9, shape: "wide" },
  { id: "B777-200ER", name: "ボーイング777-200ER", code: "772/722", group: "ana", len: 63.7, shape: "wide" },
  { id: "B777-200", name: "ボーイング777-200", code: "772", group: "ana", len: 63.7, shape: "wide" },
  { id: "B767-300ER", name: "ボーイング767-300ER", code: "763", group: "ana", len: 54.9, shape: "wide" },
  { id: "B767-300", name: "ボーイング767-300", code: "763", group: "ana", len: 54.9, shape: "wide" },
  { id: "A380", name: "エアバス A380", code: "388", group: "ana", len: 72.7, shape: "jumbo" },
  { id: "B737-800", name: "ボーイング737-800", code: "738", group: "ana", len: 39.5, shape: "narrow" },
  { id: "A321", name: "エアバス A321", code: "321", group: "ana", len: 44.5, shape: "narrow" },
  { id: "A320", name: "エアバス A320", code: "320", group: "ana", len: 37.6, shape: "narrow" },
  { id: "DASH8-400", name: "Dash 8-400", code: "DH4", group: "ana", len: 32.8, shape: "prop" },
  { id: "B737-700", name: "ボーイング737-700", code: "73G", group: "partner", len: 33.6, shape: "narrow" },
  { id: "CRJ700", name: "CRJ-700", code: "CR7", group: "partner", len: 32.3, shape: "rearjet" },
  { id: "DHC8-Q200", name: "DHC8-Q200", code: "DH2", group: "partner", len: 22.3, shape: "prop" },
  { id: "ATR72", name: "ATR72-600", code: "AT7", group: "partner", len: 27.2, shape: "prop" },
  { id: "ATR42", name: "ATR42-600", code: "AT4", group: "partner", len: 22.7, shape: "prop" },
];

// 利用者が書いた機材名（「787-8」「B788」「ボーイング787-8」「Q400」など）を図鑑の機種に結びつける。
// 結びつかなければ null（図鑑には数えない）。
const ALIASES = [
  ["B787-10", ["787-10", "78J", "781", "78X"]],
  ["B787-9", ["787-9", "789"]],
  ["B787-8", ["787-8", "788", "787"]],
  ["B777-300ER", ["777-300ER", "77W", "773ER"]],
  ["B777-300", ["777-300", "773"]],
  ["B777-200ER", ["777-200ER", "772ER", "722"]],
  ["B777-200", ["777-200", "772", "777"]],
  ["B767-300ER", ["767-300ER", "763ER", "76W"]],
  ["B767-300", ["767-300", "763", "767"]],
  ["A380", ["A380", "A380-800", "388", "FLYINGHONU", "ホヌ"]],
  ["B737-800", ["737-800", "738"]],
  ["B737-700", ["737-700", "73G", "737"]],
  ["A321", ["A321", "A321NEO", "A321CEO", "321", "32Q"]],
  ["A320", ["A320", "A320NEO", "A320CEO", "320", "32N"]],
  ["DASH8-400", ["DASH8-400", "Q400", "DHC8-400", "DH4", "DHC8-Q400", "Q4"]],
  ["DHC8-Q200", ["Q200", "DHC8-Q200", "DH2", "DHC8-200", "DASH8-200"]],
  ["CRJ700", ["CRJ700", "CRJ-700", "CR7", "CRJ"]],
  ["ATR72", ["ATR72", "ATR72-600", "AT7"]],
  ["ATR42", ["ATR42", "ATR42-600", "AT4", "ATR"]],
];

function norm(s) {
  return String(s || "").toUpperCase()
    .replace(/[Ａ-Ｚ０-９－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/ボーイング|BOEING|エアバス|AIRBUS|デ・?ハビランド・?カナダ|ボンバルディア|BOMBARDIER/g, "")
    .replace(/[\s・()（）]/g, "")
    .replace(/^B(?=7\d\d)/, "");
}

export function matchFleet(text) {
  const t = norm(text);
  if (!t) return null;
  // 長い別名から先に当てる（「787-10」を「787」より先に）
  const all = ALIASES.flatMap(([id, list]) => list.map((a) => [id, norm(a)])).sort((a, b) => b[1].length - a[1].length);
  for (const [id, a] of all) if (t === a) return id;
  for (const [id, a] of all) if (a.length >= 3 && t.startsWith(a)) return id;
  return null;
}

// 乗った回数を機種ごとに数える（予定の便は数えない）
export function fleetCounts(entries, today) {
  const out = {};
  for (const e of entries) {
    if (!e.date || e.date > today) continue;
    const id = matchFleet(e.aircraft);
    if (id) out[id] = (out[id] || 0) + 1;
  }
  return out;
}
