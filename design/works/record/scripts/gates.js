// Layout and state checks run inside the page: overflow, clipped text, fonts, the deck loop.
(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
  scrollTo(0, 0);
  await document.fonts.ready;
  const W = document.documentElement.clientWidth;
  const off = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.right <= W + 1) continue;
    let p = el.parentElement, clipped = false;
    while (p && p !== document.body) { const cs = getComputedStyle(p); if (cs.overflowX !== 'visible' || cs.overflow === 'hidden') { clipped = true; break; } p = p.parentElement; }
    if (!clipped) off.push(el.className || el.tagName);
  }
  const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src);
  return {
    W, scrollW: document.documentElement.scrollWidth, off: [...new Set(off)].slice(0, 8), brokenImgs: imgs,
    fonts: ['Moirai One', 'Gipeun Sans'].map((f) => document.fonts.check(`16px "${f}"`)),
    reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
})()
