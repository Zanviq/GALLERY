// The drawn customers. Each is a list of flat shapes in "world units": the head, crown to chin,
// is exactly 100 units, crown at y = 0, chin at y = 100, face centre on x = 0. The same shapes
// render as inline SVG (mini photos) and onto a canvas (the framing screen and the print).

export const INK = '#101214';
export const FLASH = '#FFFFFF';

const r2 = (n) => Math.round(n * 100) / 100;

// Smooth closed (or open) curve through points; a point [x, y, true] is a corner.
function spline(pts, closed = true) {
  const n = pts.length;
  const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}
const mirror = (pts) => pts.map(([x, y, c]) => [-x, y, c]);
const both = (half) => [...half, ...mirror(half.filter((p) => p[0] !== 0)).reverse()];

// The three customers. hairTop: skull top below the crown (hair volume). eyeFrac: eye line as a
// share of skull-top-to-chin. tilt: how crooked they sit (degrees). seat: where the stool is.
export const SITTERS = [
  {
    id: 1, hairTop: 6, eyeFrac: 0.44, cheek: 34, jaw: 24, hair: 'side', outfit: 'jacket', tilt: 3, seat: [16, 4],
    desc: '손님 1. 옆 가르마의 짧은 머리, 검은 재킷. 오른쪽으로 조금 기울어 앉았습니다.',
  },
  {
    id: 2, hairTop: 11, eyeFrac: 0.45, cheek: 32, jaw: 22, hair: 'long', outfit: 'cardigan', tilt: -2.5, seat: [-12, 0],
    desc: '손님 2. 귀 뒤로 넘긴 긴 머리, 검은 카디건. 머리숱이 많아 정수리가 높고 왼쪽으로 기울어 앉았습니다.',
  },
  {
    id: 3, hairTop: 3, eyeFrac: 0.43, cheek: 35, jaw: 27, hair: 'crop', outfit: 'knit', glasses: 'clear', tilt: 1.5, seat: [6, -6],
    desc: '손님 3. 아주 짧은 머리, 안경, 검은 니트. 머리가 작아 보여 더 당겨 찍어야 합니다.',
  },
];

export const PIVOT = [0, 230]; // the sitter leans around the seat of the stool

// Geometry every check needs, in sitter space (before tilt and seat).
export function landmarks(sp) {
  const t = sp.hairTop;
  const eyeY = t + sp.eyeFrac * (100 - t);
  return {
    crown: [0, 0], chin: [0, 100], eyeY, eyeMid: [0, eyeY],
    eyes: [[-13.5, eyeY], [13.5, eyeY]],
    shoulders: [[-112, 146], [112, 146]],
  };
}

// Sitter space -> world (tilt around the stool, then seat offset).
export function toWorld(sp, p) {
  const a = sp.tilt * Math.PI / 180;
  const x = p[0] - PIVOT[0], y = p[1] - PIVOT[1];
  return [PIVOT[0] + x * Math.cos(a) - y * Math.sin(a) + sp.seat[0], PIVOT[1] + x * Math.sin(a) + y * Math.cos(a) + sp.seat[1]];
}

