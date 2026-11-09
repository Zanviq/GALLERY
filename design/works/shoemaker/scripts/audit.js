// In-page audit run by cdp.mjs: `log=<contents of this file>` (dev tool, not deployed).
// Reports controls without names, tap targets under 44 px, elements past the right edge, the heading
// outline, tab order, and every text colour pair under 4.5:1 (3:1 for large text).
(() => {
  const out = { noName: [], small: [], overflow: [], lowContrast: [], headings: [], tab: [] };
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  const name = (e) => (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') || '').split(' ').map((id) => document.getElementById(id)?.textContent || '').join(' ') || (e.labels && [...e.labels].map((l) => l.textContent).join(' ')) || e.textContent || e.getAttribute('title') || '').trim().replace(/\s+/g, ' ');
  const sel = 'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"]), summary';
  for (const e of document.querySelectorAll(sel)) {
    if (e.closest('[hidden]') || (!vis(e) && !e.matches('input[type=radio], input[type=checkbox]'))) continue;
    if (!name(e)) out.noName.push(e.outerHTML.slice(0, 80));
    const t = e.matches('input[type=radio], input[type=checkbox]') ? e.closest('label').getBoundingClientRect() : e.getBoundingClientRect();
    if ((t.width < 44 || t.height < 44) && !e.matches('.skip') && !e.closest('.tag__note')) out.small.push(`${e.tagName} ${Math.round(t.width)}x${Math.round(t.height)} "${name(e).slice(0, 20)}"`);
    out.tab.push(name(e).slice(0, 10));
  }
  const W = document.documentElement.clientWidth;
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (r.right > W + 1 && vis(e) && !e.closest('[data-gallery-back]') && !e.closest('.nav__more ul')) out.overflow.push(`${e.tagName}.${e.className.baseVal ?? e.className} right=${Math.round(r.right)}`);
  }
  out.overflow = out.overflow.slice(0, 8);
  out.scrollW = document.documentElement.scrollWidth + '/' + W;
  out.headings = [...document.querySelectorAll('h1,h2,h3')].filter((h) => !h.closest('[hidden]')).map((h) => h.tagName[1] + ' ' + h.textContent.trim().slice(0, 14));
  out.tab = out.tab.join(' > ');
  // contrast
  const rgb = (s) => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 1]; };
  const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if ((c[3] ?? 1) > 0.5) return c; } return [227, 230, 232]; };
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const e = n.parentElement;
    if (!n.textContent.trim() || !e || e.closest('svg') || e.closest('[hidden]') || !vis(e) || e.closest('.defs')) continue;
    const cs = getComputedStyle(e);
    let fg = rgb(cs.color);
    const bg = bgOf(e);
    const op = Number(cs.opacity);
    const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const r = ratio(fg, bg) * (op < 1 ? op : 1);
    const need = large ? 3 : 4.5;
    const key = cs.color + '|' + bg.join(',') + '|' + Math.round(size);
    if (r < need && !seen.has(key) && !e.closest('button:disabled') && !e.closest('[aria-disabled=true]')) { seen.add(key); out.lowContrast.push(`${r.toFixed(2)} ${cs.color} on rgb(${bg.slice(0, 3)}) ${size}px "${n.textContent.trim().slice(0, 16)}"`); }
    if (size < 13 && !seen.has('s' + size)) { seen.add('s' + size); out.small.push(`text ${size}px "${n.textContent.trim().slice(0, 16)}"`); }
  }
  out.imgs = [...document.querySelectorAll('svg[role=img]')].map((s) => !!(s.getAttribute('aria-label') || document.getElementById(s.getAttribute('aria-labelledby') || '')?.textContent));
  return out;
})()
