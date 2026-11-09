// Verifies every case in works/lostfound/js/cases.js (dev tool, not deployed).
//
//   node design/works/lostfound/scripts/solve.mjs [caseId] [-v]
//
// For each case it checks:
//  1. data: ids, answer, rule references, clue sets that are not empty;
//  2. uniqueness: brute force over every assignment (owners, and places/times in cross cases)
//     finds exactly one that satisfies every clue, and it is the stated answer;
//  3. logic alone: starting from an empty grid, the game's own hint engine (js/logic.js) is applied
//     step by step. Each step is one human-sized deduction (a clue read against the tags, a row or
//     column with one cell left, an either/or, a time or ticket comparison, a link across blocks).
//     There is no trial and error. The run must fill the whole grid, and every mark it makes must
//     agree with the answer;
//  4. hints from the middle: from 200 random partial grids (correct marks only) per case, the
//     engine always finds a next step until the grid is full.
// It prints a difficulty table (steps per technique) so the cases can be ordered easy to hard.
import { CASES } from '../../../../works/lostfound/js/cases.js';
import {
  buildModel, countSolutions, effective, nextStep, applyMarks, gridDone, truth, key,
} from '../../../../works/lostfound/js/logic.js';

const args = process.argv.slice(2);
const verbose = args.includes('-v');
const only = args.find((a) => !a.startsWith('-'));
let failed = 0;
const fail = (cs, msg) => { failed++; console.log(`  FAIL ${cs.id}: ${msg}`); };

function solveFrom(model, marks, log) {
  const used = new Set();
  const levels = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const kinds = {};
  let steps = 0;
  for (;;) {
    const st = effective(model, marks);
    if (gridDone(model, st)) return { ok: true, steps, used, levels, kinds };
    const s = nextStep(model, st);
    if (!s) return { ok: false, steps, used, levels, kinds, st };
    for (const [a, b, v] of s.marks) {
      if (truth(model, a, b) !== v) return { ok: false, unsound: `${a}|${b}=${v} (${s.kind} ${s.clue || ''})`, steps, used, levels, kinds };
    }
    steps++;
    levels[s.level]++;
    kinds[s.kind] = (kinds[s.kind] || 0) + 1;
    if (s.clue) used.add(s.clue);
    if (log) console.log(`    ${String(steps).padStart(2)} L${s.level} ${(s.clue || s.kind).padEnd(6)} ${s.why}`);
    marks = applyMarks(model, marks, s.marks);
  }
}

function rng(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }

const rows = [];
for (const cs of CASES) {
  if (only && cs.id !== only) continue;
  console.log(`${cs.id}  ${cs.title}`);
  let model;
  try { model = buildModel(cs); } catch (e) { fail(cs, e.message); continue; }
  // 1. data
  const ids = new Set(Object.keys(model.ent));
  for (const c of cs.cats) {
    const ents = model.byCat[c];
    if (ents.length !== model.n) fail(cs, `${c}: ${ents.length} entities for ${model.n} items`);
    const vals = Object.values(cs.answer[c]);
    if (new Set(vals).size !== model.n || ents.some((e) => !cs.answer[c][e.id])) fail(cs, `${c}: answer is not a full one-to-one map`);
  }
  for (const cl of cs.clues) {
    if (!cl.text) fail(cs, `${cl.id} has no text`);
    if (cl.from !== 'staff' && !ids.has(cl.from)) fail(cs, `${cl.id} from unknown ${cl.from}`);
    for (const r of cl.rules || []) {
      for (const id of [r.a, r.b, r.c, ...(r.p || []), ...(r.q || []), ...(r._set || [])].filter(Boolean)) {
        if (!ids.has(id)) fail(cs, `${cl.id} refers to unknown ${id}`);
      }
      if ((r.k === 'in' || r.k === 'out') && !r._set.length) fail(cs, `${cl.id}: empty set`);
      if (r.k === 'in' || r.k === 'out') {
        const cats = new Set(r._set.map((id) => model.ent[id].cat));
        if (cats.size !== 1 || cats.has(model.ent[r.a].cat)) fail(cs, `${cl.id}: set must be one other category`);
      }
    }
  }
  // 2. uniqueness
  const sols = countSolutions(model, 10);
  const same = (s) => Object.keys(model.answer).every((id) => s[id] === model.answer[id]);
  if (sols.length !== 1) fail(cs, `${sols.length >= 10 ? '10+' : sols.length} solutions`);
  else if (!same(sols[0])) fail(cs, 'the only solution is not the stated answer');
  if (sols.length > 1 && verbose) for (const s of sols.slice(0, 4)) console.log('   ', JSON.stringify(s));
  // 3. logic alone
  const run = solveFrom(model, new Map(), verbose);
  if (run.unsound) fail(cs, `engine made a wrong mark: ${run.unsound}`);
  else if (!run.ok) {
    fail(cs, `logic stops after ${run.steps} steps`);
    if (run.st) {
      for (const [ca, cb] of model.blocks) {
        console.log(`    ${ca} x ${cb}`);
        for (const a of model.byCat[ca]) {
          console.log('     ', a.id.padEnd(6), model.byCat[cb].map((b) => run.st.get(key(model, a.id, b.id)) || '.').join(' '));
        }
      }
    }
  }
  const unused = cs.clues.filter((c) => (c.rules || []).length && !run.used.has(c.id)).map((c) => c.id);
  // 4. hints from random partial grids
  if (run.ok) {
    const all = [];
    for (const [ca, cb] of model.blocks) for (const a of model.byCat[ca]) for (const b of model.byCat[cb]) all.push([a.id, b.id]);
    const rand = rng(cs.id.length * 7919 + model.n);
    for (let t = 0; t < 200; t++) {
      const marks = new Map();
      const p = rand() * 0.6;
      for (const [a, b] of all) if (rand() < p) marks.set(key(model, a, b), truth(model, a, b));
      const r = solveFrom(model, marks, false);
      if (!r.ok) { fail(cs, `stuck from a random partial grid (${r.unsound || 'no step'})`); break; }
    }
  }
  const lv = run.levels;
  rows.push(`${cs.id.padEnd(10)} ${String(model.n).padStart(2)} items ${String(cs.cats.length + 1)} cats  steps ${String(run.steps).padStart(3)}  direct ${lv[1]} single ${lv[2]} either/link ${lv[3]} compare/cross ${lv[4]}  clues ${cs.clues.length}${unused.length ? `  unused ${unused.join(',')}` : ''}`);
}
console.log('\n' + rows.join('\n'));
console.log(failed ? `\n${failed} problem(s)` : '\nall cases: one answer each, reachable by logic alone');
process.exit(failed ? 1 : 0);
