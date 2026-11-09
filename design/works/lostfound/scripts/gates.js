// Page-side checks for works/lostfound (dev tool). Run through cdp.mjs:
//   node cdp.mjs <url> <WxH> "log=$(cat gates.js)"
// Reports horizontal overflow, elements wider than the viewport, small tap targets and
// overlapping text boxes in the board.
(() => {
  const out = { w: innerWidth, scrollW: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > innerWidth };
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden'; };
  out.wide = [...document.querySelectorAll('body *')].filter((e) => vis(e) && !e.closest('svg') && !e.closest('[data-gallery-back]') && e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('.grid-body')).slice(0, 6).map((e) => `${e.tagName}.${e.className}`);
  out.small = [...document.querySelectorAll('button, a[href], summary, [tabindex="0"]')].filter(vis).filter((e) => {
    const r = e.getBoundingClientRect();
    if (e.classList.contains('g-cell')) return r.width < 28 || r.height < 28;
    return r.width < 44 || r.height < 44;
  }).map((e) => `${e.id || e.className} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
  const cell = document.querySelector('.g-cell');
  out.cell = cell ? Math.round(cell.getBoundingClientRect().width) : null;
  // text boxes inside a tag or ticket must not overlap each other
  const overl = [];
  for (const box of document.querySelectorAll('.tag-paper, .ticket')) {
    const kids = [...box.querySelectorAll(':scope > span, :scope > svg')].filter(vis).map((k) => [k, k.getBoundingClientRect()]);
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i][1], b = kids[j][1];
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overl.push(`${box.id || box.closest('[id]').id}: ${kids[i][0].className.baseVal ?? kids[i][0].className} / ${kids[j][0].className.baseVal ?? kids[j][0].className}`);
    }
  }
  out.overlap = overl.slice(0, 6);
  return out;
})()
