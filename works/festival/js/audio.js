// 너울 2027 — the festival's own little band.
// Everything here is synthesized on the spot with oscillators and noise. No samples.
// The AudioContext is only created after the visitor presses play.

const STEPS = 16;

const n = (name) => {
  // 'A2' -> midi
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return base + acc + (Number(m[3]) + 1) * 12;
};
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const bits = (s) => s.split('').map((c) => c !== '.');

// Per day: tempo, chords (one per bar, 4 bars), editable drum/bass rows, fixed layers.
export const SONGS = {
  fri: {
    bpm: 120, swing: 0.0,
    chords: [['A2', 'C4', 'E4', 'G4', 'B4'], ['F2', 'A3', 'C4', 'E4', 'G4'], ['C3', 'E4', 'G4', 'B4', 'D5'], ['G2', 'B3', 'D4', 'F#4', 'A4']],
    rows: {
      kick: bits('x...x...x...x...'),
      clap: bits('....x.......x...'),
      hat:  bits('..x...x...x...x.'),
      bass: bits('x..x..x.x..x..x.'),
    },
    stab: bits('...x......x.....'),
    lead: [0, null, null, 2, null, null, 4, null, 3, null, null, 2, null, 1, null, null],
    voice: { bass: 'saw', hatOpen: true, pad: false, lead: 'pluck', cutoff: 1400 },
  },
  sat: {
    bpm: 126, swing: 0.0,
    chords: [['D2', 'F3', 'A3', 'C4', 'E4'], ['D2', 'F3', 'A3', 'C4', 'G4'], ['Bb1', 'D3', 'F3', 'A3', 'C4'], ['C2', 'E3', 'G3', 'Bb3', 'D4']],
    rows: {
      kick: bits('x...x...x...x...'),
      clap: bits('....x.......x..x'),
      hat:  bits('xxxxxxxxxxxxxxxx'),
      bass: bits('x.xx.xx.x.xx.xx.'),
    },
    stab: bits('................'),
    lead: [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 4, 2, 1, 3, 4, 3],
    voice: { bass: 'square', hatOpen: false, pad: false, lead: 'arp', cutoff: 2200 },
  },
  sun: {
    bpm: 96, swing: 0.12,
    chords: [['F2', 'A3', 'C4', 'E4', 'G4'], ['E2', 'G3', 'B3', 'D4', 'A4'], ['D2', 'F3', 'A3', 'C4', 'E4'], ['Bb1', 'D3', 'F3', 'A3', 'C4']],
    rows: {
      kick: bits('x......x..x.....'),
      clap: bits('....x.......x...'),
      hat:  bits('x.xxx.xxx.xxx.xx'),
      bass: bits('x......x..x...x.'),
    },
    stab: bits('................'),
    lead: [4, null, null, null, null, null, 3, null, 2, null, null, null, 1, null, 2, null],
    voice: { bass: 'sine', hatOpen: false, pad: true, lead: 'bell', cutoff: 900 },
  },
};

export const TRACKS = [
  { id: 'kick', label: '북' },
  { id: 'clap', label: '손뼉' },
  { id: 'hat', label: '찰랑' },
  { id: 'bass', label: '저음' },
];

function cloneRows(rows) {
  const out = {};
  for (const k of Object.keys(rows)) out[k] = rows[k].slice();
  return out;
}

export class Band {
  constructor() {
    this.ctx = null;
    this.day = 'fri';
    this.pendingDay = null;
    this.rows = { fri: cloneRows(SONGS.fri.rows), sat: cloneRows(SONGS.sat.rows), sun: cloneRows(SONGS.sun.rows) };
    this.playing = false;
    this.step = 0;
    this.bar = 0;
    this.nextTime = 0;
    this.timer = 0;
    this.events = []; // {time, step, kick, clap, hat, bass}
    this.listeners = new Set();
  }

  static supported() {
    return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(type, data) { for (const fn of this.listeners) fn(type, data); }

  setDay(day) {
    if (!SONGS[day]) return;
    if (!this.playing) { this.day = day; this.pendingDay = null; return; }
    this.pendingDay = day; // switched on the next downbeat
  }

  toggleCell(day, track, i) {
    const row = this.rows[day][track];
    row[i] = !row[i];
    return row[i];
  }

  resetDay(day) { this.rows[day] = cloneRows(SONGS[day].rows); }

  // ---------- graph ----------
  build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;

    this.out = ctx.createGain();
    this.out.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 8;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.16;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(comp);
    comp.connect(this.out);
    this.out.connect(ctx.destination);

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.55;
    this.bus.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);

