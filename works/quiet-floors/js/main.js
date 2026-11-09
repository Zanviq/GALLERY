import { initSim } from './sim.js';
import { initNote } from './note.js';
import { initPledge } from './pledge.js';
import { compute } from './model.js';

// Two still diagrams: impact noise against airborne noise.
function drawMinis() {
  const wave = (x) => 3.6 * Math.cos((x - 150) / 15) * Math.exp(-Math.abs(x - 150) / 90);
  const slabPath = (bend) => {
    const top = [];
    const bot = [];
    for (let x = 0; x <= 300; x += 6) {
      const d = bend ? wave(x) : 0;
      top.push(`${x} ${(70 + d).toFixed(1)}`);
      bot.push(`${x} ${(86 + d).toFixed(1)}`);
    }
    return `M${top.join(' L')} L${bot.reverse().join(' L')} Z`;
  };
  const rooms = '<rect class="room" x="10" y="0" width="280" height="70"/><rect class="room" x="10" y="86" width="280" height="84"/>';
  const walls = '<rect class="wall-s" x="0" y="-2" width="10" height="174"/><rect class="wall-s" x="290" y="-2" width="10" height="174"/>';
  const person = (x) => `<g class="m-person" stroke-linecap="round"><circle cx="${x}" cy="118" r="7"/><path d="M${x} 126 V150 M${x} 134 L${x - 9} 142 M${x} 134 L${x + 9} 142 M${x} 150 L${x - 7} 168 M${x} 150 L${x + 7} 168"/></g>`;
  const arc = (r, w, o) => `<path class="m-arc" d="M${150 - r} 86 A${r} ${(r * 0.72).toFixed(1)} 0 0 0 ${150 + r} 86" style="stroke-width:${w};opacity:${o}"/>`;
  for (const svg of document.querySelectorAll('[data-mini]')) {
    if (svg.dataset.mini === 'impact') {
      svg.innerHTML = `<defs><clipPath id="mini-low"><rect x="10" y="86" width="280" height="84"/></clipPath></defs>${rooms}
        <g clip-path="url(#mini-low)">${arc(20, 3.4, 1)}${arc(40, 2.8, 0.75)}${arc(62, 2.2, 0.5)}</g>
        ${walls}<path class="slab" d="${slabPath(true)}"/>
        <g class="m-thing"><path d="M136 62 H164"/><rect x="129" y="52" width="7" height="17" rx="1.5"/><rect x="164" y="52" width="7" height="17" rx="1.5"/></g>
        ${person(234)}`;
    } else {
      const rings = [14, 30, 46, 62].map((r, i) => `<circle class="m-ring" cx="120" cy="44" r="${r}" style="opacity:${1 - i * 0.2}"/>`).join('');
      svg.innerHTML = `<defs><clipPath id="mini-up"><rect x="10" y="0" width="280" height="70"/></clipPath></defs>${rooms}
        <g clip-path="url(#mini-up)">${rings}</g>
        <circle class="m-ring" cx="262" cy="100" r="10" style="opacity:.55"/>
        ${walls}<path class="slab" d="${slabPath(false)}"/>
        <path class="m-pipe" d="M256 0 V170 M268 0 V170"/>
        <g class="m-thing"><rect x="104" y="30" width="32" height="24" rx="2"/><path d="M120 54 V62 M110 69 H130"/></g>
        ${person(70)}`;
    }
  }
}

// Each sound row says how loud it is around 401호, from the same numbers as the drawing.
function soundLevels() {
  for (const li of document.querySelectorAll('.sound[data-activity]')) {
    const info = compute({ source: { f: 4, c: 0 }, activity: li.dataset.activity, fixes: new Set() });
    const at = (no) => info.list.find((u) => u.no === no).L;
    const p = document.createElement('p');
    p.className = 'sound__lv';
    p.textContent = `401호에서 내면 바로 아래 ${at('301')} dB, 옆집 ${at('402')} dB, 바로 위 ${at('501')} dB (예시)`;
    li.querySelector('.sound__body').appendChild(p);
  }
}

function start() {
  drawMinis();
  soundLevels();
  const sim = initSim();
  for (const b of document.querySelectorAll('[data-play]')) {
    b.addEventListener('click', () => sim.trigger({ activity: b.dataset.play }));
  }
  for (const b of document.querySelectorAll('[data-try]')) {
    b.addEventListener('click', () => sim.trigger({ activity: b.dataset.with, fix: b.dataset.try }));
  }
  initNote();
  initPledge();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
