"""Key visual triptych for 너울 2027 (canvas-design pass, Swell Notation).

python -I keyvisual.py <fontdir> <outdir>

Renders one poster per festival day with the same rules the live site uses:
rows justified to the full measure through Anybody's width axis, tone-on-tone
tide lines / solar disc / salt-pan grid from a per-day seed.
"""
import json, math, os, random, sys
from PIL import Image, ImageDraw, ImageFont

FONTDIR, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
src = open(os.path.join(REPO, 'works', 'festival', 'js', 'data.js'), encoding='utf-8').read()
DATA = json.loads(src[src.index('{'):src.rindex('}') + 1])
ACTS = {a['id']: a for a in DATA['acts']}

ANY = os.path.join(FONTDIR, 'anybody', 'Anybody[wdth,wght].ttf')
HAH = os.path.join(FONTDIR, 'hahmlet', 'Hahmlet[wght].ttf')
PLEX = os.path.join(FONTDIR, 'ibmplexsanskr', 'IBMPlexSansKR-Medium.ttf')

PAL = {
    'vermilion':   dict(field='#EE4A26', ink='#121413', deep='#C9361A'),
    'ultramarine': dict(field='#2741D6', ink='#EDEFEC', deep='#1C2FA8'),
    'gardenia':    dict(field='#F4B71C', ink='#121413', deep='#D99A00'),
}
STYLE = {  # per-day type voice: base weight, ornament plan
    'fri': dict(wght=760, disc=(0.74, 0.70), lines=34, amp=0.022),
    'sat': dict(wght=340, disc=(0.30, 0.66), lines=40, amp=0.032),
    'sun': dict(wght=560, disc=(0.62, 0.78), lines=28, amp=0.016),
}

S = 2  # supersample
W, H = 1200 * S, 1600 * S
M = 64 * S


def font(path, size, axes=None):
    f = ImageFont.truetype(path, size)
    if axes is not None:
        f.set_variation_by_axes(axes)
    return f


def is_hangul(s):
    return any('가' <= ch <= '힣' for ch in s)


def seg_font(text, size, wdth, wght):
    if is_hangul(text):
        return font(HAH, int(size * 0.92), [min(900, wght + 80)])
    return font(ANY, size, [wdth, wght])


def row_width(names, size, wdth, wght, gap):
    total = 0
    for i, n in enumerate(names):
        total += seg_font(n, size, wdth, wght).getlength(n)
        if i:
            total += gap
    return total


def fit_row(names, size, wght, measure):
    gap = size * 0.42
    lo, hi = 50.0, 150.0
    if row_width(names, size, lo, wght, gap) > measure:
        # shrink the size until the narrowest width fits
        while row_width(names, size, lo, wght, gap) > measure and size > 20:
            size = int(size * 0.96)
            gap = size * 0.42
        return size, lo, gap
    if row_width(names, size, hi, wght, gap) < measure:
        while row_width(names, size, hi, wght, gap) < measure:
            size = int(size * 1.03)
            gap = size * 0.42
        hi = 150.0
    for _ in range(18):
        mid = (lo + hi) / 2
        if row_width(names, size, mid, wght, gap) > measure:
            hi = mid
        else:
            lo = mid
    return size, lo, gap


def draw_row(d, names, x, y, size, wdth, wght, gap, ink, deep, measure):
    # distribute leftover so the row is exactly the measure
    widths = [seg_font(n, size, wdth, wght).getlength(n) for n in names]
    left = measure - sum(widths)
    g = left / (len(names) - 1) if len(names) > 1 else 0
    cx = x
    for i, n in enumerate(names):
        f = seg_font(n, size, wdth, wght)
        d.text((cx, y), n, font=f, fill=ink, anchor='ls')
        cx += widths[i]
        if i < len(names) - 1:
            r = size * 0.075
            mx = cx + g / 2
            my = y - size * 0.34
            d.ellipse((mx - r, my - r, mx + r, my + r), fill=ink)
            cx += g


def tide(d, rnd, st, deep, top, bottom):
    n = st['lines']
    for i in range(n):
        t = i / (n - 1)
        y0 = top + (bottom - top) * t
        ph = rnd.uniform(0, math.tau) * 0.15 + i * 0.21
        amp = H * st['amp'] * (0.35 + 0.65 * math.sin(math.pi * t))
        pts = []
        for xi in range(0, W + 1, 6 * S):
            u = xi / W
            env = 0.55 + 0.45 * math.sin(math.pi * u * 1.0 + i * 0.07)
            y = y0 + amp * env * math.sin(u * math.tau * 1.6 + ph) + amp * 0.35 * math.sin(u * math.tau * 4.3 - ph * 1.7)
            pts.append((xi, y))
        d.line(pts, fill=deep, width=int(2.2 * S), joint='curve')


