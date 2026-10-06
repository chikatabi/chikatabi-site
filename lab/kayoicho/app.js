// 画面の動き。計算は lib/ の純粋関数に任せ、ここでは呼ぶだけにする。
import { ALL_AIRPORTS, destinations, faresFor, intlDomCodes, INTL_ORIGINS, intlDests } from "./lib/calc.js";
import { SEATS, INTL_CLASSES, STATUSES, CARDS } from "./lib/rules.js";
import { KINDS, TARGETS, AWARD_FARE, entryPoints, yearSummary, remaining, isFlown } from "./lib/log.js";
import { parseBCBP, flightNo, seatNo, dateFromDayOfYear } from "./lib/bcbp.js";
import { guessRoute, airportName, cityCode } from "./lib/airports.js";
import { drawCard, CARD_W, CARD_H } from "./lib/card.js";
import { getPhoto, putPhoto, deletePhoto, shrink } from "./lib/photos.js";
import { RATINGS, faceSvg } from "./lib/rating.js";
import { makeSignPad } from "./lib/signpad.js";

// ── 保存（試作のあいだはこの端末のブラウザの中だけ） ──
const KEY = "kayoicho.v1";
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
const state = Object.assign({ entries: [], target: "diamond", status: "regular", card: "amc" }, load());