// Build the shape list. opts can override: hair ('side' | 'long' | 'crop'), fringe ('heavy' | 'pinned'),
// ears ('covered'), smile ('teeth'), outfit ('jacket' | 'shirt' | 'cardigan' | 'knit'),
// glasses (false | 'clear' | 'glare').
export function shapes(sp, opts = {}) {
  const o = { hair: sp.hair, outfit: sp.outfit, glasses: sp.glasses || false, fringe: null, ears: null, smile: null, ...opts };
  const t = sp.hairTop, cw = sp.cheek, jw = sp.jaw;
  const eyeY = t + sp.eyeFrac * (100 - t);
  const out = [];
  const fill = (d, f = INK, extra = {}) => out.push({ d, fill: f, ...extra });
  const line = (d, s = INK, w = 1.4, extra = {}) => out.push({ d, stroke: s, width: w, ...extra });
  const shape = (d, f, s = INK, w = 1.4) => out.push({ d, fill: f, stroke: s, width: w });

  // ---- back hair (long hair falls behind the shoulders)
  if (o.hair === 'long') {
    fill(spline(both([[0, -2], [cw * 0.8, 2], [cw + 12, t + 22], [cw + 16, eyeY + 24], [cw + 20, 112], [cw + 30, 150, true], [cw + 4, 156], [0, 150]])));
  }

  // ---- body
  const neckL = -15, neckR = 15;
  if (o.outfit === 'jacket' || o.outfit === 'shirt') {
    const body = spline([[neckL, 110, true], [-32, 115], [-58, 121], [-90, 130], [-112, 146], [-120, 180], [-124, 240], [-128, 420, true], [128, 420, true], [124, 240], [120, 180], [112, 146], [90, 130], [58, 121], [32, 115], [neckR, 110, true]]);
    if (o.outfit === 'jacket') {
      fill(body);
      // shirt between the lapels
      shape(`M-16 109L16 109L23 122L0 178L-23 122Z`, FLASH, INK, 1.2);
      // collar wings
      shape(`M16 108L26 126L8 139L2 120Z`, FLASH, INK, 1.2);
      shape(`M-16 108L-26 126L-8 139L-2 120Z`, FLASH, INK, 1.2);
      // lapels, drawn as flash lines on the ink cloth
      line(`M23 122L41 160L30 168L0 230`, FLASH, 1.3, { join: 'miter' });
      line(`M-23 122L-41 160L-30 168L0 230`, FLASH, 1.3, { join: 'miter' });
      line(`M-112 196C-104 220 -100 260 -98 300`, FLASH, 0.9);
      line(`M112 196C104 220 100 260 98 300`, FLASH, 0.9);
      fill(`M-3 252a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z`, FLASH);
    } else {
      shape(body, FLASH, INK, 1.5);
      shape(`M16 108L27 128L7 138L1 118Z`, FLASH, INK, 1.2);
      shape(`M-16 108L-27 128L-7 138L-1 118Z`, FLASH, INK, 1.2);
      line(`M0 132L0 420`, INK, 1.1);
      line(`M-60 134C-56 150 -54 160 -54 176`, INK, 0.8);
      line(`M60 134C56 150 54 160 54 176`, INK, 0.8);
      for (const y of [170, 222, 274]) fill(`M-2.4 ${y}a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0Z`, INK);
    }
  } else if (o.outfit === 'cardigan') {
    fill(spline([[neckL, 112, true], [-34, 117], [-60, 124], [-92, 133], [-110, 150], [-116, 230], [-124, 420, true], [124, 420, true], [116, 230], [110, 150], [92, 133], [60, 124], [34, 117], [neckR, 112, true]]));
    // round-neck top
    shape(`M-30 118C-26 142 -12 152 0 152C12 152 26 142 30 118C20 114 -20 114 -30 118Z`, FLASH, INK, 1.2);
    line(`M-22 121C-18 138 -9 144 0 144C9 144 18 138 22 121`, INK, 0.9);
    // cardigan fronts
    line(`M30 118C30 162 14 192 10 420`, FLASH, 1.3);
    line(`M-30 118C-30 162 -14 192 -10 420`, FLASH, 1.3);
    for (const y of [214, 262, 310]) fill(`M14.5 ${y}a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0Z`, FLASH);
  } else if (o.outfit === 'knit') {
    fill(spline([[neckL, 111, true], [-36, 117], [-64, 124], [-98, 134], [-116, 152], [-122, 230], [-130, 420, true], [130, 420, true], [122, 230], [116, 152], [98, 134], [64, 124], [36, 117], [neckR, 111, true]]));
    line(`M-26 116C-20 132 -10 138 0 138C10 138 20 132 26 116`, FLASH, 1.3);
    line(`M-21 115C-16 127 -8 131 0 131C8 131 16 127 21 115`, FLASH, 0.8);
  }

  // ---- neck
  shape(`M-14 84L-15 114C-10 120 10 120 15 114L14 84Z`, FLASH, INK, 1.4);
  // shadow under the jaw: short hatching, like an engraved print
  for (let i = 0; i < 6; i++) line(`M${-11 + i * 4.4} 108L${-8 + i * 4.4} 101`, INK, 0.7);

  // ---- ears (hidden when hair covers them)
  const earsHidden = o.ears === 'covered';
  if (!earsHidden) {
    for (const s of [1, -1]) {
      shape(`M${s * (cw - 2)} ${eyeY - 5}C${s * (cw + 7)} ${eyeY - 8} ${s * (cw + 9)} ${eyeY + 6} ${s * (cw + 1)} ${eyeY + 17}Z`, FLASH, INK, 1.3);
      line(`M${s * (cw + 1.5)} ${eyeY - 1}C${s * (cw + 5)} ${eyeY} ${s * (cw + 5)} ${eyeY + 7} ${s * (cw + 2)} ${eyeY + 10}`, INK, 0.9);
    }
  }

  // ---- face
  const fr = [[cw * 0.56, t + 2.5], [cw * 0.9, t + 14], [cw, eyeY - 2], [cw * 0.97, eyeY + 14], [jw, 86], [jw * 0.5, 97]];
  const face = spline([[0, t], ...fr, [0, 100], ...mirror(fr).reverse()]);
  shape(face, FLASH, INK, 1.5);

  // ---- brows
  const b = eyeY - 9.5;
  for (const s of [1, -1]) {
    fill(`M${s * 5.5} ${b + 2}Q${s * 12} ${b - 2.6} ${s * 21.5} ${b + 0.8}L${s * 21} ${b + 2.2}Q${s * 12} ${b - 0.4} ${s * 5.5} ${b + 3.6}Z`);
  }
  // ---- eyes
  for (const s of [1, -1]) {
    const ex = s * 13.5;
    shape(`M${ex - 6.4} ${eyeY}C${ex - 3.6} ${eyeY - 3.7} ${ex + 3.6} ${eyeY - 3.7} ${ex + 6.4} ${eyeY - 0.3}C${ex + 3.6} ${eyeY + 2.7} ${ex - 3.6} ${eyeY + 2.7} ${ex - 6.4} ${eyeY}Z`, FLASH, INK, 1.1);
    fill(`M${ex - 2.4} ${eyeY - 0.3}a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0Z`);
    fill(`M${ex + 0.3} ${eyeY - 1.2}a0.75 0.75 0 1 0 1.5 0a0.75 0.75 0 1 0 -1.5 0Z`, FLASH);
    line(`M${ex - 6.6} ${eyeY - 0.2}C${ex - 3.6} ${eyeY - 4} ${ex + 3.6} ${eyeY - 4} ${ex + 6.6} ${eyeY - 0.6}`, INK, 1.6);
  }
  // ---- nose
  const n = eyeY + 20;
  line(`M2.2 ${eyeY + 5}C3.2 ${eyeY + 11} 5.2 ${n - 4} 2.6 ${n - 0.6}`, INK, 1.1);
  line(`M-5.2 ${n - 0.4}C-3.8 ${n + 1.4} -1.6 ${n + 1.4} -0.4 ${n + 0.6}`, INK, 1);
  line(`M5.2 ${n - 0.4}C3.8 ${n + 1.4} 1.6 ${n + 1.4} 0.4 ${n + 0.6}`, INK, 1);
  // ---- mouth
  const m = n + 0.36 * (100 - n);
  if (o.smile === 'teeth') {
    fill(`M-11.5 ${m - 1.5}C-5 ${m + 0.6} 5 ${m + 0.6} 11.5 ${m - 1.5}C8 ${m + 8.5} -8 ${m + 8.5} -11.5 ${m - 1.5}Z`);
    fill(`M-9.6 ${m - 0.6}C-4 ${m + 1.2} 4 ${m + 1.2} 9.6 ${m - 0.6}L8.6 ${m + 2.4}C3 ${m + 3.6} -3 ${m + 3.6} -8.6 ${m + 2.4}Z`, FLASH);
    line(`M-15 ${m - 6}C-14 ${m - 3} -13 ${m - 1.5} -11.5 ${m - 1.5}`, INK, 0.9);
    line(`M15 ${m - 6}C14 ${m - 3} 13 ${m - 1.5} 11.5 ${m - 1.5}`, INK, 0.9);
  } else {
    line(`M-9 ${m}C-4 ${m + 1.3} 4 ${m + 1.3} 9 ${m}`, INK, 1.5);
    line(`M-4.5 ${m + 4.6}Q0 ${m + 6} 4.5 ${m + 4.6}`, INK, 0.9);
  }

  // ---- hair (front)
  hair(o, sp, eyeY, fill, line);

  // ---- glasses
  if (o.glasses) {
    for (const s of [1, -1]) {
      const ex = s * 13.5;
      const lens = `M${ex - 10} ${eyeY - 4}Q${ex - 10} ${eyeY - 7.5} ${ex - 6} ${eyeY - 7.5}L${ex + 6} ${eyeY - 7.5}Q${ex + 10} ${eyeY - 7.5} ${ex + 10} ${eyeY - 4}L${ex + 9} ${eyeY + 3}Q${ex + 8.4} ${eyeY + 6.5} ${ex + 4.5} ${eyeY + 6.5}L${ex - 4.5} ${eyeY + 6.5}Q${ex - 8.4} ${eyeY + 6.5} ${ex - 9} ${eyeY + 3}Z`;
      if (o.glasses === 'glare') {
        fill(lens, FLASH);
      }
      out.push({ d: lens, stroke: INK, width: 1.7 });
      if (o.glasses === 'glare') {
        line(`M${ex - 6} ${eyeY - 5}L${ex - 9} ${eyeY + 2}`, INK, 0.7);
        line(`M${ex + 3} ${eyeY - 5}L${ex - 2} ${eyeY + 5}`, INK, 0.7);
        line(`M${ex + 7} ${eyeY - 5}L${ex + 3} ${eyeY + 5}`, INK, 0.7);
      }
      line(`M${s * 23.5} ${eyeY - 4}L${s * (cw + 1)} ${eyeY - 3}`, INK, 1.5);
    }
    line(`M-3.5 ${eyeY - 3}Q0 ${eyeY - 5.5} 3.5 ${eyeY - 3}`, INK, 1.5);
  }
  return out;
}

