// Photographed kites (cut-outs) on code-drawn strings and tails, moved by the page's wind.
// Scenes: the hero sky (four kites on strings), the catalogue (the photographs themselves sway, two
// paper tails), and the 액막이연 field (cut-loose kites drifting with their broken strings).
// Each scene runs only while it is on screen and the tab is visible.

const RED = '#D7142C';
const INK = '#0B0C0D';
const PAPER = '#FFFFFF';
const M_TO_PX = 24;          // m/s of wind → px/s for paper tails, at scale 1

const SPRITES = {
  chima: { src: './img/chima-520.webp', aspect: 520 / 738, bridle: [0, 0.06], tailAt: null },
  banda: { src: './img/banda-520.webp', aspect: 520 / 737, bridle: [0, 0.06], tailAt: null },
  gaori: { src: './img/gaori-480.webp', aspect: 480 / 556, bridle: [0.02, -0.02], tailAt: [0.012, 0.5] },
  kkori: { src: './img/kkori-480.webp', aspect: 480 / 486, bridle: [0, 0], tailAt: [0, 0.5] },
  akmagi: { src: './img/akmagi-560.webp', aspect: 560 / 794, bridle: [0, 0.06], tailAt: null },
};

// hero presets: [sprite, fx, fy, size (fraction of zone height), tilt, tail]
const HERO_WIDE = [
  ['banda', 0.14, 0.2, 0.22, -0.05],
  ['gaori', 0.53, 0.15, 0.3, 0.06, { color: RED, len: 2.4, width: 0.085, n: 22 }],
  ['chima', 0.33, 0.6, 0.42, 0.04],
  ['kkori', 0.84, 0.47, 0.19, -0.04, { color: INK, len: 3.4, width: 0.09, n: 26 }],
];
const HERO_BAND = [
  ['banda', 0.14, 0.24, 0.27, -0.05],
  ['gaori', 0.52, 0.2, 0.32, 0.06, { color: RED, len: 2.0, width: 0.085, n: 20 }],
  ['chima', 0.32, 0.67, 0.42, 0.04],
  ['kkori', 0.8, 0.58, 0.22, -0.04, { color: INK, len: 2.6, width: 0.09, n: 22 }],
];
// 액막이연: one near, two far; strings cut
const AKMAGI = [
  ['akmagi', 0.62, 0.42, 0.5, 0.1],
  ['akmagi', 0.2, 0.18, 0.16, -0.2],
  ['akmagi', 0.86, 0.1, 0.1, 0.25],
];

const loaded = {};
function sprite(name) {
  if (!loaded[name]) {
    const img = new Image();
    img.decoding = 'async';
    img.src = SPRITES[name].src;
    loaded[name] = img.decode().then(() => img).catch(() => null);
  }
  return loaded[name];
}

