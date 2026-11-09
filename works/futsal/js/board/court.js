// Futsal court markings to the Laws of the Game, as SVG markup in metres.
// Field 40 x 20, goals 3 m (posts 8 cm), penalty areas of two 6 m quarter circles joined by a
// 3.16 m line, penalty mark 6 m, second penalty mark 10 m (with marks 5 m either side),
// centre circle r 3, corner arcs r 0.25, 5 m corner-distance marks, substitution zones
// (5 m long, 5 m from the halfway line) on the bench touchline y = 20.
import { L, W, POST_OUT } from './model.js';

const [a, b] = POST_OUT;
const R = 6;

function half(x0, dir) {
  // dir = +1 for the left goal (x = 0), -1 for the right goal (x = 40)
  const x = (d) => x0 + dir * d;
  const sweep = dir > 0 ? 1 : 0;
  const area = `M${x(0)} ${a - R} A${R} ${R} 0 0 ${sweep} ${x(R)} ${a} L${x(R)} ${b} A${R} ${R} 0 0 ${sweep} ${x(0)} ${b + R}`;
  const net = [];
  for (let i = 1; i < 6; i++) net.push(`M${x(0)} ${a + (i * (b - a)) / 6} L${x(-1)} ${a + (i * (b - a)) / 6}`);
  net.push(`M${x(-0.5)} ${a} L${x(-0.5)} ${b}`);
  return `
    <path class="c-line" d="${area}"/>
    <circle class="c-dot" cx="${x(6)}" cy="10" r="0.12"/>
    <circle class="c-dot" cx="${x(10)}" cy="10" r="0.12"/>
    <path class="c-line" d="M${x(10)} 4.8 L${x(10)} 5.2 M${x(10)} 14.8 L${x(10)} 15.2"/>
    <path class="c-line" d="M${x(0)} 5.25 L${x(-0.4)} 5.25 M${x(0)} 14.75 L${x(-0.4)} 14.75"/>
    <g class="c-goal" data-goal="${dir > 0 ? 'own' : 'opp'}">
      <path class="c-net" d="${net.join(' ')}"/>
      <path class="c-line c-frame" d="M${x(0)} ${a} L${x(-1)} ${a} L${x(-1)} ${b} L${x(0)} ${b}"/>
    </g>`;
}

export function courtMarkup() {
  const r = 0.25;
  return `
  <rect class="c-runoff" x="-2" y="-2" width="${L + 4}" height="${W + 4}"/>
  <rect class="c-floor" x="0" y="0" width="${L}" height="${W}"/>
  <g class="c-lines">
    <rect class="c-line" x="0" y="0" width="${L}" height="${W}"/>
    <path class="c-line" d="M20 0 L20 ${W}"/>
    <circle class="c-line" cx="20" cy="10" r="3"/>
    <circle class="c-dot" cx="20" cy="10" r="0.14"/>
    <path class="c-line" d="M${r} 0 A${r} ${r} 0 0 1 0 ${r} M${L - r} 0 A${r} ${r} 0 0 0 ${L} ${r}
      M0 ${W - r} A${r} ${r} 0 0 1 ${r} ${W} M${L} ${W - r} A${r} ${r} 0 0 0 ${L - r} ${W}"/>
    <path class="c-line" d="M10 19.6 L10 20.4 M15 19.6 L15 20.4 M25 19.6 L25 20.4 M30 19.6 L30 20.4"/>
    ${half(0, 1)}
    ${half(L, -1)}
  </g>
  <g class="c-labels" aria-hidden="true">
    <text class="c-label" data-at="12.5,21.35">교체 지역</text>
    <text class="c-label" data-at="27.5,21.35">교체 지역</text>
  </g>`;
}
