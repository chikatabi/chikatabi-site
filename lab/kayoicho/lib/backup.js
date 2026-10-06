// 書き出しと読み込み（機種変更の引っ越しと、控えのため）。
// 記録・設定・写真・Signature を1つの JSON ファイルにまとめる。サーバーには送らない。
import { getPhoto, putPhoto } from "./photos.js";

export const FORMAT = "kayoicho-backup";
export const VERSION = 1;

const blobToDataURL = (b) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result);
  r.onerror = () => rej(r.error);
  r.readAsDataURL(b);
});
const dataURLToBlob = async (u) => (await fetch(u)).blob();

// state → ファイルの中身（文字列）
export async function pack(state, today) {
  const media = {};
  for (const e of state.entries) {
    if (e.hasPhoto) { const b = await getPhoto(e.id); if (b) media[e.id] = await blobToDataURL(b); }
    if (e.hasSign) { const b = await getPhoto(e.id + "#sign"); if (b) media[e.id + "#sign"] = await blobToDataURL(b); }
  }
  const { lastExport, ...rest } = state;
  return JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: today, state: rest, media });
}

// ファイルの中身 → 今の state に足す。同じ記録（同じ id）は読み込んだ方で上書きする。
// 戻り値: { state, added, updated }
export async function unpack(text, current) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("空の通い帳のファイルではありません"); }
  if (!data || data.format !== FORMAT || !data.state || !Array.isArray(data.state.entries)) {
    throw new Error("空の通い帳のファイルではありません");
  }
  const byId = new Map(current.entries.map((e) => [e.id, e]));
  let added = 0, updated = 0;
  for (const e of data.state.entries) {
    if (!e || !e.id) continue;
    if (byId.has(e.id)) updated++; else added++;
    byId.set(e.id, e);
  }
  for (const [key, url] of Object.entries(data.media || {})) {
    await putPhoto(key, await dataURLToBlob(url));
  }
  const next = { ...current, entries: [...byId.values()] };
  // 設定は今の端末に何も無いときだけ引き継ぐ。有料かどうかは、どちらかが有料なら有料。
  for (const k of ["target", "status", "card"]) if (data.state[k] && !current.entries.length) next[k] = data.state[k];
  next.paid = !!(current.paid || data.state.paid);
  if (data.state.code && !current.code) next.code = data.state.code;
  return { state: next, added, updated };
}
