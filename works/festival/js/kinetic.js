// The lineup poster. Rows are justified to the full measure through Anybody's
// width axis; every letter then swells with the cursor, the scroll speed and the music.
// The visual rows are aria-hidden: the plain list in the same tabpanel is what assistive tech reads.

// Each day has its own type voice and its own way of answering a hand or a beat:
// Friday's black condensed names open up into light, wide letters (a lens of water);
// Saturday's light names swell to black; Sunday's italics thicken and lean out.
const VOICE = {
  fri: { w: 700, italic: false, to: 150, dw: 52 },
  sat: { w: 300, italic: false, to: 900, dw: 30 },
  sun: { w: 520, italic: true, to: 900, dw: 22 },
};
// f: share of the measure; min: smallest size before a row splits; m: phone minimum at a 343px measure
const TIERS = [
  { f: 0.150, min: 46, max: 260, m: 54 },
  { f: 0.098, min: 36, max: 168, m: 44 },
  { f: 0.076, min: 30, max: 128, m: 38 },
  { f: 0.064, min: 27, max: 106, m: 35 },
  { f: 0.056, min: 25, max: 92, m: 33 },
];
const REF = 100;          // measuring size in px
const NB = 40;            // spectrum bands across the measure
const HIST = 72;          // spectrum frames kept for the waterfall
const ROW_LAG = 5;        // frames of delay per row
// Every new (size, weight, width) combination makes the browser build a font instance, which is slow.
// Values snap to a grid (instances get reused) and only the letters that moved most are re-set per frame.
const QW = 20;            // weight step
const QD = 4;             // width step, in % around the row's fitted width

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const isKo = (s) => /[가-힣]/.test(s);

export class KineticPoster {
  constructor(el, { data, reduced = false, band = null, onMark = null }) {
    this.el = el;
    this.data = data;
    this.acts = Object.fromEntries(data.acts.map((a) => [a.id, a]));
    this.days = Object.fromEntries(data.days.map((d) => [d.id, d]));
    this.reduced = reduced;
    this.band = band;
    this.onMark = onMark;
    this.day = null;
    this.rows = [];
    this.letters = [];
    this.width = 0;
    this.visible = true;
    this.raf = 0;
    this.last = 0;
    this.pointer = { x: 0, y: 0, active: false, touch: false, strength: 0 };
    this.vel = 0;
    this.velRaw = 0;
    this.lastScroll = { y: window.scrollY, t: performance.now() };
    this.kick = 0;
    this.energy = 0;
    this.lastEvent = 0;
    this.hist = Array.from({ length: HIST }, () => new Float32Array(NB));
    this.head = 0;
    this.trans = null;
    this.budget = window.matchMedia('(pointer: coarse)').matches ? 12 : 24;
    this.frame = this.frame.bind(this);
    this.measureEl = document.createElement('div');
    this.measureEl.className = 'poster__measure';
    this.measureEl.setAttribute('aria-hidden', 'true');
    Object.assign(this.measureEl.style, { position: 'absolute', visibility: 'hidden', left: '0', top: '0', whiteSpace: 'nowrap', pointerEvents: 'none' });
    el.appendChild(this.measureEl);
    if (!reduced) this.bindInputs();
  }

