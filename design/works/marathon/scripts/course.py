"""Draw the 곧은내 하프 course map and elevation profile as inline SVG (build tool, not deployed).

    python -I design/works/marathon/scripts/course.py [--print]

Geometry is in metres (x east, y north) around an invented river, 곧은내. The half route is
시민광장 -> 시청로 north -> 남둑길 east -> 새벽다리 north -> 북둑길 west -> 시청다리 south ->
시민광장, solved so it measures 21,097.5 m. 10 km and the 5 km walk turn at earlier bridges.
Writes four SVGs into works/marathon/index.html between <!-- build:NAME --> markers:
course-h (wide screens), course-v (phones, rotated so the course runs down the page),
profile-h and profile-v. Prints the numbers the copy uses (water station km, elevation).
"""
import math
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[4]
PAGE = ROOT / 'works' / 'marathon' / 'index.html'

# ---------------------------------------------------------------- world
A, P, PHASE = 430.0, 8800.0, 0.35     # river meander
LEVEE = 190.0                          # levee road offset from the river centre line
BANK = 120.0                           # half river width
L0 = 420.0                             # 시청로: plaza to the south levee road
BRIDGE = 2 * LEVEE                     # a crossing, levee road to levee road
X_MIN, X_MAX = -1500.0, 11000.0


def yc(x):
    return A * math.sin(2 * math.pi * x / P + PHASE) - 0.012 * x


def ys(x):
    return yc(x) - LEVEE


def yn(x):
    return yc(x) + LEVEE


def arc(f, x0, x1, n=4000):
    s, px, py = 0.0, x0, f(x0)
    for i in range(1, n + 1):
        x = x0 + (x1 - x0) * i / n
        y = f(x)
        s += math.hypot(x - px, y - py)
        px, py = x, y
    return s


def x_at_arc(f, x0, length):
    """x where the arc length from x0 along road f reaches length (eastwards)."""
    lo, hi = x0, x0 + length
    for _ in range(60):
        mid = (lo + hi) / 2
        if arc(f, x0, mid, 600) < length:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def turn_x(total):
    """Bridge x such that plaza->south road->bridge->north road->plaza == total."""
    lo, hi = 100.0, X_MAX - 200
    for _ in range(60):
        mid = (lo + hi) / 2
        t = 2 * L0 + 2 * BRIDGE + arc(ys, 0, mid, 800) + arc(yn, 0, mid, 800)
        if t < total:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


PLAZA = (0.0, ys(0) - L0)
XH, X10, X5 = turn_x(21097.5), turn_x(10000), turn_x(5000)
X_MULLE = 7050.0
BRIDGES = [  # (name, x, used by)
    ('시청다리', 0.0, 'all'),
    ('둑머리다리', X5, '5'),
    ('갈대숲다리', X10, '10'),
    ('물레다리', X_MULLE, None),
    ('새벽다리', XH, 'half'),
]


def route(xt, step=25.0):
    """Polyline of a route that turns at bridge x = xt, as list of (x, y)."""
    pts = [PLAZA, (0.0, ys(0))]
    n = max(2, int(xt / step))
    pts += [(xt * i / n, ys(xt * i / n)) for i in range(1, n + 1)]
    pts += [(xt * (n - i) / n, yn(xt * (n - i) / n)) for i in range(0, n + 1)]
    pts.append(PLAZA)
    return pts


def cumulative(pts):
    d = [0.0]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        d.append(d[-1] + math.hypot(x1 - x0, y1 - y0))
    return d


def point_at(pts, cum, dist):
    for i in range(1, len(pts)):
        if cum[i] >= dist:
            t = (dist - cum[i - 1]) / (cum[i] - cum[i - 1])
            (x0, y0), (x1, y1) = pts[i - 1], pts[i]
            return x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, i
    return pts[-1][0], pts[-1][1], len(pts) - 1


HALF = route(XH)
HALF_CUM = cumulative(HALF)
TOTAL = HALF_CUM[-1]
D_SOUTH_END = L0 + arc(ys, 0, XH)          # distance at the foot of 새벽다리
D_NORTH_START = D_SOUTH_END + BRIDGE


