// The show: ten captions, puppets and the light move on a timeline.
// Each step: caption, duration (s), `set` (instant at the start of the step) and tweens
// [id, {prop: value}, start, end, options] with start/end in seconds from the step start.
// Props: x, y, z, angle (degrees, clockwise), flip (1 faces right, -1 faces left), on.

const WALK = { amp: 3, freq: 1.8, lift: 0.55 };
const ROCK = { amp: 2.2, freq: 0.5, lift: 0.25 };

export const SCRIPT = [
  {
    cap: '소나무 옆 작은 집에 밤이 찾아왔어요.', dur: 4.2,
    set: {
      house: { on: 1, x: 22, z: 6, y: 15, angle: 0, flip: 1 },
      pine: { on: 1, x: 40, z: 10, y: 16, angle: 0, flip: 1 },
      moon: { on: 1, x: 98, z: 3, y: 40, angle: 0, flip: 1 },
      fox: { on: 1, x: -24, z: 10, y: 14.6, angle: 0, flip: 1 },
      bearer: { on: 1, x: 146, z: 8, y: 20, angle: 0, flip: -1 },
      boat: { on: 1, x: -36, z: 5, y: 10, angle: 0, flip: 1 },
      l1: { x: 60, y: 22, z: 40 },
      l2: { on: 0, x: 104, y: 52, z: 34 },
    },
    tw: [['moon', { y: 43 }, 0.3, 3.8]],
  },
  {
    cap: '여우 한 마리가 살금살금 집 앞을 지나가요.', dur: 4.2,
    tw: [['fox', { x: 58 }, 0.1, 4.0, WALK]],
  },
  {
    cap: '건너편에서 등불을 든 사람이 걸어와요.', dur: 4.2,
    tw: [
      ['bearer', { x: 92 }, 0.1, 3.4, WALK],
      ['fox', { z: 14 }, 1.0, 3.0],
      ['l1', { x: 70 }, 1.4, 4.0],
    ],
  },
  {
    cap: '등불이 다가오자 여우 그림자가 집채만 해졌어요.', dur: 4.4,
    tw: [['l1', { x: 64, y: 11, z: 20 }, 0.2, 2.8]],
  },
  {
    cap: '등불 든 사람은 깜짝 놀라 뒷걸음쳤어요.', dur: 4.0,
    tw: [
      ['bearer', { angle: 9 }, 0.15, 0.5],
      ['bearer', { x: 108 }, 0.3, 1.7],
      ['bearer', { angle: 0 }, 1.8, 2.6],
    ],
  },
  {
    cap: '등불이 멀어지니 여우 그림자도 제 크기로 돌아왔어요.', dur: 4.2,
    tw: [
      ['l1', { x: 62, y: 22, z: 40 }, 0.2, 3.0],
      ['fox', { z: 10 }, 0.5, 2.5],
    ],
  },
  {
    cap: '여우가 꾸벅 인사하자 등불 든 사람도 꾸벅 인사했어요.', dur: 4.6,
    tw: [
      ['bearer', { x: 86 }, 0.0, 1.6, WALK],
      ['fox', { angle: 20 }, 0.3, 0.9],
      ['fox', { angle: 0 }, 1.2, 1.8],
      ['bearer', { angle: -18 }, 2.1, 2.7],
      ['bearer', { angle: 0 }, 3.0, 3.6],
    ],
  },
  {
    cap: '둘은 작은 배를 타고 달 쪽으로 노를 저어 가요.', dur: 4.8,
    tw: [
      ['boat', { x: 50 }, 0.0, 2.2],
      ['house', { x: -26 }, 0.8, 4.6],
      ['pine', { x: -16 }, 0.8, 4.6],
      ['fox', { x: 42, y: 16.6, z: 5.5 }, 1.6, 3.0],
      ['bearer', { x: 59, y: 22, z: 6, flip: 1 }, 1.6, 3.0],
      ['boat', { x: 57 }, 3.1, 4.8],
      ['fox', { x: 49 }, 3.1, 4.8],
      ['bearer', { x: 66 }, 3.1, 4.8],
    ],
  },
  {
    cap: '달빛이 하나 더 비추자 그림자가 둘씩 생겼어요.', dur: 4.4,
    set: { l2: { on: 1 } },
    tw: [
      ['l1', { x: 50 }, 0.3, 3.0],
      ['boat', { x: 66 }, 0.0, 4.4, ROCK],
      ['fox', { x: 58 }, 0.0, 4.4, ROCK],
      ['bearer', { x: 75 }, 0.0, 4.4, ROCK],
    ],
  },
  { cap: '오늘 공연은 여기까지예요.', dur: 3.0 },
];

const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

export function compile(script = SCRIPT) {
  const tracks = new Map(); // "id.prop" -> {init, segs: [{t0, t1, from, to}]}
  const mods = [];
  const steps = [];
  const cur = {};
  let T = 0;
  const track = (id, prop) => {
    const k = id + '.' + prop;
    if (!tracks.has(k)) tracks.set(k, { id, prop, init: cur[id]?.[prop], segs: [] });
    return tracks.get(k);
  };
  for (const step of script) {
    steps.push({ t0: T, t1: T + step.dur, cap: step.cap });
    for (const [id, props] of Object.entries(step.set || {})) {
      cur[id] = cur[id] || {};
      for (const [p, v] of Object.entries(props)) {
        const tr = track(id, p);
        if (tr.init === undefined && !tr.segs.length) tr.init = v;
        else tr.segs.push({ t0: T, t1: T, from: v, to: v });
        cur[id][p] = v;
      }
    }
    for (const [id, props, a, b, opt] of step.tw || []) {
      for (const [p, v] of Object.entries(props)) {
        const tr = track(id, p);
        tr.segs.push({ t0: T + a, t1: T + b, from: cur[id][p], to: v });
        cur[id][p] = v;
      }
      if (opt) mods.push({ id, t0: T + a, t1: T + b, ...opt });
    }
    T += step.dur;
  }
  const duration = T;

  function evaluate(t, reduced) {
    let step = steps.length - 1;
    for (let i = 0; i < steps.length; i++) if (t < steps[i].t1) { step = i; break; }
    const tt = reduced ? steps[step].t1 - 1e-4 : t;
    const out = {};
    for (const tr of tracks.values()) {
      let v = tr.init;
      for (const s of tr.segs) {
        if (tt >= s.t1) { v = s.to; continue; }
        if (tt >= s.t0) v = s.from + (s.to - s.from) * ease((tt - s.t0) / (s.t1 - s.t0));
        break;
      }
      (out[tr.id] = out[tr.id] || {})[tr.prop] = v;
    }
    if (!reduced) {
      for (const m of mods) {
        if (t < m.t0 || t > m.t1) continue;
        const u = (t - m.t0) / (m.t1 - m.t0);
        const env = Math.sin(Math.PI * Math.min(1, u * 4, (1 - u) * 4) / 2);
        const ph = 2 * Math.PI * m.freq * (t - m.t0);
        const o = out[m.id];
        o.angle += m.amp * Math.sin(ph) * env;
        o.y += m.lift * Math.abs(Math.sin(ph)) * env;
      }
    }
    return { state: out, step };
  }
  return { duration, steps, evaluate };
}
