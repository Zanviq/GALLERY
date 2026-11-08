// Frame fitting on a line-drawn face. Units inside both SVGs are millimetres.
import { FACES, state, update, subscribe } from './state.js';

const NS = 'http://www.w3.org/2000/svg';
const END = 8;          // endpiece width each side
const TIP = 38;         // the part of the temple that bends down behind the ear
const r1 = (n) => Math.round(n * 10) / 10;

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

/** A rounded-rectangle lens shape centred on (cx, cy), A wide and B high. */
export function lensPath(cx, cy, A, B) {
  const x0 = cx - A / 2, y0 = cy - B / 2, rx = B * 0.34, ry = B * 0.36;
  // slightly fuller at the top, like a wellington
  return `M${r1(x0 + rx)} ${r1(y0)}H${r1(x0 + A - rx)}` +
    `C${r1(x0 + A - rx * 0.3)} ${r1(y0)} ${r1(x0 + A)} ${r1(y0 + ry * 0.3)} ${r1(x0 + A)} ${r1(y0 + ry)}` +
    `V${r1(y0 + B - ry)}C${r1(x0 + A)} ${r1(y0 + B - ry * 0.2)} ${r1(x0 + A - rx * 0.4)} ${r1(y0 + B)} ${r1(x0 + A - rx * 1.2)} ${r1(y0 + B)}` +
    `H${r1(x0 + rx * 1.2)}C${r1(x0 + rx * 0.4)} ${r1(y0 + B)} ${r1(x0)} ${r1(y0 + B - ry * 0.2)} ${r1(x0)} ${r1(y0 + B - ry)}` +
    `V${r1(y0 + ry)}C${r1(x0)} ${r1(y0 + ry * 0.3)} ${r1(x0 + rx * 0.3)} ${r1(y0)} ${r1(x0 + rx)} ${r1(y0)}Z`;
}
export const lensHeight = (A) => Math.round(A * 0.76);

function dim(g, x1, x2, y, label, cls = '') {
  const grp = el('g', { class: 'dim ' + cls }, g);
  el('path', { d: `M${x1} ${y}H${x2}M${x1} ${y - 3}v6M${x2} ${y - 3}v6` }, grp);
  const t = el('text', { x: (x1 + x2) / 2, y: y - 3.2, 'text-anchor': 'middle' }, grp);
  t.textContent = label;
  return grp;
}

function drawFront(svg, s) {
  const f = FACES[s.face];
  svg.textContent = '';
  const h = f.width / 2, pd = f.pd / 2;
  const B = lensHeight(s.a), cy = 2, yTop = cy - B / 2;
  const face = el('g', { class: 'face' }, svg);
  for (const k of [-1, 1]) {
    // head contour, cropped top and bottom
    el('path', { d: `M${k * (h - 10)} -66C${k * (h - 3)} -46 ${k * h} -26 ${k * h} -6C${k * (h + 1)} 14 ${k * (h - 2)} 40 ${k * (h - 12)} 70` }, face);
    // ear
    el('path', { d: `M${k * h} -4C${k * (h + 9)} -11 ${k * (h + 12)} 2 ${k * (h + 10)} 13C${k * (h + 9)} 23 ${k * (h + 6)} 30 ${k * (h + 1)} 32` }, face);
    // eye, iris, pupil
    const ex = k * pd;
    el('path', { d: `M${ex - 14} 0Q${ex} -9 ${ex + 14} 0Q${ex} 7.5 ${ex - 14} 0Z` }, face);
    el('circle', { cx: ex, cy: 0, r: 5.4 }, face);
    el('circle', { cx: ex, cy: 0, r: 2.2, class: 'face__pupil' }, face);
    // brow
    el('path', { d: `M${ex - k * 15} -15Q${ex - k * 1} -22 ${ex + k * 16} -14` }, face);
    // side of the nose
    el('path', { d: `M${k * 7} -4C${k * 7.5} 14 ${k * 9} 28 ${k * 13} 40` }, face);
  }
  el('path', { d: 'M-13 40Q-9 49 -4 46Q0 49 4 46Q9 49 13 40' }, face);
  el('path', { d: 'M-18 66Q0 62 18 66' }, face);

  // frame
  const frame = el('g', { class: 'frame' }, svg);
  const lc = (s.a + s.dbl) / 2; // lens centre from the face midline
  for (const k of [-1, 1]) {
    el('path', { d: lensPath(k * lc, cy, s.a, B) }, frame);
    const outer = k * (s.dbl / 2 + s.a);
    const endX = outer + k * END;
    el('path', { d: `M${outer} ${yTop + 7}H${endX}` }, frame);
    // temple from the endpiece back to the side of the head
    el('path', { class: 'frame__temple', d: `M${endX} ${yTop + 7}L${k * (h + 1)} ${yTop + 9}` }, frame);
  }
  el('path', { d: `M${-s.dbl / 2} ${yTop + 9}Q0 ${yTop + 1} ${s.dbl / 2} ${yTop + 9}` }, frame);

  // dimensions: lens width and bridge above, PD below
  const dims = el('g', {}, svg);
  dim(dims, -(s.dbl / 2 + s.a), -s.dbl / 2, yTop - 8, String(s.a), 'dim--a');
  dim(dims, -s.dbl / 2, s.dbl / 2, yTop - 8, String(s.dbl), 'dim--dbl');
  const yPd = 57;
  dim(dims, -pd, pd, yPd, `PD ${f.pd}`, 'dim--pd');
  el('path', { class: 'dim__guide', d: `M${-pd} 6V${yPd - 3}M${pd} 6V${yPd - 3}` }, dims);
}

