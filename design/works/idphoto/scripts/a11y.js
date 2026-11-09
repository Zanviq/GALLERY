// In-page audit run by cdp.mjs (log=...). Returns a summary object (dev tool, not deployed).
(() => {
  const out = { noName: [], small: [], overflow: [], headings: [], tab: [], imgs: [] };
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const name = (e) => (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') || '').split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' ') || (e.labels && [...e.labels].map((l) => l.textContent).join(' ')) || e.textContent || e.getAttribute('title') || '').trim();
  const sel = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"]), summary';
  for (const e of document.querySelectorAll(sel)) {
    if (!vis(e) && !e.matches('input[type=radio]')) continue;
    if (!name(e)) out.noName.push(e.outerHTML.slice(0, 80));
    const t = e.matches('input[type=radio]') ? e.closest('label').getBoundingClientRect() : e.getBoundingClientRect();
    const inline = e.matches('a') && getComputedStyle(e).display === 'inline';
    if ((t.width < 44 || t.height < 44) && !inline && !e.matches('.skip')) out.small.push(`${e.tagName}.${e.className} ${Math.round(t.width)}x${Math.round(t.height)} "${name(e).slice(0, 16)}"`);
    out.tab.push(name(e).slice(0, 10));
  }
  const W = document.documentElement.clientWidth;
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && !e.closest("svg") && vis(e) && !e.closest('[data-gallery-back]') && !e.closest('.sr') && !e.matches('.skip')) out.overflow.push(`${e.tagName}.${e.className.baseVal ?? e.className} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  out.overflow = out.overflow.slice(0, 8);
  out.scrollW = document.documentElement.scrollWidth + '/' + W;
  out.headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName[1] + ' ' + h.textContent.trim().slice(0, 14));
  out.tab = out.tab.slice(0, 60).join(' > ');
  out.imgs = [...document.querySelectorAll('svg[role=img], canvas[role=img]')].map((s) => !!(s.getAttribute('aria-label') || s.getAttribute('aria-labelledby')));
  out.ids = [...document.querySelectorAll('[id]')].map((e) => e.id).filter((id, i, a) => a.indexOf(id) !== i);
  return out;
})()
