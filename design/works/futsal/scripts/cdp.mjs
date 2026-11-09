// Dependency-free capture and check runner over the Chrome DevTools Protocol (dev tool, not deployed).
// Needs a headless Chrome started with --remote-debugging-port=9347 (CDP_PORT). Every run gets a fresh
// browser context (empty localStorage).
//   node cdp.mjs <url> <W>x<H>[@dpr] [mobile] [reduced] [nostore] op op ...
// ops: wait=ms | shot=f.png | webp=f.webp | full=f.png | click=sel | focus=sel | key=Key | type=text
//      eval=js | log=js | store=json (sets jamo.v1 and reloads) | reload=ms
//      drag=x1,y1,x2,y2 | dragsel=from>to[@top|@bottom] | tap=x,y | tapsel=sel[@top|@bottom]
//      touchdrag=from>to[@top|@bottom] | resize=WxH
import { writeFileSync } from 'fs';

const [, , url, size, ...rest] = process.argv;
const m = /^(\d+)x(\d+)(?:@([\d.]+))?$/.exec(size);
let [W, H, DPR] = [Number(m[1]), Number(m[2]), Number(m[3] || 1)];
const flags = new Set();
while (rest.length && /^(mobile|reduced|nostore)$/.test(rest[0])) flags.add(rest.shift());
const mobile = flags.has('mobile');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ver = await (await fetch('http://127.0.0.1:' + (process.env.CDP_PORT || 9347) + '/json/version')).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let nextId = 1;
const pending = new Map();
const listeners = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
  } else if (msg.method) for (const l of listeners) l(msg);
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = nextId++;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { browserContextId } = await send('Target.createBrowserContext', { disposeOnDetach: true });
const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
const { sessionId: S } = await send('Target.attachToTarget', { targetId, flatten: true });
const cmd = (m, p) => send(m, p, S);

