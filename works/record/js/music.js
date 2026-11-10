// 깊은쪽 《물 빼는 날》 — the record's sound, composed in code with WebAudio.
// Nothing is downloaded: every drum, bass line, chord and melody is synthesised here, and the
// room is a generated 2.4-second impulse response (the drained pool the band recorded in).
// No sound is ever made before the visitor drops the needle or presses a sound button.

const AC = window.AudioContext || window.webkitAudioContext;
const MAJ = [0, 2, 4, 5, 7, 9, 11];
const MIN = [0, 2, 3, 5, 7, 8, 10];
export const RPM = 100 / 3;
export const REV = 60 / RPM; // 1.8 s per revolution

// ---------------------------------------------------------------- the ten tracks
// len: seconds (as printed on the sleeve). form: one letter per four bars (I = intro).
// prog: chord degrees, one per bar. drums/bass/chords/arp patterns: one bar, one char per step.
// mel: two one-bar rhythms; pitches are composed by makeMelody() from the chords (seeded).
const T = (o) => o;
export const SIDES = {
  A: [
    T({ id: 'A1', title: '출발대', len: 228, bpm: 124, spb: 16, root: 50, scale: MAJ, form: 'IAABABCB', verb: 0.24,
      prog: { I: [0, 4, 5, 3], A: [0, 4, 5, 3], B: [3, 0, 4, 5], C: [5, 3, 1, 4] },
      drums: { A: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        B: { k: 'x.....x.x.x.....', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx' },
        C: { k: 'x...............', s: '............x...', h: '..x...x...x...x.' } },
      bass: { A: 'r.r.r.r.r.r.r.r.', B: 'r.r.r.rrr.r.r.fo', C: 'r.......r.......', I: '' },
      chords: { inst: 'pluck', I: 'x...x...x...x...', A: 'x.x.x.x.x.x.x.x.', B: 'x..x..x.x..x..x.', C: 'x...............' },
      mel: { inst: 'lead', A: ['x.......x...x...', 'x...........x...'], B: ['x...x.x.x...x...', 'x.x...x...x.....'] } }),
    T({ id: 'A2', title: '레인 4', len: 252, bpm: 108, spb: 16, root: 45, scale: MIN, form: 'IAAABAAB', verb: 0.3,
      prog: { I: [0, 0, 5, 6], A: [0, 0, 5, 6], B: [5, 6, 0, 0] },
      drums: { I: { h: 'x.x.x.x.x.x.x.x.' }, A: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' } },
      bass: { A: 'r.o.r.o.r.o.r.o.', I: '' },
      chords: { inst: 'pad', A: 'x...............' },
      arp: { inst: 'pluck', A: '0124012401240124', I: '0124012401240124' },
      mel: { inst: 'lead', B: ['x.......x.......', 'x...............'] } }),
    T({ id: 'A3', title: '물 빼는 날', len: 306, bpm: 80, spb: 16, root: 41, scale: MAJ, form: 'IAABAB', verb: 0.42,
      prog: { I: [0, 2, 3, 3], A: [0, 2, 3, 3], B: [5, 4, 3, 0] },
      drums: { A: { k: 'x.........x.....', r: '........x.......', h: '..x...x...x...x.' } },
      bass: { A: 'r.......f.......', I: '' },
      chords: { inst: 'keys', A: 'x...x...x...x...', I: 'x.......x.......' },
      mel: { inst: 'lead', A: ['x...x...x.x.....', 'x...............'], B: ['x.x.x...x...x...', 'x.....x.x.......'] } }),
    T({ id: 'A4', title: '염소 냄새', len: 201, bpm: 138, spb: 16, root: 40, scale: MIN, form: 'AABABB', verb: 0.26,
      prog: { A: [0, 5, 2, 6], B: [5, 6, 0, 0] },
      drums: { A: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        B: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' } },
      bass: { A: 'r.r.r.r.r.r.r.r.' },
      chords: { inst: 'pluck', A: 'x.xx.x.xx.x.x.x.' },
      mel: { inst: 'lead', oct: 0, B: ['x.x.x.x.x...x...', 'x.x.x...x.......'] } }),
    T({ id: 'A5', title: '25m', len: 174, bpm: 168, spb: 16, root: 43, scale: MAJ, form: 'ABAB', verb: 0.2,
      prog: { A: [0, 0, 3, 4], B: [3, 4, 0, 0] },
      drums: { A: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        B: { k: 'x...x...x...x...', s: '....x.......x.xx', h: 'x.x.x.x.x.x.x.x.' } },
      bass: { A: 'r.r.r.r.r.r.r.r.' },
      chords: { inst: 'drive', A: 'x.x.x.x.x.x.x.x.' },
      mel: { inst: 'lead', B: ['x...x...x...x...', 'x...x...x.......'] } }),
  ],
  B: [
    T({ id: 'B1', title: '잠영', len: 280, bpm: 70, spb: 16, root: 37, scale: MIN, form: 'IAAB', verb: 0.55, tone: 1100,
      prog: { I: [0, 5, 3, 0], A: [0, 5, 3, 0], B: [5, 6, 0, 0] },
      drums: { A: { k: 'x.........x.....' } },
      bass: { A: 'r...............', I: '' },
      chords: { inst: 'pad', A: 'x...............' },
      arp: { inst: 'bell', A: '0...2...4.......', I: '0.......2.......' },
      mel: { inst: 'bell', B: ['x.......x.......', 'x...............'] } }),
    T({ id: 'B2', title: '탈의실 거울', len: 217, bpm: 96, spb: 16, root: 46, scale: MAJ, sevenths: true, swing: 0.18, form: 'IAABAB', verb: 0.3,
      prog: { I: [0, 5, 1, 4], A: [0, 5, 1, 4], B: [3, 2, 1, 4] },
      drums: { A: { k: 'x.....x...x.....', r: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
      bass: { A: 'r..f..r.r..f..t.', I: '' },
      chords: { inst: 'keys', A: 'x..x..x...x..x..', I: 'x.......x.......' },
      mel: { inst: 'lead', A: ['x...x..x..x.....', 'x.....x.x.......'] } }),
    T({ id: 'B3', title: '다이빙대', len: 298, bpm: 116, spb: 16, root: 45, scale: MAJ, form: 'IIAABBCB', verb: 0.34,
      prog: { I: [0, 3, 0, 4], A: [0, 3, 0, 4], B: [5, 3, 0, 4], C: [1, 3, 4, 4] },
      drums: { A: { k: 'x...x...x...x...', h: '..x...x...x...x.' },
        B: { k: 'x...x...x...x...', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' }, C: { k: 'x.......x.......' } },
      bass: { A: 'r...r...r...r...', B: 'r.r.r.r.r.r.r.r.', I: '' },
      chords: { inst: 'pad', A: 'x...............' },
      arp: { inst: 'pluck', A: '0123012301230123' },
      mel: { inst: 'lead', B: ['x.......x.x.x...', 'x...x...x.......'] } }),
    T({ id: 'B4', title: '수심 1.8', len: 195, bpm: 84, spb: 16, root: 38, scale: MIN, form: 'AABAB', verb: 0.3,
      prog: { A: [0, 0, 5, 4], B: [5, 6, 0, 4] },
      drums: { A: { k: 'x.....x...x.....', s: '........x.......', h: 'x.x.x.x.x.x.x.x.' } },
      bass: { inst: 'fuzz', A: 'r.....r...r.....' },
      chords: { inst: 'organ', A: 'x.......x.......' },
      mel: { inst: 'lead', B: ['x.......x.......', 'x...x...x.......'] } }),
    T({ id: 'B5', title: '마지막 자유수영', len: 362, bpm: 138, spb: 12, root: 39, scale: MAJ, form: 'IAABAB', verb: 0.44,
      prog: { I: [0, 4, 5, 3], A: [0, 4, 5, 3], B: [3, 0, 4, 0] },
      drums: { A: { k: 'x...........', h: '....x...x...' }, B: { k: 'x...........', s: '........x...', h: '....x...x...' } },
      bass: { A: 'r...f...f...', I: '' },
      chords: { inst: 'organ', A: 'x...x...x...', I: 'x...........' },
      mel: { inst: 'lead', A: ['x.....x.x...', 'x...........'], B: ['x...x...x...', 'x.....x.....'] } }),
  ],
};

export const LEADIN = 3; // seconds of lead-in groove before the first track
export const GAP = 2; // silent groove between tracks

export function timeline(side) {
  let t = LEADIN;
  const items = SIDES[side].map((tr) => {
    const it = { tr, start: t, end: t + tr.len };
    t = it.end + GAP;
    return it;
  });
  return { items, total: items[items.length - 1].end };
}

// ---------------------------------------------------------------- composing helpers
function rng(seed) {
  let a = 0;
  for (const ch of seed) a = (a * 31 + ch.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const mod = (n, m) => ((n % m) + m) % m;
const deg2midi = (tr, d, base) => base + 12 * Math.floor(d / 7) + tr.scale[mod(d, 7)];
const chordDegrees = (tr, c) => (tr.sevenths ? [c, c + 2, c + 4, c + 6] : [c, c + 2, c + 4]);

function chordNotes(tr, c) {
  const lo = tr.root + 9, hi = tr.root + 22;
  return chordDegrees(tr, c).map((d) => {
    let n = deg2midi(tr, d, tr.root + 12);
    while (n > hi) n -= 12;
    while (n < lo) n += 12;
    return n;
  }).sort((a, b) => a - b);
}

function bassNote(tr, c, ch) {
  let n = tr.root + tr.scale[mod(c, 7)];
  if (n > tr.root + 7) n -= 12;
  if (ch === 'f') return n + 7;
  if (ch === 'o') return n + 12;
  if (ch === 't') return n + mod(tr.scale[mod(c + 2, 7)] - tr.scale[mod(c, 7)], 12);
  return n;
}

// Melody: chord tones on strong steps, stepwise passing notes between, the first bar's shape comes
// back in the third bar, the phrase comes home to the tonic. Seeded by the track id and section.
function makeMelody(tr, sec) {
  const rh = tr.mel && tr.mel[sec];
  if (!rh) return null;
  const R = rng(tr.id + sec);
  const prog = tr.prog[sec] || tr.prog.A;
  const out = [];
  let prev = 4;
  let motif = [];
  for (let bar = 0; bar < 4; bar++) {
    const c = prog[bar];
    const tones = [];
    for (const d of chordDegrees(tr, c)) for (const o of [-7, 0, 7]) if (d + o >= -2 && d + o <= 10) tones.push(d + o);
    const rhythm = rh[bar % 2];
    const on = [];
    for (let i = 0; i < rhythm.length; i++) if (rhythm[i] === 'x') on.push(i);
    const dir = bar % 2 === 0 ? 1 : -1;
    on.forEach((st, k) => {
      const strong = st % 4 === 0;
      let d;
      const near = (x) => tones.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
      if (bar === 2 && motif[k] !== undefined) d = strong ? near(motif[k]) : motif[k];
      else if (strong) d = near(prev + dir * (1 + Math.floor(R() * 2)));
      else d = prev + dir * (R() < 0.7 ? 1 : 2);
      if (bar === 3 && k === on.length - 1) d = [0, 2, 4, 7].reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a));
      d = Math.max(-2, Math.min(10, d));
      if (bar === 0) motif[k] = d;
      const next = k + 1 < on.length ? on[k + 1] : tr.spb + (bar === 3 ? 4 : 0);
      out.push([bar * tr.spb + st, d, Math.min(next - st, 8)]);
      prev = d;
    });
  }
  return out;
}

// ---------------------------------------------------------------- the engine
export class Engine {
  constructor() {
    this.ctx = null;
    this.ok = !!AC;
    this.muted = true;
    this.session = null;
    this.melodies = new Map();
    this.perf0 = performance.now() / 1000;
    this.pausedAt = null;
    this.pausedTotal = 0;
  }

  // Must be called inside a user gesture the first time.
  ensure() {
    if (!this.ok) return false;
    if (!this.ctx) {
      try {
        this.ctx = new AC({ latencyHint: 'interactive' });
      } catch (e) {
        this.ok = false;
        return false;
      }
      this.build();
    }
    if (this.ctx.state === 'suspended' && this.pausedAt === null) this.ctx.resume();
    return true;
  }

  // Seconds on the transport clock: the audio clock when there is one (it stops while suspended).
  now() {
    if (this.ctx) return this.ctx.currentTime;
    const t = this.pausedAt !== null ? this.pausedAt : performance.now() / 1000;
    return t - this.perf0 - this.pausedTotal;
  }

  pause() {
    if (this.pausedAt !== null) return;
    this.pausedAt = performance.now() / 1000;
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.pausedAt === null) return;
    this.pausedTotal += performance.now() / 1000 - this.pausedAt;
    this.pausedAt = null;
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  build() {
    const c = this.ctx;
    this.out = c.createGain();
    this.out.gain.value = this.muted ? 0 : 0.85;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.attack.value = 0.008;
    comp.release.value = 0.25;
    const top = c.createBiquadFilter();
    top.type = 'lowpass';
    top.frequency.value = this.hz(12500);
    top.Q.value = 0.4;
    const rumble = c.createBiquadFilter();
    rumble.type = 'highpass';
    rumble.frequency.value = 30;
    this.tone = c.createBiquadFilter(); // per track (B1 is heard from under the water)
    this.tone.type = 'lowpass';
    this.tone.frequency.value = this.hz(18000);
    this.tone.Q.value = 0.6;
    this.music = c.createGain();
    this.music.gain.value = 0.55; // headroom: the compressor adds make-up gain
    this.dry = c.createGain();
    this.wet = c.createGain();
    this.wet.gain.value = 0.3;
    this.verb = c.createConvolver();
    this.verb.buffer = this.poolIR(2.4);
    this.music.connect(this.dry);
    this.music.connect(this.verb);
    this.verb.connect(this.wet);
    this.dry.connect(this.tone);
    this.wet.connect(this.tone);
    this.tone.connect(rumble);
    rumble.connect(top);
    top.connect(comp);
    comp.connect(this.out);
    this.out.connect(c.destination);
    // the surface of the record (crackle, needle drop, run-out click) skips the room
    this.surface = c.createGain();
    this.surface.gain.value = 0;
    this.surface.connect(top);
    this.fx = c.createGain();
    this.fx.connect(top);
    // wow: the pitch breathes once per revolution (33⅓ rpm), a few cents
    this.wow = c.createOscillator();
    this.wow.frequency.value = 1 / REV;
    this.wowDepth = c.createGain();
    this.wowDepth.gain.value = 4;
    this.wow.connect(this.wowDepth);
    this.wow.start();
    this.noise = this.noiseBuffer(1.5);
    this.crackle = this.crackleBuffer(4);
    this.runoutBuf = this.runoutBuffer();
  }

  hz(f) {
    return Math.min(f, this.ctx.sampleRate * 0.45);
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    const g = this.out.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(m ? 0 : 0.85, t + 0.12);
  }

  // ---- buffers
  noiseBuffer(sec) {
    const c = this.ctx, b = c.createBuffer(1, Math.round(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  poolIR(rt) {
    const c = this.ctx, n = Math.round(c.sampleRate * rt * 1.1), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / c.sampleRate;
        const env = Math.exp((-6.9 * t) / rt);
        const k = 0.65 - 0.5 * Math.min(1, t / rt); // tiles keep the highs, then they fade
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * env * (t < 0.012 ? t / 0.012 : 1);
      }
      // early reflections off the four walls of a 25 m basin
      for (const [ms, g] of [[19, 0.5], [31, 0.35], [47, 0.3], [73, 0.22], [101, 0.16]]) {
        const i = Math.round(((ms + ch * 3) / 1000) * c.sampleRate);
        if (i < n) d[i] += g * (ch ? -1 : 1);
      }
    }
    return b;
  }

  crackleBuffer(sec) {
    const c = this.ctx, n = Math.round(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        lp += 0.05 * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * 0.05; // faint surface hiss
        if (Math.random() < 9 / c.sampleRate) {
          const a = (0.15 + Math.random() * 0.5) * (Math.random() < 0.5 ? -1 : 1);
          for (let j = 0; j < 40 && i + j < n; j++) d[i + j] += a * Math.exp(-j / 6) * (j % 2 ? -0.6 : 1);
        }
      }
    }
    return b;
  }

  runoutBuffer() {
    const c = this.ctx, n = Math.round(c.sampleRate * REV), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let j = 0; j < 900; j++) d[j] = (Math.random() * 2 - 1) * Math.exp(-j / 120) * 0.5 + Math.sin(j / 9) * Math.exp(-j / 260) * 0.35;
    return b;
  }

  // ---- surface sounds
  needleDown() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.fx);
    o.start(t);
    o.stop(t + 0.25);
    this.burst(t, 0.05, 2500, 0.18);
    if (!this.crackleSrc) {
      const s = c.createBufferSource();
      s.buffer = this.crackle;
      s.loop = true;
      s.connect(this.surface);
      s.start(t);
      this.crackleSrc = s;
    }
    const sg = this.surface.gain;
    sg.cancelScheduledValues(t);
    sg.setValueAtTime(sg.value, t);
    sg.linearRampToValueAtTime(1, t + 0.05);
  }

  lift() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.stopMusic(0.06);
    this.runout(false);
    this.burst(t, 0.035, 3200, 0.12);
    const sg = this.surface.gain;
    sg.cancelScheduledValues(t);
    sg.setValueAtTime(sg.value, t);
    sg.linearRampToValueAtTime(0, t + 0.05);
  }

  burst(t, dur, f, v) {
    const c = this.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = 0.9;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp).connect(g).connect(this.fx);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }

  runout(on) {
    if (!this.ctx) return;
    if (on && !this.runSrc) {
      const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
      s.buffer = this.runoutBuf;
      s.loop = true;
      g.gain.value = 0.5;
      s.connect(g).connect(this.fx);
      s.start();
      this.runSrc = s;
    } else if (!on && this.runSrc) {
      this.runSrc.stop();
      this.runSrc = null;
    }
  }

  // ---- music
  stopMusic(fade = 0.08) {
    const s = this.session;
    if (!s) return;
    this.session = null;
    clearInterval(s.timer);
    const t = this.ctx.currentTime;
    s.bus.gain.cancelScheduledValues(t);
    s.bus.gain.setValueAtTime(s.bus.gain.value, t);
    s.bus.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => s.bus.disconnect(), (fade + 0.4) * 1000);
  }

  // Play `tr` from `offset` seconds into it.
  play(tr, offset) {
    if (!this.ctx) return;
    this.stopMusic(0.04);
    const c = this.ctx, t = c.currentTime + 0.03;
    const bus = c.createGain();
    bus.gain.setValueAtTime(0, t - 0.02);
    bus.gain.linearRampToValueAtTime(1, t + (offset > 0.2 ? 0.05 : 0.01));
    const fadeAt = t + (tr.len - offset) - 3;
    if (fadeAt > t) {
      bus.gain.setValueAtTime(1, fadeAt);
      bus.gain.linearRampToValueAtTime(0, fadeAt + 3);
    }
    bus.connect(this.music);
    this.wet.gain.setTargetAtTime(tr.verb ?? 0.3, t, 0.05);
    this.tone.frequency.setTargetAtTime(this.hz(tr.tone ?? 18000), t, 0.05);
    const sd = 60 / tr.bpm / 4;
    const t0 = t - offset;
    const s = { tr, bus, t0, sd, step: Math.max(0, Math.ceil(offset / sd)), end: t0 + tr.len };
    s.timer = setInterval(() => this.tick(s), 25);
    this.session = s;
    this.tick(s);
  }

  tick(s) {
    if (this.session !== s) return;
    const c = this.ctx, ahead = c.currentTime + 0.14;
    for (;;) {
      const swing = s.step % 2 ? (s.tr.swing || 0) * s.sd : 0;
      const at = s.t0 + s.step * s.sd + swing;
      if (at > ahead || at >= s.end - 0.05) break;
      if (at >= c.currentTime - 0.01) this.step(s, s.step, at);
      s.step++;
    }
  }

  step(s, n, at) {
    const tr = s.tr, spb = tr.spb, bar = Math.floor(n / spb), st = n % spb;
    const sec = tr.form[Math.floor(bar / 4) % tr.form.length];
    const prog = tr.prog[sec] || tr.prog.A;
    const chord = prog[bar % 4];
    const sd = s.sd, bus = s.bus;
    // drums
    const dr = tr.drums[sec] !== undefined ? tr.drums[sec] : sec === 'I' ? null : tr.drums.A;
    if (dr) {
      if (dr.k && dr.k[st] === 'x') this.kick(at, bus, sec === 'C' ? 0.6 : 0.9);
      if (dr.s && dr.s[st] === 'x') this.snare(at, bus, 0.5);
      if (dr.r && dr.r[st] === 'x') this.rim(at, bus, 0.32);
      if (dr.h && dr.h[st] === 'x') this.hat(at, bus, st % 4 === 0 ? 0.14 : 0.09);
    }
    // bass
    const bp = tr.bass[sec] !== undefined ? tr.bass[sec] : tr.bass.A;
    if (bp && bp[st] && bp[st] !== '.') {
      let len = 1;
      while (st + len < spb && bp[st + len] === '.' && len < 6) len++;
      const inst = tr.bass.inst === 'fuzz' ? this.fuzz : this.bass;
      inst.call(this, at, bassNote(tr, chord, bp[st]), len * sd * 0.92, bus, 0.32);
    }
    // chords
    const cp = tr.chords[sec] !== undefined ? tr.chords[sec] : tr.chords.A;
    if (cp && cp[st] === 'x') {
      let len = 1;
      while (st + len < spb && cp[st + len] !== 'x' && len < 16) len++;
      const notes = chordNotes(tr, chord);
      const inst = this[tr.chords.inst];
      const dur = tr.chords.inst === 'pad' ? spb * sd : len * sd * 0.95;
      if (tr.chords.inst === 'drive') inst.call(this, at, [notes[0], notes[0] + 7], dur, bus, 0.1);
      else notes.forEach((m, i) => inst.call(this, at + (tr.chords.inst === 'pluck' ? i * 0.006 : 0), m, dur, bus, tr.chords.inst === 'pad' ? 0.05 : 0.07));
    }
    // arpeggio
    if (tr.arp) {
      const ap = tr.arp[sec] !== undefined ? tr.arp[sec] : tr.arp.A;
      const ch = ap && ap[st];
      if (ch && ch !== '.') {
        const notes = chordNotes(tr, chord);
        const pool = [notes[0], notes[1], notes[2], notes[0] + 12, notes[1] + 12];
        this[tr.arp.inst](at, pool[Number(ch)] + 12, sd * 1.6, bus, tr.arp.inst === 'bell' ? 0.07 : 0.05);
      }
    }
    // melody (four-bar phrase)
    const key = tr.id + sec;
    if (!this.melodies.has(key)) this.melodies.set(key, makeMelody(tr, sec));
    const mel = this.melodies.get(key);
    if (mel) {
      const pos = (bar % 4) * spb + st;
      for (const [ms, d, l] of mel) {
        if (ms === pos) this[tr.mel.inst](at, deg2midi(tr, d, tr.root + 24 + 12 * (tr.mel.oct || 0)), l * sd * 0.9, bus, 0.13);
      }
    }
  }

  // ---- voices
  osc(type, f, t, dest, detune = 0) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    this.wowDepth.connect(o.detune);
    o.onended = () => {
      try { this.wowDepth.disconnect(o.detune); } catch (e) { /* already gone */ }
    };
    o.connect(dest);
    return o;
  }

  env(t, a, peak, d, sus, dur, r) {
    const g = this.ctx.createGain(), p = g.gain;
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(peak, t + a);
    p.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0001), t + a + d);
    p.setValueAtTime(Math.max(peak * sus, 0.0001), t + Math.max(dur, a + d));
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + d) + r);
    return g;
  }

  kick(t, bus, v) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.36);
  }

  snare(t, bus, v) {
    const c = this.ctx, s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.7;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.19);
    s.connect(bp).connect(g).connect(bus);
    s.start(t, Math.random());
    s.stop(t + 0.2);
    const o = c.createOscillator(), og = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
    og.gain.setValueAtTime(v * 0.6, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(og).connect(bus);
    o.start(t);
    o.stop(t + 0.1);
  }

  rim(t, bus, v) {
    const c = this.ctx, o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain();
    o.type = 'square';
    o.frequency.value = 820;
    bp.type = 'bandpass';
    bp.frequency.value = 1700;
    bp.Q.value = 3;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    o.connect(bp).connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.04);
  }

  hat(t, bus, v) {
    const c = this.ctx, s = c.createBufferSource(), hp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise;
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(hp).connect(g).connect(bus);
    s.start(t, Math.random());
    s.stop(t + 0.06);
  }

  bass(t, m, dur, bus, v) {
    const c = this.ctx, lp = c.createBiquadFilter(), g = this.env(t, 0.008, v, 0.12, 0.7, dur, 0.08);
    lp.type = 'lowpass';
    lp.frequency.value = 650;
    const f = 440 * 2 ** ((m - 69) / 12);
    const a = this.osc('triangle', f, t, lp), b = this.osc('sawtooth', f, t, lp, 4);
    const bg = c.createGain();
    bg.gain.value = 0.35;
    b.disconnect();
    b.connect(bg).connect(lp);
    lp.connect(g).connect(bus);
    a.start(t); b.start(t);
    a.stop(t + dur + 0.1); b.stop(t + dur + 0.1);
  }

  fuzz(t, m, dur, bus, v) {
    const c = this.ctx, sh = c.createWaveShaper(), lp = c.createBiquadFilter(), g = this.env(t, 0.01, v * 0.8, 0.2, 0.8, dur, 0.1);
    sh.curve = this.curve || (this.curve = (() => { const k = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; k[i] = Math.tanh(x * 4); } return k; })());
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const o = this.osc('sawtooth', 440 * 2 ** ((m - 69) / 12), t, sh);
    sh.connect(lp).connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.12);
  }

  pluck(t, m, dur, bus, v) {
    const c = this.ctx, lp = c.createBiquadFilter(), g = this.env(t, 0.004, v, 0.25, 0.35, Math.min(dur, 0.9), 0.12);
    const f = 440 * 2 ** ((m - 69) / 12);
    lp.type = 'lowpass';
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(3600, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.3);
    const a = this.osc('sawtooth', f, t, lp, -6), b = this.osc('square', f, t, lp, 6);
    lp.connect(g).connect(bus);
    a.start(t); b.start(t);
    const end = t + Math.min(dur, 0.9) + 0.15;
    a.stop(end); b.stop(end);
  }

  drive(t, ms, dur, bus, v) {
    const c = this.ctx, sh = c.createWaveShaper(), lp = c.createBiquadFilter(), g = this.env(t, 0.005, v, 0.1, 0.6, dur, 0.06);
    sh.curve = this.curve || (this.curve = (() => { const k = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; k[i] = Math.tanh(x * 4); } return k; })());
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    const os = ms.map((m) => this.osc('sawtooth', 440 * 2 ** ((m - 57) / 12), t, sh));
    sh.connect(lp).connect(g).connect(bus);
    os.forEach((o) => { o.start(t); o.stop(t + dur + 0.1); });
  }

  keys(t, m, dur, bus, v) {
    const c = this.ctx, f = 440 * 2 ** ((m - 69) / 12);
    const g = this.env(t, 0.004, v * 1.3, 1.2, 0.25, dur, 0.25);
    const a = this.osc('sine', f, t, g);
    const tine = c.createGain();
    tine.gain.setValueAtTime(v * 0.5, t);
    tine.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    const b = this.osc('sine', f * 2, t, tine);
    const bell = this.osc('sine', f * 7, t, tine);
    const bg = c.createGain();
    bg.gain.value = 0.15;
    bell.disconnect();
    bell.connect(bg).connect(tine);
    tine.connect(bus);
    g.connect(bus);
    const end = t + dur + 0.3;
    [a, b, bell].forEach((o) => { o.start(t); o.stop(end); });
  }

  pad(t, m, dur, bus, v) {
    const c = this.ctx, lp = c.createBiquadFilter(), g = this.env(t, 0.35, v, 0.4, 0.8, dur, 0.6);
    lp.type = 'lowpass';
    lp.frequency.value = 1300;
    const f = 440 * 2 ** ((m - 69) / 12);
    const a = this.osc('sawtooth', f, t, lp, -8), b = this.osc('sawtooth', f, t, lp, 8);
    lp.connect(g).connect(bus);
    a.start(t); b.start(t);
    a.stop(t + dur + 0.7); b.stop(t + dur + 0.7);
  }

  organ(t, m, dur, bus, v) {
    const c = this.ctx, f = 440 * 2 ** ((m - 69) / 12), g = this.env(t, 0.02, v, 0.1, 0.9, dur, 0.09);
    const os = [[1, 1], [2, 0.5], [3, 0.25], [4, 0.18]].map(([h, a]) => {
      const hg = c.createGain();
      hg.gain.value = a;
      const o = this.osc('sine', f * h, t, hg);
      hg.connect(g);
      return o;
    });
    g.connect(bus);
    os.forEach((o) => { o.start(t); o.stop(t + dur + 0.12); });
  }

  lead(t, m, dur, bus, v) {
    const c = this.ctx, f = 440 * 2 ** ((m - 69) / 12), lp = c.createBiquadFilter(), g = this.env(t, 0.03, v, 0.15, 0.7, dur, 0.18);
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    const o = this.osc('triangle', f, t, lp);
    const o2 = this.osc('sine', f * 2, t, lp);
    const vib = c.createOscillator(), vg = c.createGain();
    vib.frequency.value = 5.2;
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(9, t + 0.25);
    vib.connect(vg);
    vg.connect(o.detune);
    vg.connect(o2.detune);
    const o2g = c.createGain();
    o2g.gain.value = 0.18;
    o2.disconnect();
    o2.connect(o2g).connect(lp);
    lp.connect(g).connect(bus);
    const end = t + dur + 0.25;
    [o, o2, vib].forEach((x) => { x.start(t); x.stop(end); });
  }

  bell(t, m, dur, bus, v) {
    const c = this.ctx, f = 440 * 2 ** ((m - 69) / 12), g = this.env(t, 0.003, v, 1.6, 0.0001, 0.01, 0.4);
    const o = this.osc('sine', f, t, g);
    const mod = c.createOscillator(), mg = c.createGain();
    mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.2, t);
    mg.gain.exponentialRampToValueAtTime(1, t + 1.2);
    mod.connect(mg).connect(o.frequency);
    g.connect(bus);
    o.start(t); mod.start(t);
    o.stop(t + 2.1); mod.stop(t + 2.1);
  }
}
