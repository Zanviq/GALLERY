(() => { const g = __gk.game, v = g.venue;
  const blk = v.blocks.findIndex((b) => b.id === 'A2'); g.selectBlock(blk, false);
  const b = v.blocks[blk];
  let mine = -1, lost = -1;
  for (let k = 0; k < b.count - 1; k++) { const i = b.start + k; if (v.state[i] === 0 && v.state[i + 1] === 0 && v.colOf[i] < b.cols - 1) { mine = i; lost = i + 1; break; } }
  if (mine >= 0) { v.setState(mine, 2); g.r.picks.push(mine); v.setState(lost, 1, g.t); g.lostFx.set(lost, g.t + 30); g.r.lost++; g.renderPicked(); }
  g.seatEnd = g.t + 11.6; g.el.classList.add('is-urgent');
  g.toast('이미 선택된 좌석입니다', '0.04초 늦었습니다. 다른 좌석을 고르세요.', 30);
  return [mine, lost, v.free]; })()
