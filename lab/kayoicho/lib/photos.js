// 写真の保存。localStorage には入りきらないので、ブラウザの IndexedDB に入れる。
// 試作のあいだは端末の中だけ。サーバーへの保存は次の段階。
const DB = "kayoicho", STORE = "photos";

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out && "result" in out ? out.result : undefined);
    t.onerror = () => rej(t.error);
  });
}
export const getPhoto = (id) => tx("readonly", (s) => s.get(id)).catch(() => null);
export const putPhoto = (id, blob) => tx("readwrite", (s) => s.put(blob, id));
export const deletePhoto = (id) => tx("readwrite", (s) => s.delete(id)).catch(() => {});

// 大きすぎる写真は長い辺 1600px に縮めて JPEG にする（保存の容量を抑える）
export async function shrink(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob(res, "image/jpeg", 0.88));
}
