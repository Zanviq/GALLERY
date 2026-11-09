// Small WebAudio kit. The context is created on the first user gesture (the start button).
let ctx = null;
let master = null;
let noise = null;
let on = true;
let lastRush = 0;

export function setSound(v) {
  on = !!v;
  if (master) master.gain.value = on ? 0.55 : 0;
}
export const soundOn = () => on;

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = on ? 0.55 : 0;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.05);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    ctx = null;
  }
}

export function suspend() {
  if (ctx && ctx.state === 'running') ctx.suspend();
}

function ready() {
  return on && ctx && ctx.state === 'running';
}

function tone(freq, dur, { type = 'square', vol = 0.15, at = 0, to = null } = {}) {
  if (!ready()) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function burst(vol, freq = 3200) {
  if (!ready()) return;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(master);
  s.start();
}

export const sfx = {
  tick: () => tone(1500, 0.03, { vol: 0.05 }),
  tickHi: () => tone(2300, 0.035, { vol: 0.08 }),
  open: () => { tone(988, 0.08, { vol: 0.16 }); tone(1480, 0.2, { vol: 0.14, at: 0.08 }); },
  press: () => tone(620, 0.025, { type: 'triangle', vol: 0.12 }),
  refuse: () => tone(220, 0.12, { type: 'sawtooth', vol: 0.08, to: 160 }),
  // other buyers' clicks: a dry crackle, rate-limited
  rush(n) {
    const now = performance.now();
    if (now - lastRush < 45) return;
    lastRush = now;
    burst(Math.min(0.09, 0.02 + n * 0.012), 2600 + Math.random() * 2400);
  },
  win: () => { tone(1046, 0.07, { vol: 0.14 }); tone(1568, 0.12, { vol: 0.12, at: 0.07 }); },
  lose: () => tone(200, 0.22, { type: 'sawtooth', vol: 0.12, to: 110 }),
  warn: () => tone(1180, 0.05, { vol: 0.1 }),
  penalty: () => { tone(160, 0.12, { type: 'sawtooth', vol: 0.14 }); tone(130, 0.16, { type: 'sawtooth', vol: 0.12, at: 0.12 }); },
  done: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.12, at: i * 0.08 })),
  fail: () => [392, 330, 262].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.12, at: i * 0.14 })),
};
