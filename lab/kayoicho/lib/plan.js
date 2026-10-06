// 無料と有料の線（2026-10-06 CHIKA決定）
// ・通算25本まで無料（年ごとではない。ログブックは何年も書き足すものなので）
// ・それ以上は 1,000円の買い切り
// 25本にしたのは、往復（2本）を12回書いたあとの13回目の旅で、行きは書けて帰りが書けない
// ＝「旅を書き終えたいから買う」後押しを狙ったもの（CHIKAが承知のうえで選んだ）。
export const FREE_LIMIT = 25;
export const PRICE_YEN = 1000;

// 新しく1本書けるか。直す・消すはいつでもできる（ここでは数えない）。
export function canAdd(count, paid) {
  return paid || count < FREE_LIMIT;
}

// 無料であと何本書けるか（有料なら null）
export function freeLeft(count, paid) {
  return paid ? null : Math.max(0, FREE_LIMIT - count);
}

// 書き出しを促すか。最後の書き出しから30日、または一度も書き出していなくて5本以上あるとき。
export function shouldRemindBackup(count, lastExport, today) {
  if (count === 0) return false;
  if (!lastExport) return count >= 5;
  const days = (new Date(today) - new Date(lastExport)) / 86400000;
  return days >= 30;
}
