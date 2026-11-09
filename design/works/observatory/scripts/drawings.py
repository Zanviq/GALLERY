"""Draw the page's three static figures as inline SVG and put them into index.html.

    <fontenv>/python.exe -I design/works/observatory/scripts/drawings.py

- clouds: the 0-10 cloud cover scale with the cancel bracket
- map:    contour map of the (invented) hill road up to the observatory
- adapt:  the dark-adaptation curve (cones, rods, the break, what white light does)
Each lands between <!-- gen:name --> and <!-- /gen:name --> markers, twice: a wide drawing and a
narrow one for phones (smaller viewBox, so the labels stay readable). Styling is in site.css.
"""
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[4]
HTML = ROOT / 'works' / 'observatory' / 'index.html'


def f(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def smooth_closed(pts):
    """Catmull-Rom through closed points -> cubic Bezier path data."""
    n = len(pts)
    d = [f'M{f(pts[0][0])} {f(pts[0][1])}']
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f'C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}')
    return ''.join(d) + 'Z'


def smooth_open(pts):
    d = [f'M{f(pts[0][0])} {f(pts[0][1])}']
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i else pts[0]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[-1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f'C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}')
    return ''.join(d)


def clouds(narrow=False):
    sp, r, x0, cy = (40, 14, 20, 34) if narrow else (60, 20, 30, 42)
    W = x0 * 2 + sp * 10
    H = 136 if narrow else 132
    sfx = '-n' if narrow else ''
    out = [f'<svg class="draw draw--clouds draw--{"narrow" if narrow else "wide"}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="clouds-svg-t{sfx}">',
           f'<title id="clouds-svg-t{sfx}">운량 0부터 10까지를 원 열한 개로 그린 눈금. 7부터 10까지는 망원경 관측 취소 구간입니다.</title>']
    ny = cy + r + 24
    for i in range(11):
        cx = x0 + i * sp
        out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" class="d-line"/>')
        if i == 10:
            out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" class="d-fill"/>')
        elif i:
            a = 2 * math.pi * i / 10
            x = cx + r * math.sin(a)
            y = cy - r * math.cos(a)
            large = 1 if i > 5 else 0
            out.append(f'<path d="M{cx} {cy}V{cy - r}A{r} {r} 0 {large} 1 {f(x)} {f(y)}Z" class="d-fill"/>')
        out.append(f'<text x="{cx}" y="{ny}" class="d-num" text-anchor="middle">{i}</text>')
    b0, b1 = x0 + 7 * sp - r - 2, x0 + 10 * sp + r + 2
    by = ny + 12
    out.append(f'<path d="M{b0} {by}V{by + 8}H{b1}V{by}" class="d-line"/>')
    out.append(f'<text x="{(b0 + b1) / 2:.0f}" y="{by + 28}" class="d-text" text-anchor="middle">망원경 관측 취소</text>')
    if narrow:
        out.append(f'<text x="4" y="{by + 28}" class="d-text">0: 구름 없음</text>')
        out.append(f'<text x="4" y="{by + 48}" class="d-text">10: 온 하늘이 구름</text>')
    else:
        out.append(f'<text x="8" y="{by + 28}" class="d-text">0은 구름 없음, 10은 온 하늘이 구름</text>')
    out.append('</svg>')
    return '\n'.join(out)