function drawSide(svg, s) {
  const f = FACES[s.face];
  svg.textContent = '';
  const B = lensHeight(s.a), cy = 2;
  const hinge = { x: 6, y: cy - B / 2 + 7 };
  const earX = hinge.x + f.ear;
  const face = el('g', { class: 'face' }, svg);
  // profile, looking left
  el('path', { d: 'M14 -70C6 -52 2 -36 3 -22C4 -14 2 -8 0 -4C-6 10 -14 24 -24 34C-27 37 -25 42 -20 42C-14 42 -10 44 -6 46C-7 52 -8 58 -6 66' }, face);
  el('path', { d: 'M4 -3Q9 -7 14 -2Q9 1 4 -3Z' }, face);
  el('path', { d: 'M14 -70C60 -86 130 -84 178 -56' }, face);
  // ear: top of the ear sits at earX
  el('path', { d: `M${earX} -12C${earX + 10} -18 ${earX + 20} -8 ${earX + 18} 8C${earX + 17} 22 ${earX + 10} 32 ${earX + 3} 36C${earX - 2} 38 ${earX - 3} 32 ${earX} 26` }, face);
  el('path', { d: `M${earX + 5} -4C${earX + 11} -6 ${earX + 13} 4 ${earX + 9} 14` }, face);
  el('path', { d: `M${earX + 6} 44C${earX - 2} 58 ${earX - 20} 66 ${earX - 40} 70` }, face);

  const frame = el('g', { class: 'frame' }, svg);
  // lens seen edge-on, tilted 8° (pantoscopic)
  el('path', { d: `M-5 ${cy - B / 2}L-1 ${cy + B / 2}` }, frame);
  el('path', { d: `M-5 ${cy - B / 2 + 4}L${hinge.x} ${hinge.y}` }, frame);
  const bendX = hinge.x + (s.l - TIP);
  const by = hinge.y + 3;
  el('path', { class: 'frame__temple', d: `M${hinge.x} ${hinge.y}L${bendX} ${by}C${bendX + 9} ${by + 2} ${bendX + 14} ${by + 14} ${bendX + 14} ${by + 30}` }, frame);

  // temple length is measured along the temple, hinge to tip
  const dims = el('g', { class: 'dim' }, svg);
  const tl = el('text', { x: (hinge.x + bendX) / 2, y: hinge.y - 4, 'text-anchor': 'middle' }, dims);
  tl.textContent = `다리 ${s.l}`;
  el('path', { class: 'dim__guide', d: `M${earX} ${hinge.y - 12}V${hinge.y + 20}` }, dims);
  const ear = el('text', { x: earX, y: hinge.y - 14, 'text-anchor': 'middle' }, dims);
  ear.textContent = '귀 위';
}

