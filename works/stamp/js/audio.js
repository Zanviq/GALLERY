// Small synthesized sounds. The AudioContext is created on the first user gesture only.
let ctx = null;
let master = null;
let noise = null;
let muted = false;

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.85;
}

export function unlock() {
  if (muted && !ctx) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.85;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.6);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = noise.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    ctx = null;
  }
}

const ready = () => ctx && !muted && ctx.state === 'running';

function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function burst(t, { type = 'bandpass', freq = 1000, q = 0.8, peak = 0.2, attack = 0.002, decay = 0.05 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, peak, attack, decay);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.3);
  src.stop(t + attack + decay + 0.02);
}

function tone(t, { f0, f1 = f0, peak = 0.3, attack = 0.002, decay = 0.1, type = 'sine' }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + attack + decay);
  const g = ctx.createGain();
  env(g, t, peak, attack, decay);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + attack + decay + 0.02);
}

/** The stamp meeting paper. quality 1 = 정확, 0.5 = 조금 비뚤, 0 = 빗나감 */
export function thump(quality = 1) {
  if (!ready()) return;
  const t = ctx.currentTime + 0.001;
  tone(t, { f0: quality >= 1 ? 150 : 128, f1: 48, peak: 0.75, decay: 0.11 });
  burst(t, { type: 'lowpass', freq: quality >= 1 ? 1300 : 700, q: 0.5, peak: 0.32, decay: 0.05 });
  if (quality >= 1) burst(t + 0.004, { type: 'highpass', freq: 2600, q: 0.7, peak: 0.1, decay: 0.022 });
}

/** The stamp hitting the empty steel tray. */
export function clink() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.001;
  tone(t, { f0: 2140, peak: 0.06, decay: 0.16 });
  tone(t, { f0: 3310, peak: 0.035, decay: 0.11 });
  burst(t, { type: 'highpass', freq: 3000, peak: 0.08, decay: 0.015 });
}

/** A sheet arriving on the tray; pace 1 .. 2.4 (배속): a faster tray gives a brighter, shorter swish. */
export function slide(pace = 1) {
  if (!ready()) return;
  const t = ctx.currentTime + 0.001;
  burst(t, { type: 'bandpass', freq: 1500 + 420 * (pace - 1), q: 0.6, peak: 0.035, attack: 0.05 / Math.sqrt(pace), decay: 0.17 / Math.sqrt(pace) });
}

/** One notch of the stepped tray. */
export function tick() {
  if (!ready()) return;
  burst(ctx.currentTime + 0.001, { type: 'highpass', freq: 3600, q: 0.7, peak: 0.03, decay: 0.012 });
}

/** The multiplier went up: two quick pencil taps. */
export function tap2() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.001;
  burst(t, { type: 'bandpass', freq: 2400, q: 2, peak: 0.12, decay: 0.03 });
  burst(t + 0.085, { type: 'bandpass', freq: 2900, q: 2, peak: 0.12, decay: 0.03 });
}

/** 18:00. */
export function bell() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.01;
  tone(t, { f0: 1046.5, peak: 0.12, attack: 0.004, decay: 1.5 });
  tone(t, { f0: 1568, peak: 0.07, attack: 0.004, decay: 1.1 });
  tone(t + 0.18, { f0: 1318.5, peak: 0.1, attack: 0.004, decay: 1.4 });
}

/** A slip (wrong place, a miss, 반려 stamped): a short dull double knock, low and flat. */
export function buzz() {
  if (!ready()) return;
  const t = ctx.currentTime + 0.001;
  tone(t, { f0: 196, f1: 174.6, peak: 0.16, attack: 0.004, decay: 0.09, type: 'triangle' });
  tone(t + 0.11, { f0: 146.8, f1: 130.8, peak: 0.16, attack: 0.004, decay: 0.13, type: 'triangle' });
}