class Tail {
  constructor(n, segLen, width, color) {
    this.n = n; this.seg = segLen; this.width = width; this.color = color;
    this.p = null; this.q = null;
  }
  reset(x, y) {
    this.p = new Float32Array((this.n + 1) * 2);
    this.q = new Float32Array((this.n + 1) * 2);
    for (let i = 0; i <= this.n; i++) {
      this.p[i * 2] = this.q[i * 2] = x - i * this.seg * 0.9;
      this.p[i * 2 + 1] = this.q[i * 2 + 1] = y + i * this.seg * 0.3;
    }
  }
  // wind in px/s at the tail's root; gravity small (paper)
  step(dt, x, y, wx, wy, t, flutter, calm) {
    if (!this.p) this.reset(x, y);
    const { p, q, n, seg } = this;
    p[0] = x; p[1] = y; q[0] = x; q[1] = y;
    const g = 70, cd = 3.2, damp = 0.985;
    const w = calm ? 5 : 8.5;
    for (let i = 1; i <= n; i++) {
      const ix = i * 2, iy = ix + 1;
      const vx = (p[ix] - q[ix]) / dt, vy = (p[iy] - q[iy]) / dt;
      // flutter: a wave running down the paper strip, stronger in stronger wind
      const dxp = p[ix] - p[ix - 2], dyp = p[iy] - p[iy - 2];
      const l = Math.hypot(dxp, dyp) || 1;
      const fl = Math.sin(i * 0.75 - t * w) * flutter * (0.4 + i / n);
      const ax = cd * (wx - vx) - (dyp / l) * fl;
      const ay = g + cd * (wy - vy) + (dxp / l) * fl;
      const nx = p[ix] + (p[ix] - q[ix]) * damp + ax * dt * dt;
      const ny = p[iy] + (p[iy] - q[iy]) * damp + ay * dt * dt;
      q[ix] = p[ix]; q[iy] = p[iy];
      p[ix] = nx; p[iy] = ny;
    }
    for (let k = 0; k < 4; k++) {
      for (let i = 1; i <= n; i++) {
        const a = (i - 1) * 2, b = i * 2;
        const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1];
        const d = Math.hypot(dx, dy) || 1e-3;
        const diff = (d - seg) / d;
        if (i === 1) { p[b] -= dx * diff; p[b + 1] -= dy * diff; }
        else {
          p[a] += dx * diff * 0.5; p[a + 1] += dy * diff * 0.5;
          p[b] -= dx * diff * 0.5; p[b + 1] -= dy * diff * 0.5;
        }
      }
      p[0] = x; p[1] = y;
    }
  }
  draw(ctx, t, ribbon) {
    const { p, n } = this;
    if (!p) return;
    if (!ribbon) {               // a cut string: a thin line
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      for (let i = 1; i < n; i++) {
        const mx = (p[i * 2] + p[i * 2 + 2]) / 2, my = (p[i * 2 + 1] + p[i * 2 + 3]) / 2;
        ctx.quadraticCurveTo(p[i * 2], p[i * 2 + 1], mx, my);
      }
      ctx.lineTo(p[n * 2], p[n * 2 + 1]);
      ctx.strokeStyle = this.color; ctx.lineWidth = this.width; ctx.stroke();
      return;
    }
    // a paper strip: a polygon whose width narrows and twists along its length
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.max(0, i - 1) * 2, b = Math.min(n, i + 1) * 2;
      const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1];
      const l = Math.hypot(dx, dy) || 1;
      const twist = 0.35 + 0.65 * Math.abs(Math.cos(i * 0.42 - t * 2.2));
      const hw = this.width * 0.5 * (1 - 0.45 * i / n) * twist;
      L.push(p[i * 2] - (dy / l) * hw, p[i * 2 + 1] + (dx / l) * hw);
      R.push(p[i * 2] + (dy / l) * hw, p[i * 2 + 1] - (dx / l) * hw);
    }
    ctx.beginPath();
    ctx.moveTo(L[0], L[1]);
    for (let i = 1; i <= n; i++) ctx.lineTo(L[i * 2], L[i * 2 + 1]);
    for (let i = n; i >= 0; i--) ctx.lineTo(R[i * 2], R[i * 2 + 1]);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class Kite {
  constructor(opts) {
    Object.assign(this, opts);
    this.ox = 0; this.oy = 0; this.vx = 0; this.vy = 0;
    this.ang = this.tilt || 0; this.va = 0;
    this.yaw = 0;
    this.phase = Math.random() * 10;
    this.speedNow = 3.6;
  }
}

class Scene {
  constructor(root, canvas, wind, kind) {
    this.root = root; this.canvas = canvas; this.wind = wind; this.kind = kind;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.kites = [];
    this.visible = false;
    this.dirty = true;
    this.dpr = 1;
    this.scale = 1;
    this.origin = { x: 0, y: 0 };    // page position of the canvas (or root) top-left
  }
  measure() {
    const r = (this.canvas || this.root).getBoundingClientRect();
    this.origin = { x: r.left + scrollX, y: r.top + scrollY };
    this.w = r.width; this.h = r.height;
    if (this.canvas) {
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      const W = Math.max(1, Math.round(r.width * this.dpr)), H = Math.max(1, Math.round(r.height * this.dpr));
      if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    }
    this.layout?.();
    this.dirty = false;
  }
}

