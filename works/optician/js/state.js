// Shared state for the one fictional fitting the page walks through.
export const TARGET = -2.25; // the fictional customer's right eye

export const FACES = {
  narrow: { width: 132, pd: 60, ear: 94, label: '좁은 얼굴' },
  medium: { width: 140, pd: 63, ear: 100, label: '보통 얼굴' },
  wide: { width: 148, pd: 66, ear: 106, label: '넓은 얼굴' },
};

export const INDEX_PRICE = { '1.56': 40000, '1.60': 60000, '1.67': 90000, '1.74': 150000 };

export const state = { face: 'medium', a: 52, dbl: 18, l: 140, index: '1.60' };

const listeners = new Set();
export function update(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) fn(state, patch);
}
export function subscribe(fn) {
  listeners.add(fn);
}

const rm = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => rm.matches;

/** −2.25 / +1.00 / 0.00 with a real minus sign. */
export function signed(v, digits = 2) {
  const s = Math.abs(v).toFixed(digits);
  if (Math.abs(v) < 1e-9) return s;
  return (v < 0 ? '−' : '+') + s;
}

/** Words for screen readers: 마이너스 1.75 디옵터 */
export function spoken(v) {
  const s = Math.abs(v).toFixed(2);
  if (Math.abs(v) < 1e-9) return `${s} 디옵터`;
  return `${v < 0 ? '마이너스' : '플러스'} ${s} 디옵터`;
}

export const mm = (n, digits = 1) => `${n.toFixed(digits)}mm`;
