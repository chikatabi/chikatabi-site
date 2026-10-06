// 行った空港・路線・国を数える（地図の3枚目）。純粋関数のみ。

// 制覇の数え方に使う空港: ANA公式「空港ガイド（国内線）」に載っている52空港
// https://www.ana.co.jp/ja/jp/guide/prepare/airport-guide/domestic/ （2026-10-06 に画面で確認）
// ここに無い国内空港（静岡・天草・種子島・屋久島・奄美の島々など）も地図には描くが、分母には入れない。
export const ANA_DOMESTIC_AIRPORTS = [
  "OKA", "MMY", "ISG", "RIS", "WKJ", "MBE", "MMB", "AKJ", "CTS", "SHB", "KUH", "OBO", "HKD",
  "AOJ", "ONJ", "AXT", "SYO", "SDJ", "FKS", "HND", "NRT", "HAC", "NGO", "KIJ", "TOY", "KMQ", "NTQ",
  "UKB", "KIX", "ITM", "OKJ", "HIJ", "IWK", "UBJ", "TTJ", "YGJ", "IWJ", "TAK", "TKS", "MYJ", "KCZ",
  "FUK", "KKJ", "HSG", "OIT", "KMJ", "NGS", "TSJ", "IKI", "FUJ", "KMI", "KOJ",
];

export const COUNTRY_NAME = {
  JP: "日本", KR: "韓国", CN: "中国", TW: "台湾", HK: "香港", SG: "シンガポール", ID: "インドネシア",
  TH: "タイ", VN: "ベトナム", PH: "フィリピン", MY: "マレーシア", MM: "ミャンマー", IN: "インド",
  KH: "カンボジア", AU: "オーストラリア", US: "アメリカ", CA: "カナダ", MX: "メキシコ", GB: "イギリス",
  DE: "ドイツ", FR: "フランス", BE: "ベルギー", AT: "オーストリア", RU: "ロシア", TR: "トルコ",
  IT: "イタリア", SE: "スウェーデン",
};

// entries: 記録 / pos: 空港コード → [緯度, 経度, 国コード]（lib/geo.js）
// 今日までに乗った区間だけ数える。空港コードが2つそろっている区間だけが対象。
export function visits(entries, pos, today) {
  const airports = {}, routes = {}, countries = {};
  for (const e of entries) {
    if (!e.date || e.date > today) continue;
    const a = (e.fromCode || "").toUpperCase(), b = (e.toCode || "").toUpperCase();
    if (!pos[a] || !pos[b] || a === b) continue;
    airports[a] = (airports[a] || 0) + 1;
    airports[b] = (airports[b] || 0) + 1;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`; // 行きと帰りは同じ路線として数える
    routes[key] = (routes[key] || 0) + 1;
    // 国は「着いた回数」。出発地の国も行ったことにはなるので、0回なら1にしておく
    const cb = pos[b][2], ca = pos[a][2];
    countries[cb] = (countries[cb] || 0) + 1;
    if (!countries[ca]) countries[ca] = 1;
  }
  const conquered = ANA_DOMESTIC_AIRPORTS.filter((c) => airports[c]).length;
  return { airports, routes, countries, conquered, total: ANA_DOMESTIC_AIRPORTS.length };
}