def mapsvg(narrow=False):
    W, H = 640, 420
    sx, sy = 468, 130
    sfx = '-n' if narrow else ''
    vb = '150 20 490 400' if narrow else f'0 0 {W} {H}'
    out = [f'<svg class="draw draw--map draw--{"narrow" if narrow else "wide"}" viewBox="{vb}" role="img" aria-labelledby="map-svg-t{sfx}">',
           f'<title id="map-svg-t{sfx}">부엉재 등고선 지도. 남서쪽 솔메 시내에서 부엉재로가 지그재그로 올라와 27번 버스 종점과 주차장을 지나고, '
           '꼭대기에 천문대가 있습니다. 버스 종점에서 천문대까지 걷는 길이 따로 나 있고, 주차장 300m 앞에 전조등 끄는 곳이 있습니다.</title>',
           f'<defs><clipPath id="map-clip{sfx}"><rect width="640" height="420"/></clipPath></defs>',
           f'<g clip-path="url(#map-clip{sfx})">']

    def shape(t):
        return (1 + 0.10 * math.sin(2 * t + 0.7) + 0.06 * math.sin(3 * t + 2.1)
                + 0.035 * math.sin(5 * t + 0.4) + 0.14 * max(0, math.cos(t - 2.35)) ** 3)

    labels = []
    for e in (400, 350, 300, 250, 200, 150, 100):
        r0 = 8 + (412 - e) * 1.22
        pts = []
        for k in range(0, 360, 6):
            t = math.radians(k)
            r = r0 * shape(t)
            pts.append((sx + 1.25 * r * math.cos(t), sy + r * math.sin(t)))
        out.append(f'<path d="{smooth_closed(pts)}" class="m-contour{" m-contour--index" if e % 100 == 0 else ""}"/>')
        if e in (300, 200):
            t = math.radians(75)
            r = r0 * shape(t)
            labels.append((sx + 1.25 * r * math.cos(t), sy + r * math.sin(t), f'{e}'))
    kw, kh = (36, 20) if narrow else (30, 17)
    for x, y, txt in labels:
        if x < W - 16:
            out.append(f'<rect x="{f(x - kw / 2)}" y="{f(y - kh / 2 - 0.5)}" width="{kw}" height="{kh}" class="m-knock"/>')
            out.append(f'<text x="{f(x)}" y="{f(y + (5.5 if narrow else 4.5))}" class="m-num" text-anchor="middle">{txt}</text>')
    road = [(-10, 404), (70, 392), (150, 374), (210, 354), (258, 332), (288, 308), (262, 290), (220, 274),
            (206, 256), (232, 242), (276, 234), (320, 226), (362, 212), (394, 196), (412, 184)]
    out.append(f'<path d="{smooth_open(road)}" class="m-road-knock"/>')
    out.append(f'<path d="{smooth_open(road)}" class="m-road"/>')
    foot = [(292, 312), (330, 304), (372, 284), (408, 254), (436, 216), (454, 178), (464, 146)]
    out.append(f'<path d="{smooth_open(foot)}" class="m-foot"/>')
    out.append('<path d="M412 184 L446 152" class="m-foot"/>')
    out.append('<path d="M314 214 L326 238" class="m-bar"/>')
    out.append('<text x="300" y="260" class="m-text">전조등 끄는 곳</text>')
    out.append('<rect x="281" y="301" width="14" height="14" class="m-stop"/>')
    out.append('<text x="300" y="340" class="m-text">27번 버스 종점</text>')
    out.append('<rect x="398" y="168" width="22" height="18" class="m-park"/>')
    out.append('<text x="409" y="181.5" class="m-park-t" text-anchor="middle">P</text>')
    out.append('<text x="392" y="160" class="m-text" text-anchor="end">주차장 60대</text>')
    out.append('<path d="M452 132 A16 16 0 0 1 484 132 Z" class="m-dome"/>')
    out.append('<path d="M468 116 V132" class="m-slit"/>')
    out.append('<text x="494" y="128" class="m-text m-text--strong">부엉재천문대</text>')
    out.append(f'<text x="494" y="{150 if narrow else 148}" class="m-num">412m</text>')
    if narrow:
        out.append('<text x="160" y="408" class="m-text">부엉재로 (솔메 시내 쪽)</text>')
    else:
        out.append('<text x="132" y="356" class="m-text">부엉재로</text>')
        out.append('<text x="10" y="414" class="m-text">솔메 시내 쪽</text>')
    out.append('</g>')
    ax = 172 if narrow else 34
    out.append(f'<path d="M{ax} 70 V30 M{ax - 7} 40 L{ax} 28 L{ax + 7} 40" class="m-arrow"/>')
    out.append(f'<text x="{ax}" y="92" class="m-text" text-anchor="middle">북</text>')
    sy0 = 58 if narrow else 40
    out.append(f'<path d="M540 {sy0} H620 M540 {sy0 - 6} V{sy0 + 6} M620 {sy0 - 6} V{sy0 + 6}" class="m-scale"/>')
    out.append(f'<text x="580" y="{sy0 - 12}" class="m-num" text-anchor="middle">200m</text>')
    out.append('</svg>')
    return '\n'.join(out)


