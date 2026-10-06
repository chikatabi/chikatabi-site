// 通い帳の1行（1区間の搭乗記録）からPP・マイルを出し、年ごとに集計する。純粋関数のみ。
// 計算そのものは旅そろばんの calcSegment に任せる（lib/calc.js）。
import { calcSegment, bonusRate, baseMiles } from "./calc.js";

// 国内線の「運賃の種類」に足す選択肢（旅そろばんの運賃表には無い）
export const AWARD_FARE = "award";

// 記録の種類。PPの計算方法が種類ごとに違う。
export const KINDS = [
  { id: "domestic", label: "国内線" },
  { id: "intlDom", label: "国際線の航空券の国内区間" },
  { id: "intl", label: "国際線（ANAグループ運航）" },
  { id: "award", label: "その他の特典航空券（PPなし）" },
];

// ステイタス条件（docs/RULES_SOURCE.md §10。飛行機利用のみの場合）
export const TARGETS = [
  { id: "bronze", label: "ブロンズ", total: 30000, anaGroup: 15000 },
  { id: "platinum", label: "プラチナ", total: 50000, anaGroup: 25000 },
  { id: "diamond", label: "ダイヤモンド", total: 100000, anaGroup: 50000 },
];

// 記録 → 旅そろばんの区間の形
export function toSegment(e) {
  if (e.kind === "domestic") {
    return { type: "domestic", from: e.from, to: e.to, seat: e.seat || "economy", fare: e.fare, paidUpgrade: !!e.paidUpgrade };
  }
  if (e.kind === "intlDom") return { type: "intlDom", from: e.from, to: e.to, cls: e.cls };
  if (e.kind === "intl") return { type: "intl", intlFrom: e.japan, intlTo: e.foreign, cls: e.cls };
  return null;
}

// 1区間のPP・マイル。特典航空券は0。計算できないときは ok:false と理由。
export function entryPoints(e) {
  // 特典航空券はPPもマイルも付かない（国内線は運賃の種類で「特典航空券」を選ぶ）
  // 飛んだ距離には数えるので、国内線なら区間基本マイレージだけは出す。
  if (e.kind === "award") return { ok: true, award: true, pp: 0, miles: 0, base: null, anaGroup: true, reason: "" };
  if (e.kind === "domestic" && e.fare === AWARD_FARE) {
    return { ok: true, award: true, pp: 0, miles: 0, base: baseMiles(e.from, e.to), anaGroup: true, reason: "" };
  }
  const seg = toSegment(e);
  if (!seg) return { ok: false, pp: 0, miles: 0, base: null, anaGroup: true, reason: "種類を選んでください" };
  const d = calcSegment(seg);
  if (!d.ok) return { ok: false, pp: 0, miles: 0, base: null, anaGroup: true, reason: d.reason };
  return { ok: true, pp: d.ppPerLeg, miles: d.milesPerLeg, base: d.base, anaGroup: d.isAnaGroup, reason: "" };
}

// その日までに乗ったか（今日の便は「乗った」に数える）
export function isFlown(e, today) {
  return !!e.date && e.date <= today;
}

// 1年分の集計。PPは1月〜12月、翌年に持ち越さない（RULES_SOURCE.md §10）。
export function yearSummary(entries, year, today, opts = {}) {
  const { statusId = "regular", cardId = "amc" } = opts;
  const rows = entries.filter((e) => (e.date || "").startsWith(String(year)));
  const s = { flights: 0, planned: 0, pp: 0, ppAnaGroup: 0, ppPlanned: 0, ppPlannedAnaGroup: 0, distance: 0, flightMiles: 0, incomplete: 0 };
  for (const e of rows) {
    const r = entryPoints(e);
    if (!r.ok) s.incomplete++;
    if (isFlown(e, today)) {
      s.flights++;
      s.pp += r.pp;
      if (r.anaGroup) s.ppAnaGroup += r.pp;
      s.flightMiles += r.miles;
      if (r.base) s.distance += r.base;
    } else {
      s.planned++;
      s.ppPlanned += r.pp;
      if (r.anaGroup) s.ppPlannedAnaGroup += r.pp;
    }
  }
  const rate = bonusRate(statusId, cardId);
  s.bonusRate = rate;
  s.bonusMiles = Math.floor(s.flightMiles * rate / 100 + 1e-9);
  s.totalMiles = s.flightMiles + s.bonusMiles;
  return s;
}

// 目標まであと何PPか。総PPとANAグループ運航便分の両方が条件なので、両方の残りを返す。
export function remaining(summary, targetId, includePlanned = false) {
  const t = TARGETS.find((x) => x.id === targetId) || TARGETS[2];
  const total = summary.pp + (includePlanned ? summary.ppPlanned : 0);
  const ana = summary.ppAnaGroup + (includePlanned ? summary.ppPlannedAnaGroup : 0);
  return {
    target: t,
    total, ana,
    restTotal: Math.max(0, t.total - total),
    restAna: Math.max(0, t.anaGroup - ana),
    reached: total >= t.total && ana >= t.anaGroup,
  };
}
