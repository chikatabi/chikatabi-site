// その日のフライトの感想（5段階）。言葉ではなく顔のイラストで見せる。
// 5段階にしたのは、CHIKAが挙げた5つの言葉（いい・まあまあ・ふつう・まあまあ悪い・悪い）をそのまま使えるから。
export const RATINGS = [
  { id: "5", label: "いい", color: "#F08A3C", mouth: "M9 15.5 Q16 23 23 15.5", brow: 0 },
  { id: "4", label: "まあまあ", color: "#F2B640", mouth: "M10 17 Q16 21 22 17", brow: 0 },
  { id: "3", label: "ふつう", color: "#9BB7D4", mouth: "M10.5 18.5 L21.5 18.5", brow: 0 },
  { id: "2", label: "いまいち", color: "#7F95B8", mouth: "M10 20 Q16 16.5 22 20", brow: 1 },
  { id: "1", label: "わるい", color: "#5B6F93", mouth: "M9.5 21.5 Q16 14.5 22.5 21.5", brow: 2 },
];

// 顔の絵（SVG文字列）。size は表示の大きさ（px）
export function faceSvg(id, size = 40) {
  const r = RATINGS.find((x) => x.id === String(id));
  if (!r) return "";
  const brow = r.brow === 0 ? "" :
    r.brow === 1 ? '<path d="M9 10.5 L13 11.5 M23 10.5 L19 11.5" stroke="#1D2A3F" stroke-width="1.6" stroke-linecap="round"/>' :
    '<path d="M8.5 11.5 L13 10 M23.5 11.5 L19 10" stroke="#1D2A3F" stroke-width="1.6" stroke-linecap="round"/>';
  const eyes = r.id === "5"
    ? '<path d="M9.5 13 Q11.5 10.5 13.5 13 M18.5 13 Q20.5 10.5 22.5 13" fill="none" stroke="#1D2A3F" stroke-width="1.8" stroke-linecap="round"/>'
    : '<circle cx="11.5" cy="13.5" r="1.7" fill="#1D2A3F"/><circle cx="20.5" cy="13.5" r="1.7" fill="#1D2A3F"/>';
  const cheek = Number(r.id) >= 4 ? '<circle cx="8.5" cy="17.5" r="2" fill="#fff" opacity=".35"/><circle cx="23.5" cy="17.5" r="2" fill="#fff" opacity=".35"/>' : "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="14.5" fill="${r.color}"/>${cheek}${brow}${eyes}
    <path d="${r.mouth}" fill="none" stroke="#1D2A3F" stroke-width="1.9" stroke-linecap="round"/></svg>`;
}