// kite physics shared by all scenes. s = size scale (px), amp = answer amplitude
function stepKite(k, dt, wind, px, py, t, amp, calm) {
  const w = wind.sample(px, py);
  const B0 = 3.6;
  const speed = Math.hypot(w.x, w.y);
  k.speedNow += (speed - k.speedNow) * Math.min(1, dt * 3);
  const ex = -w.x - B0;                         // extra wind along the usual direction
  const s = k.h / 150;                          // bigger (nearer) kites move more px
  const slow = calm ? 0.6 : 1;
  const ph = k.phase + t * slow;
  // figure-eight drift of a kite in a steady breeze + the push of the wind
  let tx = Math.sin(ph * 0.9) * 10 * s - ex * 9 * s;
  let ty = Math.sin(ph * 1.8) * 5 * s - (speed - B0) * 6 * s + w.y * 7 * s;
  const lim = 70 * s;
  tx = Math.max(-lim, Math.min(lim, tx)) * amp;
  ty = Math.max(-lim, Math.min(lim, ty)) * amp;
  const kk = 7, c = 3.4;
  k.vx += (kk * (tx - k.ox) - c * k.vx) * dt;
  k.vy += (kk * (ty - k.oy) - c * k.vy) * dt;
  k.ox += k.vx * dt; k.oy += k.vy * dt;
  const ta = (k.tilt || 0) + (Math.sin(ph * 1.3) * 0.05 + k.vx * 0.0014 / s - w.y * 0.04 + ex * 0.02) * amp;
  k.va += (10 * (ta - k.ang) - 4 * k.va) * dt;
  k.ang += k.va * dt;
  k.yaw = (Math.sin(ph * 0.7) * 0.22 + Math.max(-0.5, Math.min(0.5, w.y * 0.06))) * amp;
  return w;
}

// ---------------------------------------------------------------- hero: kites on strings
class HeroScene extends Scene {
  constructor(root, canvas, wind, zone, band) {
    super(root, canvas, wind, 'hero');
    this.zone = zone; this.bandQuery = band;
  }
  async init() {
    const preset = () => (this.bandQuery.matches ? HERO_BAND : HERO_WIDE);
    this.preset = preset();
    this.bandQuery.addEventListener?.('change', () => { this.preset = preset(); this.build(); this.dirty = true; });
    await this.build();
  }
  async build() {
    const list = this.preset;
    const imgs = await Promise.all(list.map((p) => sprite(p[0])));
    this.kites = list.map((p, i) => new Kite({
      img: imgs[i], spec: SPRITES[p[0]], fx: p[1], fy: p[2], fh: p[3], tilt: p[4], tailSpec: p[5], idx: i,
    })).filter((k) => k.img);
    this.dirty = true;
  }
  layout() {
    const zr = this.zone.getBoundingClientRect();
    const cr = this.canvas.getBoundingClientRect();
    const zx = zr.left - cr.left, zy = zr.top - cr.top;
    for (const k of this.kites) {
      k.h = Math.max(48, zr.height * k.fh);
      k.w = k.h * k.spec.aspect;
      k.cx = zx + zr.width * k.fx;
      k.cy = zy + zr.height * k.fy;
      // the flyers stand off the right edge, a little below the sky zone
      k.ax = this.w + 40 + k.idx * 14;
      // (wide screens: they leave the frame above the facts row, so no string crosses the text there)
      k.ay = zy + zr.height + (this.bandQuery.matches ? -24 + k.idx * 10 : -40 + k.idx * 22);
      if (k.tailSpec) {
        const ts = k.tailSpec;
        k.tail = new Tail(ts.n, (k.h * ts.len) / ts.n, Math.max(4, k.h * ts.width), ts.color);
      }
    }
  }
  step(dt, t) {
    const calm = this.wind.calm;
    const amp = calm ? 0.55 : 1;
    let sum = 0;
    for (const k of this.kites) {
      const x = k.cx + k.ox, y = k.cy + k.oy;
      const w = stepKite(k, dt, this.wind, this.origin.x + x, this.origin.y + y, t, amp, calm);
      sum += k.speedNow;
      if (k.tail) {
        const [tx, ty] = rot(k.spec.tailAt[0] * k.w, k.spec.tailAt[1] * k.h, k.ang);
        const s = k.h / 150;
        k.tail.step(dt, x + tx, y + ty, w.x * M_TO_PX * s * 1.4, w.y * M_TO_PX * s, t, 900 * s * (k.speedNow / 3.6) * amp, calm);
      }
    }
    this.meanSpeed = this.kites.length ? sum / this.kites.length : 3.6;
  }
  draw(t) {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    // strings first: a sagging line from the bridle to the flyer off the right edge
    for (const k of this.kites) {
      const x = k.cx + k.ox, y = k.cy + k.oy;
      const [bx, by] = rot(k.spec.bridle[0] * k.w, k.spec.bridle[1] * k.h, k.ang);
      const sx = x + bx, sy = y + by;
      const dx = k.ax - sx, dy = k.ay - sy;
      const L = Math.hypot(dx, dy);
      const sag = L * (0.045 + 0.05 * Math.min(1, 3.6 / Math.max(1, k.speedNow)));
      let nx = -dy / L, ny = dx / L;
      if (ny < 0) { nx = -nx; ny = -ny; }
      const thr = Math.sin(t * 17 + k.idx) * Math.min(3, Math.max(0, k.speedNow - 5) * 0.6);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + dx / 2 + nx * (sag + thr), sy + dy / 2 + ny * (sag + thr), k.ax, k.ay);
      ctx.strokeStyle = 'rgba(11,12,13,.55)';
      ctx.lineWidth = 0.6 + k.h / 220;
      ctx.stroke();
    }
    for (const k of this.kites) if (k.tail) k.tail.draw(ctx, t, true);
    for (const k of this.kites) drawSprite(ctx, k);
  }
}

