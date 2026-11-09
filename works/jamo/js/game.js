// 한 문제의 상태와 규칙. DOM을 모른다.
import { isVowel, slotValue, compose, decompose, addStroke, removeStroke, chainOf } from './hangul.js';

export function hash(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return h >>> 0;
}

export function newGame(def) {
  const base = hash(def.id);
  return {
    def,
    tiles: [...def.tiles].map((j, id) => ({ id, j, orig: j, where: null, seq: 0, pos: null, home: null, seed: (base + id * 7919) % 100000 })),
    blocks: Array.from({ length: [...def.answer].length }, () => ({ cho: [], jung: [], jong: [] })),
    chalk: def.chalk,
    seq: 1,
    solved: false,
    hints: 0,
    history: [],
    flags: { placed: false, syllable: false, stroked: false, erased: false },
  };
}

// ---- undo ----
const snapshot = (g) => JSON.stringify({
  t: g.tiles.map((t) => [t.j, t.where, t.seq, t.pos]), b: g.blocks, c: g.chalk, s: g.seq,
});
export function remember(g) {
  g.history.push(snapshot(g));
  if (g.history.length > 200) g.history.shift();
}
export function undo(g) {
  const s = g.history.pop();
  if (!s) return false;
  const o = JSON.parse(s);
  o.t.forEach(([j, where, seq, pos], i) => Object.assign(g.tiles[i], { j, where, seq, pos }));
  g.blocks = o.b; g.chalk = o.c; g.seq = o.s;
  return true;
}

// ---- reading the board ----
const jamoOf = (g, ids) => ids.map((i) => g.tiles[i].j);

export function blockState(g, b) {
  const blk = g.blocks[b];
  const cho = slotValue('cho', jamoOf(g, blk.cho)) || '';
  const jung = slotValue('jung', jamoOf(g, blk.jung)) || '';
  const jong = slotValue('jong', jamoOf(g, blk.jong)) || '';
  const syllable = cho && jung ? compose(cho, jung, jong) : '';
  return { cho, jung, jong, syllable, empty: !blk.cho.length && !blk.jung.length && !blk.jong.length };
}

export const loose = (g) => g.tiles.filter((t) => !t.where);
export const word = (g) => g.blocks.map((_, b) => blockState(g, b).syllable || '').join('');
export const blocksFull = (g) => g.blocks.every((_, b) => !!blockState(g, b).syllable);

/** 'solved' | 'wrong' | null. Checked only when every block holds a syllable and no tile is left. */
export function verdict(g) {
  if (!blocksFull(g) || loose(g).length) return null;
  return word(g) === g.def.answer ? 'solved' : 'wrong';
}

// ---- moves ----
function detach(g, id) {
  const t = g.tiles[id];
  if (!t.where) return;
  const list = g.blocks[t.where.b][t.where.slot];
  list.splice(list.indexOf(id), 1);
  t.where = null;
}

export const slotFor = (j, half) => (isVowel(j) ? 'jung' : half === 'top' ? 'cho' : 'jong');

/** Put tile `id` into block b. Stacks when the jamo combine, otherwise swaps the old ones out. */
export function place(g, id, b, half) {
  const t = g.tiles[id];
  detach(g, id);
  const slot = slotFor(t.j, half);
  const list = g.blocks[b][slot];
  let kind = 'place';
  let swapped = [];
  if (list.length) {
    if (slotValue(slot, [...jamoOf(g, list), t.j])) kind = 'stack';
    else {
      swapped = list.splice(0);
      for (const i of swapped) Object.assign(g.tiles[i], { where: null, pos: null });
      kind = 'swap';
    }
  }
  list.push(id);
  t.where = { b, slot };
  t.seq = g.seq++;
  g.flags.placed = true;
  if (blockState(g, b).syllable) g.flags.syllable = true;
  return { kind, slot, swapped, value: slotValue(slot, jamoOf(g, list)) };
}

/** Take the last jamo put into that half of block b back out. Returns its id or -1. */
export function takeOut(g, b, half) {
  const blk = g.blocks[b];
  const ids = half === 'top' ? [...blk.cho, ...blk.jung] : [...blk.jong];
  if (!ids.length) return -1;
  const id = ids.reduce((a, i) => (g.tiles[i].seq > g.tiles[a].seq ? i : a), ids[0]);
  detach(g, id);
  g.tiles[id].pos = null;
  return id;
}

export function halfHas(g, b, half) {
  const blk = g.blocks[b];
  return half === 'top' ? blk.cho.length + blk.jung.length > 0 : blk.jong.length > 0;
}

/** dir +1 adds a stroke with the chalk, -1 erases one and returns it to the chalk. */
export function stroke(g, id, dir) {
  const t = g.tiles[id];
  const from = t.j;
  if (t.where) return { ok: false, reason: 'inblock', from };
  if (dir > 0) {
    const to = addStroke(from);
    if (!to) return { ok: false, reason: chainOf(from).chain.length > 1 ? 'top' : 'nochain', from };
    if (g.chalk <= 0) return { ok: false, reason: 'nochalk', from };
    t.j = to; g.chalk--; g.flags.stroked = true;
    return { ok: true, from, to };
  }
  const to = removeStroke(from);
  if (!to) return { ok: false, reason: chainOf(from).chain.length > 1 ? 'bottom' : 'nochain', from };
  t.j = to; g.chalk++; g.flags.erased = true;
  return { ok: true, from, to };
}

// ---- hints ----
export function answerParts(def) {
  const out = [];
  for (const s of def.answer) {
    const d = decompose(s);
    out.push(d);
  }
  return out;
}

const BASIC_OF = {
  'ㄲ': 'ㄱㄱ', 'ㄸ': 'ㄷㄷ', 'ㅃ': 'ㅂㅂ', 'ㅆ': 'ㅅㅅ', 'ㅉ': 'ㅈㅈ', 'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ',
  'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ', 'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
  'ㅐ': 'ㅏㅣ', 'ㅒ': 'ㅑㅣ', 'ㅔ': 'ㅓㅣ', 'ㅖ': 'ㅕㅣ', 'ㅘ': 'ㅗㅏ', 'ㅙ': 'ㅗㅏㅣ', 'ㅚ': 'ㅗㅣ', 'ㅝ': 'ㅜㅓ',
  'ㅞ': 'ㅜㅓㅣ', 'ㅟ': 'ㅜㅣ', 'ㅢ': 'ㅡㅣ',
};
export const basics = (j) => [...(BASIC_OF[j] || j)];

/** For each tile, how many strokes it still needs (+ add, - erase), pairing tiles and answer jamo per family. */
export function strokeNeeds(g) {
  const need = {};
  for (const d of answerParts(g.def)) for (const j of [d.cho, d.jung, d.jong]) if (j) for (const b of basics(j)) {
    const { chain, level } = chainOf(b);
    (need[chain[0]] ||= []).push(level);
  }
  const out = {};
  const byRoot = {};
  for (const t of g.tiles) (byRoot[chainOf(t.j).chain[0]] ||= []).push(t);
  for (const [root, tiles] of Object.entries(byRoot)) {
    const want = (need[root] || []).slice().sort((a, b) => a - b);
    const have = tiles.slice().sort((a, b) => chainOf(a.j).level - chainOf(b.j).level);
    have.forEach((t, i) => { out[t.id] = (want[i] ?? chainOf(t.j).level) - chainOf(t.j).level; });
  }
  return out;
}
