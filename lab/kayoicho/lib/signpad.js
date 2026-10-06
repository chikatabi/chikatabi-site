// シグネチャーを指やペンで書く欄。書いた線は透明な背景の画像として保存する。
export function makeSignPad(canvas, onChange) {
  const ctx = canvas.getContext("2d");
  let drawing = false, last = null, inked = false;

  // 画面の解像度に合わせて、線がにじまないようにする。
  // 書いた線は引き継がない（前の記録のサインが次の記録に残る不具合があったため。2026-10-06 CHIKA指摘）
  function fit() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    inked = false;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = "#1D2A3F";
  }
  const pt = (ev) => {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top, p: ev.pressure || 0.5 };
  };
  canvas.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    canvas.setPointerCapture(ev.pointerId);
    drawing = true; last = pt(ev);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!drawing) return;
    const p = pt(ev);
    // ペンの筆圧があれば線の太さに反映する（指では一定）
    ctx.lineWidth = ev.pointerType === "pen" ? 1.5 + p.p * 3 : 3;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    if (!inked) { inked = true; }
  });
  const end = () => { if (drawing) { drawing = false; onChange && onChange(); } };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  return {
    fit,
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); inked = false; },
    hasInk: () => inked,
    async load(blob) {
      this.clear();
      if (!blob) return;
      const bmp = await createImageBitmap(blob);
      const r = canvas.getBoundingClientRect();
      ctx.drawImage(bmp, 0, 0, r.width, r.height);
      inked = true;
    },
    toBlob: () => new Promise((res) => canvas.toBlob(res, "image/png")),
  };
}
