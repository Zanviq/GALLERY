// The drum behind the porthole: verlet laundry tumbling in a rotating drum, Canvas 2D.
// Units are metres and seconds. y points down. Positive omega turns the drum clockwise.

const R = 0.26;            // drum radius
const LIFT = 0.048;        // lifter height
const LIFT_T = 0.013;      // lifter half thickness
const G = 9.8;
const TAU = Math.PI * 2;

const C = {
  graphite: '#1F2428', white: '#FFFFFF', steel: '#C5CCD2', steelHi: '#E4E8EB', steelLo: '#8E99A3',
  steelDark: '#6E7983', mint: '#BEE9DA', mintDeep: '#5FB497',
};

// Garment recipes in local coordinates. Each returns { pts:[[x,y]], cons:[[i,j,stiff]], draw, colors }.
function sock(colorA, colorB) {
  const pts = [[0, -0.05], [0, -0.016], [0, 0.018], [0.02, 0.044], [0.052, 0.05]];
  const cons = [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 2, 0.25], [1, 3, 0.25], [2, 4, 0.25]];
  return { type: 'sock', r: 0.015, pts, cons, fill: colorA, stripe: colorB, width: 0.032 };
}
function grid(w, h, type, fill, stripe, r) {
  const pts = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) pts.push([(i - 1) * w / 2, (j - 1) * h / 2]);
  const cons = [];
  const id = (i, j) => j * 3 + i;
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
    if (i < 2) cons.push([id(i, j), id(i + 1, j), 1]);
    if (j < 2) cons.push([id(i, j), id(i, j + 1), 1]);
    if (i < 2 && j < 2) { cons.push([id(i, j), id(i + 1, j + 1), 0.7]); cons.push([id(i + 1, j), id(i, j + 1), 0.7]); }
  }
  for (let j = 0; j < 3; j++) cons.push([id(0, j), id(2, j), 0.12]);
  for (let i = 0; i < 3; i++) cons.push([id(i, 0), id(i, 2), 0.12]);
  return { type, r, pts, cons, fill, stripe };
}
function towel(fill, stripe) { return grid(0.12, 0.1, 'towel', fill, stripe, 0.017); }
function shirt(fill, stripe) {
  const g = grid(0.09, 0.1, 'shirt', fill, stripe, 0.017);
  g.pts.push([-0.085, -0.035], [0.085, -0.035]); // sleeve ends
  g.cons.push([0, 9, 1], [2, 10, 1], [3, 9, 0.3], [5, 10, 0.3]);
  return g;
}
function pants(fill, stripe) {
  const pts = [[-0.035, -0.06], [0.035, -0.06], [-0.04, -0.005], [-0.042, 0.055], [0.04, -0.005], [0.042, 0.055]];
  const cons = [[0, 1, 1], [0, 2, 1], [2, 3, 1], [1, 4, 1], [4, 5, 1], [0, 4, 0.6], [1, 2, 0.6], [0, 3, 0.15], [1, 5, 0.15], [2, 4, 0.2]];
  return { type: 'pants', r: 0.018, pts, cons, fill, stripe, width: 0.04 };
}

const RECIPES = {
  sock: [() => sock(C.white, C.graphite), () => sock(C.graphite, C.white), () => sock(C.steelDark, C.white), () => sock(C.mint, C.graphite)],
  towel: [() => towel(C.mint, C.white), () => towel(C.white, C.mintDeep), () => towel(C.steel, C.graphite)],
  shirt: [() => shirt(C.white, C.steelLo), () => shirt(C.mintDeep, C.white), () => shirt(C.steelHi, C.graphite)],
  pants: [() => pants(C.graphite, C.steelLo), () => pants(C.steelDark, C.graphite)],
};

