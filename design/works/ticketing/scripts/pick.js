(() => { const g = __gk.game, v = g.venue, b = v.blocks[g.sel]; const mine = g.r.picks[0];
  let best = -1;
  for (let k = 0; k < b.count; k++) { const i = b.start + k; if (v.state[i] !== 0) continue;
    if (mine !== undefined && v.adjacent(mine, i)) { best = i; break; } if (best < 0) best = i; }
  if (best >= 0) document.querySelector('[data-i="' + best + '"]').click(); return best; })()