def pans(d, deep, x0, y0, x1, y1, cols, rows):
    w = (x1 - x0) / cols
    h = (y1 - y0) / rows
    for c in range(cols + 1):
        d.line([(x0 + c * w, y0), (x0 + c * w, y1)], fill=deep, width=int(1.5 * S))
    for r in range(rows + 1):
        d.line([(x0, y0 + r * h), (x1, y0 + r * h)], fill=deep, width=int(1.5 * S))


def poster(day):
    pal = PAL[day['color']]
    st = STYLE[day['id']]
    rnd = random.Random(day['seed'])
    im = Image.new('RGB', (W, H), pal['field'])
    d = ImageDraw.Draw(im)
    ink, deep = pal['ink'], pal['deep']

    # --- layout the lineup first so the ornament can sit below it ---
    measure = W - 2 * M
    tiers = [190, 128, 96, 80, 66]
    y = M + 300 * S
    rows = []
    for i, row in enumerate(day['rows']):
        names = [ACTS[a]['name'] for a in row]
        size, wdth, gap = fit_row(names, int(tiers[i] * S), st['wght'], measure)
        y += size * 0.86
        rows.append((names, y, size, wdth, gap))
        y += size * 0.18
    top = y + 56 * S
    pan_top = H - M * 1.45 - 150 * S
    # --- ornament (tone on tone) ---
    pans(d, deep, M, pan_top, W - M, H - M * 1.45 - 24 * S, 12, 2)
    tide(d, rnd, st, deep, top + 40 * S, pan_top - 70 * S)
    r = min(W * 0.17, (pan_top - top) * 0.36)
    cx = M + r + (W - 2 * M - 2 * r) * st['disc'][0]
    cy = top + r + 10 * S + (pan_top - top - 2 * r - 40 * S) * (st['disc'][1] - 0.6) * 2.5
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=deep)

    # --- masthead ---
    hf = font(HAH, int(250 * S), [900])
    d.text((M - 6 * S, M + 210 * S), '너울', font=hf, fill=ink, anchor='ls')
    yf = font(ANY, int(120 * S), [150, 300])
    d.text((W - M, M + 98 * S), '2027', font=yf, fill=ink, anchor='rs')
    df = font(ANY, int(96 * S), [52, 820])
    d.text((W - M, M + 210 * S), day['md'], font=df, fill=ink, anchor='rs')
    sf = font(PLEX, int(19 * S))
    d.text((M, M + 262 * S), f"{day['dowLong']}  {day['tide']}", font=sf, fill=ink, anchor='ls')
    d.text((W - M, M + 262 * S), '서해 소금곶 옛 염전', font=sf, fill=ink, anchor='rs')
    d.line([(M, M + 290 * S), (W - M, M + 290 * S)], fill=ink, width=int(3 * S))

    # --- lineup rows ---
    for names, y, size, wdth, gap in rows:
        draw_row(d, names, M, y, size, wdth, st['wght'], gap, ink, deep, measure)

    # --- foot ---
    d.line([(M, H - M * 1.45), (W - M, H - M * 1.45)], fill=ink, width=int(3 * S))
    ff = font(PLEX, int(17 * S))
    stages = '물마루    소금창고    모래톱'
    d.text((M, H - M * 0.9), stages, font=ff, fill=ink, anchor='ls')
    d.text((W - M, H - M * 0.9), f"문 여는 시간 {day['gates']}", font=ff, fill=ink, anchor='rs')
    return im.resize((W // S, H // S), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    posters = [poster(day) for day in DATA['days']]
    for day, p in zip(DATA['days'], posters):
        p.save(os.path.join(OUT, f"poster-{day['id']}.png"))
    gap = 48
    sheet = Image.new('RGB', (1200 * 3 + gap * 4, 1600 + gap * 2), '#EDEFEC')
    for i, p in enumerate(posters):
        sheet.paste(p, (gap + i * (1200 + gap), gap))
    sheet.save(os.path.join(OUT, 'keyvisual-triptych.png'))
    print('ok')


main()
