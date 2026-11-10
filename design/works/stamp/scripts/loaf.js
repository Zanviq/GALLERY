// Long-animation-frame recorder for checks (dev tool, not deployed). Paste via cdp.mjs eval= before a
// round; window.__loaf.report() lists the frames over 34 ms with where their time went.
(() => {
  const L = window.__loaf = { entries: [] };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (window.__stamp.G.state !== 'playing') continue;
        L.entries.push({
          dur: Math.round(e.duration), block: Math.round(e.blockingDuration),
          style: Math.round(e.renderStart && e.styleAndLayoutStart ? e.duration - (e.styleAndLayoutStart - e.startTime) : 0),
          render: Math.round(e.renderStart ? e.duration - (e.renderStart - e.startTime) : 0),
          scripts: e.scripts.map((s) => `${s.invoker || s.invokerType} ${Math.round(s.duration)}ms ${(s.sourceFunctionName || '')}`).slice(0, 3),
        });
      }
    }).observe({ type: 'long-animation-frame', buffered: false });
  } catch (err) { L.error = String(err); }
  L.report = () => ({ n: L.entries.length, top: L.entries.sort((a, b) => b.dur - a.dur).slice(0, 12) });
  return 'loaf on';
})()
