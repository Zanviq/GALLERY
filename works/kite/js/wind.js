// The page's wind: a light breeze that never stops, plus gusts made by the pointer, a finger's sideways
// swipe, or the "바람 불기" button. Everything is in page coordinates and metres per second.
// It blows from right to left (the flyers stand off the right edge, the kites fly downwind of them).

const PX_TO_MS = 1 / 150;   // pointer speed 1500 px/s ≈ a 10 m/s gust where it passes
const MAX_GUSTS = 48;

export const BEAUFORT = [
  [0.3, '고요'], [1.6, '실바람'], [3.4, '남실바람'], [5.5, '산들바람'], [8.0, '건들바람'],
  [10.8, '흔들바람'], [13.9, '된바람'], [Infinity, '센바람'],
];
export const beaufortName = (ms) => BEAUFORT.find(([lim]) => ms < lim)[1];

export class Wind {
  constructor(reduceQuery) {
    this.reduceQuery = reduceQuery;
    this.calm = reduceQuery.matches;          // reduced motion: same wind, smaller and slower answers
    reduceQuery.addEventListener?.('change', (e) => { this.calm = e.matches; });
    this.t = 0;
    this.gusts = [];
    this.sweeps = [];
    this.last = null;
    this.sigma = 140;
    this.active = 0;                          // 0..1, how much the visitor is stirring right now
    this.onResize();
    addEventListener('resize', () => this.onResize(), { passive: true });
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;  // touches are read from touch events (they survive scrolling)
      this.feed(e.pageX, e.pageY, e.timeStamp, false);
    }, { passive: true });
    addEventListener('pointerleave', () => { this.last = null; }, { passive: true });
    addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (t) this.last = { x: t.pageX, y: t.pageY, time: e.timeStamp };
    }, { passive: true });
    addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (t) this.feed(t.pageX, t.pageY, e.timeStamp, true);
    }, { passive: true });
    addEventListener('touchend', () => { this.last = null; }, { passive: true });
  }

  onResize() {
    this.sigma = Math.min(170, Math.max(90, innerWidth * 0.1));
  }

  feed(x, y, time, touch) {
    const last = this.last;
    this.last = { x, y, time };
    if (!last) return;
    const dt = Math.max(8, time - last.time) / 1000;
    if (dt > 0.2) return;
    let vx = (x - last.x) / dt;
    let vy = (y - last.y) / dt;
    // a mostly vertical swipe on a phone is scrolling, not wind: only sideways swipes blow
    if (touch) {
      if (Math.abs(y - last.y) > 1.5 * Math.abs(x - last.x)) return;
      vy *= 0.3;
    }
    const sp = Math.hypot(vx, vy);
    if (sp < 60) return;
    const cap = 2600;
    if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
    this.push(x, y, vx, vy, 1.1, this.sigma);
    this.active = Math.min(1, this.active + sp / 9000);
  }

  push(x, y, vx, vy, life, sigma) {
    this.gusts.push({ x, y, vx, vy, age: 0, life, sigma });
    if (this.gusts.length > MAX_GUSTS) this.gusts.shift();
  }

  // a broad gust that crosses the visible screen from right to left (the button, keyboard path)
  sweep() {
    this.sweeps.push({ age: 0, dur: 1.5 });
    this.active = 1;
  }

  base(t) {
    // 2–5 m/s: 남실바람 to 산들바람, the breeze a winter afternoon on a river flat usually has
    return 3.6 + 0.9 * Math.sin(t * 0.21) + 0.55 * Math.sin(t * 0.57 + 1.3) + 0.25 * Math.sin(t * 1.7 + 0.4);
  }

  step(dt) {
    const k = this.calm ? 0.6 : 1;
    this.t += dt * k;
    for (const g of this.gusts) {
      g.age += dt;
      g.x += g.vx * dt * 0.32;
      g.y += g.vy * dt * 0.32;
    }
    this.gusts = this.gusts.filter((g) => g.age < g.life);
    for (const s of this.sweeps) {
      s.age += dt;
      const p = s.age / s.dur;
      if (p < 1) {
        const x = scrollX + innerWidth * (1.1 - 1.3 * p);
        for (let y = scrollY - 40; y < scrollY + innerHeight + 40; y += 110) {
          if (Math.random() < 0.22) this.push(x, y + Math.random() * 60, -1250, -140 + Math.random() * 120, 0.9, 190);
        }
      }
    }
    this.sweeps = this.sweeps.filter((s) => s.age < s.dur);
    this.active = Math.max(0, this.active - dt * 0.8);
  }

  // wind at a page point, m/s; x < 0 is the usual direction (right to left)
  sample(x, y) {
    const t = this.t;
    const b = this.base(t + x * 0.0009);
    let wx = -b;
    let wy = 0.35 * Math.sin(t * 0.43 + x * 0.002) + 0.2 * Math.sin(t * 1.1 + y * 0.003);
    const gk = (this.calm ? 0.6 : 1) * PX_TO_MS;
    for (const g of this.gusts) {
      const dx = x - g.x, dy = y - g.y;
      const s2 = g.sigma * g.sigma;
      const d2 = dx * dx + dy * dy;
      if (d2 > 9 * s2) continue;
      const life = 1 - g.age / g.life;
      const f = Math.exp(-d2 / (2 * s2)) * life * life * gk;
      wx += g.vx * f;
      wy += g.vy * f;
    }
    const m = Math.hypot(wx, wy);
    if (m > 15) { wx *= 15 / m; wy *= 15 / m; }
    return { x: wx, y: wy };
  }
}
