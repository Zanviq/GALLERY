// The 4×6 print: the capture laid out cols × rows on landscape paper, dashed trim lines, a one-line
// imprint in the margin, then a trimmer wheel runs every line and the cuts part.
import { SHEET, cm } from './formats.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const SVGNS = 'http://www.w3.org/2000/svg';

export function createSheet(els) {
  const { block, sheet, paper, cuts, blade, what, verdict, mirror } = els;
  let current = null, run = 0;

  function layout(F) {
    const mx = (SHEET.w - F.cols * F.w) / 2, my = (SHEET.h - F.rows * F.h) / 2;
    return { mx, my };
  }

  function drawPaper() {
    if (!current) return;
    const { F } = current, { my } = layout(F);
    const r = sheet.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    paper.width = Math.round(r.width * dpr); paper.height = Math.round(r.height * dpr);
    const c = paper.getContext('2d'), k = paper.width / SHEET.w;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, paper.width, paper.height);
    if (my >= 4.5) {
      c.setTransform(k, 0, 0, k, 0, 0);
      c.fillStyle = '#101214';
      c.font = `500 ${Math.min(2.1, (my - 3) * 0.75)}px "Noto Sans KR", sans-serif`;
      c.textBaseline = 'middle';
      const d = new Date();
      c.fillText(`정면사진관   ${F.name} ${size(F)} cm   ${F.cols * F.rows}컷   ${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`, (SHEET.w - F.cols * F.w) / 2, SHEET.h - (my - 3) / 2 + 0.1);
    }
  }

  function drawLines(progress) {
    const { F } = current, { mx, my } = layout(F);
    const r = sheet.getBoundingClientRect(), k = r.width / SHEET.w;
    blade.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    const lines = trimLines(F, mx, my).map(([x1, y1, x2, y2]) => [x1 * k, y1 * k, x2 * k, y2 * k]);
    // dashed trim lines across the photo block, short solid crop marks in the margins
    const bw = F.cols * F.w, bh = F.rows * F.h, dash = [], ticks = [];
    for (let r = 0; r <= F.rows; r++) { const y = (my + r * F.h) * k; dash.push(`M${mx * k} ${y}H${(mx + bw) * k}`); if (mx > 3.5) ticks.push(`M${(mx - 3) * k} ${y}H${(mx - 0.8) * k}M${(mx + bw + 0.8) * k} ${y}H${(mx + bw + 3) * k}`); }
    for (let c = 0; c <= F.cols; c++) { const x = (mx + c * F.w) * k; dash.push(`M${x} ${my * k}V${(my + bh) * k}`); if (my > 3.5) ticks.push(`M${x} ${(my - 3) * k}V${(my - 0.8) * k}M${x} ${(my + bh + 0.8) * k}V${(my + bh + 3) * k}`); }
    let s = `<path d="${dash.join('')}" stroke="#101214" stroke-width="1.2" stroke-dasharray="5 4" fill="none"/><path d="${ticks.join('')}" stroke="#101214" stroke-width="1.2" fill="none"/>`;
    if (progress) {
      const { done, at } = progress;
      const cut = lines.slice(0, done).map(([a, b, c2, d]) => `M${a} ${b}L${c2} ${d}`).join('');
      let partial = '', wheel = '';
      if (at) {
        const [a, b, c2, d] = lines[done], t = at;
        const x = a + (c2 - a) * t, y = b + (d - b) * t;
        partial = `M${a} ${b}L${x} ${y}`;
        wheel = `<circle cx="${x}" cy="${y}" r="9" fill="#FFFFFF" stroke="#101214" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2.5" fill="#101214"/>`;
      }
      s += `<path d="${cut}${partial}" stroke="#101214" stroke-width="2" fill="none"/>` + wheel;
    }
    blade.innerHTML = s;
  }

  function trimLines(F, mx, my) {
    const out = [];
    for (let r = 0; r <= F.rows; r++) out.push([0, my + r * F.h, SHEET.w, my + r * F.h]);
    for (let c = 0; c <= F.cols; c++) out.push([mx + c * F.w, 0, mx + c * F.w, SHEET.h]);
    return out;
  }

  function placeCuts(spread) {
    const { F, photo } = current, { mx, my } = layout(F);
    const r = sheet.getBoundingClientRect(), gap = Math.max(6, r.width * 0.012);
    if (!cuts.childElementCount) {
      for (let row = 0; row < F.rows; row++) for (let col = 0; col < F.cols; col++) {
        const d = document.createElement('div');
        d.className = 'sheet__cut';
        d.style.left = `${(mx + col * F.w) / SHEET.w * 100}%`;
        d.style.top = `${(my + row * F.h) / SHEET.h * 100}%`;
        d.style.width = `${F.w / SHEET.w * 100}%`;
        d.style.height = `${F.h / SHEET.h * 100}%`;
        const cv = document.createElement('canvas');
        cv.width = photo.width; cv.height = photo.height;
        cv.getContext('2d').drawImage(photo, 0, 0);
        d.append(cv);
        d.dataset.col = col; d.dataset.row = row;
        cuts.append(d);
      }
    }
    for (const d of cuts.children) {
      const dx = (d.dataset.col - (F.cols - 1) / 2) * gap, dy = (d.dataset.row - (F.rows - 1) / 2) * gap;
      d.style.transform = spread ? `translate(${dx}px, ${dy}px)` : '';
    }
  }

  function animateCut(id) {
    const { F } = current, { mx, my } = layout(F);
    const lines = trimLines(F, mx, my);
    const durs = lines.map((l, i) => (i <= F.rows ? 260 : 190));
    const total = durs.reduce((a, b) => a + b, 0);
    const t0 = performance.now() + 450;
    const step = (t) => {
      if (id !== run) return;
      let e = t - t0;
      if (e < 0) { requestAnimationFrame(step); return; }
      if (e >= total) {
        blade.innerHTML = '';
        sheet.classList.add('is-cut');
        placeCuts(true);
        return;
      }
      let done = 0;
      while (e > durs[done]) { e -= durs[done]; done++; }
      drawLines({ done, at: e / durs[done] });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function size(F) { return `${cm(F.w, F.w % 10 ? 1 : 0)} × ${cm(F.h, F.h % 10 ? 1 : 0)}`; }

  function verdictText(F, result, camera) {
    if (camera) {
      const bg = result.bg.ok ? '배경은 맞았습니다.' : '배경에 무늬나 그림자가 보입니다.';
      return `카메라 사진은 배경만 쟀습니다. ${bg} 머리 크기와 눈높이는 가이드 띠를 보고 직접 확인하세요.`;
    }
    const keys = ['head', 'eye', 'center', 'level', 'bg'];
    const n = keys.filter((k) => result[k].ok).length;
    if (n === 5) return '규격 확인 5/5. 이대로 내셔도 됩니다.';
    const raw = result.raw, out = [];
    const mm = (v) => `${v.toFixed(1)} mm`;
    if (!result.head.ok) out.push(raw.head < F.head[0] ? `머리가 ${mm(F.head[0] - raw.head)} 작습니다.` : `머리가 ${mm(raw.head - F.head[1])} 큽니다.`);
    if (!result.eye.ok) out.push(raw.eyeUp < F.eye[0] ? `눈높이가 ${mm(F.eye[0] - raw.eyeUp)} 낮습니다.` : `눈높이가 ${mm(raw.eyeUp - F.eye[1])} 높습니다.`);
    if (!result.center.ok) out.push(`얼굴이 ${raw.off > 0 ? '오른쪽' : '왼쪽'}으로 ${mm(Math.abs(raw.off))} 치우쳤습니다.`);
    if (!result.level.ok) out.push(`화면 ${raw.tilt > 0 ? '오른쪽' : '왼쪽'}이 ${Math.abs(raw.tilt).toFixed(1)}° 낮습니다.`);
    if (!result.bg.ok) out.push('배경지 끝이 찍혔습니다.');
    return `규격 확인 ${n}/5. ${out.join(' ')} 가게에서는 이 컷을 다시 찍습니다.`;
  }

  async function show(photo, F, result, { camera = false } = {}) {
    const id = ++run;
    current = { photo, F };
    block.hidden = false;
    sheet.classList.remove('is-cut');
    cuts.textContent = '';
    what.textContent = `${F.name} ${size(F)} cm, 4×6 인화지에 ${F.cols * F.rows}컷.`;
    verdict.textContent = verdictText(F, result, camera);
    mirror.hidden = !camera;
    paper.setAttribute('aria-label', `4×6 인화지. ${F.name} 사진 ${F.cols * F.rows}컷이 ${F.cols}열 ${F.rows}줄로 놓이고 점선 재단선이 그어져 있습니다.`);
    try { await document.fonts.load('500 12px "Noto Sans KR"', '정면사진관'); } catch (e) { /* draw with the fallback */ }
    if (id !== run) return;
    drawPaper();
    placeCuts(false);
    drawLines(null);
    if (!reduced.matches) animateCut(id);
  }

  new ResizeObserver(() => {
    if (!current || block.hidden) return;
    drawPaper();
    if (sheet.classList.contains('is-cut')) { blade.innerHTML = ''; placeCuts(true); } else drawLines(null);
  }).observe(sheet);

  return { show };
}
