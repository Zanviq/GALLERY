// Deduction engine for the lost-and-found puzzles.
// The game uses it for hints; design/works/lostfound/scripts/solve.mjs uses the same code to prove
// that every case has exactly one answer and that these human-sized steps reach it without guessing.
//
// A case links every entity (owner, and in later cases place and time) to exactly one item.
// The grid holds one block per pair of categories; a cell is 'O' (pair), 'X' (not a pair) or empty.

const CAT_ORDER = ['item', 'owner', 'place', 'time'];

// ---------- Korean particles ----------
function finalOf(word) {
  const s = String(word).trim();
  const ch = s[s.length - 1] || '';
  const code = ch.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    return jong === 0 ? 'none' : jong === 8 ? 'rieul' : 'other';
  }
  if (/[0-9]/.test(ch)) return { 0: 'other', 1: 'rieul', 2: 'none', 3: 'other', 4: 'none', 5: 'none', 6: 'other', 7: 'rieul', 8: 'rieul', 9: 'none' }[ch];
  return 'none';
}
export function josa(word, pair) {
  const [withF, noF] = pair.split('/');
  const f = finalOf(word);
  if (pair === '으로/로') return word + (f === 'other' ? '으로' : '로');
  return word + (f === 'none' ? noF : withF);
}

// ---------- model ----------
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export function hm(min) { return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`; }
export function sayTime(min) {
  const h = Math.floor(min / 60), m = min % 60;
  const ap = h < 12 ? '오전' : '오후';
  const h12 = h > 12 ? h - 12 : h;
  return `${ap} ${h12}시${m ? ` ${m}분` : ''}`;
}

export function buildModel(cs) {
  const cats = ['item', ...cs.cats];
  const ent = {};
  const byCat = {};
  for (const c of cats) byCat[c] = [];
  const add = (cat, e, extra) => {
    if (ent[e.id]) throw new Error(`${cs.id}: duplicate id ${e.id}`);
    const x = { ...e, cat, ...extra };
    ent[e.id] = x;
    byCat[cat].push(x);
  };
  for (const it of cs.items) {
    add('item', it, { label: `${it.no}번 ${it.kind}`, short: `${it.no} ${it.kind}`, time: it.time ? toMin(it.time) : undefined });
  }
  for (const o of cs.owners) add('owner', o, { label: `${o.name} 님`, short: o.name });
  if (cs.places) for (const p of cs.places) add('place', p, { label: p.name, short: p.short || p.name });
  if (cs.times) for (const t of cs.times) add('time', t, { label: sayTime(toMin(t.t)), short: t.t, time: toMin(t.t) });
  // which category carries each comparable attribute
  const attrCat = { ticket: 'owner', group: 'item' };
  attrCat.time = cats.includes('time') ? 'time' : 'item';
  attrCat.place = cats.includes('place') ? 'place' : 'item';
  const model = { cs, cats, ent, byCat, attrCat, n: cs.items.length };
  model.blocks = [];
  for (let i = 0; i < cats.length; i++) for (let j = i + 1; j < cats.length; j++) model.blocks.push([cats[i], cats[j]]);
  // answer: entity id -> item id
  model.answer = {};
  for (const it of cs.items) model.answer[it.id] = it.id;
  for (const c of cs.cats) for (const [eid, iid] of Object.entries(cs.answer[c])) model.answer[eid] = iid;
  for (const c of cs.clues) for (const r of c.rules || []) r._set = r.set || r.where ? resolveSet(model, r) : null;
  return model;
}

function attrValue(model, e, attr) {
  if (attr === 'time') return e.time;
  if (attr === 'place') return e.cat === 'place' ? e.id : e.place;
  if (attr === 'ticket') return e.ticket;
  return e[attr];
}
function rankIn(model, cat, attr) {
  const list = [...model.byCat[cat]].sort((a, b) => attrValue(model, a, attr) - attrValue(model, b, attr));
  const r = {};
  list.forEach((e, i) => { r[e.id] = i; });
  return r;
}

export function resolveSet(model, r) {
  if (r.set) return r.set;
  const w = r.where;
  const list = model.byCat[w.cat];
  const ok = (e) => {
    const v = attrValue(model, e, w.attr);
    if (w.lt !== undefined) return v < toMin(w.lt);
    if (w.lte !== undefined) return v <= toMin(w.lte);
    if (w.gt !== undefined) return v > toMin(w.gt);
    if (w.gte !== undefined) return v >= toMin(w.gte);
    if (w.is !== undefined) return [].concat(w.is).includes(v);
    if (w.has !== undefined) return (e.flags || []).includes(w.has);
    throw new Error('bad where');
  };
  return list.filter(ok).map((e) => e.id);
}

// ---------- state ----------
export function key(model, a, b) {
  const ca = CAT_ORDER.indexOf(model.ent[a].cat), cb = CAT_ORDER.indexOf(model.ent[b].cat);
  return ca < cb ? `${a}|${b}` : `${b}|${a}`;
}
export const get = (model, st, a, b) => st.get(key(model, a, b)) || '';

// manual marks + the X's every O implies in its own row and column
export function effective(model, marks) {
  const st = new Map(marks);
  for (const [k, v] of marks) {
    if (v !== 'O') continue;
    const [a, b] = k.split('|');
    const ea = model.ent[a], eb = model.ent[b];
    for (const x of model.byCat[eb.cat]) if (x.id !== b && !st.has(key(model, a, x.id))) st.set(key(model, a, x.id), 'X');
    for (const x of model.byCat[ea.cat]) if (x.id !== a && !st.has(key(model, x.id, b))) st.set(key(model, x.id, b), 'X');
  }
  return st;
}
export function autoX(model, marks) {
  const eff = effective(model, marks);
  const out = new Set();
  for (const [k, v] of eff) if (v === 'X' && !marks.has(k)) out.add(k);
  return out;
}

const cands = (model, st, e, cat) => (e.cat === cat ? [e] : model.byCat[cat].filter((v) => get(model, st, e.id, v.id) !== 'X'));

export function truth(model, a, b) { return model.answer[a] === model.answer[b] ? 'O' : 'X'; }
export function wrongMarks(model, marks) {
  const out = [];
  for (const [k, v] of marks) {
    const [a, b] = k.split('|');
    if (truth(model, a, b) !== v) out.push([a, b, v]);
  }
  return out;
}
export function blockDone(model, st, ca, cb) {
  return model.byCat[ca].every((a) => model.byCat[cb].some((b) => get(model, st, a.id, b.id) === 'O'));
}
export function gridDone(model, st) { return model.blocks.every(([a, b]) => blockDone(model, st, a, b)); }

// ---------- explanations ----------
const L = (model, id) => model.ent[id].label;
const CAT_WORD = { item: '물건', owner: '찾는 분', place: '장소', time: '시각' };
function listLabels(model, ids) { return ids.map((id) => L(model, id)).join(', '); }
function pairText(model, a, b, mark) {
  return mark === 'O'
    ? `${josa(L(model, a), '과/와')} ${josa(L(model, b), '이/가')} 짝이에요.`
    : `${josa(L(model, a), '과/와')} ${josa(L(model, b), '은/는')} 짝이 아니에요.`;
}
function marksText(model, marks) {
  // group X's by their first entity so a row of crosses reads as one sentence
  const groups = new Map();
  const os = [];
  for (const [a, b, v] of marks) {
    if (v === 'O') { os.push([a, b]); continue; }
    if (!groups.has(a)) groups.set(a, []);
    groups.get(a).push(b);
  }
  const parts = [];
  for (const [a, bs] of groups) {
    parts.push(bs.length === 1 ? pairText(model, a, bs[0], 'X')
      : `${josa(L(model, a), '은/는')} ${listLabels(model, bs)} 어느 것과도 짝이 아니에요.`);
  }
  for (const [a, b] of os) parts.push(pairText(model, a, b, 'O'));
  return parts.join(' ');
}

// ---------- techniques ----------
function push(model, st, out, a, b, v) {
  if (get(model, st, a, b) === v) return;
  if (out.some(([x, y]) => key(model, x, y) === key(model, a, b))) return;
  out.push([a, b, v]);
}

function directStep(model, st, clue, r) {
  const marks = [];
  const a = r.a;
  if (r.k === 'yes') push(model, st, marks, a, r.b, 'O');
  else if (r.k === 'no') push(model, st, marks, a, r.b, 'X');
  else if (r.k === 'in' || r.k === 'out') {
    const set = r._set;
    const cat = model.ent[set[0]].cat;
    for (const v of model.byCat[cat]) {
      const inside = set.includes(v.id);
      if ((r.k === 'in' && !inside) || (r.k === 'out' && inside)) push(model, st, marks, a, v.id, 'X');
    }
    if (marks.length) {
      // if the clue leaves a single candidate, say so in the same breath
      const left = model.byCat[cat].filter((v) => get(model, st, a, v.id) !== 'X' && !marks.some(([, b]) => b === v.id));
      if (left.length === 1 && get(model, st, a, left[0].id) !== 'O') marks.push([a, left[0].id, 'O']);
    }
  }
  if (!marks.length) return null;
  const xs = marks.filter((m) => m[2] === 'X');
  const o = marks.find((m) => m[2] === 'O');
  let why = `${r.why || ''} ${marksText(model, xs.length ? xs : marks)}`;
  if (o && xs.length) why += ` 그러면 ${L(model, o[0])} 쪽에 남은 건 ${L(model, o[1])}뿐이에요. ${pairText(model, o[0], o[1], 'O')}`;
  return { level: 1, kind: 'clue', clue: clue.id, marks, why: why.trim() };
}

function singleSteps(model, st) {
  for (const [ca, cb] of model.blocks) {
    for (const [rowCat, colCat] of [[ca, cb], [cb, ca]]) {
      for (const a of model.byCat[rowCat]) {
        const left = model.byCat[colCat].filter((b) => get(model, st, a.id, b.id) !== 'X');
        if (left.length === 1 && get(model, st, a.id, left[0].id) !== 'O') {
          const b = left[0].id;
          return {
            level: 2, kind: 'single', clue: null, marks: [[a.id, b, 'O']],
            why: `${josa(L(model, a.id), '은/는')} ${josa('다른 ' + CAT_WORD[colCat], '과/와')}는 모두 X라서, 남은 건 ${josa(L(model, b), '이/가')} 하나뿐이에요. ${pairText(model, a.id, b, 'O')}`,
          };
        }
      }
    }
  }
  return null;
}

function xorStep(model, st, clue, r) {
  const { a, b, c } = r;
  const marks = [];
  let why = '';
  const sameCat = model.ent[b].cat === model.ent[c].cat;
  if (!sameCat && get(model, st, b, c) !== 'X') {
    push(model, st, marks, b, c, 'X');
    why = `${josa(L(model, a), '은/는')} ${L(model, b)}, ${L(model, c)} 가운데 한쪽하고만 짝이에요. 그러니 ${josa(L(model, b), '과/와')} ${josa(L(model, c), '은/는')} 서로 짝일 수 없어요.`;
    return { level: 3, kind: 'clue', clue: clue.id, marks, why };
  }
  const ab = get(model, st, a, b), ac = get(model, st, a, c);
  if (ab === 'X' && ac !== 'O') { push(model, st, marks, a, c, 'O'); why = `${josa(L(model, a), '은/는')} ${josa(L(model, b), '이/가')} 아니면 ${L(model, c)}의 짝이에요. ${josa(L(model, b), '과/와')}는 짝이 아니니 ${josa(L(model, c), '과/와')} 짝이에요.`; }
  else if (ac === 'X' && ab !== 'O') { push(model, st, marks, a, b, 'O'); why = `${josa(L(model, a), '은/는')} ${josa(L(model, b), '이/가')} 아니면 ${L(model, c)}의 짝이에요. ${josa(L(model, c), '과/와')}는 짝이 아니니 ${josa(L(model, b), '과/와')} 짝이에요.`; }
  else if (ab === 'O' && ac !== 'X' && !sameCat) { push(model, st, marks, a, c, 'X'); why = `${josa(L(model, a), '은/는')} 둘 중 한쪽하고만 짝이에요. 이미 ${josa(L(model, b), '과/와')} 짝이니 ${josa(L(model, c), '과/와')}는 아니에요.`; }
  else if (ac === 'O' && ab !== 'X' && !sameCat) { push(model, st, marks, a, b, 'X'); why = `${josa(L(model, a), '은/는')} 둘 중 한쪽하고만 짝이에요. 이미 ${josa(L(model, c), '과/와')} 짝이니 ${josa(L(model, b), '과/와')}는 아니에요.`; }
  else if (sameCat) {
    // reads as "a is b or c": every other candidate goes
    for (const v of model.byCat[model.ent[b].cat]) if (v.id !== b && v.id !== c) push(model, st, marks, a, v.id, 'X');
    if (marks.length) why = `${josa(L(model, a), '은/는')} ${josa(L(model, b), '이/가')} 아니면 ${L(model, c)}의 짝이에요. 나머지는 모두 지워요.`;
  }
  if (!marks.length) return null;
  return { level: 3, kind: 'clue', clue: clue.id, marks, why };
}

function ifStep(model, st, clue, r) {
  const [a, b] = r.p, [c, d] = r.q;
  if (get(model, st, a, b) === 'O' && get(model, st, c, d) !== 'O') {
    return { level: 3, kind: 'clue', clue: clue.id, marks: [[c, d, 'O']], why: `${josa(L(model, a), '과/와')} ${josa(L(model, b), '이/가')} 짝이면 ${josa(L(model, c), '과/와')} ${josa(L(model, d), '도/도')} 짝이에요. 앞쪽이 이미 짝이니 ${pairText(model, c, d, 'O')}` };
  }
  if (get(model, st, c, d) === 'X' && get(model, st, a, b) !== 'X') {
    return { level: 3, kind: 'clue', clue: clue.id, marks: [[a, b, 'X']], why: `${josa(L(model, a), '과/와')} ${josa(L(model, b), '이/가')} 짝이라면 ${josa(L(model, c), '과/와')} ${josa(L(model, d), '도/도')} 짝이어야 해요. 그런데 ${josa(L(model, c), '과/와')} ${josa(L(model, d), '은/는')} 짝이 아니니, ${pairText(model, a, b, 'X')}` };
  }
  return null;
}

const OP_TEXT = {
  '<': (A, B, w) => `${josa(A, '은/는')} ${B}보다 먼저${w}`,
  '>': (A, B, w) => `${josa(A, '은/는')} ${B}보다 나중${w}`,
};
function relPred(model, r, C, va, vb) {
  if (va.id === vb.id) return false;
  const x = attrValue(model, va, r.attr), y = attrValue(model, vb, r.attr);
  switch (r.op) {
    case '<': return x < y;
    case '>': return x > y;
    case '=': return x === y;
    case '!=': return x !== y;
    case 'adj': { const rk = rankIn(model, C, r.attr); return Math.abs(rk[va.id] - rk[vb.id]) === 1; }
    case 'next': { const rk = rankIn(model, C, r.attr); return rk[va.id] === rk[vb.id] + 1; }
    default: throw new Error('bad op ' + r.op);
  }
}
function relStep(model, st, clue, r) {
  const C = model.attrCat[r.attr];
  const A = model.ent[r.a], B = model.ent[r.b];
  const Da = cands(model, st, A, C), Db = cands(model, st, B, C);
  for (const [self, other, Ds, Do, flip] of [[A, B, Da, Db, false], [B, A, Db, Da, true]]) {
    if (self.cat === C) continue;
    const bad = Ds.filter((v) => !Do.some((w) => (flip ? relPred(model, r, C, w, v) : relPred(model, r, C, v, w))));
    if (!bad.length) continue;
    const marks = bad.map((v) => [self.id, v.id, 'X']);
    const note = (w) => {
      if (w.cat === 'item' && r.attr === 'time') return `${L(model, w.id)}(${hm(w.time)})`;
      if (w.cat === 'item' && (r.attr === 'place' || r.attr === 'group')) return `${L(model, w.id)}(${w[r.attr]})`;
      if (w.cat === 'owner' && r.attr === 'ticket') return `${L(model, w.id)}(${w.ticket}번)`;
      return L(model, w.id);
    };
    const options = Do.map(note);
    const optText = other.cat === C ? josa(L(model, other.id), '이/가') + ' 정해져 있어요'
      : `${L(model, other.id)} 쪽에 남은 후보는 ${josa(options.join(', '), '이에요/예요')}`;
    const why = `${r.why || ''} ${optText}. 이 중 어느 것과도 맞지 않는 ${josa(listLabels(model, bad.map((v) => v.id)), '은/는')} ${L(model, self.id)} 쪽이 될 수 없어요. ${marksText(model, marks)}`;
    return { level: 4, kind: 'clue', clue: clue.id, marks, why: why.trim() };
  }
  return null;
}

function linkSteps(model, st) {
  // O(a,b) & O(b,c) -> O(a,c);  O(a,b) & X(b,c) -> X(a,c)
  if (model.cats.length < 3) return null;
  for (const [k, v] of st) {
    if (v !== 'O') continue;
    const [p, q] = k.split('|');
    for (const [a, b] of [[p, q], [q, p]]) {
      for (const cat of model.cats) {
        if (cat === model.ent[a].cat || cat === model.ent[b].cat) continue;
        for (const c of model.byCat[cat]) {
          const bc = get(model, st, b, c.id), ac = get(model, st, a, c.id);
          if (bc === 'O' && ac !== 'O') {
            return { level: 3, kind: 'link', clue: null, marks: [[a, c.id, 'O']], why: `${josa(L(model, a), '과/와')} ${josa(L(model, b), '이/가')} 짝이고, ${josa(L(model, b), '과/와')} ${josa(L(model, c.id), '도/도')} 짝이에요. 같은 물건 이야기니까 ${pairText(model, a, c.id, 'O')}` };
          }
          if (bc === 'X' && ac === '') {
            return { level: 3, kind: 'link', clue: null, marks: [[a, c.id, 'X']], why: `${josa(L(model, a), '과/와')} ${josa(L(model, b), '은/는')} 짝이에요. 그런데 ${josa(L(model, b), '과/와')} ${josa(L(model, c.id), '은/는')} 짝이 아니니, ${pairText(model, a, c.id, 'X')}` };
          }
        }
      }
    }
  }
  return null;
}

function crossSteps(model, st) {
  // a and c can only pair if some b in a third category could pair with both
  if (model.cats.length < 3) return null;
  for (const [ca, cc] of model.blocks) {
    for (const a of model.byCat[ca]) {
      for (const c of model.byCat[cc]) {
        if (get(model, st, a.id, c.id) !== '') continue;
        for (const cb of model.cats) {
          if (cb === ca || cb === cc) continue;
          const both = model.byCat[cb].filter((b) => get(model, st, a.id, b.id) !== 'X' && get(model, st, c.id, b.id) !== 'X');
          if (!both.length) {
            const la = model.byCat[cb].filter((b) => get(model, st, a.id, b.id) !== 'X').map((b) => b.id);
            const lc = model.byCat[cb].filter((b) => get(model, st, c.id, b.id) !== 'X').map((b) => b.id);
            return {
              level: 4, kind: 'cross', clue: null, marks: [[a.id, c.id, 'X']],
              why: `${CAT_WORD[cb]} 칸을 나란히 보세요. ${L(model, a.id)} 쪽에 남은 건 ${listLabels(model, la)}, ${L(model, c.id)} 쪽에 남은 건 ${josa(listLabels(model, lc), '이에요/예요')}. 겹치는 게 없으니 ${pairText(model, a.id, c.id, 'X')}`,
            };
          }
        }
      }
    }
  }
  return null;
}

// The easiest deduction available from this state, or null when nothing more follows.
export function nextStep(model, st) {
  const clues = model.cs.clues;
  for (const c of clues) for (const r of c.rules || []) {
    if (['yes', 'no', 'in', 'out'].includes(r.k)) { const s = directStep(model, st, c, r); if (s) return s; }
  }
  const s2 = singleSteps(model, st);
  if (s2) return s2;
  for (const c of clues) for (const r of c.rules || []) {
    if (r.k === 'xor') { const s = xorStep(model, st, c, r); if (s) return s; }
    if (r.k === 'if') { const s = ifStep(model, st, c, r); if (s) return s; }
  }
  const s3 = linkSteps(model, st);
  if (s3) return s3;
  for (const c of clues) for (const r of c.rules || []) {
    if (r.k === 'rel') { const s = relStep(model, st, c, r); if (s) return s; }
  }
  return crossSteps(model, st);
}

// Apply a step to a manual-marks map (used by the solver and by "표시 넣기").
export function applyMarks(model, marks, list) {
  const next = new Map(marks);
  for (const [a, b, v] of list) next.set(key(model, a, b), v);
  return next;
}

// ---------- brute force (solver only) ----------
function* perms(arr) {
  if (arr.length <= 1) { yield arr.slice(); return; }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of perms(rest)) yield [arr[i], ...p];
  }
}
export function holds(model, f, r) {
  const same = (a, b) => f[a] === f[b];
  const partner = (e, C) => model.byCat[C].find((v) => f[v.id] === f[e]);
  switch (r.k) {
    case 'yes': return same(r.a, r.b);
    case 'no': return !same(r.a, r.b);
    case 'in': return r._set.some((s) => same(r.a, s));
    case 'out': return !r._set.some((s) => same(r.a, s));
    case 'xor': return same(r.a, r.b) !== same(r.a, r.c);
    case 'if': return !same(r.p[0], r.p[1]) || same(r.q[0], r.q[1]);
    case 'rel': {
      const C = model.attrCat[r.attr];
      return relPred(model, r, C, partner(r.a, C), partner(r.b, C));
    }
    default: throw new Error('bad rule ' + r.k);
  }
}
export function countSolutions(model, limit = 50) {
  const items = model.byCat.item.map((i) => i.id);
  const extra = model.cats.slice(1);
  const rules = model.cs.clues.flatMap((c) => c.rules || []);
  const sols = [];
  const f = {};
  for (const i of items) f[i] = i;
  const rec = (k) => {
    if (sols.length >= limit) return;
    if (k === extra.length) {
      if (rules.every((r) => holds(model, f, r))) sols.push({ ...f });
      return;
    }
    const ents = model.byCat[extra[k]];
    for (const p of perms(items)) {
      ents.forEach((e, i) => { f[e.id] = p[i]; });
      // prune with rules whose entities are all assigned
      const ok = rules.every((r) => {
        const ids = [r.a, r.b, r.c, ...(r.p || []), ...(r.q || []), ...(r._set || [])].filter(Boolean);
        if (ids.some((id) => f[id] === undefined)) return true;
        if (r.k === 'rel' && f[model.byCat[model.attrCat[r.attr]][0].id] === undefined) return true;
        return holds(model, f, r);
      });
      if (ok) rec(k + 1);
      for (const e of ents) delete f[e.id];
    }
  };
  rec(0);
  return sols;
}
