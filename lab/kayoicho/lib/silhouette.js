// 機材のシルエット（横から見た形）を SVG で描く。
// 写真やメーカーの図面は使わず、全長と形の種類だけから描く（著作物を持ち込まないため）。
// shape: wide（双発ワイドボディ）/ jumbo（総2階建て4発）/ narrow（双発ナローボディ）/
//        rearjet（胴体後方エンジン・T字尾翼）/ prop（高翼プロペラ機）
const MAX_LEN = 74; // いちばん長い機材（777-300）

export function silhouetteSvg(plane, fill = "currentColor", w = 100) {
  const H = 46;
  // 大きさの差は少し縮める（小さい機材が点にならないように。並びの大小は残す）
  const L = (0.42 + 0.58 * plane.len / MAX_LEN) * (w - 6);
  const x0 = (w - L) / 2;               // 長さに応じて中央に置く
  const xe = x0 + L;
  const s = plane.shape;
  const r = { wide: 5.6, jumbo: 7.6, narrow: 4.6, rearjet: 4.0, prop: 4.2 }[s];
  const y = 28;
  const tl = L * 0.2;                    // しっぽの長さ
  const fin = { wide: 13, jumbo: 14, narrow: 11, rearjet: 11, prop: 11 }[s];
  const parts = [];

  // 胴体（機首は丸く、しっぽは上へ細くなる）
  parts.push(`<path d="M${x0 + r * 1.5} ${y - r} L${xe - tl} ${y - r} L${xe} ${y - r * 0.55} L${xe} ${y - r * 0.15}
    L${xe - tl * 1.3} ${y + r} L${x0 + r * 1.5} ${y + r} Q${x0} ${y + r} ${x0} ${y} Q${x0} ${y - r} ${x0 + r * 1.5} ${y - r} Z"/>`);
  // 垂直尾翼
  parts.push(`<path d="M${xe - tl * 1.15} ${y - r + 0.5} L${xe - tl * 0.4} ${y - r - fin} L${xe - tl * 0.06} ${y - r - fin} L${xe} ${y - r * 0.55} Z"/>`);
  // T字尾翼（CRJ・プロペラ機）
  if (s === "rearjet" || s === "prop") {
    parts.push(`<rect x="${xe - tl * 0.7}" y="${y - r - fin - 0.8}" width="${tl * 0.7}" height="2" rx="1"/>`);
  } else {
    parts.push(`<path d="M${xe - tl * 0.8} ${y - r * 0.15} L${xe - tl * 0.02} ${y - r * 0.5} L${xe - tl * 0.02} ${y} Z"/>`);
  }
  // 主翼（横から見ると細い板）
  const wx = x0 + L * 0.36;
  if (s === "prop") {
    parts.push(`<path d="M${wx} ${y - r - 0.4} L${wx + L * 0.2} ${y - r - 0.9} L${wx + L * 0.22} ${y - r + 0.6} L${wx + L * 0.02} ${y - r + 0.9} Z"/>`);
  } else {
    parts.push(`<path d="M${wx} ${y + r * 0.45} L${wx + L * 0.22} ${y + r * 0.1} L${wx + L * 0.24} ${y + r * 0.45} L${wx + L * 0.03} ${y + r * 0.85} Z"/>`);
  }
  // エンジン
  if (s === "wide" || s === "narrow") {
    const er = s === "wide" ? 3.2 : 2.5;
    parts.push(`<ellipse cx="${wx + L * 0.03}" cy="${y + r + er * 0.55}" rx="${er * 2.1}" ry="${er}"/>`);
  } else if (s === "jumbo") {
    parts.push(`<ellipse cx="${wx - L * 0.01}" cy="${y + r + 1.8}" rx="5.4" ry="2.6"/>`);
    parts.push(`<ellipse cx="${wx + L * 0.12}" cy="${y + r + 0.6}" rx="4.6" ry="2.2" opacity=".75"/>`);
    // 2階席の段（A380は胴体が高い）
  } else if (s === "rearjet") {
    parts.push(`<ellipse cx="${xe - tl * 1.45}" cy="${y - r * 0.45}" rx="4.6" ry="2.1"/>`);
  } else if (s === "prop") {
    const nx = wx + L * 0.06;
    parts.push(`<ellipse cx="${nx}" cy="${y - r + 0.4}" rx="4.4" ry="2.0"/>`);
    parts.push(`<rect x="${nx - 5}" y="${y - r - 6}" width="1.1" height="13" rx="0.55"/>`);
  }
  return `<svg viewBox="0 0 ${w} ${H}" width="100%" aria-hidden="true"><g fill="${fill}">${parts.join("")}</g></svg>`;
}
