(() => { const W = document.documentElement.clientWidth; const bad = [];
  document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) { const cs = getComputedStyle(e); if (cs.position !== 'fixed') bad.push((e.className && e.className.baseVal === undefined ? e.className : e.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right)); } });
  return { W, sw: document.documentElement.scrollWidth, bad: bad.slice(0, 8) }; })()
