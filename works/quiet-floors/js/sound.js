// Optional sound, off by default. The AudioContext is only created after the visitor ticks the box.
// Everything is synthesised and low-passed, as if heard through a slab from the room below.

let ctx = null;
let master = null;
let noiseBuf = null;
const live = new Set();

export function enable() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 6; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

export function stopAll() {
  for (const n of live) { try { n.stop(); } catch (e) { /* already stopped */ } }
  live.clear();
}

const gainFor = (L) => Math.min(1, 0.85 * Math.pow(10, (L - 56) / 20));

function track(node, end) {
  live.add(node);
  node.onended = () => live.delete(node);
  node.start(node._t0);
  node.stop(end);
}

function thump(t, L, a, low = 70) {
  const g = ctx.createGain();
  const peak = gainFor(L) * a;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  g.connect(lp).connect(master);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(low * 1.6, t);
  o.frequency.exponentialRampToValueAtTime(low, t + 0.12);
  o.connect(g);
  o._t0 = t;
  track(o, t + 0.5);
  const n = ctx.createBufferSource();
  n.buffer = noiseBuf;
  const ng = ctx.createGain();
  ng.gain.value = 0.35;
  n.connect(ng).connect(g);
  n._t0 = t;
  track(n, t + 0.3);
}

function scrape(t, dur, L) {
  const n = ctx.createBufferSource();
  n.buffer = noiseBuf;
  n.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900;
  bp.Q.value = 3;
  const g = ctx.createGain();
  const peak = gainFor(L) * 2.2;
  g.gain.setValueAtTime(0.0001, t);
  for (let k = 0; k < dur; k += 0.06) g.gain.setValueAtTime(Math.max(0.0002, peak * (0.45 + 0.55 * Math.abs(Math.sin(k * 23.7)))), t + k);
  g.gain.setValueAtTime(0.0001, t + dur);
  n.connect(bp).connect(g).connect(master);
  n._t0 = t;
  track(n, t + dur + 0.05);
}

function hum(t, dur, L) {
  const g = ctx.createGain();
  const peak = gainFor(L) * 1.4;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.6);
  g.gain.setValueAtTime(peak, t + dur - 0.5);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 220;
  g.connect(lp).connect(master);
  for (const [f, a] of [[48, 1], [96, 0.4]]) {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    const og = ctx.createGain();
    og.gain.value = a;
    o.connect(og).connect(g);
    o._t0 = t;
    track(o, t + dur + 0.05);
  }
}

function ambience(t, dur, L) {
  const n = ctx.createBufferSource();
  n.buffer = noiseBuf;
  n.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  const g = ctx.createGain();
  const v = gainFor(L) * 0.9;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(v, t + 0.3);
  g.gain.setValueAtTime(v, t + dur - 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  n.connect(lp).connect(g).connect(master);
  n._t0 = t;
  track(n, t + dur + 0.05);
}

// Play what the meter's room hears for this setup.
export function playScene(act, L, bg, day) {
  if (!ctx) return;
  stopAll();
  const t = ctx.currentTime + 0.05;
  if (day) ambience(t, act.dur, bg);
  if (act.hits) {
    for (const [ht, a] of act.hits) thump(t + ht, L, a, act.kind === 'wall' ? 90 : 62);
  } else if (act.kind === 'light') {
    scrape(t + act.span[0], act.span[1] - act.span[0], L);
  } else {
    hum(t + act.span[0], act.span[1] - act.span[0], L);
  }
}