const $ = (s) => document.querySelector(s);
const fmt = (n) => Number(n || 0).toLocaleString("ja-JP");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const opt = (v, label, sel) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(label)}</option>`;

let year = new Date().getFullYear();

// ── 一覧の画面 ──
function routeText(e) {
  if (e.kind === "intl") {
    // 国際線は日本側・海外側で持っているので、空港コードがあれば向きをそれで出す
    if (e.fromCode && e.toCode) return `${airportName(e.fromCode)} → ${airportName(e.toCode)}`;
    return `${e.japan || "?"} ⇄ ${e.foreign || "?"}`;
  }
  if (e.kind === "award") return `${airportName(e.fromCode) || "?"} → ${airportName(e.toCode) || "?"}`;
  return `${e.from || "?"} → ${e.to || "?"}`;
}
function fareText(e) {
  if (e.kind === "award") return "特典航空券";
  if (e.kind === "domestic") {
    if (e.fare === AWARD_FARE) return "特典航空券";
    const f = faresFor(e.seat || "economy").find((x) => x.id === e.fare);
    return f ? f.label : "運賃未選択";
  }
  return e.cls ? `予約クラス ${e.cls}` : "予約クラス未選択";
}

// 一覧の小さな写真。写真の無い記録は空の色に空港コードだけ載せる。
const thumbUrls = new Map();
async function fillThumbs() {
  for (const el of document.querySelectorAll(".thumb[data-photo]")) {
    const id = el.dataset.photo;
    let url = thumbUrls.get(id);
    if (!url) {
      const blob = await getPhoto(id);
      if (!blob) continue;
      url = URL.createObjectURL(blob);
      thumbUrls.set(id, url);
    }
    el.insertAdjacentHTML("afterbegin", `<img src="${url}" alt="">`);
  }
}

function renderHome() {
  $("#yearLabel").textContent = `${year}年`;
  const today = todayStr();
  const s = yearSummary(state.entries, year, today, { statusId: state.status, cardId: state.card });
  const r = remaining(s, state.target, false);
  const rp = remaining(s, state.target, true);
  const t = r.target;
  const pct = (v, max) => Math.min(100, (v / max) * 100).toFixed(1);

  $("#heroNum").innerHTML = `
    <div class="label">${year}年に乗った分のPP</div>
    <div class="big">${fmt(s.pp)}<small>PP</small></div>
    <div class="planned">${s.planned ? `予定の${s.planned}区間を入れると ${fmt(s.pp + s.ppPlanned)} PP` : "&nbsp;"}</div>`;

  $("#summary").innerHTML = `
    <div class="target">
      <div class="target-head">
        <span>目標</span>
        <select id="targetSel">${TARGETS.map((x) => opt(x.id, x.label, state.target)).join("")}</select>
      </div>
      <div class="bar">
        <div class="bar-row"><span>年間PP</span><span><b>${fmt(r.total)}</b> / ${fmt(t.total)}</span></div>
        <div class="track"><div class="fill plan" style="width:${pct(rp.total, t.total)}%"></div><div class="fill" style="width:${pct(r.total, t.total)}%"></div></div>
      </div>
      <div class="bar">
        <div class="bar-row"><span>うちANAグループ運航便</span><span><b>${fmt(r.ana)}</b> / ${fmt(t.anaGroup)}</span></div>
        <div class="track"><div class="fill plan" style="width:${pct(rp.ana, t.anaGroup)}%"></div><div class="fill" style="width:${pct(r.ana, t.anaGroup)}%"></div></div>
      </div>
      <div class="rest">${r.reached
        ? `<span class="reached">${t.label}の条件に届きました</span>`
        : `${t.label}まで あと <b>${fmt(Math.max(r.restTotal, r.restAna))}</b> PP` +
          (s.planned && !rp.reached ? `<div class="note">予定の便に乗ると、あと ${fmt(Math.max(rp.restTotal, rp.restAna))} PP</div>` : "") +
          (s.planned && rp.reached ? `<div class="note">予定の便に乗れば届きます</div>` : "")}
      </div>
    </div>
    <div class="stats">
      <div><b>${s.flights}</b><span>搭乗した区間</span></div>
      <div><b>${fmt(s.distance)}</b><span>飛んだマイル</span></div>
      <div><b>${fmt(s.totalMiles)}</b><span>貯まったマイル</span></div>
    </div>
    ${s.incomplete ? `<div class="warn">運賃や予約クラスが未選択の記録が${s.incomplete}件あります。PPに入っていません。</div>` : ""}`;
  $("#targetSel").onchange = (ev) => { state.target = ev.target.value; save(); renderHome(); };

  const rows = state.entries.filter((e) => (e.date || "").startsWith(String(year)))
    .sort((a, b) => (b.date + (b.depActual || "")).localeCompare(a.date + (a.depActual || "")));
  if (!rows.length) {
    $("#logList").innerHTML = `<div class="card empty">${year}年の記録はまだありません。<br>右下の「記録する」から書き始めましょう。</div>`;
    return;
  }
  const byMonth = new Map();
  for (const e of rows) {
    const m = Number(e.date.slice(5, 7));
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(e);
  }
  const wd = ["日", "月", "火", "水", "木", "金", "土"];
  $("#logList").innerHTML = [...byMonth].map(([m, list]) => `
    <h2>${year}.${String(m).padStart(2, "0")}</h2>
    ${list.map((e) => {
      const p = entryPoints(e);
      const d = new Date(e.date + "T00:00:00");
      const flown = isFlown(e, today);
      return `<button class="entry${flown ? "" : " plan"}" data-id="${esc(e.id)}">
        <div class="thumb"${e.hasPhoto ? ` data-photo="${esc(e.id)}"` : ""}>
          <div class="codes">${esc(e.fromCode || "")}<br><i>✈</i> ${esc(e.toCode || "")}</div>
        </div>
        <div class="what">
          <span class="date">${d.getMonth() + 1}/${d.getDate()}（${wd[d.getDay()]}）</span>
          <b>${esc(e.flightNo || "便名なし")}</b>${flown ? "" : '<span class="stamp">予定</span>'}${e.rating ? `<span class="face">${faceSvg(e.rating, 22)}</span>` : ""}
          <span class="route">${esc(routeText(e))}</span>
          <span class="fare">${esc(fareText(e))}${e.seatNo ? "・" + esc(e.seatNo) : ""}</span>
        </div>
        <div class="pts">${p.ok ? fmt(p.pp) : "—"}<small>PP</small></div>
      </button>`;
    }).join("")}`).join("");
  document.querySelectorAll(".entry").forEach((b) => (b.onclick = () => openSheet(b.dataset.id)));
  fillThumbs();
}

// ── 入力画面 ──
const form = $("#form");
let editingId = null;

function fillSelects(e) {
  $("#kindSel").innerHTML = KINDS.map((k) => opt(k.id, k.label, e.kind)).join("");
  const from = e.from || "";
  $("#fromSel").innerHTML = opt("", "選んでください", from) + ALL_AIRPORTS.map((a) => opt(a, a, from)).join("");
  const dests = from ? destinations(from) : [];
  $("#toSel").innerHTML = opt("", from ? "選んでください" : "先に出発を", e.to || "") + dests.map((a) => opt(a, a, e.to)).join("");
  $("#japanSel").innerHTML = opt("", "選んでください", e.japan || "") + INTL_ORIGINS.map((a) => opt(a, a, e.japan)).join("");
  const fdests = e.japan ? intlDests(e.japan) : [];
  $("#foreignSel").innerHTML = opt("", e.japan ? "選んでください" : "先に日本側を", e.foreign || "") + fdests.map((a) => opt(a, a, e.foreign)).join("");
  const seat = e.seat || "economy";
  $("#seatSel").innerHTML = SEATS.map((s) => opt(s.id, s.label, seat)).join("");
  $("#fareSel").innerHTML = opt("", "選んでください", e.fare || "") + faresFor(seat).map((f) => opt(f.id, f.label, e.fare)).join("")
    + opt(AWARD_FARE, "特典航空券（PP・マイルなし）", e.fare);
  const codes = e.kind === "intl" ? INTL_CLASSES.map((c) => c.code) : intlDomCodes();
  $("#clsSel").innerHTML = opt("", "選んでください", e.cls || "") + codes.map((c) => opt(c, c, e.cls)).join("");
}

function readForm() {
  const fd = new FormData(form);
  const e = {};
  for (const [k, v] of fd.entries()) e[k] = typeof v === "string" ? v.trim() : v;
  e.paidUpgrade = !!form.paidUpgrade.checked;
  e.flightNo = (e.flightNo || "").toUpperCase();
  return e;
}

function writeForm(e) {
  fillSelects(e);
  for (const el of form.elements) {
    if (!el.name || el.type === "file") continue;
    if (el.type === "checkbox") el.checked = !!e[el.name];
    else if (el.type === "radio") el.checked = el.value === String(e[el.name] ?? "");
    else if (el.tagName !== "SELECT") el.value = e[el.name] ?? "";
  }
  showKind(e.kind);
  preview();
}

function showKind(kind) {
  form.querySelectorAll("[data-show]").forEach((el) => {
    el.hidden = !el.dataset.show.split(" ").includes(kind);
  });
}

function preview() {
  const e = readForm();
  const p = entryPoints(e);
  const box = $("#ppPreview");
  box.className = "pp" + (p.ok ? "" : " ng");
  if (!p.ok) { box.textContent = p.reason; return; }
  box.innerHTML = p.award
    ? "特典航空券は PP もマイルも付きません"
    : `この区間の PP <b>${fmt(p.pp)}</b>　フライトマイル ${fmt(p.miles)}（区間 ${fmt(p.base)} マイル）`;
}

// 選んだ値に応じて、ほかの選択肢を作り直す（出発→到着、クラス→運賃 など）
form.addEventListener("change", (ev) => {
  const n = ev.target.name;
  if (["kind", "from", "japan", "seat"].includes(n)) {
    const e = readForm();
    if (n === "from") e.to = "";
    if (n === "japan") e.foreign = "";
    if (n === "kind") e.cls = "";
    fillSelects(e);
    showKind(e.kind);
  }
  // 都市を選んだら、カードに載せる空港コードも入れておく（違えば利用者が直す）
  if (n === "from") form.fromCode.value = cityCode(form.from.value);
  if (n === "to") form.toCode.value = cityCode(form.to.value);
  if (n === "japan" || n === "foreign") {
    const j = cityCode(form.japan.value), f = cityCode(form.foreign.value);
    if (n === "japan") form.fromCode.value = j;
    if (n === "foreign") form.toCode.value = f;
  }
  preview();
  drawPreview();
});
form.addEventListener("input", (ev) => {
  if (ev.target.name === "fromCode" || ev.target.name === "toCode") ev.target.value = ev.target.value.toUpperCase();
  preview();
  drawPreview();
});

// ── その日の感想（顔）とCAさんのサイン ──
$("#faces").innerHTML = RATINGS.map((r) =>
  `<label><input type="radio" name="rating" value="${r.id}">${faceSvg(r.id, 40)}<span>${r.label}</span></label>`).join("");
let signChanged = false, signBmp = null;
const pad = makeSignPad($("#signPad"), async () => {
  signChanged = true;
  signBmp = await createImageBitmap(await pad.toBlob());
  drawPreview();
});
$("#signClear").onclick = () => { pad.clear(); signChanged = true; signBmp = null; drawPreview(); };

// ── 思い出の1枚 ──
let photo = { blob: null, bmp: null, changed: false };
let drawTimer = null;
function cardData() {
  const e = readForm();
  return { flightNo: e.flightNo, fromCode: e.fromCode, toCode: e.toCode, date: e.date, photo: photo.bmp, sign: signBmp };
}
function drawPreview() {
  clearTimeout(drawTimer);
  drawTimer = setTimeout(() => drawCard($("#cardCanvas"), cardData(), 0.5), 120);
}
async function setPhoto(blob, changed) {
  photo = { blob, bmp: blob ? await createImageBitmap(blob) : null, changed };
  $("#photoRemove").hidden = !blob;
  drawPreview();
}
$("#photoInput").addEventListener("change", async (ev) => {
  const f = ev.target.files[0];
  ev.target.value = "";
  if (f) await setPhoto(await shrink(f), true);
});
$("#photoRemove").onclick = () => setPhoto(null, true);
$("#shareBtn").onclick = async () => {
  const c = document.createElement("canvas");
  await drawCard(c, cardData(), 1);
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.92));
  const e = readForm();
  const name = `空の通い帳_${e.date || ""}_${e.flightNo || ""}.jpg`;
  const file = new File([blob], name, { type: "image/jpeg" });
  // iPhone は共有シートから「画像を保存」で写真に入れられる。使えない環境ではダウンロードする。
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (err) { if (err.name === "AbortError") return; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
};

async function openSheet(id) {
  editingId = id || null;
  const e = id ? state.entries.find((x) => x.id === id) : { kind: "domestic", date: todayStr(), seat: "economy" };
  $("#sheetTitle").textContent = id ? "記録を直す" : "記録する";
  $("#deleteBtn").hidden = !id;
  $("#scanMsg").hidden = true;
  writeForm(e);
  $("#sheet").hidden = false;
  $("#sheet").scrollTop = 0;
  pad.fit();
  const sb = id && e.hasSign ? await getPhoto(id + "#sign") : null;
  await pad.load(sb);
  signBmp = sb ? await createImageBitmap(sb) : null;
  signChanged = false;
  await setPhoto(id && e.hasPhoto ? await getPhoto(id) : null, false);
}
function closeSheet() { $("#sheet").hidden = true; }

$("#newBtn").onclick = () => openSheet(null);
$("#closeBtn").onclick = closeSheet;
$("#saveBtn").onclick = async () => {
  const e = readForm();
  if (!e.date) { alertField("日付を入れてください"); return; }
  const id = editingId || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const prev = state.entries.find((x) => x.id === id);
  e.hasPhoto = photo.changed ? !!photo.blob : !!(prev && prev.hasPhoto);
  if (photo.changed) {
    if (photo.blob) await putPhoto(id, photo.blob); else await deletePhoto(id);
    if (thumbUrls.has(id)) { URL.revokeObjectURL(thumbUrls.get(id)); thumbUrls.delete(id); }
  }
  e.hasSign = signChanged ? pad.hasInk() : !!(prev && prev.hasSign);
  if (signChanged) {
    if (pad.hasInk()) await putPhoto(id + "#sign", await pad.toBlob()); else await deletePhoto(id + "#sign");
  }
  if (prev) Object.assign(prev, e); else state.entries.push({ ...e, id });
  year = Number(e.date.slice(0, 4));
  save(); closeSheet(); renderHome();
};
$("#deleteBtn").onclick = async () => {
  if (!editingId) return;
  if (!confirm("この記録を消します。よろしいですか？")) return;
  await deletePhoto(editingId);
  await deletePhoto(editingId + "#sign");
  state.entries = state.entries.filter((x) => x.id !== editingId);
  save(); closeSheet(); renderHome();
};
function alertField(msg) {
  const m = $("#scanMsg");
  m.hidden = false; m.textContent = msg;
  $("#sheet").scrollTop = 0;
}

// ── 搭乗券のスクリーンショットから入れる ──
// 読み取り部品（zxing-wasm）は重いので、使うときに初めて読み込む。
let zxingReady = null;
function loadZXing() {
  if (!zxingReady) {
    zxingReady = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.5/dist/iife/reader/index.js";
      s.onload = () => res(window.ZXingWASM);
      s.onerror = () => { zxingReady = null; rej(new Error("読み取り部品を読み込めませんでした")); };
      document.head.append(s);
    });
  }
  return zxingReady;
}

async function readBarcode(file) {
  const ZX = await loadZXing();
  // 画素に直してから渡す（ファイルのままだと webp などで読めなかった）。大きい画像は縮めて読み直す。
  const bmp = await createImageBitmap(file);
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  for (const w of [bmp.width, 1200, 800]) {
    if (w > bmp.width) continue;
    const h = Math.round(bmp.height * w / bmp.width);
    cv.width = w; cv.height = h;
    ctx.drawImage(bmp, 0, 0, w, h);
    const res = await ZX.readBarcodes(ctx.getImageData(0, 0, w, h), { tryHarder: true, maxNumberOfSymbols: 3 });
    const hit = res.find((r) => r.isValid && r.text);
    if (hit) return hit.text;
  }
  return null;
}

$("#scanInput").addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = "";
  if (!file) return;
  const msg = $("#scanMsg");
  msg.hidden = false; msg.textContent = "読み取っています…";
  try {
    const text = await readBarcode(file);
    const legs = text ? parseBCBP(text) : null;
    if (!legs) { msg.textContent = "搭乗券のバーコードが見つかりませんでした。バーコード全体が写っているか確かめてください。"; return; }
    const L = legs[0];
    const e = readForm();
    e.date = dateFromDayOfYear(L.dayOfYear) || e.date;
    e.flightNo = flightNo(L.carrier, L.number);
    e.seatNo = seatNo(L.seat);
    e.fromCode = L.from; e.toCode = L.to;
    const g = guessRoute(L.from, L.to);
    if (g && g.kind === "domestic") {
      if (!["domestic", "intlDom"].includes(e.kind)) e.kind = "domestic";
      e.from = g.from; e.to = g.to;
    } else if (g && g.kind === "intl") {
      e.kind = "intl"; e.japan = g.japan; e.foreign = g.foreign;
    }
    if (e.kind === "domestic") e.seat = ["F", "A", "P"].includes(L.compartment) ? "first" : "economy";
    writeForm(e);
    drawPreview();
    msg.textContent = `${L.from}→${L.to} ${e.flightNo} を入れました。` +
      (g ? "" : "空港が一覧に無いので、区間は選んでください。") +
      "運賃の種類（予約クラス）は搭乗券に入っていないので、選んでください。年が違っていたら日付を直してください。";
  } catch (err) {
    msg.textContent = "読み取れませんでした（" + err.message + "）";
  }
});

// ── 設定 ──
$("#statusSel").innerHTML = STATUSES.map((s) => opt(s.id, s.label, state.status)).join("");
$("#cardSel").innerHTML = CARDS.map((c) => opt(c.id, c.label, state.card)).join("");
$("#statusSel").onchange = (ev) => { state.status = ev.target.value; save(); renderHome(); };
$("#cardSel").onchange = (ev) => { state.card = ev.target.value; save(); renderHome(); };
$("#prevYear").onclick = () => { year--; renderHome(); };
$("#nextYear").onclick = () => { year++; renderHome(); };
$("#clearBtn").onclick = () => {
  if (!confirm("この端末の記録を全部消します。よろしいですか？")) return;
  state.entries = []; save(); renderHome();
};
// 見本: 区間と運賃は実際の搭乗実績でPPを確かめたもの。日付は見本用に変えてある（公開URLで個人の旅程を出さない）
$("#sampleBtn").onclick = () => {
  const s = [
    ["2026-08-02", "NH794", { fromCode: "OIT", toCode: "HND", kind: "domestic", from: "大分", to: "東京", seat: "economy", fare: "award" }, {}],
    ["2026-08-08", "NH3162", { fromCode: "OIT", toCode: "NGO", kind: "domestic", from: "大分", to: "名古屋", seat: "economy", fare: "standard" }, {}],
    ["2026-08-11", "NH867", { fromCode: "HND", toCode: "GMP", kind: "intl", japan: "東京", foreign: "ソウル", cls: "Y" }, {}],
    ["2026-08-11", "NH579", { fromCode: "NGO", toCode: "ISG", kind: "intlDom", from: "名古屋", to: "石垣", cls: "Y" }, {}],
    ["2026-08-11", "NH92", { fromCode: "ISG", toCode: "HND", kind: "intlDom", from: "石垣", to: "東京", cls: "Y" }, {}],
    ["2026-08-21", "NH864", { fromCode: "GMP", toCode: "HND", kind: "intl", japan: "東京", foreign: "ソウル", cls: "Y" }, {}],
    ["2026-08-22", "NH89", { fromCode: "HND", toCode: "ISG", kind: "intlDom", from: "東京", to: "石垣", cls: "Y" }, {}],
    ["2026-08-22", "NH580", { fromCode: "ISG", toCode: "NGO", kind: "intlDom", from: "石垣", to: "名古屋", cls: "Y" }, {}],
    ["2026-08-22", "NH3165", { fromCode: "NGO", toCode: "OIT", kind: "domestic", from: "名古屋", to: "大分", seat: "economy", fare: "standard" }, {}],
    ["2026-12-10", "NH241", { fromCode: "HND", toCode: "FUK", kind: "domestic", from: "東京", to: "福岡", seat: "economy", fare: "standard" }, {}],
  ];
  s.forEach(([date, fn, a, b], i) => state.entries.push({ id: "sample" + Date.now().toString(36) + i, date, flightNo: fn, ...a, ...b }));
  year = 2026; save(); renderHome();
};

renderHome();
