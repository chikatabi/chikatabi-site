// 搭乗券のバーコード（IATA BCBP・Resolution 792）を読む。純粋関数のみ。
// 2026-10-06、CHIKAのANA国内線（Walletのスクリーンショット）で形式を確認済み。
//
// 個人情報の扱い: 名前・予約番号・会員番号もバーコードに入っているが、
// ここでは取り出さない（アプリに保存しないため）。

export function parseBCBP(s) {
  if (typeof s !== "string" || s[0] !== "M" || s.length < 60) return null;
  const legs = parseInt(s[1], 10);
  if (!(legs >= 1 && legs <= 4)) return null;
  const out = [];
  let p = 23; // 0:形式 1:区間数 2-21:名前 22:電子券
  for (let i = 0; i < legs; i++) {
    if (s.length < p + 37) break;
    const condLen = parseInt(s.slice(p + 35, p + 37), 16) || 0;
    out.push({
      from: s.slice(p + 7, p + 10).trim(),
      to: s.slice(p + 10, p + 13).trim(),
      carrier: s.slice(p + 13, p + 16).trim(),
      number: s.slice(p + 16, p + 21).trim(),
      dayOfYear: parseInt(s.slice(p + 21, p + 24), 10),
      compartment: s.slice(p + 24, p + 25).trim(), // 客室（Y など）。予約クラスではない
      seat: s.slice(p + 25, p + 29).trim(),
    });
    p += 37 + condLen;
  }
  return out.length ? out : null;
}

// 便名: "NH" + "0794" → "NH794"
export function flightNo(carrier, number) {
  const n = String(number || "").replace(/^0+/, "");
  return (carrier || "") + n;
}

// 座席: "005H" → "5H"
export function seatNo(raw) {
  return String(raw || "").replace(/^0+/, "");
}

// 年の初めからの日数 → 日付。年はバーコードに入っていないので、
// 前年・今年・翌年のうち「今日に最も近い日」を選ぶ。違っていれば利用者が直す。
export function dateFromDayOfYear(doy, today = new Date()) {
  if (!(doy >= 1 && doy <= 366)) return null;
  const y = today.getFullYear();
  let best = null;
  for (const yy of [y - 1, y, y + 1]) {
    const d = new Date(yy, 0, doy);
    if (d.getFullYear() !== yy) continue; // 平年の366日目
    const diff = Math.abs(d - today);
    if (!best || diff < best.diff) best = { d, diff };
  }
  if (!best) return null;
  const d = best.d;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
