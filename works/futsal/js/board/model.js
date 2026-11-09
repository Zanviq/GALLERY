// Tactics board model: pieces, moves, beats, simulation and plain-Korean descriptions.
// Units are metres. The field is 40 x 20; we attack toward +x; "left" is small y.

export const L = 40;
export const W = 20;
export const POST_OUT = [8.42, 11.58]; // outsides of the goal posts (3 m goal + 8 cm posts)

export const PLAYERS = [
  { id: 'p1', num: 1, name: '해경', role: '골키퍼', gk: true },
  { id: 'p3', num: 3, name: '수진', role: '픽소' },
  { id: 'p11', num: 11, name: '다온', role: '왼쪽 알라' },
  { id: 'p7', num: 7, name: '은채', role: '오른쪽 알라' },
  { id: 'p9', num: 9, name: '미란', role: '피보' },
];
export const PLAYER = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));
export const PIECES = [...PLAYERS.map((p) => p.id), 'ball'];

export const RUN_SPEED = 5.5;
export const PASS_SPEED = 13;
const MIN_RUN = 0.45;
const MIN_PASS = 0.3;
export const GAP = 0.2;
export const SNAP = 1.6;
const OWN = 1.4;
const RECEIVE = 1.0;
export const MAX_MOVES = 30;
export const BOUNDS = { x0: -1.5, x1: 41.5, y0: -1.5, y1: 21.5 };

export const clone = (o) => JSON.parse(JSON.stringify(o));
export const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
export const clampPt = (p) => ({
  x: Math.min(BOUNDS.x1, Math.max(BOUNDS.x0, p.x)),
  y: Math.min(BOUNDS.y1, Math.max(BOUNDS.y0, p.y)),
});

export function isGoal(p) {
  return (p.x > L || p.x < 0) && p.y > POST_OUT[0] && p.y < POST_OUT[1];
}

function ownerOf(pos) {
  let best = null;
  let bd = OWN;
  for (const p of PLAYERS) {
    const d = dist(pos[p.id], pos.ball);
    if (d <= bd) { bd = d; best = p.id; }
  }
  return best;
}

/** Beat index of every move: a move that joins the one before it shares its beat. */
export function beatsOf(moves) {
  const out = [];
  let b = -1;
  moves.forEach((m, i) => { b = i > 0 && m.join ? b : b + 1; out.push(b); });
  return out;
}

/** 'twoPasses' | 'twoRuns' | null */
export function validate(moves) {
  const beats = beatsOf(moves);
  const seen = new Map();
  for (let i = 0; i < moves.length; i++) {
    const key = beats[i];
    if (!seen.has(key)) seen.set(key, { pass: 0, runs: new Set() });
    const s = seen.get(key);
    if (moves[i].kind === 'pass') { if (++s.pass > 1) return 'twoPasses'; }
    else if (s.runs.has(moves[i].piece)) return 'twoRuns';
    else s.runs.add(moves[i].piece);
  }
  return null;
}

const ease = {
  inout: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: (u) => 1 - (1 - u) * (1 - u),
};

/**
 * Play the moves through and return one record per beat:
 * { idx: [move indexes], start, end, tracks, T, ownerStart, ownerEnd, shot }
 */
export function simulate(state) {
  const pos = clone(state.setup);
  let owner = ownerOf(pos);
  const beats = beatsOf(state.moves);
  const groups = [];
  state.moves.forEach((m, i) => { (groups[beats[i]] ||= []).push(i); });
  const out = [];
  for (const idx of groups) {
    const start = clone(pos);
    const end = clone(pos);
    const ownerStart = owner;
    const tracks = {};
    let T = 0;
    let passIdx = -1;
    for (const i of idx) {
      const m = state.moves[i];
      if (m.kind === 'pass') { passIdx = i; continue; }
      const from = start[m.piece];
      const dur = Math.max(MIN_RUN, dist(from, m.to) / RUN_SPEED);
      tracks[m.piece] = { from, to: m.to, t0: 0, t1: dur, ease: 'inout' };
      end[m.piece] = { ...m.to };
      T = Math.max(T, dur);
    }
    let shot = null;
    if (passIdx >= 0) {
      const m = state.moves[passIdx];
      const from = start.ball;
      const aim = m.target ? end[m.target] : m.to;
      const d = dist(from, aim);
      const dur = Math.max(MIN_PASS, d / PASS_SPEED);
      let t0 = 0;
      if (m.target && tracks[m.target]) t0 = Math.max(0, tracks[m.target].t1 - dur);
      let rest = { ...aim };
      if (m.target && d > 0.01) {
        const ux = (aim.x - from.x) / d;
        const uy = (aim.y - from.y) / d;
        const back = Math.min(RECEIVE, d * 0.5);
        rest = { x: aim.x - ux * back, y: aim.y - uy * back };
      }
      tracks.ball = { from, to: rest, t0, t1: t0 + dur, ease: 'out' };
      end.ball = rest;
      owner = m.target || null;
      if (!m.target && isGoal(aim)) shot = { by: ownerStart, at: t0 + dur };
      T = Math.max(T, t0 + dur);
    } else if (ownerStart && tracks[ownerStart]) {
      const off = { x: start.ball.x - start[ownerStart].x, y: start.ball.y - start[ownerStart].y };
      tracks.ball = { follow: ownerStart, off };
      end.ball = { x: end[ownerStart].x + off.x, y: end[ownerStart].y + off.y };
    }
    if (!owner && !shot) {
      // a loose ball is picked up by whoever ends a run next to it
      for (const p of PLAYERS) if (tracks[p.id] && dist(end[p.id], end.ball) <= OWN) { owner = p.id; break; }
    }
    if (shot) owner = null;
    out.push({ idx, start, end, tracks, T, ownerStart, ownerEnd: owner, shot });
    Object.assign(pos, end);
  }
  return out;
}