function verdict(s) {
  const f = FACES[s.face];
  const frameW = 2 * s.a + s.dbl + 2 * END;
  const dw = frameW - f.width;
  let width;
  if (Math.abs(dw) <= 4) width = `테 폭 ${frameW}mm, 얼굴 폭 ${f.width}mm. 폭이 맞아 관자놀이를 누르지 않고 옆으로 남지도 않습니다.`;
  else if (dw < 0) width = `테가 얼굴보다 ${-dw}mm 좁습니다. 다리가 관자놀이를 눌러 자국이 남습니다.`;
  else width = `테가 얼굴보다 ${dw}mm 넓습니다. 옆으로 남고 흘러내리기 쉽습니다.`;

  const d = (s.a + s.dbl - f.pd) / 2;
  let eye;
  if (d < 0) eye = `눈동자가 렌즈 가운데보다 귀 쪽에 있습니다. 렌즈 폭이나 브리지를 늘려 보세요.`;
  else if (d <= 4) eye = `눈동자가 렌즈 가운데에서 코 쪽으로 ${d}mm 떨어져 있습니다. 렌즈 두께가 고릅니다.`;
  else eye = `눈동자가 렌즈 가운데에서 코 쪽으로 ${d}mm 치우칩니다. 마이너스 렌즈는 귀 쪽 가장자리가 두꺼워집니다.`;

  const dt = s.l - TIP - f.ear;
  let temple;
  if (Math.abs(dt) <= 3) temple = '다리가 귀 바로 위에서 꺾입니다.';
  else if (dt < 0) temple = `다리가 ${-dt}mm 짧아 귀 앞에서 꺾입니다. 귀 윗부분을 누릅니다.`;
  else temple = `다리가 ${dt}mm 길어 귀 뒤로 남습니다. 안경이 코 아래로 내려옵니다.`;

  return {
    width: [width, Math.abs(dw) <= 4],
    eye: [eye, d >= 0 && d <= 4],
    temple: [temple, Math.abs(dt) <= 3],
  };
}

export function initFit() {
  const front = document.getElementById('face-front');
  const side = document.getElementById('face-side');
  if (!front || !side) return;
  const stamp = document.getElementById('stamp');
  const list = document.getElementById('fit-verdict');
  const inputs = { a: document.getElementById('r-a'), dbl: document.getElementById('r-dbl'), l: document.getElementById('r-l') };
  const outs = { a: document.getElementById('o-a'), dbl: document.getElementById('o-dbl'), l: document.getElementById('o-l') };
  const faceBtns = [...document.querySelectorAll('[data-face]')];
  let verdictTimer = 0;

  function render(s, changed) {
    drawFront(front, s);
    drawSide(side, s);
    for (const k of ['a', 'dbl', 'l']) {
      outs[k].textContent = `${s[k]}mm`;
      if (Number(inputs[k].value) !== s[k]) inputs[k].value = s[k];
      inputs[k].setAttribute('aria-valuetext', s[k] + '밀리미터');
      stamp.querySelector(`[data-part="${k}"]`).textContent = s[k];
    }
    stamp.querySelectorAll('[data-part]').forEach((n) => n.classList.toggle('is-live', !!changed && n.dataset.part === changed));
    for (const b of faceBtns) b.setAttribute('aria-pressed', String(b.dataset.face === s.face));
    // the live region speaks once the slider settles
    clearTimeout(verdictTimer);
    verdictTimer = setTimeout(() => {
      const v = verdict(s);
      for (const li of list.children) {
        const [text, ok] = v[li.dataset.check];
        li.textContent = text;
        li.classList.toggle('is-off', !ok);
      }
    }, changed ? 220 : 0);
  }

  for (const k of ['a', 'dbl', 'l']) {
    inputs[k].addEventListener('input', () => update({ [k]: Number(inputs[k].value) }));
    inputs[k].addEventListener('focus', () => render(state, k));
    inputs[k].addEventListener('blur', () => stamp.querySelectorAll('.is-live').forEach((n) => n.classList.remove('is-live')));
  }
  for (const b of faceBtns) b.addEventListener('click', () => update({ face: b.dataset.face }));

  subscribe((s, patch) => {
    if ('a' in patch || 'dbl' in patch || 'l' in patch || 'face' in patch) {
      render(s, Object.keys(patch).find((k) => k in inputs) || null);
    }
  });
  render(state, null);
}
