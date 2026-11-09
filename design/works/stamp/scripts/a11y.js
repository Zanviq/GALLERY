(() => {
  const out = [];
  const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]') && !e.closest('[inert]'); };
  const f = [...document.querySelectorAll('button, a[href], [tabindex]')].filter(vis);
  for (const e of f) {
    const r = e.getBoundingClientRect();
    const name = (e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim();
    out.push(`${e.id || e.tagName} ${Math.round(r.width)}x${Math.round(r.height)} "${name}"${r.width < 44 || r.height < 44 ? ' SMALL' : ''}`);
  }
  return out;
})()
