// Keyboard, target-size and text-contrast audit for works/quiet-floors over CDP (dev tool, not deployed).
//   CDP_PORT=9351 node a11y.mjs <url> [width]
// Needs a headless Chrome started with --remote-debugging-port. Tabs through the page and prints each
// stop with its name and whether a focus ring is drawn; lists targets under 44x44 and text under
// 4.5:1 (3:1 for large text) against the nearest opaque background.
const [, , url, width = '1440'] = process.argv;
const PORT = process.env.CDP_PORT || '9351';
const W = Number(width);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 1;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m); pending.delete(m.id); }
};
const send = (method, params = {}, sessionId) => new Promise((res) => { const i = id++; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { browserContextId } = await send('Target.createBrowserContext', { disposeOnDetach: true });
const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
const cmd = (m, p) => send(m, p, S);
await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: W < 768 });
await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await cmd('Page.navigate', { url });
await sleep(3500);
const ev = async (expression) => (await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
const key = async (k, code, vk) => {
  await cmd('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk });
  await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
};

const stops = [];
for (let i = 0; i < 80; i++) {
  await key('Tab', 'Tab', 9);
  const info = await ev(`(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const vis = el.matches('input') && el.closest('.chip, .seg, .promise') ? el.nextElementSibling || el.parentElement : el;
    const ring = (e) => { const c = getComputedStyle(e); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0; };
    const host = el.closest('.promise');
    const b = (host || vis).getBoundingClientRect();
    const name = (el.getAttribute('aria-label') || (el.labels && el.labels[0] && el.labels[0].textContent) || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
    return { tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.type ? '[' + el.type + ']' : ''), name, ring: ring(el) || ring(vis) || (host ? ring(host) : false), w: Math.round(b.width), h: Math.round(b.height) };
  })()`);
  if (!info) break;
  if (stops.length && stops[0].tag === info.tag && stops[0].name === info.name) break;
  stops.push(info);
}
for (const s of stops) console.log(`${s.ring ? 'ring' : 'NO-RING'}  ${s.w}x${s.h}  ${s.tag}  ${s.name}`);

const report = await ev(`(() => {
  const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = getComputedStyle(e);
      if (c.backgroundImage && c.backgroundImage.includes('data:image/svg')) return [214, 214, 210];
      const v = rgb(c.backgroundColor);
      if (v.length >= 3 && (v[3] === undefined || v[3] > 0.5)) return v;
    }
    return [255, 255, 255];
  };
  const bad = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') || el.closest('.sr-only')) continue;
    const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!t) continue;
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    const c = getComputedStyle(el);
    const fg = rgb(c.color);
    const bg = bgOf(el);
    const L1 = lum(...fg.slice(0, 3)), L2 = lum(...bg.slice(0, 3));
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(c.fontSize), bold = Number(c.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const key = c.color + bg.join(',') + need;
    if (ratio < need && !seen.has(key)) { seen.add(key); bad.push(t.slice(0, 24) + ' ' + ratio.toFixed(2) + ' < ' + need); }
  }
  const small = [...document.querySelectorAll('a, button, select, input, summary')].filter((el) => {
    if (el.tagName === 'A' && el.closest('p')) return false;
    const host = el.matches('input') ? (el.closest('.chip, .seg, .promise, .check') || el) : el;
    const b = host.getBoundingClientRect();
    return b.width && (b.width < 44 || b.height < 44) && getComputedStyle(host).visibility !== 'hidden';
  }).map((el) => el.tagName + '.' + el.className + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));
  const unlabelled = [...document.querySelectorAll('input, select, textarea')].filter((el) => !(el.labels && el.labels.length) && !el.getAttribute('aria-label')).map((el) => el.name || el.id);
  const svgs = [...document.querySelectorAll('svg')].filter((s) => !s.closest('[aria-hidden="true"]') && s.getAttribute('role') !== 'img' && !s.closest('button')).length;
  return { contrast: bad, small, unlabelled, svgsWithoutRole: svgs, h: [...document.querySelectorAll('h1,h2,h3')].map((h) => h.tagName + ' ' + h.textContent.replace(/\\s+/g, ' ').trim().slice(0, 18)) };
})()`);
console.log(JSON.stringify(report, null, 1));
await send('Target.disposeBrowserContext', { browserContextId });
ws.close();
process.exit(0);
