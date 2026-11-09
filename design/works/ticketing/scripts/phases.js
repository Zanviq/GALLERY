(async () => { const g = __gk.game, out = {}; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const W = document.documentElement.clientWidth;
  const check = (name) => { const bad = []; g.el.querySelectorAll('*').forEach((e) => { const r = e.getBoundingClientRect(); if (!r.width || getComputedStyle(e).position === 'fixed' && e.id === 'toast') return; if (r.right > W + 1 || r.left < -1) bad.push((e.id || e.className) + ':' + Math.round(r.left) + '-' + Math.round(r.right)); }); out[name] = [g.el.scrollWidth, W, bad.slice(0, 5)]; };
  g.start(__gk.CONCERTS[NUM]); await sleep(300); check('open');
  g.r.rt = 0.25; g.enterQueue(); await sleep(300); check('queue');
  g.enterSeats(); await sleep(400); check('seats');
  const v = g.venue, b = v.blocks[g.sel]; for (let k = 0; k < b.count && g.r.picks.length < 2; k++) { const i = b.start + k; if (v.state[i] === 0) { v.setState(i, 2); g.r.picks.push(i); } } g.renderPicked();
  await sleep(100); check('seats2');
  g.enterPay(); await sleep(300); check('pay');
  g.r.doneAt = g.t; g.r.paid = 1000; g.finish(); await sleep(300); check('result');
  return out; })()
