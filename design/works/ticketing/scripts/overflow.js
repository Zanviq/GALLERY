(() => { const W = document.documentElement.clientWidth; const bad = [];
  document.querySelectorAll('body *').forEach((e) => { const r = e.getBoundingClientRect();
    if (!r.width || e.closest('.event__photo, [data-gallery-back], .stage[hidden]')) return;
    if (r.right > W + 1 || r.left < -1) bad.push((e.id || e.className || e.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right)); });
  return [document.documentElement.scrollWidth, W, bad.slice(0, 6)]; })()
