// The sound of pouring sand, made in the page: thousands of tiny clicks (grains striking grains),
// filtered. It starts only after the visitor's first touch, follows the grains that actually land,
// and gets duller as the bottle fills (shorter fall, sand on sand instead of sand on glass).

export class SandSound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.level = 0;
    this.idle = 0;
  }

  /** Call from inside a user gesture. */
  start() {
    if (!this.enabled) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    if (!this.ctx) {
      try {
        this.ctx = new AC();
      } catch (e) { this.enabled = false; return; }
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(ctx.destination);
      // the stream: a looped buffer of grain clicks through a band-pass whose centre follows the fill
      this.flowGain = ctx.createGain();
      this.flowGain.gain.value = 0;
      this.band = ctx.createBiquadFilter();
      this.band.type = 'bandpass';
      this.band.frequency.value = 3800;
      this.band.Q.value = 0.6;
      this.src = ctx.createBufferSource();
      this.src.buffer = grainBuffer(ctx, 2.2, 0.05);
      this.src.loop = true;
      this.src.connect(this.band).connect(this.flowGain).connect(this.master);
      this.src.start();
      // a soft hiss for avalanches and the settling pile
      this.hissGain = ctx.createGain();
      this.hissGain.gain.value = 0;
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 1600;
      this.hiss = ctx.createBufferSource();
      this.hiss.buffer = grainBuffer(ctx, 1.7, 0.35);
      this.hiss.loop = true;
      this.hiss.connect(low).connect(this.hissGain).connect(this.master);
      this.hiss.start();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.05);
    if (!on) this.ctx.suspend().catch(() => {});
  }

  /** landed: grains that reached the pile this frame; moving: grains still rolling; fill 0..1. */
  update(landed, moving, fill) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const flow = Math.min(1, landed / 46);
    const roll = Math.min(1, moving / 900);
    this.flowGain.gain.setTargetAtTime(0.5 * Math.pow(flow, 0.7), t, 0.06);
    this.hissGain.gain.setTargetAtTime(0.06 * roll + 0.05 * flow, t, 0.12);
    this.band.frequency.setTargetAtTime(5200 - 3000 * Math.min(1, fill * 1.2), t, 0.3);
    if (landed || moving) this.idle = 0;
    else if (++this.idle > 240 && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  /** A short rattle when the bottle is shaken. */
  shake() {
    if (!this.ctx || !this.enabled) return;
    this.start();
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = grainBuffer(ctx, 0.5, 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.55, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
  }

  /** The cork going in: a dull knock. */
  cork() {
    if (!this.ctx || !this.enabled) return;
    this.start();
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.2);
  }
}

/**
 * Seconds of grain noise: sparse clicks with random strength, each a few samples of decaying
 * noise; `density` is the chance of a click per sample. Seeded, so it sounds the same every time.
 */
function grainBuffer(ctx, seconds, density) {
  const rate = ctx.sampleRate;
  const n = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(1, n, rate);
  const d = buf.getChannelData(0);
  let r = 0x2545f491;
  const rand = () => { r ^= r << 13; r ^= r >>> 17; r ^= r << 5; return (r >>> 0) / 4294967296; };
  let env = 0, sign = 1, prev = 0;
  for (let i = 0; i < n; i++) {
    if (rand() < density) { env = -Math.log(1 - rand() * 0.999) * 0.35; sign = rand() < 0.5 ? -1 : 1; }
    const x = env * sign * (rand() * 2 - 1);
    env *= 0.82;
    d[i] = x - prev * 0.6;          // tilt the spectrum up a little: grit, not rumble
    prev = x;
  }
  // loop seam: fade the ends together
  const fade = Math.floor(rate * 0.02);
  for (let i = 0; i < fade; i++) { const k = i / fade; d[i] *= k; d[n - 1 - i] *= k; }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  for (let i = 0; i < n; i++) d[i] /= peak || 1;
  return buf;
}
