// A burr grinder, synthesized with WebAudio. Nothing is created or played before a user gesture
// calls ensure(); the page decides when that is (first grab of the dial, a method click, the 소리 button).
//
// motor  : sawtooth + square an octave up, low-passed; spins up on start, sags and winds down on stop
// whine  : looping noise through a narrow band-pass; higher and louder the finer the grind (more load)
// crunch : looping noise through a band-pass whose gain is struck in short random bursts; fine grind =
//          dense small ticks (a hiss), coarse grind = sparse, louder, lower cracks of whole fragments
// detent : a short click for every step of the dial

export class GrinderSound {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.running = false;
    this.load = 0.5;
    this.nextCrack = 0;
    this.timer = 0;
  }

  get available() {
    return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
  }

  /** Call only inside a user gesture. Returns false when the browser has no WebAudio. */
  ensure() {
    if (!this.available) return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      try {
        this.ctx = new AC();
      } catch (e) {
        return false;
      }
      this.build();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return true;
  }

  build() {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * 2);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.master = c.createGain();
    this.master.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);

    // motor
    this.motorGain = c.createGain();
    this.motorGain.gain.value = 0;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 620;
    lp.Q.value = 0.7;
    this.o1 = c.createOscillator();
    this.o1.type = 'sawtooth';
    this.o1.frequency.value = 30;
    this.o2 = c.createOscillator();
    this.o2.type = 'square';
    this.o2.frequency.value = 60;
    const g2 = c.createGain();
    g2.gain.value = 0.22;
    this.o1.connect(lp);
    this.o2.connect(g2).connect(lp);
    lp.connect(this.motorGain).connect(this.master);

    // whine of the burrs
    this.whine = c.createBufferSource();
    this.whine.buffer = buf;
    this.whine.loop = true;
    this.whineBP = c.createBiquadFilter();
    this.whineBP.type = 'bandpass';
    this.whineBP.Q.value = 5;
    this.whineBP.frequency.value = 3000;
    this.whineGain = c.createGain();
    this.whineGain.gain.value = 0;
    this.whine.connect(this.whineBP).connect(this.whineGain).connect(this.master);

    // cracking beans
    this.crunch = c.createBufferSource();
    this.crunch.buffer = buf;
    this.crunch.loop = true;
    this.crunchBP = c.createBiquadFilter();
    this.crunchBP.type = 'bandpass';
    this.crunchBP.Q.value = 0.9;
    this.crunchBP.frequency.value = 1800;
    this.crunchGain = c.createGain();
    this.crunchGain.gain.value = 0;
    this.crunch.connect(this.crunchBP).connect(this.crunchGain).connect(this.master);

    // detent clicks
    this.clickBP = c.createBiquadFilter();
    this.clickBP.type = 'bandpass';
    this.clickBP.frequency.value = 3800;
    this.clickBP.Q.value = 2;
    this.clickGain = c.createGain();
    this.clickGain.gain.value = 0;
    const clickSrc = c.createBufferSource();
    clickSrc.buffer = buf;
    clickSrc.loop = true;
    clickSrc.connect(this.clickBP).connect(this.clickGain).connect(this.master);

    this.o1.start();
    this.o2.start();
    this.whine.start();
    this.crunch.start(0, 0.7);
    clickSrc.start(0, 1.3);
  }

  setOn(v) {
    this.on = v;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(v ? 0.6 : 0, t, 0.05);
    if (!v) this.stop(true);
  }

  /** 0 = coarsest (little load), 1 = finest (most load) */
  setLoad(load) {
    this.load = Math.min(1, Math.max(0, load));
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    this.whineBP.frequency.setTargetAtTime(2100 + 2200 * this.load, t, 0.08);
    this.whineGain.gain.setTargetAtTime(0.025 + 0.06 * this.load, t, 0.08);
    this.o1.frequency.setTargetAtTime(96 - 10 * this.load, t, 0.12);
    this.o2.frequency.setTargetAtTime(2 * (96 - 10 * this.load) + 1.5, t, 0.12);
  }

  start() {
    if (!this.on || !this.ctx || this.running || this.ctx.state !== 'running') return;
    this.running = true;
    const c = this.ctx;
    const t = c.currentTime;
    const f = 96 - 10 * this.load;
    for (const [o, k] of [[this.o1, 1], [this.o2, 2]]) {
      o.frequency.cancelScheduledValues(t);
      o.frequency.setValueAtTime(Math.max(o.frequency.value, 24 * k), t);
      o.frequency.exponentialRampToValueAtTime(f * k + (k - 1) * 1.5, t + 0.28);
    }
    this.motorGain.gain.cancelScheduledValues(t);
    this.motorGain.gain.setTargetAtTime(0.34, t, 0.05);
    this.whineBP.frequency.setTargetAtTime(2100 + 2200 * this.load, t, 0.05);
    this.whineGain.gain.cancelScheduledValues(t);
    this.whineGain.gain.setTargetAtTime(0.025 + 0.06 * this.load, t + 0.12, 0.12);
    this.nextCrack = t + 0.1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  schedule() {
    if (!this.running) return;
    const c = this.ctx;
    const horizon = c.currentTime + 0.1;
    const fine = this.load;
    const rate = 18 + 80 * fine; // cracks per second
    while (this.nextCrack < horizon) {
      const t = this.nextCrack;
      const amp = (0.08 + 0.34 * (1 - fine)) * (0.45 + Math.random() * 0.55);
      const dur = 0.003 + 0.011 * (1 - fine) * Math.random();
      this.crunchBP.frequency.setValueAtTime(700 + 2600 * fine * (0.6 + Math.random() * 0.4) + Math.random() * 500, t);
      this.crunchGain.gain.setValueAtTime(amp, t);
      this.crunchGain.gain.setTargetAtTime(0, t + 0.0015, dur);
      this.nextCrack += -Math.log(1 - Math.random()) / rate;
    }
  }

  stop(now = false) {
    if (!this.ctx || !this.running) return;
    this.running = false;
    clearInterval(this.timer);
    const t = this.ctx.currentTime;
    const down = now ? 0.12 : 0.65;
    for (const [o, k] of [[this.o1, 1], [this.o2, 2]]) {
      o.frequency.cancelScheduledValues(t);
      o.frequency.setValueAtTime(o.frequency.value, t);
      o.frequency.exponentialRampToValueAtTime(26 * k, t + down);
    }
    this.motorGain.gain.cancelScheduledValues(t);
    this.motorGain.gain.setTargetAtTime(0, t, down / 3.5);
    this.whineGain.gain.cancelScheduledValues(t);
    this.whineGain.gain.setTargetAtTime(0, t, 0.06);
    this.crunchGain.gain.cancelScheduledValues(t);
    this.crunchGain.gain.setTargetAtTime(0, t, 0.02);
  }

  tick() {
    if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    const g = this.clickGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.5, t);
    g.setTargetAtTime(0, t + 0.001, 0.004);
  }
}
