// 空港コード（IATA 3文字）→ 計算に使う都市名。
// 搭乗券のバーコードは空港コードで入っているが、ANAのマイレージチャートは都市単位
// （東京＝羽田・成田、大阪＝伊丹・関西・神戸）なので、ここで読み替える。
// 都市名は lib/domestic.js / lib/intl.js の表記と一字一句同じにすること（test で照合している）。

// 国内線チャートの都市
export const DOMESTIC_CITY = {
  HND: "東京", NRT: "東京",
  ITM: "大阪", KIX: "大阪", UKB: "大阪",
  NGO: "名古屋",
  CTS: "札幌",
  FUK: "福岡", OKA: "沖縄", ISG: "石垣", MMY: "宮古",
  RIS: "利尻", WKJ: "稚内", MBE: "オホーツク紋別", MMB: "女満別", AKJ: "旭川",
  SHB: "根室中標津", KUH: "釧路", OBO: "帯広", HKD: "函館",
  AOJ: "青森", ONJ: "大館能代", AXT: "秋田", SYO: "庄内", SDJ: "仙台", FKS: "福島",
  HAC: "八丈島", FSZ: "静岡", KIJ: "新潟", TOY: "富山", KMQ: "小松", NTQ: "能登",
  OKJ: "岡山", HIJ: "広島", IWK: "岩国", UBJ: "山口宇部", TTJ: "鳥取", YGJ: "米子", IWJ: "萩・石見",
  TAK: "高松", TKS: "徳島", MYJ: "松山", KCZ: "高知",
  KKJ: "北九州", HSG: "佐賀", OIT: "大分", KMJ: "熊本", AXJ: "天草", NGS: "長崎",
  TSJ: "対馬", IKI: "壱岐", FUJ: "五島福江", KMI: "宮崎", KOJ: "鹿児島",
  TNE: "種子島", KUM: "屋久島", ASJ: "奄美", KKX: "喜界島", TKN: "徳之島", OKE: "沖永良部", RNJ: "与論",
};

// 国際線チャートの日本側の都市（lib/intl.js のキー）
export const INTL_JAPAN_CITY = {
  HND: "東京", NRT: "東京",
  KIX: "大阪（関西）",
  NGO: "名古屋（中部）",
};

// 国際線チャートの海外側の都市
export const INTL_FOREIGN_CITY = {
  SEA: "シアトル", SFO: "サンフランシスコ", SJC: "サンノゼ", LAX: "ロサンゼルス", IAH: "ヒューストン",
  ORD: "シカゴ", JFK: "ニューヨーク", EWR: "ニューヨーク", IAD: "ワシントンD.C.", HNL: "ホノルル",
  YVR: "バンクーバー", MEX: "メキシコシティ",
  LHR: "ロンドン", FRA: "フランクフルト", MUC: "ミュンヘン", DUS: "デュッセルドルフ", CDG: "パリ",
  BRU: "ブリュッセル", VIE: "ウィーン", VVO: "ウラジオストク", IST: "イスタンブール", SVO: "モスクワ",
  MXP: "ミラノ", ARN: "ストックホルム",
  PVG: "上海", SHA: "上海", PEK: "北京", PKX: "北京", HKG: "香港", CAN: "広州", DLC: "大連",
  TAO: "青島", XMN: "厦門", HGH: "杭州", SHE: "瀋陽", CTU: "成都", TFU: "成都", WUH: "武漢",
  SZX: "深セン", ICN: "ソウル", GMP: "ソウル", TPE: "台北", TSA: "台北",
  SIN: "シンガポール", CGK: "ジャカルタ", BKK: "バンコク", SGN: "ホーチミンシティ", HAN: "ハノイ",
  MNL: "マニラ", KUL: "クアラルンプール", RGN: "ヤンゴン", DEL: "デリー", BOM: "ムンバイ",
  PNH: "プノンペン", MAA: "チェンナイ", SYD: "シドニー", PER: "パース",
};

// 搭乗券の2つの空港コードから、記録の「種類」と都市を推定する。
// 推定できないときは null を返し、利用者に選んでもらう。
export function guessRoute(fromCode, toCode) {
  const df = DOMESTIC_CITY[fromCode], dt = DOMESTIC_CITY[toCode];
  if (df && dt) return { kind: "domestic", from: df, to: dt };
  // 国際線は「日本側」と「海外側」で持つ（チャートが日本発の片側だけなので）
  const jf = INTL_JAPAN_CITY[fromCode], jt = INTL_JAPAN_CITY[toCode];
  const ff = INTL_FOREIGN_CITY[fromCode], ft = INTL_FOREIGN_CITY[toCode];
  if (jf && ft) return { kind: "intl", japan: jf, foreign: ft };
  if (ff && jt) return { kind: "intl", japan: jt, foreign: ff };
  return null;
}

// ── カード（思い出の1枚）に書く空港名 ──
// 国内は「都市名＋空港」を基本にし、通称が違う空港だけ書き分ける。
const NAME_OVERRIDE = {
  HND: "羽田空港", NRT: "成田空港", ITM: "伊丹空港", KIX: "関西空港", UKB: "神戸空港",
  NGO: "中部国際空港", CTS: "新千歳空港", OKA: "那覇空港", SHB: "中標津空港",
  FSZ: "静岡空港", KKX: "喜界空港",
};
// 海外で、同じ都市に空港が2つ以上あるもの
const INTL_AIRPORT = {
  GMP: "金浦", ICN: "仁川", PVG: "浦東", SHA: "虹橋", PEK: "首都", PKX: "大興",
  TPE: "桃園", TSA: "松山", JFK: "JFK", EWR: "ニューアーク", CTU: "双流", TFU: "天府",
};
export function airportName(code) {
  if (!code) return "";
  if (NAME_OVERRIDE[code]) return NAME_OVERRIDE[code];
  if (DOMESTIC_CITY[code]) return DOMESTIC_CITY[code] + "空港";
  const city = INTL_FOREIGN_CITY[code];
  if (city) return INTL_AIRPORT[code] ? `${city}（${INTL_AIRPORT[code]}）` : city;
  return code;
}

// 手で都市を選んだときの空港コード（複数ある都市は代表の1つ。違えば利用者が直す）
const CITY_DEFAULT = { "東京": "HND", "大阪": "ITM", "名古屋": "NGO", "札幌": "CTS",
  "大阪（関西）": "KIX", "名古屋（中部）": "NGO", "ソウル": "GMP", "上海": "PVG", "北京": "PEK",
  "台北": "TSA", "ニューヨーク": "JFK", "成田": "NRT", "成都": "CTU" };
export function cityCode(city) {
  if (!city) return "";
  if (CITY_DEFAULT[city]) return CITY_DEFAULT[city];
  for (const t of [DOMESTIC_CITY, INTL_FOREIGN_CITY]) {
    for (const [code, c] of Object.entries(t)) if (c === city) return code;
  }
  return "";
}
