// A soft wind made in the browser: filtered noise whose pitch and loudness follow the wind on screen,
// with a faint paper rattle when it gusts. Nothing plays until the visitor presses the sound button.

export class WindSound {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.audible = true;
    this.supported = !!(window.AudioContext || window.webkitAudioContext);
  }

  build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    // brown-ish noise: a soft roar rather than hiss
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass'; band.frequency.value = 380; band.Q.value = 0.6;
    const body = ctx.createGain(); body.gain.value = 0.05;

    const white = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const wd = white.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const src2 = ctx.createBufferSource();
    src2.buffer = white; src2.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass'; hp.frequency.value = 2600; hp.Q.value = 1.4;
    const rattle = ctx.createGain(); rattle.gain.value = 0;

    const master = ctx.createGain(); master.gain.value = 0;
    src.connect(band).connect(body).connect(master);
    src2.connect(hp).connect(rattle).connect(master);
    master.connect(ctx.destination);
    src.start(); src2.start();
    Object.assign(this, { ctx, band, body, rattle, master });
  }

  async toggle() {
    if (!this.supported) return false;
    if (!this.ctx) this.build();
    this.on = !this.on;
    if (this.on) await this.ctx.resume();
    this.apply();
    return this.on;
  }

  setAudible(v) {
    if (this.audible === v) return;
    this.audible = v;
    this.apply();
  }

  apply() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const target = this.on && this.audible ? 0.9 : 0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, target ? 0.25 : 0.12);
    clearTimeout(this.sleep);
    if (!target) this.sleep = setTimeout(() => { if (!(this.on && this.audible)) this.ctx.suspend(); }, 900);
    else if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // level: wind in m/s; gust: 0..1 how much the visitor is stirring
  update(level, gust) {
    if (!this.ctx || !this.on || !this.audible) return;
    const now = this.ctx.currentTime;
    const n = Math.max(0, Math.min(1, (level - 1) / 11));
    this.band.frequency.setTargetAtTime(240 + 900 * n, now, 0.15);
    this.body.gain.setTargetAtTime(0.04 + 0.5 * n * n, now, 0.2);
    this.rattle.gain.setTargetAtTime(0.03 * gust * (0.5 + Math.random()), now, 0.04);
  }
}