// ---------------------------------------------------------------- 액막이연: cut loose
class AkmagiScene extends HeroScene {
  constructor(root, canvas, wind, zone) {
    super(root, canvas, wind, zone, { matches: false, addEventListener() {} });
    this.kind = 'akmagi';
  }
  async init() {
    this.preset = AKMAGI;
    await this.build();
  }
  layout() {
    const zr = this.zone.getBoundingClientRect();
    const cr = this.canvas.getBoundingClientRect();
    const zx = zr.left - cr.left, zy = zr.top - cr.top;
    for (const k of this.kites) {
      k.h = Math.max(40, Math.min(zr.height, zr.width * 1.3) * k.fh);
      k.w = k.h * k.spec.aspect;
      k.cx = zx + zr.width * k.fx;
      k.cy = zy + zr.height * k.fy;
      k.tail = new Tail(18, (k.h * 1.5) / 18, Math.max(0.7, k.h / 260), 'rgba(255,255,255,.9)');
    }
  }
  step(dt, t) {
    const calm = this.wind.calm;
    const amp = (calm ? 0.55 : 1) * 1.5;     // nothing holds them: larger, looser answers
    for (const k of this.kites) {
      const x = k.cx + k.ox, y = k.cy + k.oy;
      const w = stepKite(k, dt, this.wind, this.origin.x + x, this.origin.y + y, t * 0.8, amp, calm);
      k.ang += Math.sin(t * (calm ? 0.25 : 0.4) + k.phase) * 0.0025 * amp;   // a slow tumble
      const [bx, by] = rot(k.spec.bridle[0] * k.w, k.spec.bridle[1] * k.h, k.ang);
      const s = k.h / 150;
      k.tail.step(dt, x + bx, y + by, w.x * M_TO_PX * s, w.y * M_TO_PX * s, t, 300 * s * amp, calm);
    }
  }
  draw(t) {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    for (const k of this.kites) k.tail.draw(ctx, t, false);
    for (const k of this.kites) drawSprite(ctx, k);
  }
}

// ---------------------------------------------------------------- catalogue: the photographs sway
class CatalogueScene extends Scene {
  constructor(root, wind, imgs) {
    super(root, null, wind, 'catalogue');
    this.items = imgs.map((el) => {
      const name = el.dataset.kite;
      const spec = SPRITES[name];
      const fig = el.closest('figure');
      let canvas = null, tail = null;
      if (spec.tailAt) {
        canvas = document.createElement('canvas');
        canvas.className = 'kite__tail';
        canvas.setAttribute('aria-hidden', 'true');
        fig.prepend(canvas);
        tail = { color: name === 'gaori' ? RED : INK, len: name === 'gaori' ? 1.25 : 1.6, width: 0.07, n: 18 };
      }
      return { el, fig, spec, canvas, ctx: canvas?.getContext('2d'), tailSpec: tail, kite: new Kite({ tilt: 0, idx: 0 }) };
    });
  }
  measure() {
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    for (const it of this.items) {
      const fr = it.fig.getBoundingClientRect();
      it.origin = { x: fr.left + scrollX, y: fr.top + scrollY };
      const k = it.kite;
      k.w = it.el.offsetWidth; k.h = it.el.offsetHeight;
      k.cx = it.el.offsetLeft + k.w / 2; k.cy = it.el.offsetTop + k.h * 0.4;
      if (it.canvas) {
        const cr = it.canvas.getBoundingClientRect();
        it.cw = cr.width; it.ch = cr.height;
        it.cox = cr.left - fr.left; it.coy = cr.top - fr.top;
        const W = Math.round(cr.width * this.dpr), H = Math.round(cr.height * this.dpr);
        if (it.canvas.width !== W || it.canvas.height !== H) { it.canvas.width = W; it.canvas.height = H; }
        const ts = it.tailSpec;
        it.tail = new Tail(ts.n, (k.h * ts.len) / ts.n, Math.max(5, k.w * ts.width), ts.color);
      }
    }
    this.dirty = false;
  }
  step(dt, t) {
    const calm = this.wind.calm;
    const amp = (calm ? 0.55 : 1) * 0.42;     // specimens: they answer, they do not fly about
    for (const it of this.items) {
      const k = it.kite;
      const w = stepKite(k, dt, this.wind, it.origin.x + k.cx + k.ox, it.origin.y + k.cy + k.oy, t, amp, calm);
      it.el.style.transform = `translate(${k.ox.toFixed(1)}px, ${k.oy.toFixed(1)}px) rotate(${k.ang.toFixed(4)}rad) scaleX(${Math.cos(k.yaw * 0.6).toFixed(4)})`;
      if (it.tail) {
        const [tx, ty] = rot(it.spec.tailAt[0] * k.w, (it.spec.tailAt[1] + 0.1) * k.h, k.ang);
        const s = k.h / 150;
        it.tail.step(dt, k.cx + k.ox + tx - it.cox, k.cy + k.oy + ty - it.coy, w.x * M_TO_PX * s * 0.9, w.y * M_TO_PX * s, t, 500 * s * amp, calm);
      }
    }
  }
  draw(t) {
    for (const it of this.items) {
      if (!it.ctx) continue;
      it.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      it.ctx.clearRect(0, 0, it.cw, it.ch);
      it.tail.draw(it.ctx, t, true);
    }
  }
}

