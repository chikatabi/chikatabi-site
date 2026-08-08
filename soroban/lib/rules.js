// ANA プレミアムポイント／フライトマイル 制度の数値をここに集約する。
// 根拠はすべて docs/RULES_SOURCE.md（2026-08-07 にANA公式から一次取得）。
// このファイル以外に制度の数値を直書きしないこと。改定時は RULES_SOURCE.md を先に直す。

export const RULE_VERSION = "2026-05-19";
export const RULE_CHECKED_AT = "2026-08-07";

// ─── 端数処理 ────────────────────────────────────────────────────────────────
// 公式マイレージチャートの592セルを検証した結果、切り捨て（floor）が100%一致。
// 四捨五入は49.8%しか一致しない。→ scripts/verify_rounding.py
export const trunc = (x) => Math.floor(x + 1e-9);

// ─── 路線倍率 ────────────────────────────────────────────────────────────────
export const MULTIPLIER = {
  domestic: 2.0,        // 国内線
  intlAsia: 1.5,        // ANAグループ運航便の日本発着アジア・オセアニア・ウラジオストク路線
  intlOther: 1.0,       // ANAグループ運航便のその他路線
  partner: 1.0,         // スターアライアンス加盟社・コネクティングパートナー
};

// ─── 国内線 座席クラス ───────────────────────────────────────────────────────
// 2026/5/19以降、ANAの表記は「ファーストクラス（プレミアムクラス）」「エコノミークラス」。
export const SEATS = [
  { id: "first", label: "ファーストクラス", note: "旧・プレミアムクラス" },
  { id: "economy", label: "エコノミークラス", note: "旧・普通席" },
];

// ─── 国内線 運賃 ─────────────────────────────────────────────────────────────
// rate: 積算率(%)  bp: 搭乗ポイント  null は「そのクラスでは設定なし」
// 出典: RULES_SOURCE.md §4 / §5
export const DOMESTIC_FARES = [
  { id: "flex",       label: "フレックス",                 first: { rate: 150, bp: 400 }, economy: { rate: 100, bp: 400 } },
  { id: "biz",        label: "Biz",                        first: { rate: 150, bp: 400 }, economy: { rate: 100, bp: 400 } },
  { id: "anacard",    label: "ANAカード優待割引",           first: { rate: 150, bp: 400 }, economy: { rate: 100, bp: 400 } },
  { id: "flex_intl",  label: "フレックス（国際線接続専用）", first: { rate: 150, bp: 0 },   economy: { rate: 100, bp: 0 } },
  { id: "kabunushi",  label: "株主優待割引",                first: { rate: 130, bp: 400 }, economy: { rate: 80,  bp: 400 } },
  { id: "standard",   label: "スタンダード",                first: { rate: 130, bp: 400 }, economy: { rate: 80,  bp: 200 } },
  { id: "simple",     label: "シンプル",                    first: { rate: 120, bp: 400 }, economy: { rate: 70,  bp: 100 } },
  { id: "sale",       label: "セール",                      first: { rate: 100, bp: 0 },   economy: { rate: 50,  bp: 0 } },
  { id: "tomin",      label: "島民割引",                    first: null,                   economy: { rate: 100, bp: 0 } },
  { id: "youth",      label: "ユース",                      first: null,                   economy: { rate: 50,  bp: 0 } },
  { id: "senior",     label: "シニア",                      first: null,                   economy: { rate: 50,  bp: 0 } },
  { id: "apit",       label: "個人包括旅行運賃（APIT）",     first: null,                   economy: { rate: 50,  bp: 0 } },
  { id: "iita",       label: "包括団体旅行運賃（IITA）",     first: null,                   economy: { rate: 50,  bp: 0 } },
  { id: "ite",        label: "包括旅行割引運賃（ITE）",      first: null,                   economy: { rate: 30,  bp: 0 } },
];

// 有償アップグレード: 元運賃の積算率に一律 +50 ポイント。搭乗ポイントは元運賃（エコノミー欄）のまま。
// マイルでのアップグレードは対象外（マイルもPPも積算されない）。
export const PAID_UPGRADE_BONUS_RATE = 50;

// ─── 国際線 ANAグループ運航便 予約クラス ────────────────────────────────────
// rate: 積算率(%)  bp: 搭乗ポイント（座席クラス基準。P・N は70%でも400）
// 出典: RULES_SOURCE.md §6 / §7
export const INTL_CLASSES = [
  { code: "F", cabin: "ファーストクラス",     rate: 150, bp: 400 },
  { code: "A", cabin: "ファーストクラス",     rate: 150, bp: 400 },
  { code: "J", cabin: "ビジネスクラス",       rate: 150, bp: 400 },
  { code: "C", cabin: "ビジネスクラス",       rate: 125, bp: 400 },
  { code: "D", cabin: "ビジネスクラス",       rate: 125, bp: 400 },
  { code: "Z", cabin: "ビジネスクラス",       rate: 125, bp: 400 },
  { code: "P", cabin: "ビジネスクラス",       rate: 70,  bp: 400 },
  { code: "G", cabin: "プレミアムエコノミー", rate: 100, bp: 400 },
  { code: "E", cabin: "プレミアムエコノミー", rate: 100, bp: 400 },
  { code: "N", cabin: "プレミアムエコノミー", rate: 70,  bp: 400 },
  { code: "Y", cabin: "エコノミークラス",     rate: 100, bp: 400 },
  { code: "B", cabin: "エコノミークラス",     rate: 100, bp: 400 },
  { code: "M", cabin: "エコノミークラス",     rate: 100, bp: 400 },
  { code: "U", cabin: "エコノミークラス",     rate: 70,  bp: 0 },
  { code: "H", cabin: "エコノミークラス",     rate: 70,  bp: 0 },
  { code: "Q", cabin: "エコノミークラス",     rate: 70,  bp: 0 },
  { code: "V", cabin: "エコノミークラス",     rate: 50,  bp: 0 },
  { code: "W", cabin: "エコノミークラス",     rate: 50,  bp: 0 },
  { code: "S", cabin: "エコノミークラス",     rate: 50,  bp: 0 },
  { code: "T", cabin: "エコノミークラス",     rate: 50,  bp: 0 },
  { code: "L", cabin: "エコノミークラス",     rate: 30,  bp: 0 },
  { code: "K", cabin: "エコノミークラス",     rate: 30,  bp: 0 },
];

