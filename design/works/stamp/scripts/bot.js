// A perfect player for checks (dev tool, not deployed). Paste via cdp.mjs eval=, then read
// window.__bot.report() after the round. It stamps every open target at the exact moment it
// crosses the ring (press() takes the event time) and leaves every 반려 alone, and while it plays it
// records what the speed curve asks of a player and how the frames run:
//   presses, lates/misses (must be 0: every target is reachable at full speed),
//   minGapMs  the shortest time between two targets crossing the ring (a human double tap needs ~150),
//   winEnd    the 정확 / 조금 비뚤 half-windows in ms at 18:00,
//   maxAccel  the largest change of tray speed per second once the tray is up to speed (no jumps),
//   js        the game's frame callback time (ms): p50, p95, p99, max,
//   frames    rAF intervals while playing: count, mean, p95, p99, max, how many over 20 / 34 ms.
(() => {
  const S = window.__stamp;
  // lag: ms the bot presses after the exact crossing (0 = perfect; ~95 makes it slip once the tray
  // passes about 2배속, for checking the work log's lines)
  const B = window.__bot = { presses: 0, lag: 0, crossings: [], frames: [], js: [], maxAccel: 0, speeds: {} };
  // time the game's own frame callback (its JS per frame) by wrapping requestAnimationFrame
  const raf0 = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf0((t) => {
    if (cb.name !== 'frame') return cb(t);
    const a = performance.now();
    cb(t);
    if (S.G.state === 'playing') B.js.push(performance.now() - a);
  });
  let lastT = 0, lastV = 0;
  const tick = (now) => {
    const G = S.G;
    if (G.state === 'playing') {
      if (lastT) {
        const dt = (now - lastT) / 1000;
        B.frames.push(now - lastT);
        if (G.spin >= 1 && lastV > 0 && dt > 0) B.maxAccel = Math.max(B.maxAccel, Math.abs(G.v - lastV) / dt);
      }
      lastT = now; lastV = G.v;
      const sec = Math.floor(G.elapsed / 15) * 15;
      if (!(sec in B.speeds)) B.speeds[sec] = +(G.v / 100).toFixed(3);
      if (performance.now() >= G.cooldown && G.v > 0) {
        outer: for (const d of G.docs) {
          if (d.resolved || d.kind === 'banryeo') continue;
          const lx = G.offset - d.worldX;
          for (const t of d.targets) {
            const ahead = t.u - lx; // units until the target sits in the ring
            const ms = (ahead / G.v) * 1000 + B.lag; // from this frame to the press
            if (!t.status && ms >= -20 && ms <= 45) {
              const at = G.last + ms;
              S.press(at);
              B.crossings.push(at);
              B.presses++;
              break outer;
            }
          }
        }
      }
    } else { lastT = 0; }
    raf0(tick);
  };
  raf0(tick);
  B.report = () => {
    const G = S.G, c = G.c;
    const gaps = B.crossings.slice(1).map((t, i) => t - B.crossings[i]);
    const f = B.frames.slice(10).sort((a, b) => a - b);
    const q = (p) => +(f[Math.min(f.length - 1, Math.floor(f.length * p))] || 0).toFixed(1);
    const v1 = S.curve(S.ROUND) * (S.settings.slow ? 0.7 : 1);
    const p = Math.max(2.8, v1 * 0.045), g = Math.min(Math.max(7, v1 * 0.11), 9.5);
    return {
      presses: B.presses, perfect: c.perfect, good: c.good, late: c.late, miss: c.miss + c.wrong + c.twice, air: c.air,
      banKept: c.banKept, banHit: c.banHit, done: G.done, score: G.score, maxStreak: G.maxStreak,
      minGapMs: Math.round(Math.min(...gaps)), gapsUnder200: gaps.filter((x) => x < 200).length,
      winEnd: [Math.round((p / v1) * 1000), Math.round((g / v1) * 1000)],
      speeds: B.speeds, maxAccel: +B.maxAccel.toFixed(1),
      js: (() => { const j = B.js.slice().sort((a, b) => a - b); const k = (p) => +(j[Math.min(j.length - 1, Math.floor(j.length * p))] || 0).toFixed(2); return { p50: k(0.5), p95: k(0.95), p99: k(0.99), max: k(0.9999) }; })(),
      frames: { n: f.length, mean: +(f.reduce((s, x) => s + x, 0) / (f.length || 1)).toFixed(2), p95: q(0.95), p99: q(0.99), max: q(0.9999), over20: f.filter((x) => x > 20).length, over34: f.filter((x) => x > 34).length },
    };
  };
  return 'bot on';
})()