def adapt(narrow=False):
    W = 400 if narrow else 640
    x0, per = (48, 11.4) if narrow else (72, 18)
    X = lambda t: x0 + t * per
    xe = X(30)
    cone = lambda t: 140 - 100 * math.exp(-t / 1.6)
    rod = lambda t: 140 + 95 * (1 - math.exp(-(t - 7) / 6))
    sfx = '-n' if narrow else ''
    out = [f'<svg class="draw draw--adapt draw--{"narrow" if narrow else "wide"}" viewBox="0 0 {W} 320" role="img" aria-labelledby="adapt-svg-t{sfx}">',
           f'<title id="adapt-svg-t{sfx}">암적응 곡선. 처음 7분 동안은 원뿔세포가 빠르게 적응하다 멈추고, 7분 무렵 곡선이 꺾여 막대세포가 30분까지 '
           '더 흐린 빛을 보게 해 줍니다. 20분에 관측회가 시작되고, 흰 빛을 한 번 보면 곡선이 다시 처음 높이로 올라갑니다.</title>']
    out.append(f'<path d="M{x0} 30 V258 H{f(xe)}" class="c-axis"/>')
    for t in range(0, 31, 5):
        out.append(f'<path d="M{f(X(t))} 258 V264" class="c-axis"/>')
        out.append(f'<text x="{f(X(t))}" y="282" class="d-num" text-anchor="middle">{t}</text>')
    out.append(f'<text x="{f(xe)}" y="308" class="d-text" text-anchor="end">어둠 속에서 보낸 시간(분)</text>')
    out.append(f'<text x="{x0 + 8}" y="20" class="d-text">위: 밝은 빛만 보입니다</text>')
    out.append(f'<text x="{x0 + 8}" y="246" class="d-text">아래: 흐린 별까지 보입니다</text>')
    pts = [(X(t / 10), cone(t / 10)) for t in range(0, 71)]
    out.append('<path d="M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + '" class="c-curve"/>')
    pts = [(X(t / 10), cone(t / 10)) for t in range(70, 301, 5)]
    out.append('<path d="M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + '" class="c-dash"/>')
    pts = [(X(t / 10), rod(t / 10)) for t in range(70, 301, 2)]
    out.append('<path d="M' + ' L'.join(f'{f(x)} {f(y)}' for x, y in pts) + '" class="c-curve"/>')
    bx, by = X(7), cone(7)
    out.append(f'<circle cx="{f(bx)}" cy="{f(by)}" r="4" class="d-fill"/>')
    out.append(f'<text x="{f(bx + 8)}" y="{f(by - 12)}" class="d-text">7분 무렵 꺾입니다</text>')
    out.append(f'<text x="{f(X(1.6) + 10)}" y="{f(cone(1.6) - 6)}" class="d-text">원뿔세포</text>')
    if narrow:
        out.append(f'<text x="{f(X(12) + 4)}" y="182" class="d-text">막대세포</text>')
    else:
        out.append(f'<text x="{f(X(16))}" y="{f(rod(16) + 26)}" class="d-text">막대세포</text>')
    out.append(f'<path d="M{f(X(20))} 30 V258" class="c-mark"/>')
    if narrow:
        out.append(f'<text x="{f(X(20) - 6)}" y="40" class="d-text" text-anchor="end">20분: 관측회 시작</text>')
    else:
        out.append(f'<text x="{f(X(20) + 8)}" y="40" class="d-text">20분: 관측회 시작</text>')
    ax = X(29.5) if narrow else X(26.5)
    ay = rod(29.5 if narrow else 26.5)
    out.append(f'<path d="M{f(ax)} {f(ay - 6)} V64 M{f(ax - 6)} 74 L{f(ax)} 62 L{f(ax + 6)} 74" class="c-jump"/>')
    out.append(f'<text x="{f(ax - 10)}" y="72" class="d-text" text-anchor="end">흰 빛을 보면</text>')
    out.append(f'<text x="{f(ax - 10)}" y="92" class="d-text" text-anchor="end">처음으로</text>')
    out.append('</svg>')
    return '\n'.join(out)


def main():
    html = HTML.read_text(encoding='utf-8')
    for name, fn in (('clouds', clouds), ('map', mapsvg), ('adapt', adapt)):
        both = fn() + '\n' + fn(narrow=True)
        html, n = re.subn(rf'<!-- gen:{name} -->.*?<!-- /gen:{name} -->',
                          lambda m: f'<!-- gen:{name} -->\n{both}\n<!-- /gen:{name} -->', html, flags=re.S)
        print(name, 'replaced' if n else 'MARKER MISSING')
    HTML.write_text(html, encoding='utf-8')


if __name__ == '__main__':
    main()