    // room: a generated impulse response (decaying noise), nothing recorded
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 400 ? i / 400 : 1);
      }
    }
    this.verb = ctx.createConvolver();
    this.verb.buffer = ir;
    this.verbSend = ctx.createGain();
    this.verbSend.gain.value = 0.32;
    this.verbSend.connect(this.verb);
    this.verb.connect(this.bus);

    // tape-ish echo for plucks
    this.delay = ctx.createDelay(2);
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = 0.34;
    const dl = ctx.createBiquadFilter();
    dl.type = 'lowpass';
    dl.frequency.value = 2600;
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = 0.28;
    this.delaySend.connect(this.delay);
    this.delay.connect(dl);
    dl.connect(this.delayFb);
    this.delayFb.connect(this.delay);
    dl.connect(this.bus);

    // white noise, reused by every percussive voice
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
  }

  // ---------- transport ----------
  async start() {
    if (!Band.supported()) throw new Error('unsupported');
    if (!this.ctx) this.build();
    if (this.ctx.state !== 'running') await this.ctx.resume();
    if (this.pendingDay) { this.day = this.pendingDay; this.pendingDay = null; }
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0.72, t + 0.4);
    this.step = 0;
    this.bar = 0;
    this.nextTime = t + 0.06;
    this.delay.delayTime.setValueAtTime((60 / SONGS[this.day].bpm) * 0.75, t);
    this.playing = true;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
    this.emit('state', 'playing');
  }

  async stop() {
    if (!this.ctx || !this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(this.out.gain.value, t);
    this.out.gain.linearRampToValueAtTime(0, t + 0.25);
    this.events.length = 0;
    this.emit('state', 'stopped');
    await new Promise((r) => setTimeout(r, 300));
    if (!this.playing && this.ctx.state === 'running') await this.ctx.suspend();
  }

  schedule() {
    const ctx = this.ctx;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      const song = SONGS[this.day];
      const sixteenth = 60 / song.bpm / 4;
      // swing: push every second 16th a little late
      const sw = song.swing * sixteenth;
      this.nextTime += this.step % 2 === 0 ? sixteenth + sw : sixteenth - sw;
      this.step = (this.step + 1) % STEPS;
      if (this.step === 0) {
        this.bar = (this.bar + 1) % 4;
        if (this.pendingDay) {
          this.day = this.pendingDay;
          this.pendingDay = null;
          this.bar = 0;
          this.delay.delayTime.setTargetAtTime((60 / SONGS[this.day].bpm) * 0.75, this.nextTime, 0.05);
          this.emit('day', this.day);
        }
      }
    }
    // drop events that are long gone
    const cut = ctx.currentTime - 0.5;
    while (this.events.length && this.events[0].time < cut) this.events.shift();
  }

  playStep(i, t) {
    const day = this.day;
    const song = SONGS[day];
    const rows = this.rows[day];
    const chord = song.chords[this.bar].map(n);
    const ev = { time: t, step: i, bar: this.bar, kick: rows.kick[i], clap: rows.clap[i], hat: rows.hat[i], bass: rows.bass[i] };
    if (ev.kick) this.kick(t, day);
    if (ev.clap) this.clap(t, day);
    if (ev.hat) this.hat(t, day, i);
    if (ev.bass) this.bassNote(t, day, chord[0] + (song.voice.bass === 'square' && i % 2 ? 12 : 0), i);
    if (song.stab[i]) this.stab(t, chord.slice(1));
    if (song.voice.pad && i === 0) this.pad(t, chord.slice(1), (60 / song.bpm) * 4);
    const li = song.lead[i];
    if (li !== null && li !== undefined) {
      const tones = chord.slice(1);
      const note = tones[li % tones.length] + 12;
      if (song.voice.lead === 'pluck') this.pluck(t, note, 0.16);
      else if (song.voice.lead === 'arp') this.pluck(t, note + (i >= 8 ? 12 : 0), 0.07);
      else this.bell(t, note + 12);
    }
    this.events.push(ev);
  }

  // ---------- voices ----------
  env(g, t, peak, a, d, s = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(s, 0.0001), t + a + d);
  }

  noise(t, dur) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
    return src;
  }

  kick(t, day) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    const top = day === 'sun' ? 120 : 160;
    o.frequency.setValueAtTime(top, t);
    o.frequency.exponentialRampToValueAtTime(day === 'sun' ? 48 : 44, t + 0.11);
    this.env(g, t, day === 'sun' ? 0.75 : 1.0, 0.003, day === 'sun' ? 0.32 : 0.42);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.6);
    // the click of the beater
    const c = this.noise(t, 0.02);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    const cg = ctx.createGain();
    this.env(cg, t, 0.18, 0.001, 0.015);
    c.connect(hp).connect(cg).connect(this.bus);
  }

  clap(t, day) {
    const ctx = this.ctx;
    const src = this.noise(t, 0.3);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = day === 'sun' ? 2200 : 1400;
    bp.Q.value = day === 'sun' ? 2.5 : 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    const peak = day === 'sun' ? 0.32 : 0.55;
    [0, 0.011, 0.022].forEach((o) => {
      g.gain.setValueAtTime(peak, t + o);
      g.gain.exponentialRampToValueAtTime(peak * 0.25, t + o + 0.009);
    });
    g.gain.exponentialRampToValueAtTime(0.0001, t + (day === 'sun' ? 0.09 : 0.2));
    src.connect(bp).connect(g);
    g.connect(this.bus);
    g.connect(this.verbSend);
  }

  hat(t, day, i) {
    const ctx = this.ctx;
    const open = SONGS[day].voice.hatOpen;
    const dur = open ? 0.2 : day === 'sun' ? 0.035 : 0.045;
    const src = this.noise(t, dur + 0.05);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = day === 'sun' ? 6000 : 7600;
    const g = ctx.createGain();
    const accent = i % 4 === 2 ? 1 : 0.55;
    this.env(g, t, (day === 'sun' ? 0.13 : 0.2) * accent, 0.002, dur);
    src.connect(hp).connect(g).connect(this.bus);
  }

  bassNote(t, day, midi, i) {
    const ctx = this.ctx;
    const v = SONGS[day].voice;
    const o = ctx.createOscillator();
    o.type = v.bass === 'saw' ? 'sawtooth' : v.bass === 'square' ? 'square' : 'triangle';
    o.frequency.setValueAtTime(hz(midi), t);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = v.bass === 'sine' ? 0.5 : 6;
    const open = v.bass === 'sine' ? 500 : 340 + (i % 4 === 0 ? 900 : 520);
    f.frequency.setValueAtTime(open, t);
    f.frequency.exponentialRampToValueAtTime(120, t + 0.22);
    const g = ctx.createGain();
    const len = v.bass === 'sine' ? 0.42 : 0.2;
    this.env(g, t, v.bass === 'sine' ? 0.5 : 0.34, 0.006, len);
    o.connect(f).connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + len + 0.1);
    if (v.bass === 'sine') {
      const s = ctx.createOscillator();
      s.type = 'sine';
      s.frequency.setValueAtTime(hz(midi), t);
      const sg = ctx.createGain();
      this.env(sg, t, 0.35, 0.01, 0.5);
      s.connect(sg).connect(this.bus);
      s.start(t);
      s.stop(t + 0.6);
    }
  }

  stab(t, notes) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 3;
    f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    const g = ctx.createGain();
    this.env(g, t, 0.085, 0.004, 0.28);
    f.connect(g);
    g.connect(this.bus);
    g.connect(this.verbSend);
    for (const m of notes.slice(0, 4)) {
      for (const det of [-8, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(hz(m), t);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + 0.4);
      }
    }
  }

  pad(t, notes, dur) {
    const ctx = this.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(1300, t + dur * 0.5);
    f.frequency.linearRampToValueAtTime(800, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.5);
    g.gain.setValueAtTime(0.05, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    f.connect(g);
    g.connect(this.bus);
    g.connect(this.verbSend);
    for (const m of notes.slice(0, 4)) {
      for (const det of [-6, 5]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(hz(m), t);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.5);
      }
    }
  }

  pluck(t, midi, peak) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(hz(midi), t);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 4;
    f.frequency.setValueAtTime(3800, t);
    f.frequency.exponentialRampToValueAtTime(400, t + 0.16);
    const g = ctx.createGain();
    this.env(g, t, peak, 0.003, 0.2);
    o.connect(f).connect(g);
    g.connect(this.bus);
    g.connect(this.delaySend);
    o.start(t);
    o.stop(t + 0.3);
  }

  bell(t, midi) {
    const ctx = this.ctx;
    const c = ctx.createOscillator();
    const m = ctx.createOscillator();
    const mg = ctx.createGain();
    const g = ctx.createGain();
    const f = hz(midi);
    c.type = 'sine';
    m.type = 'sine';
    c.frequency.setValueAtTime(f, t);
    m.frequency.setValueAtTime(f * 3.5, t);
    mg.gain.setValueAtTime(f * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.9);
    m.connect(mg).connect(c.frequency);
    this.env(g, t, 0.12, 0.004, 1.6);
    c.connect(g);
    g.connect(this.bus);
    g.connect(this.verbSend);
    g.connect(this.delaySend);
    c.start(t);
    m.start(t);
    c.stop(t + 1.8);
    m.stop(t + 1.8);
  }

  // ---------- analysis for the visuals ----------
  spectrum() {
    if (!this.analyser) return null;
    this.analyser.getByteFrequencyData(this.freq);
    return this.freq;
  }

  get sampleRate() { return this.ctx ? this.ctx.sampleRate : 48000; }
  get now() { return this.ctx ? this.ctx.currentTime : 0; }
}
