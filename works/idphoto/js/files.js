// The three files the shop hands over, built in the browser from the latest shot. Nothing leaves
// the device: each file is encoded with canvas.toBlob and handed to the browser's own download.
import { px } from './formats.js';

const LIMIT = 100 * 1024;

export function createFiles(els) {
  const { photoCanvas, caption, specs, buttons, status } = els;
  let shot = null; // { hi (600 dpi canvas), F, name }

  function scaled(src, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, h);
    return c;
  }
  const blob = (c, q) => new Promise((r) => c.toBlob(r, 'image/jpeg', q));

  function set(hi, F, text) {
    shot = { hi, F };
    const w3 = px(F.w, 300), h3 = px(F.h, 300), w6 = px(F.w, 600), h6 = px(F.h, 600);
    const shown = scaled(hi, w3, h3);
    photoCanvas.width = w3; photoCanvas.height = h3;
    photoCanvas.getContext('2d').drawImage(shown, 0, 0);
    photoCanvas.setAttribute('aria-label', `파일로 만들 ${F.name} 사진`);
    caption.textContent = text;
    specs['300'].textContent = `${w3} × ${h3} px, 300 dpi, JPG`;
    specs['600'].textContent = `${w6} × ${h6} px, 600 dpi, JPG`;
    specs.small.textContent = `${w3} × ${h3} px, 100 KB 이하 JPG`;
  }

  async function save(kind) {
    if (!shot) return;
    const { hi, F } = shot;
    let c, b;
    if (kind === '600') { c = hi; b = await blob(c, 0.92); }
    else {
      c = scaled(hi, px(F.w, 300), px(F.h, 300));
      if (kind === '300') b = await blob(c, 0.92);
      else {
        for (let q = 0.9; q >= 0.3; q -= 0.1) { b = await blob(c, q); if (b && b.size <= LIMIT) break; }
      }
    }
    if (!b) { status.textContent = '이 브라우저에서는 파일을 만들지 못했습니다.'; return; }
    const url = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jeongmyeon-${F.id}-${c.width}x${c.height}${kind === 'small' ? '-small' : ''}.jpg`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    status.textContent = `저장했습니다. ${c.width} × ${c.height} px, ${Math.max(1, Math.round(b.size / 1024))} KB.`;
  }

  for (const btn of buttons) btn.addEventListener('click', () => save(btn.dataset.save));
  return { set };
}
