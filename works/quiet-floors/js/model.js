// Numbers are illustrative (예시), shown as such on the page. They are not measurements or legal limits.

export const FLOORS = [5, 4, 3, 2];
export const unitNo = (f, c) => `${f}0${c + 1}`;
export const BG = { night: 28, day: 42 };
export const CLOCK = { night: '밤 10:40', day: '낮 2:00' };

// below: level at the unit directly below, with no fixes.
// side/above: offsets for the unit beside and the unit above.
// spot: where in the room it happens (0 = outer wall, 1 = party wall). air: airborne share for the drawing.
export const ACTS = {
  run: {
    label: '아이가 뛰기', past: '아이가 뛰었어요', below: 50, kind: 'heavy', air: 0.35, spot: 0.66, spotY: 80,
    side: -9, above: -11, hits: [[0, 1], [0.34, 0.85], [0.68, 1], [1.02, 0.9], [1.36, 1], [1.7, 0.8]],
    dur: 2.7, freq: 6, decay: 0.32, fix: { mat: 9, slipper: 4 },
  },
  chair: {
    label: '의자 끌기', past: '의자를 끌었어요', below: 45, kind: 'light', air: 0.3, spot: 0.24, spotY: 96,
    side: -9, above: -11, span: [0, 1.3], dur: 2.1, freq: 15, decay: 0.12, fix: { pad: 13, mat: 4 },
  },
  door: {
    label: '문 쾅 닫기', past: '문을 쾅 닫았어요', below: 47, kind: 'wall', air: 0.75, spot: 0.87, spotY: 66,
    side: -2, above: -6, hits: [[0, 1]], dur: 1.9, freq: 8, decay: 0.22, fix: { doorstop: 14 },
  },
  washer: {
    label: '밤 세탁기', past: '세탁기를 돌렸어요', below: 39, kind: 'cont', air: 0.5, spot: 0.1, spotY: 90,
    side: -5, above: -8, span: [0, 3.2], dur: 3.8, freq: 11, decay: 0.2, fix: {},
  },
  weights: {
    label: '운동 기구 내려놓기', past: '운동 기구를 내려놓았어요', below: 56, kind: 'heavy', air: 0.2, spot: 0.6, spotY: 104,
    side: -9, above: -11, hits: [[0, 1], [0.3, 0.45]], dur: 2.4, freq: 5, decay: 0.36, fix: { mat: 13 },
  },
};
export const ACT_ORDER = ['run', 'chair', 'door', 'washer', 'weights'];

export const FIXES = {
  mat: { label: '매트 깔기' },
  pad: { label: '의자 다리 패드' },
  slipper: { label: '실내화 신기' },
  time: { label: '시간 바꾸기' },
  doorstop: { label: '방문 완충재' },
};
export const FIX_ORDER = ['mat', 'pad', 'slipper', 'time', 'doorstop'];

const NUM = ['', '두', '세', '네'];

// df > 0: the target is below the source. same: same column.
export function relName(df, same) {
  if (df === 0) return '옆집';
  const n = Math.abs(df);
  const dir = df > 0 ? '아래' : '위';
  if (n === 1) return same ? `바로 ${dir}` : `${dir}층 옆집`;
  return same ? `${NUM[n - 1]}\u00A0층 ${dir}` : `${NUM[n - 1]}\u00A0층 ${dir} 옆집`;
}

export function offset(act, df, same) {
  if (df === 0) return act.side;
  if (df > 0) return same ? [0, 0, -8, -13][df] : [0, -7, -12, -16][df];
  const n = -df;
  return act.above + (same ? 0 : -4) - (n - 1) * 7;
}

export function reduction(act, fixes) {
  let r = 0;
  for (const f of fixes) r += act.fix[f] || 0;
  return r;
}

export function meterUnit(src) {
  return src.f > 2 ? { f: src.f - 1, c: src.c } : { f: src.f, c: 1 - src.c };
}

// Everything the page shows for one setup.
export function compute(state) {
  const act = ACTS[state.activity];
  const fixes = [...state.fixes];
  const red = reduction(act, fixes);
  const day = state.fixes.has('time');
  const bg = day ? BG.day : BG.night;
  const m = meterUnit(state.source);
  const list = [];
  for (const f of FLOORS) {
    for (const c of [0, 1]) {
      if (f === state.source.f && c === state.source.c) continue;
      const df = state.source.f - f;
      const same = c === state.source.c;
      const L = act.below + offset(act, df, same) - red;
      const L0 = act.below + offset(act, df, same);
      list.push({ f, c, no: unitNo(f, c), rel: relName(df, same), df, same, L, L0, margin: L - bg, meter: f === m.f && c === m.c });
    }
  }
  const mu = list.find((u) => u.meter);
  return { act, fixes, red, day, bg, meter: mu, list, before: mu.L0, now: mu.L };
}
