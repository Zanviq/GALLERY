// Paste-free audit run inside the page by cdp.mjs (log=...). Returns a summary object.
(() => {
  const out = { noName: [], small: [], overflow: [], headings: [], tab: [] };
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = (e) => (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') || '').split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' ') || (e.labels && [...e.labels].map((l) => l.textContent).join(' ')) || e.textContent || e.getAttribute('title') || '').trim();
  const sel = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"]), summary';
  for (const e of document.querySelectorAll(sel)) {
    if (!vis(e)) continue;
    if (!name(e) && e.type !== 'radio') out.noName.push(e.outerHTML.slice(0, 80));
    const r = e.getBoundingClientRect();
    const t = e.matches('input[type=radio], input[type=checkbox]') ? e.closest('label').getBoundingClientRect() : r;
    if ((t.width < 44 || t.height < 44) && !e.closest('.piece') && !e.matches('.skip')) out.small.push(`${e.tagName}.${e.className.baseVal ?? e.className} ${Math.round(t.width)}x${Math.round(t.height)} "${name(e).slice(0, 20)}"`);
    out.tab.push((e.dataset.id || name(e)).slice(0, 14));
  }
  for (const e of document.querySelectorAll('.piece')) { const r = e.querySelector('.piece__hit').getBoundingClientRect(); if (r.width < 44) out.small.push('piece hit ' + Math.round(r.width)); }
  const W = document.documentElement.clientWidth;
  for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.right > W + 1 && vis(e) && !e.closest('[data-gallery-back]')) out.overflow.push(`${e.tagName}.${e.className.baseVal ?? e.className} right=${Math.round(r.right)}`); }
  out.overflow = out.overflow.slice(0, 8);
  out.scrollW = document.documentElement.scrollWidth + '/' + W;
  out.headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName[1] + ' ' + h.textContent.trim().slice(0, 16));
  out.tab = out.tab.slice(0, 40).join(' > ');
  out.imgs = [...document.querySelectorAll('svg[role=img]')].map((s) => !!(s.getAttribute('aria-label') || s.getAttribute('aria-labelledby')));
  return out;
})()
