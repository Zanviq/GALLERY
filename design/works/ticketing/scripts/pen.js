(() => { const g = __gk.game; g.start(__gk.CONCERTS[1]); g.phase = 'pay'; g.payEnd = g.t + 20; g.penalty(3, 'x'); const p = document.querySelector('#p-pen');
  return [p.className, p.getAnimations().map(a => [a.animationName, a.playState, a.currentTime]), getComputedStyle(p).opacity, matchMedia('(prefers-reduced-motion: reduce)').matches, document.visibilityState]; })()