  // ---------- inputs ----------
  bindInputs() {
    const host = this.el.closest('.hero') || this.el;
    const setPointer = (x, y, touch) => {
      this.pointer.x = x;
      this.pointer.y = y;
      this.pointer.active = true;
      this.pointer.touch = touch;
      this.wake();
    };
    host.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return; // touch is handled with touch events, which survive scrolling
      setPointer(e.clientX, e.clientY, false);
    }, { passive: true });
    host.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'touch') { this.pointer.active = false; this.wake(); }
    });
    host.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY, true); }, { passive: true });
    host.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY, true); }, { passive: true });
    const end = () => { this.pointer.active = false; this.wake(); };
    host.addEventListener('touchend', end, { passive: true });
    host.addEventListener('touchcancel', end, { passive: true });
    window.addEventListener('scroll', () => {
      const now = performance.now();
      const dt = Math.max(8, now - this.lastScroll.t);
      const dy = window.scrollY - this.lastScroll.y;
      this.lastScroll = { y: window.scrollY, t: now };
      // a jump (restored scroll, a far anchor without smooth scrolling) is not a gesture
      if (Math.abs(dy) > window.innerHeight * 0.9) return;
      const v = dy / dt;
      this.velRaw = clamp(v, -6, 6);
      this.wake();
    }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        this.visible = entries[0].isIntersecting;
        if (this.visible) this.wake();
      }, { rootMargin: '80px' }).observe(this.el);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.wake(); });
  }

  // ---------- measuring + planning ----------
  measure(day) {
    const voice = VOICE[day.id];
    const ids = day.rows.flat();
    const m = this.measureEl;
    m.innerHTML = '';
    m.style.fontSize = REF + 'px';
    m.style.fontFamily = 'var(--f-lat)';
    m.style.lineHeight = '1';
    const spans = ids.map((id) => {
      const name = this.acts[id].name;
      const s = document.createElement('span');
      s.textContent = name;
      s.style.fontWeight = voice.w;
      if (isKo(name)) {
        s.style.fontFamily = 'var(--f-ko)';
        s.style.fontSize = '.9em';
        s.style.letterSpacing = '-.02em';
      } else if (voice.italic) {
        s.style.fontStyle = 'italic';
      }
      s.style.display = 'inline-block';
      m.appendChild(s);
      return s;
    });
    const sep = document.createElement('span');
    sep.className = 'sep';
    m.appendChild(sep);
    const read = (stretch) => {
      m.style.fontStretch = stretch + '%';
      return spans.map((s) => s.getBoundingClientRect().width);
    };
    const w50 = read(50);
    const w150 = read(150);
    const sepW = sep.getBoundingClientRect().width + 0.4 * REF; // dot + its margins
    m.style.fontStretch = '';
    const out = {};
    ids.forEach((id, i) => { out[id] = { w50: w50[i], w150: w150[i] }; });
    m.innerHTML = '';
    return { names: out, sep: sepW };
  }

  plan(day, M, W) {
    const out = [];
    day.rows.forEach((row, tierIdx) => {
      const T = TIERS[Math.min(tierIdx, TIERS.length - 1)];
      // phones get bigger type and more, shorter rows
      const tier = W < 700 ? { ...T, f: Math.max(T.f, (T.m / 343) * 0.92), min: (T.m * W) / 343 } : T;
      const queue = [row.slice()];
      while (queue.length) {
        const r = queue.shift();
        const seps = (r.length - 1) * M.sep;
        const w50 = r.reduce((s, id) => s + M.names[id].w50, 0) + seps;
        const w150 = r.reduce((s, id) => s + M.names[id].w150, 0) + seps;
        const fit50 = (W * REF) / w50;
        const tierF = clamp(tier.f * W, tier.min, tier.max);
        if (fit50 < tier.min && r.length > 1) {
          // too many names for this width: split, keeping the halves balanced by length
          // a Hangul name cannot narrow, so never leave one alone on a row if a Latin name can share it
          const stiff = (part) => part.every((id) => M.names[id].w150 - M.names[id].w50 < 0.5);
          let best = 1, bestDiff = Infinity;
          for (let k = 1; k < r.length; k++) {
            const A = r.slice(0, k), B = r.slice(k);
            const a = A.reduce((s, id) => s + M.names[id].w50, 0);
            const b = B.reduce((s, id) => s + M.names[id].w50, 0);
            const diff = Math.abs(a - b) + (stiff(A) || stiff(B) ? 1e4 : 0);
            if (diff < bestDiff) { bestDiff = diff; best = k; }
          }
          queue.unshift(r.slice(0, best), r.slice(best));
          continue;
        }
        let F = Math.min(tierF, fit50);
        const span = w150 - w50;
        let ls = 0;
        if (span < 0.5) {
          // Hangul only: no width axis. Grow the size, then open the tracking (never stretch the glyphs)
          F = Math.min(fit50, tierF * 1.8);
          const chars = r.reduce((s, id) => s + [...this.acts[id].name.replace(/ /g, '')].length, 0);
          const left = W - (w50 * F) / REF;
          if (left > 1 && chars > 1) ls = left / chars;
          out.push({ ids: r, F, wd: 100, ls, tier: tierIdx });
          continue;
        }
        let wd = 50 + (100 * ((W * REF) / F - w50)) / span;
        if (wd > 150) {
          wd = 150;
          F = Math.min((W * REF) / w150, tierF * 1.5);
        }
        wd = clamp(wd, 50, 150);
        out.push({ ids: r, F, wd, ls, tier: tierIdx });
      }
    });
    return out;
  }

  build(dayId) {
    const day = this.days[dayId];
    const voice = VOICE[dayId];
    this.day = dayId;
    this.voice = voice;
    this.el.dataset.voice = dayId;
    const W = this.el.clientWidth;
    this.width = W;
    const M = this.measure(day);
    const plan = this.plan(day, M, W);
    const frag = document.createDocumentFragment();
    this.rows = [];
    this.letters = [];
    plan.forEach((p, ri) => {
      const row = document.createElement('div');
      row.className = 'prow';
      row.style.setProperty('--fs', p.F.toFixed(2) + 'px');
      row.style.fontStretch = p.wd.toFixed(2) + '%';
      const inner = document.createElement('span');
      inner.className = 'prow__in';
      const rowLetters = [];
      p.ids.forEach((id, k) => {
        if (k) {
          const s = document.createElement('span');
          s.className = 'sep';
          inner.appendChild(s);
        }
        const name = this.acts[id].name;
        const nm = document.createElement('span');
        nm.className = 'nm' + (isKo(name) ? ' nm--ko' : '');
        nm.style.fontWeight = voice.w;
        if (p.ls) nm.style.letterSpacing = `calc(-0.02em + ${p.ls.toFixed(2)}px)`;
        for (const ch of name) {
          if (ch === ' ') { nm.appendChild(document.createTextNode(' ')); continue; }
          const c = document.createElement('span');
          c.className = 'ch';
          c.textContent = ch;
          nm.appendChild(c);
          const L = { el: c, row: ri, w: voice.w, d: 0, cx: 0, cy: 0, qw: voice.w, qd: 0, nw: 0, nd: 0, pri: 0 };
          rowLetters.push(L);
          this.letters.push(L);
        }
        inner.appendChild(nm);
      });
      row.appendChild(inner);
      frag.appendChild(row);
      this.rows.push({ el: row, inner, wd: p.wd, F: p.F, skew: 0, sy: 1, sx: 1, reveal: 1, letters: rowLetters, width: 0 });
    });
    // keep the measuring node, replace rows
    [...this.el.querySelectorAll('.prow')].forEach((r) => r.remove());
    this.el.insertBefore(frag, this.measureEl);
    this.readGeometry();
    this.applyTransforms(true);
  }

  readGeometry() {
    for (const r of this.rows) {
      r.width = r.inner.offsetWidth || 1;
      r.top = r.el.offsetTop;
      r.h = r.el.offsetHeight;
    }
    for (const L of this.letters) {
      L.cx = L.el.offsetLeft + L.el.offsetWidth / 2;
      L.cy = this.rows[L.row].top + this.rows[L.row].h * 0.5;
    }
  }

  applyTransforms(force) {
    const W = this.width;
    for (const r of this.rows) {
      const sx = (W / r.width) * r.reveal;
      r.sx = sx;
      if (this.reduced || force) {
        r.el.style.transform = `scale(${(W / r.width).toFixed(4)}, 1)`;
        continue;
      }
      r.el.style.transform = `skewX(${r.skew.toFixed(2)}deg) scale(${Math.max(sx, 0.0001).toFixed(4)}, ${r.sy.toFixed(4)})`;
    }
  }

  relayout() {
    if (!this.day) return;
    this.build(this.day);
    this.wake();
  }

  // ---------- day change ----------
  setDay(dayId, animate) {
    if (dayId === this.day && !this.trans) return Promise.resolve();
    if (this.reduced || !animate || !this.visible) {
      this.trans = null;
      this.build(dayId);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const now = performance.now();
      if (this.trans && this.trans.phase === 'in') {
        // interrupt an incoming poster: fold it from wherever it is now
        this.rows.forEach((r) => { r.revealFrom = r.reveal; });
      } else {
        this.rows.forEach((r) => { r.revealFrom = r.reveal; });
      }
      this.trans = { phase: 'out', t0: now, to: dayId, resolve };
      this.wake();
    });
  }

  // ---------- frame loop ----------
  wake() {
    if (this.reduced || this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  sampleAudio(dt) {
    const band = this.band;
    let live = false;
    if (band && band.playing && band.ctx) {
      live = true;
      const now = band.now;
      for (const ev of band.events) {
        if (ev.time > this.lastEvent && ev.time <= now) {
          this.lastEvent = ev.time;
          if (ev.kick) this.kick = 1;
        }
      }
      const spec = band.spectrum();
      const frame = this.hist[(this.head + 1) % HIST];
      if (spec) {
        const sr = band.sampleRate;
        const bins = spec.length;
        const lo = Math.log(55), hi = Math.log(9000);
        let total = 0;
        for (let b = 0; b < NB; b++) {
          const f0 = Math.exp(lo + ((hi - lo) * b) / NB);
          const f1 = Math.exp(lo + ((hi - lo) * (b + 1)) / NB);
          const i0 = Math.max(1, Math.floor((f0 / (sr / 2)) * bins));
          const i1 = Math.max(i0 + 1, Math.ceil((f1 / (sr / 2)) * bins));
          let m = 0;
          for (let i = i0; i < i1 && i < bins; i++) if (spec[i] > m) m = spec[i];
          // tilt so the highs are not drowned by the bass
          const v = clamp((m / 255 - 0.5 + b * 0.008) / 0.42, 0, 1);
          frame[b] = v * v;
          total += v;
        }
        this.energy = lerp(this.energy, total / NB, 0.2);
      }
      this.head = (this.head + 1) % HIST;
    } else {
      // let the waterfall drain
      const frame = this.hist[(this.head + 1) % HIST];
      const prev = this.hist[this.head];
      for (let b = 0; b < NB; b++) frame[b] = prev[b] * 0.86;
      this.head = (this.head + 1) % HIST;
      this.energy *= 0.9;
    }
    this.kick *= Math.exp(-dt / 170);
    return live;
  }

  frame(now) {
    this.raf = 0;
    const dt = clamp(now - this.last, 1, 64);
    this.last = now;
    if (!this.rows.length) return;
    const k60 = (k) => 1 - Math.pow(1 - k, dt / 16.67);

    // --- transition clock ---
    let tr = this.trans;
    if (tr) {
      const t = now - tr.t0;
      if (tr.phase === 'out') {
        let done = true;
        this.rows.forEach((r, i) => {
          const u = clamp((t - i * 38) / 260, 0, 1);
          r.reveal = (r.revealFrom ?? 1) * (1 - easeIn(u));
          if (u < 1) done = false;
        });
        if (done) {
          this.build(tr.to);
          this.rows.forEach((r) => { r.reveal = 0; });
          this.letters.forEach((L) => { L.w = 100; L.d = -30; });
          tr.phase = 'wait';
          tr.t0 = now;
          tr.resolve && tr.resolve();
        }
      } else if (tr.phase === 'wait') {
        // the colour wipe finishes before the new names rise
        this.rows.forEach((r) => { r.reveal = 0; });
        if (t > 140) { tr.phase = 'in'; tr.t0 = now; }
      } else if (tr.phase === 'in') {
        let done = true;
        this.rows.forEach((r, i) => {
          const u = clamp((t - i * 46) / 440, 0, 1);
          r.reveal = easeOut(u);
          if (u < 1) done = false;
        });
        if (done) this.trans = tr = null;
      }
    }

    const live = this.sampleAudio(dt);

    // --- inputs ---
    this.vel = lerp(this.vel, this.velRaw, k60(0.25));
    this.velRaw *= Math.pow(0.82, dt / 16.67);
    const rect = this.el.getBoundingClientRect();
    const W = this.width;
    const R = clamp(W * 0.26, 150, 420);
    const P = this.pointer;
    P.strength = lerp(P.strength, P.active ? 1 : 0, k60(P.active ? 0.2 : 0.06));
    const px = P.x - rect.left;
    const py = P.y - rect.top;
    const base = this.voice.w;
    const room = this.voice.to - base;
    const dw = this.voice.dw;

    // --- letters (writes) ---
    let moving = false;
    const kSpring = k60(0.16);
    const coarse = tr ? 3 : 1; // fewer, bigger steps while a new poster is being set
    const dirty = [];
    for (const L of this.letters) {
      const r = this.rows[L.row];
      let p = 0;
      if (P.strength > 0.002) {
        const dx = L.cx * r.sx - px;
        const dy = L.cy - py;
        const dist = Math.sqrt(dx * dx + dy * dy * 1.6);
        p = smooth(R, 0, dist) * P.strength;
      }
      let a = 0;
      if (live || this.energy > 0.002) {
        const xn = clamp((L.cx * r.sx) / W, 0, 0.999);
        const fr = this.hist[(this.head - L.row * ROW_LAG + HIST * 4) % HIST];
        a = fr[Math.floor(xn * NB)] * 0.8 + this.kick * 0.22;
      }
      const reveal = r.reveal;
      const tw = lerp(100, base + room * clamp(p + a, 0, 1), reveal);
      const td = p * dw + a * dw * 0.4 - (1 - reveal) * 30;
      L.w += (tw - L.w) * kSpring;
      L.d += (td - L.d) * kSpring;
      if (Math.abs(tw - L.w) > 0.4 || Math.abs(td - L.d) > 0.2) moving = true;
      const qw = clamp(Math.round(L.w / (QW * coarse)) * QW * coarse, 100, 900);
      const qd = clamp(Math.round(L.d / (QD * coarse)) * QD * coarse, 50 - r.wd, 150 - r.wd);
      if (qw !== L.qw || qd !== L.qd) {
        L.nw = qw;
        L.nd = qd;
        L.pri = Math.abs(qw - L.qw) / QW + Math.abs(qd - L.qd) / QD;
        dirty.push(L);
      }
    }
    if (dirty.length > this.budget) {
      dirty.sort((a, b) => b.pri - a.pri);
      dirty.length = this.budget;
      moving = true;
    }
    for (const L of dirty) {
      if (L.nw !== L.qw) { L.el.style.fontWeight = String(L.nw); L.qw = L.nw; }
      if (L.nd !== L.qd) {
        L.el.style.fontStretch = L.nd === 0 ? '' : (this.rows[L.row].wd + L.nd).toFixed(2) + '%';
        L.qd = L.nd;
      }
    }

    // --- read once, and only when something was re-set ---
    if (dirty.length) this.readGeometry();

    // --- rows (transform writes) ---
    const vel = this.vel;
    const targetSkew = clamp(-vel * 7, -12, 12);
    const targetSy = 1 + Math.min(Math.abs(vel) * 0.14, 0.3) + this.kick * 0.035;
    this.rows.forEach((r, i) => {
      const k = k60(Math.max(0.06, 0.22 - i * 0.025));
      r.skew += (targetSkew - r.skew) * k;
      r.sy += (targetSy - r.sy) * k;
      if (Math.abs(targetSkew - r.skew) > 0.02 || Math.abs(targetSy - r.sy) > 0.0005) moving = true;
    });
    this.applyTransforms(false);

    if (this.onMark) this.onMark(this.kick, this.energy);

    const busy = moving || tr || live || Math.abs(this.velRaw) > 0.01 || P.strength > 0.002 || this.kick > 0.01;
    if (busy && this.visible && !document.hidden) this.raf = requestAnimationFrame(this.frame);
  }
}
