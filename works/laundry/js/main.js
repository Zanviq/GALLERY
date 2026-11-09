// 뽀득 셀프 빨래방: wires the simulated board, the washer front and the drum together.

import { BRANCHES } from './data.js';
import { Sim } from './sim.js';
import { Board } from './board.js';
import { Drum } from './drum.js';
import { Panel } from './panel.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

// ---------------------------------------------------------------- board
const sim = new Sim();
const board = new Board(sim, { reduced });

let saved = null;
try { saved = localStorage.getItem('ppodeuk.branch'); } catch (e) { /* storage unavailable */ }
board.setBranch(saved && BRANCHES.some((b) => b.id === saved) ? saved : BRANCHES[0].id);

// one-second refresh; the clock itself is timestamp based, so throttling never drifts it
setInterval(() => board.update(), 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) board.update(true); });

const speed = document.getElementById('speed');
speed.addEventListener('click', () => {
  const on = speed.getAttribute('aria-pressed') !== 'true';
  speed.setAttribute('aria-pressed', String(on));
  sim.setSpeed(on ? 30 : 1);
  document.getElementById('speed-sub').textContent = on ? '30배 빠르게, 1시간이 2분이에요' : '지금은 실제 시간대로 가요';
  board.update(true);
});

// ---------------------------------------------------------------- branches list
const blist = document.getElementById('blist');
function renderBranches(current) {
  blist.innerHTML = BRANCHES.map((b) => {
    const n = (k) => b.machines.filter((m) => m.kind === k).length;
    const extra = [n('shoe') && '운동화 세탁기', n('shoedry') && '운동화 건조기', n('pet') && '반려동물 세탁기', n('petdry') && '반려동물 건조기'].filter(Boolean);
    return `<li class="bcard${b.id === current ? ' is-current' : ''}">
      <h3 class="bcard__name">${b.name}</h3>
      <p class="bcard__addr">${b.addr}<small class="fake-note">가상 서비스예요. 실제 주소가 아니에요.</small></p>
      <p class="bcard__way">${b.way}</p>
      <p class="bcard__mc">세탁기 ${n('washer')}대, 건조기 ${n('dryer')}대${extra.length ? `<br>${extra.join(', ')}` : ''}</p>
      <p class="bcard__park">주차: ${b.parking}</p>
      <button type="button" class="key key--small" data-go="${b.id}"><span class="key__label">${b.id === current ? '지금 보고 있는 현황판' : '이 지점 현황 보기'}</span></button>
    </li>`;
  }).join('');
}
board.onBranch = (b) => renderBranches(b.id);
renderBranches(board.branchId);
blist.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-go]');
  if (!btn) return;
  board.setBranch(btn.dataset.go, true);
  const target = document.getElementById('board');
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
});

// ---------------------------------------------------------------- washer front
const canvas = document.getElementById('drum');
const drum = new Drum(canvas, { reduced });
drum.add('towel', 2);
drum.add('sock', 1);
drum.add('shirt', 2);
drum.settle(420);
drum.draw();
new Panel(drum, { reduced });