function rot(x, y, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

function drawSprite(ctx, k) {
  ctx.save();
  ctx.translate(k.cx + k.ox, k.cy + k.oy);
  ctx.rotate(k.ang);
  ctx.scale(Math.cos(k.yaw), 1);
  ctx.drawImage(k.img, -k.w / 2, -k.h / 2, k.w, k.h);
  ctx.restore();
}

// ---------------------------------------------------------------- the loop
export class Sky {
  constructor(wind, onFrame) {
    this.wind = wind;
    this.onFrame = onFrame;
    this.scenes = [];
    this.running = false;
    this.last = 0;
    this.t = 0;
    this.tick = this.tick.bind(this);
  }
  async start() {
    const band = matchMedia('(max-width: 1023px)');
    const hero = document.querySelector('[data-scene="hero"]');
    if (hero) {
      const s = new HeroScene(hero.closest('section'), hero, this.wind, document.querySelector('[data-sky="hero"]'), band);
      this.scenes.push(s); this.hero = s;
    }
    const ak = document.querySelector('[data-scene="akmagi"]');
    if (ak) this.scenes.push(new AkmagiScene(ak.closest('section'), ak, this.wind, document.querySelector('[data-sky="akmagi"]')));
    const cat = document.querySelectorAll('img[data-kite]');
    if (cat.length) this.scenes.push(new CatalogueScene(document.getElementById('kites'), this.wind, [...cat]));

    await Promise.all(this.scenes.map((s) => s.init?.()));
    for (const s of this.scenes) s.canvas?.classList.add('is-ready');

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const s = this.scenes.find((x) => x.root === e.target);
        if (s) { s.visible = e.isIntersecting; if (s.visible) s.dirty = true; }
      }
      this.wake();
    }, { rootMargin: '80px 0px' });
    for (const s of this.scenes) io.observe(s.root);
    const ro = new ResizeObserver(() => { for (const s of this.scenes) s.dirty = true; });
    ro.observe(document.body);
    document.addEventListener('visibilitychange', () => this.wake());
    document.fonts?.ready.then(() => { for (const s of this.scenes) s.dirty = true; });
  }
  // one frame chain at most: `raf` holds the pending frame, cancelled when nothing is on screen
  wake() {
    const want = !document.hidden && this.scenes.some((s) => s.visible);
    if (want && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    } else if (!want && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    this.running = !!this.raf;
    this.onFrame?.(this, want);
  }
  tick(now) {
    this.raf = 0;
    const dt = Math.min(1 / 30, Math.max(1 / 240, (now - this.last) / 1000));
    this.last = now;
    this.t += dt;
    this.wind.step(dt);
    for (const s of this.scenes) {
      if (!s.visible) continue;
      if (s.dirty) s.measure();
      // two half steps keep the tails stable at low frame rates
      s.step(dt / 2, this.t - dt / 2);
      s.step(dt / 2, this.t);
      s.draw(this.t);
    }
    this.onFrame?.(this, true);
    if (document.hidden || !this.scenes.some((s) => s.visible)) { this.running = false; this.onFrame?.(this, false); return; }
    this.raf = requestAnimationFrame(this.tick);
  }
}
