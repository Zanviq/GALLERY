// Reads the QR back out of works/sand/index.html and decodes it (dev tool, not deployed).
//   node design/works/sand/scripts/qrcheck.mjs
// Parses the SVG path into a module grid, checks the finder patterns and timing lines, reads both
// copies of the format info, unmasks, walks the codeword order, checks the Reed-Solomon syndromes
// and parses byte mode. No headless browser here has a barcode reader, so this is the check.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.resolve(here, '../../../../works/sand/index.html'), 'utf8');
const svg = /<svg class="qr" viewBox="-4 -4 (\d+) \d+"[\s\S]*?<path fill="#000" d="([^"]+)"/.exec(html);
if (!svg) throw new Error('no qr svg');
const size = Number(svg[1]) - 8;
const m = Array.from({ length: size }, () => new Array(size).fill(0));
for (const [, x, y, w] of svg[2].matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
  for (let i = 0; i < Number(w); i++) m[Number(y)][Number(x) + i] = 1;
}
const ver = (size - 17) / 4;
const fail = (msg) => { console.log('FAIL', msg); process.exit(1); };

// finders (7x7 ring/ring/core) and timing lines
for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    const d = Math.max(Math.abs(x - 3), Math.abs(y - 3));
    if (m[oy + y][ox + x] !== (d === 2 ? 0 : 1)) fail(`finder at ${ox},${oy}`);
  }
}
for (let i = 8; i < size - 8; i++) if (m[6][i] !== (i % 2 === 0 ? 1 : 0) || m[i][6] !== (i % 2 === 0 ? 1 : 0)) fail('timing');

// format info: copy 1 around the top-left finder, copy 2 split top-right / bottom-left
const bitsA = [], bitsB = [];
for (let i = 0; i <= 5; i++) bitsA.push(m[i][8]);
bitsA.push(m[7][8], m[8][8], m[8][7]);
for (let i = 9; i < 15; i++) bitsA.push(m[8][14 - i]);
for (let i = 0; i < 8; i++) bitsB.push(m[8][size - 1 - i]);
for (let i = 8; i < 15; i++) bitsB.push(m[size - 15 + i][8]);
const val = (b) => b.reduce((acc, bit, i) => acc | (bit << i), 0);
if (val(bitsA) !== val(bitsB)) fail('format copies differ');
const fmt = val(bitsA) ^ 0x5412;
const level = ['M', 'L', 'H', 'Q'][fmt >> 13];
const mask = (fmt >> 10) & 7;
let rem = fmt >> 10;
for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
if ((((fmt >> 10) << 10) | rem) !== fmt) fail('format BCH');

// which modules are data: everything except finders+separators, timing, alignment, format, dark module
const isFn = (x, y) => {
  if ((x < 9 && y < 9) || (x >= size - 8 && y < 9) || (x < 9 && y >= size - 8)) return true;
  if (x === 6 || y === 6) return true;
  if (ver >= 2) { const a = 4 * ver + 10; if (Math.abs(x - a) <= 2 && Math.abs(y - a) <= 2) return true; }
  return false;
};
const masks = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];

// walk two-module columns from the right edge, alternating up and down, skipping the timing column
const bits = [];
let up = true;
for (let col = size - 1; col > 0; col -= 2) {
  if (col === 6) col = 5;
  for (let k = 0; k < size; k++) {
    const y = up ? size - 1 - k : k;
    for (const x of [col, col - 1]) if (!isFn(x, y)) bits.push(m[y][x] ^ (masks[mask](x, y) ? 1 : 0));
  }
  up = !up;
}
const cw = [];
for (let i = 0; i + 8 <= bits.length; i += 8) cw.push(parseInt(bits.slice(i, i + 8).join(''), 2));

// Reed-Solomon syndromes over GF(256) must all be zero (level M, version 3: 70 codewords, 26 ec)
const exp = new Array(512), log = new Array(256);
for (let i = 0, x = 1; i < 255; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
const mul = (a, b) => (a && b ? exp[log[a] + log[b]] : 0);
const total = { 1: 26, 2: 44, 3: 70, 4: 100 }[ver];
const ecn = { 1: 10, 2: 16, 3: 26 }[ver];
const block = cw.slice(0, total);
for (let i = 0; i < ecn; i++) {
  let s = 0;
  for (const c of block) s = mul(s, exp[i]) ^ c;
  if (s !== 0) fail(`syndrome ${i} = ${s}`);
}
// byte mode payload
const data = block.slice(0, total - ecn);
const db = data.flatMap((b) => [7, 6, 5, 4, 3, 2, 1, 0].map((i) => (b >> i) & 1));
const num = (a, n) => parseInt(db.slice(a, a + n).join(''), 2);
if (num(0, 4) !== 4) fail('not byte mode');
const len = num(4, 8);
const out = Buffer.from(Array.from({ length: len }, (_, i) => num(12 + i * 8, 8))).toString('utf8');
console.log(`decoded: version ${ver}, level ${level}, mask ${mask}, "${out}"`);
if (out !== 'https://gallery.zanviq.dev/sand/') fail('payload differs');
