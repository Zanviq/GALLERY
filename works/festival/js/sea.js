// Tone-on-tone tide lines and a solar disc under the lineup, drawn from the day's seed.
// Still when nothing plays; with sound on, the swell follows the music.

const PLAN = {
  fri: { lines: 30, amp: 0.20, freq: 1.6, disc: 0.76, drift: 0.00035 },
  sat: { lines: 36, amp: 0.26, freq: 2.1, disc: 0.28, drift: 0.00055 },
  sun: { lines: 24, amp: 0.15, freq: 1.2, disc: 0.62, drift: 0.00022 },
};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sea {
  constructor(canvas, hero, region, { band = null, reduced = false } = {}) {
    this.canvas = canvas;
    this.hero = hero;
    this.region = region;
    this.band = band;
    this.reduced = reduced;
    this.ctx = null;
    try { this.ctx = canvas.getContext('2d'); } catch (e) { this.ctx = null; }
    this.ok = !!this.ctx;
    this.day = 'fri';
    this.seed = 903;
    this.raf = 0;
    this.visible = true;
    this.t = 0;
    this.lastEvent = 0;
    this.kick = 0;
    this.energy = 0;
    this.loop = this.loop.bind(this);
    if (!this.ok) { canvas.remove(); document.documentElement.classList.add('no-canvas'); return; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => {
        this.visible = e[0].isIntersecting;
        if (this.visible) this.wake();
      }).observe(canvas);
    }
  }

  setDay(day, seed) {
    this.day = day;
    this.seed = seed;
    this.resize();
  }

  colors() {
    const cs = getComputedStyle(document.documentElement);
    return { deep: cs.getPropertyValue('--day-deep').trim() || '#C9361A' };
  }

  resize() {
    if (!this.ok) return;
    const heroRect = this.hero.getBoundingClientRect();
    const r = this.region.getBoundingClientRect();
    const top = r.top - heroRect.top;
    const w = this.hero.clientWidth;
    const h = Math.max(1, r.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    Object.assign(this.canvas.style, { top: top + 'px', height: h + 'px', width: w + 'px', bottom: 'auto' });
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.deep = this.colors().deep;
    this.draw(0, 0, 0);
  }

  draw(time, energy, kick) {
    const { ctx, w, h, dpr } = this;
    if (!ctx || !w) return;
    const plan = PLAN[this.day];
    const rand = rng(this.seed);
    const phases = Array.from({ length: plan.lines }, () => rand() * Math.PI * 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = this.deep;
    ctx.fillStyle = this.deep;
    ctx.lineWidth = w < 600 ? 1.1 : 1.4;
    ctx.lineJoin = 'round';

    const amp0 = h * plan.amp * (1 + energy * 1.6 + kick * 0.35);
    const top = h * 0.12, bottom = h * 0.92;
    const step = w < 600 ? 6 : 8;
    for (let i = 0; i < plan.lines; i++) {
      const t = i / (plan.lines - 1);
      const y0 = top + (bottom - top) * t;
      const ph = phases[i] * 0.15 + i * 0.21 + time * plan.drift * (1 + t);
      const amp = amp0 * (0.3 + 0.7 * Math.sin(Math.PI * t)) * 0.5;
      ctx.beginPath();
      for (let x = -step; x <= w + step; x += step) {
        const u = x / w;
        const env = 0.55 + 0.45 * Math.sin(Math.PI * u + i * 0.07);
        const y = y0 + amp * env * Math.sin(u * Math.PI * 2 * plan.freq + ph) + amp * 0.35 * Math.sin(u * Math.PI * 2 * 4.3 - ph * 1.7);
        if (x === -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const r = Math.min(h * 0.4, w * 0.13) * (1 + kick * 0.05);
    const pad = Math.max(16, w * 0.04);
    const cx = pad + r + (w - 2 * pad - 2 * r) * plan.disc;
    const cy = h * 0.52;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  wake() {
    if (!this.ok || this.reduced || this.raf) return;
    if (!this.band || !this.band.playing) return;
    this.raf = requestAnimationFrame(this.loop);
  }

  loop(now) {
    this.raf = 0;
    const band = this.band;
    const playing = band && band.playing;
    if (playing) {
      const t = band.now;
      for (const ev of band.events) {
        if (ev.time > this.lastEvent && ev.time <= t) {
          this.lastEvent = ev.time;
          if (ev.kick) this.kick = 1;
        }
      }
      const spec = band.spectrum();
      if (spec) {
        let s = 0;
        for (let i = 2; i < 40; i++) s += spec[i];
        this.energy += ((s / (38 * 255)) - this.energy) * 0.15;
      }
    } else {
      this.energy *= 0.9;
    }
    this.kick *= 0.88;
    this.t += 16.67;
    this.draw(this.t, Math.max(0, this.energy - 0.25), this.kick);
    const settling = this.energy > 0.01 || this.kick > 0.01;
    if ((playing || settling) && this.visible && !document.hidden) this.raf = requestAnimationFrame(this.loop);
    else if (!playing) this.draw(this.t, 0, 0);
  }
}