function hair(o, sp, eyeY, fill, line) {
  const t = sp.hairTop, cw = sp.cheek;
  if (o.hair === 'side') {
    const outer = [[-(cw + 0.5), eyeY - 3, true], [-(cw + 4), eyeY - 15], [-(cw + 3), t + 17], [-cw * 0.74, t + 1.5], [-cw * 0.25, 0.4], [cw * 0.2, 0], [cw * 0.66, 1.8], [cw + 3, t + 14], [cw + 4, eyeY - 14], [cw + 0.5, eyeY - 3, true]];
    let inner;
    if (o.fringe === 'heavy') {
      inner = [[cw - 0.5, eyeY - 6, true], [cw * 0.8, eyeY - 7], [cw * 0.3, eyeY - 5.5], [-cw * 0.2, eyeY - 6], [-cw * 0.7, eyeY - 7.5], [-(cw - 0.5), eyeY - 6, true]];
    } else {
      inner = [[cw - 0.5, eyeY - 7, true], [cw * 0.82, eyeY - 15], [cw * 0.42, eyeY - 21], [-cw * 0.08, t + 15], [-cw * 0.38, t + 11, true], [-cw * 0.62, t + 15], [-cw * 0.88, t + 22], [-(cw - 0.5), eyeY - 7, true]];
    }
    fill(spline([...outer, ...inner]));
    if (o.fringe !== 'heavy') {
      line(`M${-cw * 0.38} ${t + 11}Q${-cw * 0.36} ${t + 4} ${-cw * 0.26} ${1.4}`, FLASH, 0.9);
      line(`M${-cw * 0.2} ${t + 6}C${cw * 0.1} ${t + 6} ${cw * 0.5} ${t + 9} ${cw * 0.8} ${t + 18}`, FLASH, 0.7);
      line(`M${-cw * 0.1} ${t + 11}C${cw * 0.2} ${t + 12} ${cw * 0.5} ${t + 15} ${cw * 0.7} ${t + 22}`, FLASH, 0.7);
    } else {
      line(`M${-cw * 0.3} ${t + 4}C${-cw * 0.3} ${t + 16} ${-cw * 0.36} ${eyeY - 14} ${-cw * 0.42} ${eyeY - 8}`, FLASH, 0.7);
      line(`M${cw * 0.25} ${t + 4}C${cw * 0.26} ${t + 16} ${cw * 0.3} ${eyeY - 14} ${cw * 0.34} ${eyeY - 7}`, FLASH, 0.7);
    }
  } else if (o.hair === 'long') {
    const coverEars = o.ears === 'covered';
    // tucked: the front hair stops above the ear and sweeps back; covered: it falls over ear and cheek
    const outer = coverEars
      ? [[-(cw - 1), eyeY + 30, true], [-(cw + 9), eyeY - 6], [-(cw + 6), t + 10], [-cw * 0.66, 1], [0, -1.5], [cw * 0.66, 1], [cw + 6, t + 10], [cw + 9, eyeY - 6], [cw - 1, eyeY + 30, true]]
      : [[-(cw - 1.5), eyeY - 7, true], [-(cw + 4), t + 24], [-(cw + 4), t + 10], [-cw * 0.66, 1], [0, -1.5], [cw * 0.66, 1], [cw + 4, t + 10], [cw + 4, t + 24], [cw - 1.5, eyeY - 7, true]];
    let inner;
    if (o.fringe === 'heavy') {
      inner = [[cw - 2, eyeY - 6, true], [cw * 0.7, eyeY - 6.5], [0, eyeY - 5.5], [-cw * 0.7, eyeY - 6.5], [-(cw - 2), eyeY - 6, true]];
    } else if (o.fringe === 'pinned') {
      inner = [[cw - 2, eyeY - 7, true], [cw * 0.86, t + 16], [cw * 0.5, t + 9], [-cw * 0.1, t + 8], [-cw * 0.55, t + 12], [-cw * 0.9, eyeY - 18], [-(cw - 2), eyeY - 7, true]];
    } else {
      inner = [[cw - 2, eyeY - 7, true], [cw * 0.9, t + 16], [cw * 0.45, t + 8], [0, t + 6, true], [-cw * 0.45, t + 8], [-cw * 0.9, t + 16], [-(cw - 2), eyeY - 7, true]];
    }
    fill(spline([...outer, ...inner]));
    if (coverEars) {
      for (const s of [1, -1]) {
        fill(spline([[s * (cw - 2), eyeY - 8], [s * (cw + 9), eyeY - 6], [s * (cw + 14), eyeY + 22], [s * (cw + 18), 118], [s * (cw + 26), 150, true], [s * (cw + 2), 146], [s * (cw - 3), 112], [s * (cw - 6), eyeY + 18]]));
        line(`M${s * (cw + 2)} ${eyeY - 4}C${s * (cw + 5)} ${eyeY + 14} ${s * (cw + 8)} 104 ${s * (cw + 14)} 136`, FLASH, 0.7);
        line(`M${s * (cw - 2)} ${eyeY + 6}C${s * (cw)} ${eyeY + 22} ${s * (cw + 2)} 108 ${s * (cw + 6)} 138`, FLASH, 0.7);
      }
    } else {
      for (const s of [1, -1]) line(`M${s * (cw + 3)} ${t + 22}C${s * (cw + 9)} ${eyeY - 8} ${s * (cw + 11)} ${eyeY + 2} ${s * (cw + 12)} ${eyeY + 12}`, FLASH, 0.8);
    }
    if (o.fringe === 'pinned') {
      line(`M${-cw * 0.78} ${t + 13}L${-cw * 0.46} ${t + 7}`, FLASH, 1.6);
    }
    if (!o.fringe) {
      line(`M0 ${t + 6}L0 ${-1}`, FLASH, 0.9);
      line(`M${cw * 0.2} ${t + 4}C${cw * 0.5} ${t + 4} ${cw * 0.8} ${t + 10} ${cw + 3} ${eyeY - 12}`, FLASH, 0.7);
      line(`M${-cw * 0.2} ${t + 4}C${-cw * 0.5} ${t + 4} ${-cw * 0.8} ${t + 10} ${-(cw + 3)} ${eyeY - 12}`, FLASH, 0.7);
    }
  } else if (o.hair === 'crop') {
    const outer = [[-(cw + 0.2), eyeY - 6, true], [-(cw + 1.6), t + 18], [-cw * 0.72, t - 1.2], [0, 0], [cw * 0.72, t - 1.2], [cw + 1.6, t + 18], [cw + 0.2, eyeY - 6, true]];
    const inner = [[cw - 0.8, eyeY - 8, true], [cw * 0.8, t + 14], [cw * 0.36, t + 9], [0, t + 10], [-cw * 0.36, t + 9], [-cw * 0.8, t + 14], [-(cw - 0.8), eyeY - 8, true]];
    fill(spline([...outer, ...inner]));
    for (let i = -3; i <= 3; i++) line(`M${i * 6.5} ${t + 7.5 - Math.abs(i) * 0.4}L${i * 7.2} ${t + 3 - Math.abs(i) * 0.6}`, FLASH, 0.6);
  }
}

export function toSVG(list) {
  return list.map((s) => {
    if (s.alpha === 0) return '';
    const a = [`d="${s.d}"`];
    a.push(`fill="${s.fill || 'none'}"`);
    if (s.stroke) a.push(`stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="${s.join || 'round'}"`);
    return `<path ${a.join(' ')}/>`;
  }).join('');
}

const cache = new WeakMap();
export function drawShapes(ctx, list) {
  let paths = cache.get(list);
  if (!paths) { paths = list.map((s) => new Path2D(s.d)); cache.set(list, paths); }
  ctx.lineCap = 'round';
  list.forEach((s, i) => {
    if (s.alpha === 0) return;
    if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(paths[i]); }
    if (s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.width; ctx.lineJoin = s.join || 'round'; ctx.stroke(paths[i]); }
  });
}
