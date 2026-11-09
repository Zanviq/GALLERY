// Build-time QR code for the wide-screen side note (dev tool, not deployed).
//   node design/works/sand/scripts/qr.mjs           writes the SVG into works/sand/index.html
//   node design/works/sand/scripts/qr.mjs --test    runs the self-checks only
// Byte mode, error correction M, smallest version that fits (3 for the gallery URL), best of the
// eight masks by the standard penalty rules. Written from the ISO 18004 procedure; checked against
// the Reed-Solomon example in the spec tutorials (HELLO WORLD, 1-M) and the format-info table.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const URL_TEXT = 'https://gallery.zanviq.dev/sand/';
// version -> [total codewords, ec codewords per block, blocks] for level M, versions 1..5 (single group)
const TABLE_M = { 1: [26, 10, 1], 2: [44, 16, 1], 3: [70, 26, 1], 4: [100, 18, 2], 5: [134, 24, 2] };
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30] };
const REMAINDER_BITS = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7 };

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}
function rsDivisor(degree) {
  const r = new Array(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 2);
  }
  return r;
}
function rsRemainder(data, divisor) {
  const r = divisor.map(() => 0);
  for (const b of data) {
    const f = b ^ r.shift();
    r.push(0);
    divisor.forEach((c, i) => { r[i] ^= gfMul(c, f); });
  }
  return r;
}

function formatBits(mask) {
  const data = (0 << 3) | mask; // level M = 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

export function encode(text) {
  const bytes = [...Buffer.from(text, 'utf8')];
  let version = 0;
  for (const v of [1, 2, 3, 4, 5]) {
    const [total, ec, blocks] = TABLE_M[v];
    if (bytes.length + 2 <= total - ec * blocks) { version = v; break; }
  }
  if (!version) throw new Error('text too long for this encoder');
  const [total, ecLen, blocks] = TABLE_M[version];
  const dataLen = total - ecLen * blocks;

  // bit stream: mode 0100, 8-bit count, data, terminator, pad
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, 8);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, dataLen * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let p = 0; data.length < dataLen; p ^= 1) data.push(p ? 0x11 : 0xec);

  // blocks (all the same length for versions 1..5 at level M) and interleave
  const per = dataLen / blocks;
  const div = rsDivisor(ecLen);
  const dBlocks = [], eBlocks = [];
  for (let b = 0; b < blocks; b++) {
    const d = data.slice(b * per, (b + 1) * per);
    dBlocks.push(d); eBlocks.push(rsRemainder(d, div));
  }
  const codewords = [];
  for (let i = 0; i < per; i++) for (const d of dBlocks) codewords.push(d[i]);
  for (let i = 0; i < ecLen; i++) for (const e of eBlocks) codewords.push(e[i]);

  const size = version * 4 + 17;
  const mod = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const setF = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };

  for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      setF(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = ALIGN[version];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const drawFormat = (mask) => {
    const f = formatBits(mask);
    const bit = (i) => ((f >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) setF(8, i, bit(i));
    setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(i));
    setF(8, size - 8, true); // dark module
  };
  drawFormat(0);

  // zigzag data placement
  const allBits = codewords.length * 8 + REMAINDER_BITS[version];
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (fn[y][x] || k >= allBits) continue;
        mod[y][x] = k < codewords.length * 8 ? ((codewords[k >>> 3] >>> (7 - (k & 7))) & 1) === 1 : false;
        k++;
      }
    }
  }
  if (k !== allBits) throw new Error(`placed ${k} of ${allBits} bits`);

  const maskFn = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
  ];
  const applyMask = (m) => {
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && maskFn[m](x, y)) mod[y][x] = !mod[y][x];
  };
  const penalty = () => {
    let p = 0;
    const lines = [];
    for (let y = 0; y < size; y++) lines.push(mod[y].slice());
    for (let x = 0; x < size; x++) lines.push(mod.map((r) => r[x]));
    for (const line of lines) {
      let run = 1;
      for (let i = 1; i <= size; i++) {
        if (i < size && line[i] === line[i - 1]) run++;
        else { if (run >= 5) p += 3 + run - 5; run = 1; }
      }
      const s = line.map((b) => (b ? '1' : '0')).join('');
      const padded = '0000' + s + '0000';
      for (const pat of ['10111010000', '00001011101']) {
        let at = padded.indexOf(pat);
        while (at !== -1) { p += 40; at = padded.indexOf(pat, at + 1); }
      }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
      const c = mod[y][x];
      if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
    }
    let dark = 0;
    for (const r of mod) for (const b of r) if (b) dark++;
    p += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
    return p;
  };
  let best = 0, bestP = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m); drawFormat(m);
    const pen = penalty();
    if (pen < bestP) { bestP = pen; best = m; }
    applyMask(m); // undo (xor)
  }
  applyMask(best); drawFormat(best);
  return { version, size, mask: best, modules: mod };
}

export function toSvg({ size, modules }, label) {
  const q = 4;
  let d = '';
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!modules[y][x]) { x++; continue; }
      let w = 1;
      while (x + w < size && modules[y][x + w]) w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w;
    }
  }
  return `<svg class="qr" viewBox="${-q} ${-q} ${size + 2 * q} ${size + 2 * q}" role="img" aria-label="${label}" shape-rendering="crispEdges">` +
    `<rect x="${-q}" y="${-q}" width="${size + 2 * q}" height="${size + 2 * q}" fill="#fff"/><path fill="#000" d="${d}"/></svg>`;
}

function selfTest() {
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  const ec = rsRemainder(data, rsDivisor(10));
  const want = [196, 35, 39, 119, 235, 215, 231, 226, 93, 23];
  if (ec.join() !== want.join()) throw new Error('RS mismatch ' + ec.join());
  // known 15-bit format strings for level M, masks 0..7
  const fmt = ['101010000010010', '101000100100101', '101111001111100', '101101101001011',
    '100010111111001', '100000011001110', '100111110010111', '100101010100000'];
  for (let m = 0; m < 8; m++) {
    const got = formatBits(m).toString(2).padStart(15, '0');
    if (got !== fmt[m]) throw new Error(`format M-${m} ${got} != ${fmt[m]}`);
  }
  console.log('self-test ok (RS HELLO WORLD 1-M, format bits M 0..7)');
}

selfTest();
if (!process.argv.includes('--test')) {
  const qr = encode(URL_TEXT);
  const svg = toSvg(qr, '휴대폰 카메라로 비추면 gallery.zanviq.dev/sand/ 가 열려요');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(here, '../../../../works/sand/index.html');
  const html = readFileSync(file, 'utf8');
  const re = /<!-- qr:start -->[\s\S]*?<!-- qr:end -->/;
  if (!re.test(html)) throw new Error('markers not found in index.html');
  writeFileSync(file, html.replace(re, `<!-- qr:start -->${svg}<!-- qr:end -->`));
  console.log(`QR version ${qr.version}, ${qr.size}x${qr.size}, mask ${qr.mask}, ${svg.length} bytes written`);
}
