// Camera sounds, synthesised with WebAudio (no files). Nothing plays before a user gesture:
// the AudioContext is only created inside a click, tap or key press.
let ctx = null;
let master = null;
let noiseBuf = null;

export function available() {
  return typeof window.AudioContext === 'function' || typeof window.webkitAudioContext === 'function';
}

// Call only from inside a user gesture.
export function wake() {
  if (!available()) return false;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

export function sleep() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}

function noise(t, dur, { type = 'bandpass', freq = 2000, q = 1, gain = 0.5, attack = 0.001, decay } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (decay || dur));
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

function tone(t, dur, { type = 'sine', from = 440, to, gain = 0.2, attack = 0.002 } = {}) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

// The leaf shutter opening and closing, and the soft pop of the flash tube.
export function shutter() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.005;
  noise(t, 0.012, { freq: 4200, q: 3, gain: 0.9 });
  tone(t, 0.03, { type: 'triangle', from: 1900, to: 900, gain: 0.12 });
  noise(t + 0.045, 0.035, { freq: 1500, q: 2.2, gain: 0.75, decay: 0.03 });
  tone(t + 0.045, 0.05, { type: 'square', from: 220, to: 120, gain: 0.05 });
  noise(t + 0.01, 0.05, { type: 'highpass', freq: 5200, q: 0.7, gain: 0.16, decay: 0.045 });
}

// The rollers pushing the print out: a small DC motor and its gears.
export function motor(dur = 1.15) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  const end = t + dur;
  const o1 = ctx.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.setValueAtTime(70, t);
  o1.frequency.linearRampToValueAtTime(118, t + 0.12);
  o1.frequency.setValueAtTime(118, end - 0.12);
  o1.frequency.linearRampToValueAtTime(80, end);
  const o2 = ctx.createOscillator();
  o2.type = 'square';
  o2.frequency.setValueAtTime(140, t);
  o2.frequency.linearRampToValueAtTime(236, t + 0.12);
  o2.frequency.setValueAtTime(236, end - 0.12);
  o2.frequency.linearRampToValueAtTime(160, end);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  lp.Q.value = 2;
  const trem = ctx.createGain();
  trem.gain.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 31;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.3;
  lfo.connect(lfoGain).connect(trem.gain);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.11, t + 0.05);
  g.gain.setValueAtTime(0.11, end - 0.08);
  g.gain.linearRampToValueAtTime(0, end);
  const o2g = ctx.createGain();
  o2g.gain.value = 0.35;
  o1.connect(lp);
  o2.connect(o2g).connect(lp);
  lp.connect(trem).connect(g).connect(master);
  [o1, o2, lfo].forEach((o) => { o.start(t); o.stop(end + 0.05); });
  // the paper sliding over the rollers
  noise(t, dur, { freq: 2600, q: 0.8, gain: 0.05, attack: 0.08, decay: dur });
  // the gear catching at the end
  noise(end - 0.02, 0.03, { freq: 1100, q: 3, gain: 0.4 });
}

// The flash capacitor charging again: a thin rising whine.
export function charge(dur = 1.0) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  tone(t, dur, { from: 2400, to: 7600, gain: 0.018, attack: 0.15 });
}

// Pressing the shutter with no film left.
export function dry() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.005;
  noise(t, 0.015, { freq: 2600, q: 4, gain: 0.45 });
}

// Closing the film door after a new pack.
export function door() {
  if (!ctx) return;
  const t = ctx.currentTime + 0.005;
  tone(t, 0.09, { from: 120, to: 60, gain: 0.35 });
  noise(t, 0.04, { freq: 900, q: 1.5, gain: 0.5 });
  noise(t + 0.06, 0.02, { freq: 3000, q: 4, gain: 0.3 });
}