/** Final positions after every move (where a new arrow would start). */
export function finalPositions(state, sim = simulate(state)) {
  return sim.length ? sim[sim.length - 1].end : clone(state.setup);
}

export function finalOwner(state, sim = simulate(state)) {
  return sim.length ? sim[sim.length - 1].ownerEnd : ownerOf(state.setup);
}

/** Positions inside beat `b` at time t (seconds from the beat's start). */
export function positionsAt(b, t) {
  const p = clone(b.start);
  for (const [id, tr] of Object.entries(b.tracks)) {
    if (tr.follow) continue;
    const span = Math.max(0.001, tr.t1 - tr.t0);
    const u = Math.min(1, Math.max(0, (t - tr.t0) / span));
    const e = ease[tr.ease](u);
    p[id] = { x: tr.from.x + (tr.to.x - tr.from.x) * e, y: tr.from.y + (tr.to.y - tr.from.y) * e };
  }
  const f = b.tracks.ball && b.tracks.ball.follow ? b.tracks.ball : null;
  if (f) p.ball = { x: p[f.follow].x + f.off.x, y: p[f.follow].y + f.off.y };
  return p;
}

/** Where the players stand at the end of the beat a new move would land in. */
export function positionsForNew(state, join, sim = simulate(state)) {
  if (join && sim.length) {
    const last = sim[sim.length - 1];
    return last.end;
  }
  return finalPositions(state, sim);
}

export function snapTarget(point, positions, radius = SNAP) {
  let best = null;
  let bd = radius;
  for (const p of PLAYERS) {
    const d = dist(point, positions[p.id]);
    if (d <= bd) { bd = d; best = p.id; }
  }
  return best;
}

/* ---------- words ---------- */

function batchim(word) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return /[013678lmn]$/i.test(word) ? 1 : 0;
  return (c - 0xac00) % 28;
}
export const iga = (w) => w + (batchim(w) ? '이' : '가');
export const euro = (w) => { const b = batchim(w); return w + (b && b !== 8 ? '으로' : '로'); };
export const eul = (w) => w + (batchim(w) ? '을' : '를');

export function zone(p) {
  if (isGoal(p)) return p.x > L ? '상대 골문' : '우리 골문';
  const gy = Math.min(POST_OUT[1], Math.max(POST_OUT[0], p.y));
  if (p.x <= L && Math.hypot(L - p.x, gy - p.y) <= 6) return '상대 페널티 지역 안';
  if (p.x >= 0 && Math.hypot(p.x, gy - p.y) <= 6) return '우리 페널티 지역 안';
  const half = p.x >= 22 ? '상대 진영' : p.x <= 18 ? '우리 진영' : '하프라인 근처';
  let lane;
  if (p.y < 1.2) lane = '왼쪽 터치라인';
  else if (p.y > W - 1.2) lane = '오른쪽 터치라인';
  else if (p.y < 6.5) lane = '왼쪽';
  else if (p.y > 13.5) lane = '오른쪽';
  else lane = '가운데';
  if (p.x < 0 || p.x > L) return `${p.x < 0 ? '우리' : '상대'} 골라인 밖`;
  return `${half} ${lane}`;
}

export const who = (id) => `${PLAYER[id].num}번 ${PLAYER[id].name}`;
const m1 = (d) => `${Math.max(1, Math.round(d))} m`; // no-break space keeps '4 m' together

/** One sentence per move, using the simulation for start points and owners. */
export function describeMoves(state, sim = simulate(state)) {
  const lines = new Array(state.moves.length);
  sim.forEach((b, bi) => {
    for (const i of b.idx) {
      const m = state.moves[i];
      if (m.kind === 'run') {
        lines[i] = { beat: bi + 1, text: `${iga(who(m.piece))} ${euro(zone(m.to))} 뛰어요 (${m1(dist(b.start[m.piece], m.to))})` };
      } else {
        const tr = b.tracks.ball;
        const aim = m.target ? b.end[m.target] : m.to;
        const d = m1(dist(tr.from, aim));
        const from = b.ownerStart ? who(b.ownerStart) : null;
        let text;
        if (b.shot) text = from ? `${iga(from)} 슛해요 (${d})` : `공이 골문으로 가요 (${d})`;
        else if (m.target) text = from ? `${iga(from)} ${who(m.target)}에게 패스해요 (${d})` : `공이 ${who(m.target)}에게 가요 (${d})`;
        else text = from ? `${iga(from)} ${zone(aim)} 빈 곳으로 패스해요 (${d})` : `공이 ${zone(aim)} 빈 곳으로 가요 (${d})`;
        lines[i] = { beat: bi + 1, text };
      }
    }
  });
  return lines;
}

export function describePiece(id, p, owner) {
  if (id === 'ball') return `공. ${zone(p)}.${owner ? ` ${PLAYER[owner].name} 발밑.` : ''}`;
  const pl = PLAYER[id];
  return `${pl.num}번 ${pl.name}, ${pl.role}. ${zone(p)}.`;
}

export { ownerOf };
