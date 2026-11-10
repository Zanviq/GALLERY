// Render every track offline (no speakers) and report peak/RMS: node cdp.mjs <url> 800x600 "log=$(cat audiotest.js)"
(async () => {
  const m = await import('/record/js/music.js');
  const out = {};
  for (const side of ['A', 'B']) for (const tr of m.SIDES[side]) for (const offset of [0, 40]) {
    const eng = new m.Engine();
    const sr = 22050, dur = 8;
    eng.ctx = new OfflineAudioContext(2, sr * dur, sr);
    eng.muted = false;
    eng.build();
    const c = eng.ctx, bus = c.createGain();
    bus.connect(eng.music);
    eng.wet.gain.value = tr.verb ?? 0.3;
    eng.tone.frequency.value = eng.hz(tr.tone ?? 18000);
    const sd = 60 / tr.bpm / 4, s = { tr, bus, t0: 0, sd };
    for (let n = Math.ceil(offset / sd); n * sd - offset < dur - 0.4; n++) eng.step(s, n, 0.05 + n * sd - offset);
    const buf = await c.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0, sum = 0;
    for (let i = 0; i < d.length; i++) { const v = d[i]; if (Math.abs(v) > peak) peak = Math.abs(v); sum += v * v; }
    out[tr.id + '@' + offset] = [+peak.toFixed(2), +Math.sqrt(sum / d.length).toFixed(3)];
  }
  return out;
})()
