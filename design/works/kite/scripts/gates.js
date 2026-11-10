// Evaluated in the page by cdp.mjs (log=...). Returns overflow and clipping facts for BRIEF §5.
(() => {
  const vw = document.documentElement.clientWidth;
  const out = { vw, scrollW: document.documentElement.scrollWidth, wide: [], tinyText: [] };
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName !== 'svg') continue;
    if (el.matches('canvas.scene, canvas.kite__tail, .hero__field, .sr, .skip')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right > vw + 1 || r.left < -1) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed') continue;
      out.wide.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${Math.round(r.left)}..${Math.round(r.right)}`);
    }
  }
  // rendered size of map labels (svg text scales with the map)
  const t = document.querySelector('.map__label--small');
  if (t) out.mapSmallPx = Math.round(t.getBoundingClientRect().height * 10) / 10;
  out.wide = out.wide.slice(0, 12);
  return out;
})()