def half_dist_south(x):
    return L0 + arc(ys, 0, x, 800)


def half_dist_north(x):
    return D_NORTH_START + arc(yn, x, XH, 800)


def cat_dist(xt, side, x):
    """Distance at road point x for a route turning at xt (None if not on that route)."""
    if x > xt + 1:
        return None
    if side == 's':
        return L0 + arc(ys, 0, x, 800)
    return L0 + arc(ys, 0, xt, 800) + BRIDGE + arc(yn, x, xt, 800)


# water stations at chosen half-marathon distances
WATER_D = [4.0, 8.2, 12.6, 16.6, 19.3]


def locate(d):
    if d * 1000 <= D_SOUTH_END:
        x = x_at_arc(ys, 0, d * 1000 - L0)
        return 's', x
    if d * 1000 >= D_NORTH_START:
        back = d * 1000 - D_NORTH_START          # metres west of 새벽다리 along 북둑길
        lo, hi = 0.0, XH
        for _ in range(60):
            mid = (lo + hi) / 2
            if arc(yn, mid, XH, 600) > back:
                lo = mid
            else:
                hi = mid
        return 'n', (lo + hi) / 2
    raise ValueError(d)


WATER = []
for i, d in enumerate(WATER_D, 1):
    side, x = locate(d)
    WATER.append({
        'n': i, 'side': side, 'x': x, 'y': ys(x) if side == 's' else yn(x),
        'half': d,
        '10': cat_dist(X10, side, x),
        '5': cat_dist(X5, side, x),
    })


# ---------------------------------------------------------------- elevation
def elevation(dist):
    """Elevation (m) at a distance along the half route."""
    def ramp(d, a, b, h):            # smooth bump of height h between a and b
        if d <= a or d >= b:
            return 0.0
        t = (d - a) / (b - a)
        e = min(t / 0.34, 1.0, (1 - t) / 0.34)
        return h * (0.5 - 0.5 * math.cos(math.pi * e))

    if dist <= L0:                                   # 시청로 down to the levee
        return 22.0 - 7.0 * dist / L0
    if dist >= TOTAL - L0:                           # 시청로 back up to the plaza
        return 15.0 + 7.0 * (dist - (TOTAL - L0)) / L0
    if D_SOUTH_END <= dist <= D_NORTH_START:         # 새벽다리
        return 18.0 + ramp(dist, D_SOUTH_END, D_NORTH_START, 9.0)
    if dist > TOTAL - L0 - BRIDGE:                   # 시청다리
        a = TOTAL - L0 - BRIDGE
        return 15.0 + ramp(dist, a, TOTAL - L0, 11.0)
    if dist < D_SOUTH_END:                           # 남둑길 rising gently upstream
        base = 15.0 + 3.0 * (dist - L0) / (D_SOUTH_END - L0)
        x_here = locate(dist / 1000)[1]
    else:                                            # 북둑길 falling back
        base = 18.0 - 3.0 * (dist - D_NORTH_START) / (TOTAL - L0 - BRIDGE - D_NORTH_START)
        x_here = locate(dist / 1000)[1]
    dip = 0.0
    for _, bx, used in BRIDGES[1:4]:                 # underpasses below the other bridges
        dx = abs(x_here - bx)
        if dx < 240:
            dip -= 2.6 * (0.5 + 0.5 * math.cos(math.pi * dx / 240))
    return base + dip + 0.35 * math.sin(dist / 610.0)


