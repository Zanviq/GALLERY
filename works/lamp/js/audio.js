// Detent and press clicks for the dial, synthesised with WebAudio (no files).
// The AudioContext is created only inside a user gesture (start()).

export class Clicks {
  constructor() {
    this.AC = window.AudioContext || window.webkitAudioContext || null;
    this.ok = !!this.AC;
    this.ctx = null;
  }

  start() {
    if (!this.ok) return false;
    if (!this.ctx) {
      try {
        const ctx = new this.AC();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 8200;
        const master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(lp).connect(ctx.destination);
        const len = Math.floor(ctx.sampleRate * 0.5);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.ctx = ctx;
        this.master = master;
        this.noise = buf;
      } catch (e) {
        this.ok = false;
        return false;
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  burst(t, f, q, gain, decay) {
    const { ctx } = this;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.4);
    src.stop(t + decay + 0.02);
  }

  tone(t, f0, f1, gain, decay) {
    const { ctx } = this;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  // Run fn(t) now, or as soon as a suspended context has resumed.
  play(fn) {
    const { ctx } = this;
    if (!ctx) return;
    if (ctx.state === 'running') { fn(ctx.currentTime + 0.005); return; }
    // A context that is still starting plays a moment late; a blocked one stays silent (no backlog).
    const t0 = performance.now();
    ctx.resume().then(() => { if (performance.now() - t0 < 250) fn(ctx.currentTime + 0.005); }, () => {});
  }

  // One detent of the dial: a small, dry tick, a touch higher as it turns up.
  detent(level) {
    const p = 1 + (level - 3) * 0.025 + (Math.random() - 0.5) * 0.03;
    this.play((t) => {
      this.burst(t, 3600 * p, 1.4, 0.34, 0.022);
      this.tone(t, 2300 * p, 1600 * p, 0.05, 0.018);
      this.burst(t + 0.003, 950, 0.8, 0.09, 0.03);
    });
  }

  // The last detent into off: a lower, heavier click.
  off() {
    this.play((t) => {
      this.burst(t, 1900, 1.0, 0.36, 0.034);
      this.tone(t, 190, 120, 0.15, 0.05);
    });
  }

  // Pressing the dial top: a soft thock down, a lighter tick up.
  press() {
    this.play((t) => {
      this.burst(t, 1400, 1.1, 0.3, 0.03);
      this.tone(t, 240, 150, 0.12, 0.045);
      this.burst(t + 0.09, 2800, 1.3, 0.16, 0.02);
    });
  }
}