export class Drum {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = reduced;
    this.P = [];            // points {x,y,px,py,r,b}
    this.bodies = [];       // {type, idx:[], cons:[[a,b,rest,stiff]], fill, stripe, width, load}
    this.theta = 0;
    this.omega = 0;
    this.target = 0;        // target omega, rad/s
    this.accel = 6;         // rad/s^2 toward target
    this.coast = true;      // when true the drum slows by friction instead of chasing target
    this.water = 0;         // level as a fraction of the diameter
    this.waterTarget = 0;
    this.mode = 'washer';
    this.locked = false;
    this.grab = null;       // {i, x, y, vx, vy}
    this.hand = null;       // {a, t}
    this.visible = true;
    this.running = false;   // loop flag
    this.calm = 0;
    this.time = 0;
    this.picks = { sock: 0, towel: 0, shirt: 0, pants: 0 };
    this.onStep = null;
    this.resize();
    window.addEventListener('resize', () => { this.resize(); this.draw(); });
    this.bindPointer();
    this.bindKeys();
    const io = new IntersectionObserver((es) => { this.visible = es[0].intersectionRatio > 0.1; this.wake(); }, { threshold: [0, 0.1, 0.5] });
    io.observe(canvas);
    document.addEventListener('visibilitychange', () => this.wake());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = Math.max(1, Math.round(rect.width * dpr));
    if (this.canvas.width !== size) { this.canvas.width = size; this.canvas.height = size; }
    this.scale = size / 2 / (R * 1.035);
    this.cx = size / 2;
    this.dpr = dpr;
  }

  // ------------------------------------------------------------------ content
  load() { return this.bodies.reduce((s, b) => s + b.load, 0); }

  add(kind, load) {
    const list = RECIPES[kind];
    const rec = list[this.picks[kind]++ % list.length]();
    const ang = (Math.random() - 0.5) * 1.2;
    const ox = (Math.random() - 0.5) * 0.12, oy = -R * 0.45;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const base = this.P.length;
    const idx = [];
    for (const [x, y] of rec.pts) {
      const wx = ox + x * cs - y * sn, wy = oy + x * sn + y * cs;
      this.P.push({ x: wx, y: wy, px: wx, py: wy - 0.004, r: rec.r, b: this.bodies.length });
      idx.push(this.P.length - 1);
    }
    const cons = rec.cons.map(([a, b, s]) => {
      const pa = this.P[base + a], pb = this.P[base + b];
      return [base + a, base + b, Math.hypot(pa.x - pb.x, pa.y - pb.y), s];
    });
    this.bodies.push({ ...rec, idx, cons, load });
    this.wake();
  }

  empty() {
    this.P = [];
    this.bodies = [];
    this.grab = null;
    this.wake();
  }

  settle(steps = 360) {
    for (let i = 0; i < steps; i++) this.sub(1 / 240);
  }

  // ------------------------------------------------------------------ physics
  sub(dt) {
    const P = this.P;
    const w = this.omega;
    // drum
    if (!this.hand) this.theta += w * dt;
    const surf = R - this.water * 2 * R;
    const tilt = Math.max(-0.35, Math.min(0.35, w * 0.03));
    const drag = Math.exp(-3.2 * dt);
    for (const p of P) {
      let vx = (p.x - p.px) * 0.9995, vy = (p.y - p.py) * 0.9995;
      let gy = G;
      if (this.water > 0.01 && p.y > surf + tilt * p.x) { vx *= drag; vy *= drag; gy = G * 0.3; }
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + gy * dt * dt;
    }
    if (this.grab) {
      const p = P[this.grab.i];
      if (p) { p.x = this.grab.x; p.y = this.grab.y; p.px = p.x - this.grab.vx * dt; p.py = p.y - this.grab.vy * dt; }
    }
    for (let it = 0; it < 3; it++) {
      for (const b of this.bodies) {
        for (const [i, j, rest, s] of b.cons) {
          const a = P[i], c = P[j];
          const dx = c.x - a.x, dy = c.y - a.y;
          const d = Math.hypot(dx, dy) || 1e-6;
          const k = ((d - rest) / d) * 0.5 * s;
          a.x += dx * k; a.y += dy * k; c.x -= dx * k; c.y -= dy * k;
        }
      }
      this.collide(dt);
    }
  }

  collide(dt) {
    const P = this.P, n = P.length, w = this.omega;
    // garments push each other apart
    for (let i = 0; i < n; i++) {
      const a = P[i];
      for (let j = i + 1; j < n; j++) {
        const c = P[j];
        if (a.b === c.b) continue;
        const dx = c.x - a.x, dy = c.y - a.y, min = a.r + c.r;
        if (dx > min || dx < -min || dy > min || dy < -min) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 < 1e-12) continue;
        const d = Math.sqrt(d2), k = ((min - d) / d) * 0.5;
        a.x -= dx * k; a.y -= dy * k; c.x += dx * k; c.y += dy * k;
      }
    }
    // lifters
    for (let L = 0; L < 3; L++) {
      const ang = this.theta + (L * TAU) / 3;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const x0 = ux * R, y0 = uy * R, x1 = ux * (R - LIFT), y1 = uy * (R - LIFT);
      for (const p of P) {
        const t = Math.max(0, Math.min(1, ((p.x - x0) * (x1 - x0) + (p.y - y0) * (y1 - y0)) / (LIFT * LIFT)));
        const qx = x0 + (x1 - x0) * t, qy = y0 + (y1 - y0) * t;
        const dx = p.x - qx, dy = p.y - qy, min = p.r + LIFT_T;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        const nx = d > 1e-6 ? dx / d : -uy, ny = d > 1e-6 ? dy / d : ux;
        p.x = qx + nx * min; p.y = qy + ny * min;
        // carry with the lifter
        const lvx = -w * p.y, lvy = w * p.x;
        const vx = (p.x - p.px) / dt, vy = (p.y - p.py) / dt;
        const nvx = vx + (lvx - vx) * 0.55, nvy = vy + (lvy - vy) * 0.55;
        p.px = p.x - nvx * dt; p.py = p.y - nvy * dt;
      }
    }
    // drum wall, with friction toward the wall's own speed
    for (const p of P) {
      const lim = R - p.r;
      const d2 = p.x * p.x + p.y * p.y;
      if (d2 <= lim * lim) continue;
      const d = Math.sqrt(d2), nx = p.x / d, ny = p.y / d;
      p.x = nx * lim; p.y = ny * lim;
      let vx = (p.x - p.px) / dt, vy = (p.y - p.py) / dt;
      const vn = vx * nx + vy * ny;
      if (vn > 0) { vx -= vn * nx * 1.05; vy -= vn * ny * 1.05; }
      const wx = -w * p.y, wy = w * p.x;
      vx += (wx - vx) * 0.32; vy += (wy - vy) * 0.32;
      p.px = p.x - vx * dt; p.py = p.y - vy * dt;
    }
  }

  step(frameDt) {
    const dt = Math.min(frameDt, 1 / 30);
    this.time += dt;
    // drum speed
    let target = this.target;
    if (this.reduced) target = Math.max(-2.5, Math.min(2.5, target));
    if (this.hand) {
      // turned by hand; omega set by the pointer
    } else if (this.coast && target === 0) {
      const f = 1.8 * dt;
      this.omega = Math.abs(this.omega) <= f ? 0 : this.omega - Math.sign(this.omega) * f;
    } else {
      const d = target - this.omega, a = this.accel * dt;
      this.omega += Math.abs(d) <= a ? d : Math.sign(d) * a;
    }
    // water level
    const wd = this.waterTarget - this.water;
    this.water += Math.sign(wd) * Math.min(Math.abs(wd), dt * 0.09);
    const n = Math.abs(this.omega) > 9 ? 6 : 4;
    for (let i = 0; i < n; i++) this.sub(dt / n);
    this.onStep?.(Math.min(frameDt, 1)); // the course runs on real time even when physics is capped
  }

  // ------------------------------------------------------------------ loop
  wake() {
    this.calm = 0;
    if (this.loop || !this.visible || document.hidden) return;
    this.last = performance.now();
    this.loop = requestAnimationFrame((t) => this.frame(t));
  }

  frame(t) {
    this.loop = null;
    if (!this.visible || document.hidden) return;
    const now = performance.now(); // rAF timestamps can lag real time in throttled or headless frames
    const dt = (now - this.last) / 1000;
    this.last = now;
    const before = this.P.map((p) => p.x + p.y);
    this.step(dt > 0 ? dt : 1 / 60);
    this.draw();
    // sleep when nothing moves and no course is running
    let moving = Math.abs(this.omega) > 0.01 || Math.abs(this.waterTarget - this.water) > 0.001 || this.busy || this.grab || this.hand;
    if (!moving) {
      let max = 0;
      this.P.forEach((p, i) => { max = Math.max(max, Math.abs(p.x + p.y - before[i])); });
      moving = max > 0.00015;
    }
    this.calm = moving ? 0 : this.calm + 1;
    if (this.calm > 40) return;
    this.loop = requestAnimationFrame((tt) => this.frame(tt));
  }

  // ------------------------------------------------------------------ input
  toWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    const k = this.canvas.width / rect.width;
    return [((e.clientX - rect.left) * k - this.cx) / this.scale, ((e.clientY - rect.top) * k - this.cx) / this.scale];
  }

  bindPointer() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => {
      if (this.locked) { this.onLocked?.(); return; }
      const [x, y] = this.toWorld(e);
      if (x * x + y * y > (R * 1.03) ** 2) return;
      cv.setPointerCapture(e.pointerId);
      let best = -1, bd = 0.045 ** 2;
      this.P.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = i; } });
      if (best >= 0) this.grab = { i: best, x, y, vx: 0, vy: 0, t: performance.now() };
      else this.hand = { a: Math.atan2(y, x), t: performance.now() };
      this.wake();
      e.preventDefault();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!this.grab && !this.hand) return;
      const [x, y] = this.toWorld(e);
      const now = performance.now();
      if (this.grab) {
        const g = this.grab, dt = Math.max(0.008, (now - g.t) / 1000);
        const lim = R - 0.02, d = Math.hypot(x, y);
        const cx = d > lim ? (x / d) * lim : x, cy = d > lim ? (y / d) * lim : y;
        g.vx = g.vx * 0.5 + ((cx - g.x) / dt) * 0.5; g.vy = g.vy * 0.5 + ((cy - g.y) / dt) * 0.5;
        g.x = cx; g.y = cy; g.t = now;
      } else {
        const h = this.hand, a = Math.atan2(y, x);
        let da = a - h.a;
        if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
        const dt = Math.max(0.008, (now - h.t) / 1000);
        this.theta += da;
        const lim = this.reduced ? 2.5 : 9;
        this.omega = Math.max(-lim, Math.min(lim, this.omega * 0.4 + (da / dt) * 0.6));
        h.a = a; h.t = now;
      }
      this.wake();
    });
    const end = () => {
      if (this.grab) {
        const g = this.grab, max = 3;
        g.vx = Math.max(-max, Math.min(max, g.vx)); g.vy = Math.max(-max, Math.min(max, g.vy));
        const p = this.P[g.i];
        if (p) { p.px = p.x - g.vx / 240; p.py = p.y - g.vy / 240; }
      }
      this.grab = null;
      this.hand = null;
      this.wake();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  }

  bindKeys() {
    this.canvas.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(e.key)) return;
      e.preventDefault();
      if (this.locked) { this.onLocked?.(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const lim = this.reduced ? 2.5 : 7;
        this.omega = Math.max(-lim, Math.min(lim, this.omega + (e.key === 'ArrowRight' ? 1.6 : -1.6)));
      } else {
        for (const p of this.P) { p.py = p.y + 0.012 + Math.random() * 0.006; p.px = p.x + (Math.random() - 0.5) * 0.006; }
      }
      this.wake();
    });
  }

  // ------------------------------------------------------------------ drawing
  draw() {
    const { ctx, scale: s, cx } = this;
    const size = this.canvas.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cx, cx, 0, TAU); ctx.clip();
    ctx.translate(cx, cx);
    ctx.scale(s, s);
    const px = 1 / s; // one device pixel in world units

    // gap behind the drum rim
    ctx.fillStyle = '#4D565E';
    ctx.fillRect(-R * 1.1, -R * 1.1, R * 2.2, R * 2.2);

    // drum shell
    const grd = ctx.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.05, 0, 0, R);
    grd.addColorStop(0, '#E9EDF0'); grd.addColorStop(0.65, '#C5CCD2'); grd.addColorStop(1, '#9AA4AD');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();

    const speed = Math.abs(this.omega);
    const smear = this.reduced ? 0 : Math.max(0, Math.min(1, (speed - 5) / 3));
    // perforations
    const rings = [0.34, 0.5, 0.66, 0.8, 0.92];
    if (smear < 1) {
      ctx.fillStyle = `rgba(78,88,96,${0.55 * (1 - smear)})`;
      ctx.beginPath();
      for (const rr of rings) {
        const rad = rr * R, count = Math.round(rr * 30);
        const off = (rings.indexOf(rr) % 2) * (Math.PI / count);
        for (let i = 0; i < count; i++) {
          const a = this.theta + off + (i * TAU) / count;
          const hx = Math.cos(a) * rad, hy = Math.sin(a) * rad;
          ctx.moveTo(hx + 0.0055, hy);
          ctx.arc(hx, hy, 0.0055, 0, TAU);
        }
      }
      ctx.fill();
    }
    if (smear > 0) {
      ctx.strokeStyle = `rgba(78,88,96,${0.22 * smear})`;
      ctx.lineWidth = 0.011;
      for (const rr of rings) { ctx.beginPath(); ctx.arc(0, 0, rr * R, 0, TAU); ctx.stroke(); }
    }
    // back plate hub with three ribs
    ctx.fillStyle = '#B4BDC4';
    ctx.beginPath(); ctx.arc(0, 0, R * 0.16, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(31,36,40,${0.35 * (1 - smear) + 0.08})`;
    ctx.lineWidth = 2 * px;
    ctx.stroke();
    if (smear < 1) {
      ctx.strokeStyle = `rgba(31,36,40,${0.3 * (1 - smear)})`;
      ctx.lineWidth = 3 * px;
      ctx.beginPath();
      for (let L = 0; L < 3; L++) {
        const a = this.theta + Math.PI / 3 + (L * TAU) / 3;
        ctx.moveTo(Math.cos(a) * R * 0.18, Math.sin(a) * R * 0.18);
        ctx.lineTo(Math.cos(a) * R * 0.3, Math.sin(a) * R * 0.3);
      }
      ctx.stroke();
    }

    // lifters, with trailing ghosts when fast
    const ghosts = smear > 0 ? 3 : 0;
    for (let gI = ghosts; gI >= 0; gI--) {
      const back = gI * Math.sign(this.omega) * Math.min(0.12, speed * 0.006);
      ctx.globalAlpha = gI === 0 ? 1 : 0.18;
      for (let L = 0; L < 3; L++) this.drawLifter(this.theta - back + (L * TAU) / 3, px);
    }
    ctx.globalAlpha = 1;

    // garments
    for (const b of this.bodies) this.drawBody(b, px);

    // water over everything below its surface
    if (this.water > 0.005) {
      const surf = R - this.water * 2 * R;
      const tilt = Math.max(-0.35, Math.min(0.35, this.omega * 0.03));
      const wave = this.reduced ? 0 : Math.sin(this.time * 2.3) * 0.004;
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
      ctx.beginPath();
      ctx.moveTo(-R, surf - tilt * R + wave);
      ctx.lineTo(R, surf + tilt * R - wave);
      ctx.lineTo(R, R); ctx.lineTo(-R, R); ctx.closePath();
      ctx.fillStyle = 'rgba(150, 214, 192, 0.42)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-R, surf - tilt * R + wave);
      ctx.lineTo(R, surf + tilt * R - wave);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2.5 * px;
      ctx.stroke();
      ctx.restore();
    }

    // drum lip
    ctx.strokeStyle = '#7D8891';
    ctx.lineWidth = 0.008;
    ctx.beginPath(); ctx.arc(0, 0, R - 0.004, 0, TAU); ctx.stroke();
    ctx.restore();

    // glass: dark edge
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(cx, cx, cx * 0.72, cx, cx, cx);
    vg.addColorStop(0, 'rgba(31,36,40,0)');
    vg.addColorStop(1, 'rgba(31,36,40,0.38)');
    ctx.fillStyle = vg;
    ctx.beginPath(); ctx.arc(cx, cx, cx, 0, TAU); ctx.fill();
  }

  drawLifter(a, px) {
    const { ctx } = this;
    const ux = Math.cos(a), uy = Math.sin(a), tx = -uy, ty = ux;
    const r0 = R + 0.002, r1 = R - LIFT;
    ctx.beginPath();
    ctx.moveTo(ux * r0 + tx * 0.03, uy * r0 + ty * 0.03);
    ctx.lineTo(ux * r1 + tx * 0.012, uy * r1 + ty * 0.012);
    ctx.quadraticCurveTo(ux * (r1 - 0.01), uy * (r1 - 0.01), ux * r1 - tx * 0.012, uy * r1 - ty * 0.012);
    ctx.lineTo(ux * r0 - tx * 0.03, uy * r0 - ty * 0.03);
    ctx.closePath();
    ctx.fillStyle = '#E4E8EB';
    ctx.fill();
    ctx.strokeStyle = '#1F2428';
    ctx.lineWidth = 1.6 * px;
    ctx.stroke();
  }

  drawBody(b, px) {
    const { ctx } = this;
    const P = this.P;
    const q = b.idx.map((i) => P[i]);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (b.type === 'sock') {
      this.rope(q, b.width + 4 * px, C.graphite);
      this.rope(q, b.width, b.fill);
      // cuff stripe
      const m = { x: (q[0].x + q[1].x) / 2, y: (q[0].y + q[1].y) / 2 };
      ctx.strokeStyle = b.stripe;
      ctx.lineWidth = b.width * 0.42;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      const dx = q[1].x - q[0].x, dy = q[1].y - q[0].y, d = Math.hypot(dx, dy) || 1;
      ctx.moveTo(m.x - (dy / d) * b.width * 0.45 - dx * 0.12, m.y + (dx / d) * b.width * 0.45 - dy * 0.12);
      ctx.lineTo(m.x + (dy / d) * b.width * 0.45 - dx * 0.12, m.y - (dx / d) * b.width * 0.45 - dy * 0.12);
      ctx.stroke();
      ctx.lineCap = 'round';
      return;
    }
    if (b.type === 'pants') {
      const leg = (a, c, d) => [q[a], q[c], q[d]];
      for (const [w, col] of [[b.width + 4 * px, C.graphite], [b.width, b.fill]]) {
        this.rope(leg(0, 2, 3), w, col);
        this.rope(leg(1, 4, 5), w, col);
        this.rope([q[0], q[1]], w * 0.9, col);
      }
      ctx.strokeStyle = b.stripe;
      ctx.lineWidth = 2 * px;
      ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y); ctx.lineTo(q[1].x, q[1].y); ctx.stroke();
      return;
    }
    // towel and shirt: a smooth outline through the outer grid points
    if (b.type === 'shirt') {
      for (const [w, col] of [[0.034 + 4 * px, C.graphite], [0.034, b.fill]]) {
        this.rope([q[0], q[9]], w, col);
        this.rope([q[2], q[10]], w, col);
      }
    }
    const ring = [0, 1, 2, 5, 8, 7, 6, 3].map((i) => q[i]);
    ctx.beginPath();
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
      if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(a.x, a.y, mx, my);
    }
    ctx.quadraticCurveTo(ring[0].x, ring[0].y, (ring[0].x + ring[1].x) / 2, (ring[0].y + ring[1].y) / 2);
    ctx.closePath();
    ctx.fillStyle = b.fill;
    ctx.fill();
    ctx.strokeStyle = C.graphite;
    ctx.lineWidth = 2 * px;
    ctx.stroke();
    ctx.strokeStyle = b.stripe;
    if (b.type === 'towel') {
      ctx.lineWidth = 0.008;
      ctx.beginPath();
      const l = this.lerp(q[3], q[6], 0.55), r = this.lerp(q[5], q[8], 0.55);
      ctx.moveTo(l.x, l.y); ctx.quadraticCurveTo(q[7].x, q[7].y - 0.0, r.x, r.y);
      ctx.stroke();
    } else {
      // collar and button line
      ctx.lineWidth = 2 * px;
      const a = this.lerp(q[0], q[1], 0.55), c = this.lerp(q[1], q[2], 0.45), m = this.lerp(q[1], q[4], 0.45);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(m.x, m.y); ctx.lineTo(c.x, c.y); ctx.stroke();
      ctx.fillStyle = b.stripe;
      for (const t of [0.75, 1.25, 1.7]) {
        const p = t <= 1 ? this.lerp(q[1], q[4], t) : this.lerp(q[4], q[7], t - 1);
        ctx.beginPath(); ctx.arc(p.x, p.y, 0.004, 0, TAU); ctx.fill();
      }
    }
  }

  rope(pts, width, color) {
    const { ctx } = this;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) ctx.lineTo(pts[1].x, pts[1].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i], c = pts[i + 1];
      const mx = (a.x + c.x) / 2, my = (a.y + c.y) / 2;
      if (i === pts.length - 2) ctx.quadraticCurveTo(a.x, a.y, c.x, c.y);
      else ctx.quadraticCurveTo(a.x, a.y, mx, my);
    }
    ctx.stroke();
  }

  lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
}