PROFILE = [(d / 1000, elevation(d)) for d in [i * 20.0 for i in range(int(TOTAL // 20) + 1)] + [TOTAL]]
ELEV_MAX = max(e for _, e in PROFILE)
ELEV_MIN = min(e for _, e in PROFILE)
GAIN = sum(max(0.0, b - a) for (_, a), (_, b) in zip(PROFILE, PROFILE[1:]))


# ---------------------------------------------------------------- svg helpers
def f(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


class Proj:
    """World metres -> screen units for one orientation."""

    def __init__(self, vertical, s, pad, ymin, ymax):
        self.v, self.s, self.pad, self.ymin, self.ymax = vertical, s, pad, ymin, ymax

    def __call__(self, x, y):
        if self.v:   # east runs down the page, north points right
            return self.pad[0] + (y - self.ymin) * self.s, self.pad[1] + (x - X_MIN) * self.s
        return self.pad[0] + (x - X_MIN) * self.s, self.pad[1] + (self.ymax - y) * self.s

    def size(self):
        w = (X_MAX - X_MIN) * self.s
        h = (self.ymax - self.ymin) * self.s
        return (h, w) if self.v else (w, h)

    def vec(self, dx, dy):
        """A world-direction offset (east, north) in screen units, unscaled."""
        return (dy, dx) if self.v else (dx, -dy)


def path(proj, pts):
    out = []
    for i, (x, y) in enumerate(pts):
        X, Y = proj(x, y)
        out.append(('M' if i == 0 else 'L') + f(X) + ' ' + f(Y))
    return ''.join(out)


def label(proj, x, y, text, off=(0, 0), cls='m-lbl', line=0):
    """Text at world point offset by screen-ish world direction off=(east, north) in px."""
    X, Y = proj(x, y)
    ox, oy = proj.vec(*off)
    X, Y = X + ox, Y + oy
    if abs(ox) > abs(oy) * 1.2:
        anchor = 'start' if ox > 0 else 'end'
        dy = 0.36
    else:
        anchor = 'middle'
        dy = 0.9 if oy > 0 else -0.25
    dy = round(dy + 1.25 * line, 2)
    return (f'<text class="{cls}" x="{f(X)}" y="{f(Y)}" dy="{dy}em" text-anchor="{anchor}">{text}</text>')


def course_svg(vertical):
    ymin, ymax = -1500.0, 1150.0
    if vertical:
        proj = Proj(True, 0.118, (34, 30), ymin, ymax)
    else:
        proj = Proj(False, 0.128, (20, 26), ymin, ymax)
    w, h = proj.size()
    W, H = w + proj.pad[0] * 2, h + proj.pad[1] * 2
    o = []
    title = '곧은내 하프마라톤 코스 지도'
    o.append(f'<svg class="map map--{"v" if vertical else "h"}" viewBox="0 0 {f(W)} {f(H)}" '
             f'role="img" aria-labelledby="map-t-{"v" if vertical else "h"}" focusable="false">')
    o.append(f'<title id="map-t-{"v" if vertical else "h"}">{title}</title>')
    # river: polygon between the banks
    xs = [X_MIN + i * 50 for i in range(int((X_MAX - X_MIN) / 50) + 1)]
    bank_s = [(x, yc(x) - BANK) for x in xs]
    bank_n = [(x, yc(x) + BANK) for x in reversed(xs)]
    o.append(f'<path class="m-river" d="{path(proj, bank_s + bank_n)}Z"/>')
    # levee roads (full length) and city streets
    o.append(f'<path class="m-road m-road--main" d="{path(proj, [(x, ys(x)) for x in xs])}"/>')
    o.append(f'<path class="m-road m-road--main" d="{path(proj, [(x, yn(x)) for x in xs])}"/>')
    streets = []
    for gx in (-1200, -800, -400, 400, 800, 1200):          # south grid around 시청
        streets.append([(gx, ys(gx) - 40), (gx, ymin + 120)])
    for gy in (-760, -1000, -1240):
        streets.append([(-1450, gy), (1500, gy)])
    streets.append([(0.0, ys(0) - L0), (0.0, ymin + 120)])  # 시청로 south of the plaza
    for gx in (-900, 600, 2600, 4800, 8600, 10300):          # north side streets
        streets.append([(gx, yn(gx) + 40), (gx, ymax - 60)])
    streets.append([(-1450, 900), (2500, 980)])
    streets.append([(1600, ys(1600) - 40), (2400, -1350)])
    streets.append([(5600, ys(5600) - 40), (5900, ymin + 120)])
    streets.append([(9200, ys(9200) - 40), (9050, ymin + 120)])
    for s in streets:
        o.append(f'<path class="m-road" d="{path(proj, s)}"/>')
    # bridges
    for name, bx, used in BRIDGES:
        o.append(f'<path class="m-bridge" d="{path(proj, [(bx, ys(bx)), (bx, yn(bx))])}"/>')
    # plaza
    px, py = PLAZA
    sq = [(px - 260, py + 60), (px + 260, py + 60), (px + 260, py - 230), (px - 260, py - 230)]
    o.append(f'<path class="m-plaza" d="{path(proj, sq)}Z"/>')
    # routes: 5 km and 10 km crossings, then the half on top
    for xt, cls in ((X5, 'm-cross m-cross--5'), (X10, 'm-cross m-cross--10')):
        o.append(f'<path class="{cls}" d="{path(proj, [(xt, ys(xt)), (xt, yn(xt))])}"/>')
    o.append(f'<path class="m-route" d="{path(proj, HALF)}"/>')
    # direction chevrons on the half route
    for dist in (1500, 6200, 13800, 17500):
        x, y, i = point_at(HALF, HALF_CUM, dist)
        x2, y2, _ = point_at(HALF, HALF_CUM, dist + 60)
        X, Y = proj(x, y)
        X2, Y2 = proj(x2, y2)
        ang = math.degrees(math.atan2(Y2 - Y, X2 - X))
        o.append(f'<path class="m-dir" d="M-5 -5L1 0L-5 5" transform="translate({f(X)} {f(Y)}) rotate({f(ang)})"/>')
    # km markers
    marks = []
    for k in range(1, 21):          # 21 sits on the finish tape
        x, y, i = point_at(HALF, HALF_CUM, k * 1000)
        X, Y = proj(x, y)
        marks.append(f'<g class="m-km"><circle cx="{f(X)}" cy="{f(Y)}" r="11"/>'
                     f'<text x="{f(X)}" y="{f(Y)}" dy=".36em" text-anchor="middle">{k}</text></g>')
    # water stations
    water = []
    for wtr in WATER:
        X, Y = proj(wtr['x'], wtr['y'])
        outward = -1 if wtr['side'] == 's' else 1
        ox, oy = proj.vec(0, outward * 26)
        wx, wy = X + ox, Y + oy
        water.append(f'<path class="m-tick" d="M{f(X)} {f(Y)}L{f(wx)} {f(wy)}"/>')
        water.append(f'<rect class="m-water" x="{f(wx - 6)}" y="{f(wy - 6)}" width="12" height="12"/>')
        lx, ly = proj.vec(0, outward * 14)
        anchor_off = (0, outward * 40)
        water.append(label(proj, wtr['x'], wtr['y'], f'급수 {wtr["n"]}', anchor_off, 'm-lbl m-lbl--w'))
    # labels: streets, bridges, river, places
    t = []
    t.append(label(proj, 2900, ys(2900), '남둑길', (0, -44), 'm-lbl m-lbl--road'))
    t.append(label(proj, 6000, yn(6000), '북둑길', (0, 46), 'm-lbl m-lbl--road'))
    t.append(label(proj, -400, ys(-400) - 300, '시청로', (0, 0), 'm-lbl m-lbl--road') if False else '')
    t.append(label(proj, -850, yc(-850), '곧은내', (0, 0), 'm-lbl m-lbl--river'))
    t.append(label(proj, 10480, yc(10480), '곧은내', (0, 0), 'm-lbl m-lbl--river'))
    t.append(label(proj, 0.0, yn(0.0), '시청다리', (-24, 26), 'm-lbl m-lbl--bridge'))
    t.append(label(proj, X_MULLE, ys(X_MULLE), '물레다리', (0, -32), 'm-lbl m-lbl--bridge'))
    # turn notes
    t.append(label(proj, X5, ys(X5), '5km 걷기 반환', (0, -48), 'm-lbl m-lbl--turn'))
    t.append(label(proj, X5, ys(X5), '둑머리다리', (0, -48), 'm-lbl m-lbl--bridge', line=1))
    t.append(label(proj, X10, ys(X10), '10km 반환', (0, -48), 'm-lbl m-lbl--turn'))
    t.append(label(proj, X10, ys(X10), '갈대숲다리', (0, -48), 'm-lbl m-lbl--bridge', line=1))
    if vertical:   # below the bridge, where the river runs on with no route beside it
        t.append(label(proj, XH, yc(XH), '하프 반환', (40, 0), 'm-lbl m-lbl--turn'))
        t.append(label(proj, XH, yc(XH), '새벽다리', (40, 0), 'm-lbl m-lbl--bridge', line=1))
    else:
        t.append(label(proj, XH, yn(XH), '하프 반환', (0, 74), 'm-lbl m-lbl--turn'))
        t.append(label(proj, XH, yn(XH), '새벽다리', (0, 74), 'm-lbl m-lbl--bridge', line=1))
    # start / finish: a red tape across 시청로 at the plaza
    X, Y = proj(*PLAZA)
    tx, ty = proj.vec(1, 0)
    tape = f'<path class="m-tape" d="M{f(X - tx * 22)} {f(Y - ty * 22)}L{f(X + tx * 22)} {f(Y + ty * 22)}"/>'
    t.append(label(proj, PLAZA[0], PLAZA[1], '출발·도착', (-30, 0) if not vertical else (-28, 0), 'm-lbl m-lbl--start'))
    t.append(label(proj, PLAZA[0], PLAZA[1] - 230, '시민광장', (0, -16), 'm-lbl'))
    t.append(label(proj, -1150, -1120, '곧은내시청', (0, 0), 'm-lbl m-lbl--place') if False else '')
    # north arrow and scale bar (bottom right corner of the drawing)
    if vertical:
        nx, ny = 44, H - 190
    else:
        nx, ny = W - 150, H - 46
    ax, ay = proj.vec(0, 1)
    o_n = (f'<g class="m-north" transform="translate({f(nx)} {f(ny)})">'
           f'<path d="M{f(-ax * 16)} {f(-ay * 16)}L{f(ax * 16)} {f(ay * 16)}"/>'
           f'<path d="M{f(ax * 16)} {f(ay * 16)}l{f(-ay * 6 - ax * 8)} {f(ax * 6 - ay * 8)}M{f(ax * 16)} {f(ay * 16)}l{f(ay * 6 - ax * 8)} {f(-ax * 6 - ay * 8)}"/>'
           f'<text x="{f(ax * 30)}" y="{f(ay * 30)}" dy=".36em" text-anchor="middle">북</text></g>')
    km = 1000 * proj.s
    if vertical:
        sx, sy = 40, H - 30
        scale = (f'<g class="m-scale"><path d="M{f(sx)} {f(sy - km)}V{f(sy)}"/>'
                 f'<path d="M{f(sx - 5)} {f(sy - km)}H{f(sx + 5)}M{f(sx - 5)} {f(sy)}H{f(sx + 5)}"/>'
                 f'<text x="{f(sx + 12)}" y="{f(sy - km / 2)}" dy=".36em" text-anchor="start">1km</text></g>')
    else:
        sx, sy = W - 40 - km, H - 26
        scale = (f'<g class="m-scale"><path d="M{f(sx)} {f(sy)}H{f(sx + km)}"/>'
                 f'<path d="M{f(sx)} {f(sy - 5)}V{f(sy + 5)}M{f(sx + km)} {f(sy - 5)}V{f(sy + 5)}"/>'
                 f'<text x="{f(sx + km / 2)}" y="{f(sy - 10)}" text-anchor="middle">1km</text></g>')
    o += water
    o.append(tape)
    o += marks
    o += [x for x in t if x]
    o.append(o_n)
    o.append(scale)
    o.append('</svg>')
    return '\n'.join(o)


def profile_svg(vertical):
    """Plain elevation chart, 0-21.1 km by 0-40 m."""
    if vertical:   # phones: still a horizontal chart, just narrower and taller
        W, H, pl, pr, pt, pb = 360, 230, 34, 10, 22, 34
    else:
        W, H, pl, pr, pt, pb = 800, 250, 40, 12, 26, 40
    cw, ch = W - pl - pr, H - pt - pb
    ymax = 40.0

    def P(d, e):
        return pl + d / 21.0975 * cw, pt + ch - e / ymax * ch

    o = [f'<svg class="prof prof--{"v" if vertical else "h"}" viewBox="0 0 {W} {H}" role="img" '
         f'aria-labelledby="prof-t-{"v" if vertical else "h"}" focusable="false">',
         f'<title id="prof-t-{"v" if vertical else "h"}">코스 고도: 가장 낮은 곳 {ELEV_MIN:.0f}m, '
         f'가장 높은 곳 {ELEV_MAX:.0f}m (새벽다리)</title>']
    for e in (0, 10, 20, 30, 40):
        x0, y = P(0, e)
        x1, _ = P(21.0975, e)
        o.append(f'<path class="p-grid" d="M{f(x0)} {f(y)}H{f(x1)}"/>')
        o.append(f'<text class="p-ax" x="{f(x0 - 8)}" y="{f(y)}" dy=".36em" text-anchor="end">{e}</text>')
    steps = (0, 5, 10, 15, 20) if not vertical else (0, 5, 10, 15, 20)
    for k in steps:
        x, y0 = P(k, 0)
        o.append(f'<path class="p-tick" d="M{f(x)} {f(y0)}v6"/>')
        anchor = 'start' if k == 0 else 'middle'
        o.append(f'<text class="p-ax" x="{f(x)}" y="{f(y0 + 20)}" text-anchor="{anchor}">{k}km</text>')
    x, y0 = P(21.0975, 0)
    o.append(f'<path class="p-tick" d="M{f(x)} {f(y0)}v6"/>')
    area = [P(0, 0)] + [P(d, e) for d, e in PROFILE] + [P(21.0975, 0)]
    o.append('<path class="p-area" d="' + ''.join(('M' if i == 0 else 'L') + f(X) + ' ' + f(Y) for i, (X, Y) in enumerate(area)) + 'Z"/>')
    line = [P(d, e) for d, e in PROFILE]
    o.append('<path class="p-line" d="' + ''.join(('M' if i == 0 else 'L') + f(X) + ' ' + f(Y) for i, (X, Y) in enumerate(line)) + '"/>')
    # water ticks along the base line
    for w in WATER:
        X, Y = P(w['half'], 0)
        o.append(f'<rect class="p-water" x="{f(X - 4)}" y="{f(Y - 12)}" width="8" height="8"/>')
    # high points
    peak_d = max(PROFILE, key=lambda p: p[1])[0]
    X, Y = P(peak_d, ELEV_MAX)
    o.append(f'<text class="p-note" x="{f(X)}" y="{f(Y - 8)}" text-anchor="middle">새벽다리 {ELEV_MAX:.0f}m</text>')
    o.append('</svg>')
    return '\n'.join(o)


def inject(html, name, svg):
    pat = re.compile(r'(<!-- build:' + name + r' -->)(.*?)(<!-- /build:' + name + r' -->)', re.S)
    if not pat.search(html):
        sys.exit(f'marker build:{name} missing in index.html')
    return pat.sub(lambda m: m.group(1) + '\n' + svg + '\n' + m.group(3), html)


def main():
    print(f'half total {TOTAL:.1f} m  turn x: half {XH:.0f}  10k {X10:.0f}  5k {X5:.0f}')
    print(f'10k check {2 * L0 + 2 * BRIDGE + arc(ys, 0, X10) + arc(yn, 0, X10):.1f}  '
          f'5k check {2 * L0 + 2 * BRIDGE + arc(ys, 0, X5) + arc(yn, 0, X5):.1f}')
    print(f'elevation min {ELEV_MIN:.1f} max {ELEV_MAX:.1f} gain {GAIN:.1f}')
    for w in WATER:
        print('water', w['n'], w['side'], 'half', w['half'],
              '10k', None if w['10'] is None else round(w['10'] / 1000, 1),
              '5k', None if w['5'] is None else round(w['5'] / 1000, 1))
    if '--print' in sys.argv:
        return
    html = PAGE.read_text(encoding='utf-8')
    html = inject(html, 'course-h', course_svg(False))
    html = inject(html, 'course-v', course_svg(True))
    html = inject(html, 'profile-h', profile_svg(False))
    html = inject(html, 'profile-v', profile_svg(True))
    PAGE.write_text(html, encoding='utf-8')
    print('wrote', PAGE)


if __name__ == '__main__':
    main()