let loaded = null;
listeners.push((msg) => {
  if (msg.sessionId !== S) return;
  const p = msg.params;
  if (msg.method === 'Page.loadEventFired' && loaded) { loaded(); loaded = null; }
  if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(p.type)) {
    console.log(`[console.${p.type}]`, p.args.map((a) => a.value ?? a.description).join(' '), p.stackTrace?.callFrames?.[0]?.url || '');
  }
  if (msg.method === 'Runtime.exceptionThrown') console.log('[pageerror]', p.exceptionDetails.exception?.description || p.exceptionDetails.text);
  if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(p.entry.level)) console.log(`[log.${p.entry.level}]`, p.entry.text, p.entry.url || '');
  if (msg.method === 'Network.loadingFailed' && !p.canceled) console.log('[requestfailed]', p.errorText);
  if (msg.method === 'Network.responseReceived' && p.response.status >= 400) console.log('[http]', p.response.status, p.response.url);
});
await cmd('Page.enable');
await cmd('Runtime.enable');
await cmd('Log.enable');
await cmd('Network.enable');
await cmd('Network.setCacheDisabled', { cacheDisabled: true });
async function metrics() {
  await cmd('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile });
  await cmd('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
}
await metrics();
if (flags.has('reduced')) await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
if (flags.has('nostore')) {
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const deny = () => { throw new DOMException('denied', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', { get: deny }); Object.defineProperty(window, 'sessionStorage', { get: deny }); })();` });
}
async function go(u) {
  const p = new Promise((r) => { loaded = r; });
  await cmd('Page.navigate', { url: u });
  await Promise.race([p, sleep(15000)]);
  await sleep(700);
}
async function evaluate(expression) {
  const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) return { error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  return r.result.value;
}
async function center(sel, where) {
  return evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null;
    const r = e.getBoundingClientRect(); const w = ${JSON.stringify(where || '')};
    return [r.left + r.width / 2, w === 'top' ? r.top + r.height * 0.3 : w === 'bottom' ? r.top + r.height * 0.8 : r.top + r.height / 2]; })()`);
}
const mouse = (type, x, y, extra = {}) => cmd('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
async function drag(x1, y1, x2, y2) {
  await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1, button: 'none', buttons: 0 });
  await mouse('mousePressed', x1, y1);
  for (let i = 1; i <= 14; i++) await mouse('mouseMoved', x1 + (x2 - x1) * i / 14, y1 + (y2 - y1) * i / 14);
  await mouse('mouseReleased', x2, y2);
}
async function click(x, y) {
  await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
  await mouse('mousePressed', x, y);
  await mouse('mouseReleased', x, y);
}
const touch = (type, pts) => cmd('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y })) });
async function touchDrag(x1, y1, x2, y2) {
  await touch('touchStart', [[x1, y1]]);
  for (let i = 1; i <= 12; i++) await touch('touchMove', [[x1 + (x2 - x1) * i / 12, y1 + (y2 - y1) * i / 12]]);
  await touch('touchEnd', []);
}
const KEYS = {
  Enter: [13, 'Enter', '\r'], Escape: [27, 'Escape'], Tab: [9, 'Tab'], Backspace: [8, 'Backspace'], Delete: [46, 'Delete'],
  ArrowLeft: [37, 'ArrowLeft'], ArrowUp: [38, 'ArrowUp'], ArrowRight: [39, 'ArrowRight'], ArrowDown: [40, 'ArrowDown'],
  ' ': [32, 'Space', ' '], '+': [187, 'Equal', '+'], '=': [187, 'Equal', '='], '-': [189, 'Minus', '-'],
};
async function key(k) {
  let mod = 0, name = k;
  if (k.startsWith('Shift+')) { mod = 8; name = k.slice(6); }
  if (k.startsWith('Control+')) { mod = 2; name = k.slice(8); }
  const [code, codeName, text] = KEYS[name] || [name.toUpperCase().charCodeAt(0), 'Key' + name.toUpperCase(), name];
  await cmd('Input.dispatchKeyEvent', { type: text && !mod ? 'keyDown' : 'rawKeyDown', key: name, code: codeName, windowsVirtualKeyCode: code, text: mod ? undefined : text, modifiers: mod });
  await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code: codeName, windowsVirtualKeyCode: code, modifiers: mod });
}
async function shot(file, format = 'png', full = false) {
  const params = { format };
  if (format !== 'png') params.quality = 82;
  if (full) {
    const h = await evaluate('document.documentElement.scrollHeight');
    params.clip = { x: 0, y: 0, width: W, height: h, scale: 1 };
    params.captureBeyondViewport = true;
  }
  const { data } = await cmd('Page.captureScreenshot', params);
  writeFileSync(file, Buffer.from(data, 'base64'));
}

await go(url);
for (const op of rest) {
  const i = op.indexOf('=');
  const k = op.slice(0, i), v = op.slice(i + 1);
  const target = async (s) => {
    const [sel, rest2] = s.split('@');
    const [where, dy] = (rest2 || '').split('+');
    const p = await center(sel, where);
    return p && dy ? [p[0], p[1] + Number(dy)] : p;
  };
  if (k === 'wait') await sleep(Number(v));
  else if (k === 'shot') await shot(v);
  else if (k === 'webp') await shot(v, 'webp');
  else if (k === 'full') await shot(v, 'png', true);
  else if (k === 'click') { const p = await center(v); if (p) await click(p[0], p[1]); else console.log('[click] missing', v); }
  else if (k === 'focus') await evaluate(`document.querySelector(${JSON.stringify(v)})?.focus()`);
  else if (k === 'key') await key(v);
  else if (k === 'type') await cmd('Input.insertText', { text: v });
  else if (k === 'eval') { const r = await evaluate(v); if (r && r.error) console.log('[eval error]', r.error); }
  else if (k === 'log') console.log('[log]', JSON.stringify(await evaluate(v)));
  else if (k === 'store') { await evaluate(`localStorage.setItem('futsal.board.v1', ${JSON.stringify(v)})`); await go(url); }
  else if (k === 'reload') { await go(url); await sleep(Number(v) || 0); }
  else if (k === 'resize') { const [a, b] = v.split('x').map(Number); W = a; H = b; await metrics(); await sleep(300); }
  else if (k === 'drag') { const [a, b, c, d] = v.split(',').map(Number); await drag(a, b, c, d); }
  else if (k === 'tap') { const [x, y] = v.split(',').map(Number); await touch('touchStart', [[x, y]]); await touch('touchEnd', []); }
  else if (k === 'tapsel') { const p = await target(v); if (p) { await touch('touchStart', [p]); await touch('touchEnd', []); } else console.log('[tap] missing', v); }
  else if (k === 'dragsel' || k === 'touchdrag') {
    const [from, to] = v.split('>');
    const p = await target(from), q = await target(to);
    if (!p || !q) { console.log('[drag] missing', from, to); continue; }
    if (k === 'dragsel') await drag(p[0], p[1], q[0], q[1]); else await touchDrag(p[0], p[1], q[0], q[1]);
  }
}
await send('Target.disposeBrowserContext', { browserContextId });
ws.close();
process.exit(0);
