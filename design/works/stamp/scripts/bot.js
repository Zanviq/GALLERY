// A perfect player for checks (dev tool, not deployed): stamps every open target at the exact moment
// it crosses the ring (press() takes the event time) and leaves every send-back document alone.
// Paste via cdp.mjs eval=. window.__bot.presses counts its presses.
(() => {
  const S = window.__stamp;
  window.__bot = { presses: 0 };
  const tick = () => {
    const G = S.G;
    if (G.state === 'playing' && performance.now() >= G.cooldown && G.v > 0) {
      outer: for (const d of G.docs) {
        if (d.resolved || d.hold) continue;
        const lx = G.offset - d.worldX;
        for (const t of d.targets) {
          const ahead = t.u - lx; // units until the target sits in the ring
          if (!t.status && ahead >= -0.5 && ahead <= G.v * 0.045) {
            S.press(G.last + (ahead / G.v) * 1000);
            window.__bot.presses++;
            break outer;
          }
        }
      }
    }
    requestAnimationFrame(tick);
  };
  tick();
  return 'bot on';
})()