// ─── 国際航空券で発券された日本国内線区間 ───────────────────────────────────
// 積算率は 2018/10/1 以降のまま。搭乗ポイントは 2026/5/19 から 0 → F/A/Y/B/M=400 に変わった。
// T は積算対象外（国際線本体の表と違い、この表に T は存在しない）。
// 出典: RULES_SOURCE.md §5 / §8
export const INTL_DOM_CLASSES = [
  { code: "F", rate: 150, bp: 400 },
  { code: "A", rate: 150, bp: 400 },
  { code: "Y", rate: 100, bp: 400 },
  { code: "B", rate: 100, bp: 400 },
  { code: "M", rate: 100, bp: 400 },
  { code: "U", rate: 70,  bp: 0 },
  { code: "H", rate: 70,  bp: 0 },
  { code: "Q", rate: 70,  bp: 0 },
  { code: "V", rate: 50,  bp: 0 },
  { code: "W", rate: 50,  bp: 0 },
  { code: "S", rate: 50,  bp: 0 },
  { code: "L", rate: 30,  bp: 0 },
  { code: "K", rate: 30,  bp: 0 },
];
// 旧ルール（2026/5/18まで）では運賃にかかわらず一律0だった。差分表示に使う。
export const INTL_DOM_BP_BEFORE_20260519 = 0;

// ─── 提携社便（スターアライアンス加盟社・コネクティングパートナー） ─────────
// 路線倍率1倍。搭乗ポイントは「積算率100%以上→400、それ以外→0」（ANA便とは判定基準が違う）。
// フライトボーナスマイルは UA / LH / LX / OS のみ対象。
export const PARTNER_BONUS_ELIGIBLE = ["ユナイテッド航空", "ルフトハンザ ドイツ航空",
  "スイス インターナショナル エアラインズ", "オーストリア航空"];
export const partnerBoardingPoint = (rate) => (rate >= 100 ? 400 : 0);

// ─── フライトボーナスマイル ─────────────────────────────────────────────────
// 出典: RULES_SOURCE.md §9
export const STATUSES = [
  { id: "regular",     label: "一般会員",                 rate: 0 },
  { id: "bronze_y1",   label: "ブロンズ（1年目）",         rate: 40 },
  { id: "bronze_y2",   label: "ブロンズ（継続2年以上）",   rate: 50 },
  { id: "platinum_y1", label: "プラチナ（1年目）",         rate: 90 },
  { id: "platinum_y2", label: "プラチナ（継続2年以上）",   rate: 100 },
  { id: "diamond_y1",  label: "ダイヤモンド（1年目）",     rate: 115 },
  { id: "diamond_y2",  label: "ダイヤモンド（継続2年以上）", rate: 125 },
];

// gold: ANAゴールドカード／ANAカード プレミアム相当（ステイタス率が5%アップする対象）
export const CARDS = [
  { id: "amc",          label: "ANAマイレージクラブカード（提携カード含む）", rate: 0,  gold: false },
  { id: "ana_general",  label: "ANAカード 一般",                            rate: 10, gold: false },
  { id: "ana_wide",     label: "ANAワイドカード",                           rate: 25, gold: false },
  { id: "ana_gold",     label: "ANAゴールドカード",                         rate: 25, gold: true },
  { id: "ana_premium",  label: "ANAカード プレミアム",                       rate: 50, gold: true },
  { id: "sfc_general",  label: "ANAスーパーフライヤーズカード 一般",          rate: 35, gold: false },
  { id: "sfc_gold",     label: "ANAスーパーフライヤーズ ゴールドカード",       rate: 40, gold: true },
  { id: "sfc_premium",  label: "ANAスーパーフライヤーズカード プレミアム",     rate: 50, gold: true },
];
export const GOLD_STATUS_UPLIFT = 5;

// ステイタス獲得条件（ブロンズ30,000/15,000 など）はここに持たない。
// この計算機は1年分の搭乗実績を保持しないので、達成判定を出すことができないため。
// 条件そのものは docs/RULES_SOURCE.md §10 に記録済み。実装するなら実績の保存が先。

export const SOURCES = [
  ["プレミアムポイントとは（計算式・搭乗ポイント・ステイタス条件）", "https://www.ana.co.jp/ja/jp/amc/premium/overview/premium-point/"],
  ["国内線 積算条件（運賃別積算率）", "https://www.ana.co.jp/ja/jp/amc/flightmile/dom/"],
  ["国内線 マイレージチャート（区間基本マイレージ）", "https://www.ana.co.jp/ja/jp/amc/flightmile/dom/chart/"],
  ["国際線 積算条件（予約クラス別積算率）", "https://www.ana.co.jp/ja/jp/amc/flightmile/int/"],
  ["国際航空券で発券されている日本国内線の積算率", "https://www.ana.co.jp/ja/jp/amc/flightmile/dom/integration_rate/"],
  ["フライトボーナスマイル積算率", "https://www.ana.co.jp/ja/jp/amc/premium/service/delight/detail/"],
  ["ANAカード ご搭乗ごとのボーナスマイル", "https://www.ana.co.jp/ja/jp/guide/amc/anacard/flight/"],
];
