"""'마흔 날' plate: forty days of steeping, four scents, one vessel per day.

    python -I make_plate.py <fonts-dir> <repo-root>

Writes works/perfume/img/forty-days-wide.webp, forty-days-tall.webp (transparent ground, so it
sits on whichever paper tint the page has) and design/works/perfume/forty-days.png (on paper).
Drawn at 3x and downsampled for clean edges.
"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFont

FONTS, ROOT = sys.argv[1], sys.argv[2]
SS = 3  # supersample

INK = (42, 31, 24)
SCENTS = [
    # name, latin, light, body, deep
    ('유월', 'Yuwol', (223, 227, 168), (146, 158, 64), (59, 71, 24)),
    ('조청', 'Jocheong', (243, 196, 106), (184, 104, 14), (74, 29, 4)),
    ('오미', 'Omi', (236, 160, 170), (156, 30, 56), (58, 6, 18)),
    ('먹', 'Meok', (190, 196, 203), (70, 77, 86), (14, 16, 19)),
]


def font(name, size, wght=None, opsz=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), int(size * SS))
    axes = f.get_variation_axes() if name.endswith('.ttf') and 'Plex' not in name else []
    if axes:
        vals = []
        for a in axes:
            n = a['name'].decode() if isinstance(a['name'], bytes) else a['name']
            if n == 'Weight':
                vals.append(wght or a['default'])
            elif n == 'Optical Size':
                vals.append(opsz or a['default'])
            else:
                vals.append(a['default'])
        f.set_variation_by_axes(vals)
    return f


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def ease(t):
    return 1 - (1 - t) ** 2.2


def squircle(cx, cy, w, h, n=4.2, steps=96):
    pts = []
    for i in range(steps):
        th = 2 * math.pi * i / steps
        c, s = math.cos(th), math.sin(th)
        x = math.copysign(abs(c) ** (2 / n), c) * w / 2
        y = math.copysign(abs(s) ** (2 / n), s) * h / 2
        pts.append((cx + x, cy + y))
    return pts


def clip_poly_below(pts, ylevel):
    """Sutherland–Hodgman clip of polygon to y >= ylevel (screen coords, below the level)."""
    out = []
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        ina, inb = a[1] >= ylevel, b[1] >= ylevel
        if ina:
            out.append(a)
        if ina != inb:
            t = (ylevel - a[1]) / (b[1] - a[1])
            out.append((a[0] + (b[0] - a[0]) * t, ylevel))
    return out


def vessel(d, cx, cy, w, h, day, scent, rng, final=False):
    _, _, light, body, deep = scent
    t = min(day, 40) / 40
    # body colour deepens as the material gives itself up to the spirit
    col = mix(mix(light, (250, 247, 240), 0.55), body, ease(t)) if not final else body
    level = cy - h / 2 + h * 0.26  # liquid line
    outline = squircle(cx, cy, w, h)
    liquid = clip_poly_below(squircle(cx, cy, w - 2.2 * SS, h - 2.2 * SS), level)
    d.polygon(liquid, fill=col + (255,))
    # meniscus hairline, a touch lighter
    d.line([(cx - w / 2 + 2.4 * SS, level), (cx + w / 2 - 2.4 * SS, level)],
           fill=mix(col, (255, 255, 255), 0.45) + (255,), width=max(1, int(0.9 * SS)))
    # suspended matter drifting down over the days, cleared after filtering
    if not final:
        settle = min(1.0, (t ** 1.35) * 1.08)
        count = 16
        bottom = cy + h / 2 - 5 * SS
        for k in range(count):
            rx = rng.uniform(-0.34, 0.34) * w
            ry0 = rng.uniform(0.04, 0.98)
            # pile at the bottom: settled specks gather into a thin bed
            ybed = bottom - rng.uniform(0, 3.2) * SS * (0.4 + settle)
            ysus = level + (bottom - level) * ry0
            y = ysus + (ybed - ysus) * settle
            r = rng.uniform(0.55, 1.05) * SS
            a = int(150 + 80 * settle)
            d.ellipse([cx + rx - r, y - r, cx + rx + r, y + r], fill=deep + (a,))
    d.line(outline + [outline[0]], fill=INK + (120,), width=max(1, int(0.75 * SS)))


def plate(layout, out_paths, ground=None):
    if layout == 'wide':
        W, H = 2400, 1180
        blocks = [(1, 40)]
    else:
        W, H = 1200, 1640
        blocks = [(1, 20), (21, 40)]
    W *= SS
    H *= SS
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0) if ground is None else ground + (255,))
    d = ImageDraw.Draw(img, 'RGBA')
    rng = random.Random(40)

    f_num = font('Newsreader-Italic.ttf', 26 if layout == 'wide' else 22, wght=300, opsz=24)
    f_name = font('Hahmlet.ttf', 30 if layout == 'wide' else 26, wght=300)
    f_lat = font('Newsreader-Italic.ttf', 21 if layout == 'wide' else 18, wght=300, opsz=18)
    f_ui = font('IBMPlexSansKR-Regular.ttf', 17 if layout == 'wide' else 16)
    f_small = font('IBMPlexSansKR-Regular.ttf', 15 if layout == 'wide' else 14)

    mx = (96 if layout == 'wide' else 56) * SS
    label_w = (250 if layout == 'wide' else 0) * SS
    top = (130 if layout == 'wide' else 110) * SS

    if layout == 'wide':
        cols = 41
        grid_x0 = mx + label_w
        grid_w = W - grid_x0 - mx
        colw = grid_w / (cols + 0.8)  # extra gap before day 41
        rowh = (H - top - 170 * SS) / 4
        vw, vh = colw * 0.62, rowh * 0.62
        # day scale
        for day in range(1, 42):
            x = grid_x0 + colw * (day - 0.5) + (colw * 0.8 if day == 41 else 0)
            big = day in (1, 10, 20, 30, 40, 41)
            y0 = top - (26 if big else 14) * SS
            d.line([(x, y0), (x, top - 6 * SS)], fill=INK + (150 if big else 70,), width=max(1, int(0.8 * SS)))
            if big:
                s = str(day)
                tw = d.textlength(s, font=f_num)
                d.text((x - tw / 2, y0 - 40 * SS), s, font=f_num, fill=INK + (230,))
        d.line([(grid_x0, top - 6 * SS), (grid_x0 + colw * 40, top - 6 * SS)], fill=INK + (60,), width=max(1, int(0.7 * SS)))
        # labels for the two phases
        d.text((grid_x0, top - 96 * SS), '담근 날부터', font=f_small, fill=INK + (200,))
        x41 = grid_x0 + colw * 40.5 + colw * 0.8
        s = '거른 날'
        tw = d.textlength(s, font=f_small)
        d.text((x41 - tw / 2, top - 96 * SS), s, font=f_small, fill=INK + (200,))
        for r, sc in enumerate(SCENTS):
            cy = top + rowh * (r + 0.5) + 10 * SS
            d.text((mx, cy - 30 * SS), f'No.0{r + 1}', font=f_num, fill=INK + (200,))
            d.text((mx + 92 * SS, cy - 34 * SS), sc[0], font=f_name, fill=INK + (255,))
            d.text((mx + 92 * SS, cy + 8 * SS), sc[1], font=f_lat, fill=INK + (170,))
            for day in range(1, 42):
                cx = grid_x0 + colw * (day - 0.5) + (colw * 0.8 if day == 41 else 0)
                vessel(d, cx, cy, vw, vh, day, sc, rng, final=(day == 41))
        # caption, bottom left, quiet
        cap = '2026년 가을 배치. 매일 같은 시각에 병을 한 번 돌리고, 가라앉은 것을 적었습니다.'
        d.text((grid_x0, H - 92 * SS), cap, font=f_ui, fill=INK + (190,))
        # the forty-day bracket under the grid
        by = H - 128 * SS
        f_title = font('Hahmlet.ttf', 26, wght=250)
        title = '마흔 날'
        tw = d.textlength(title, font=f_title)
        midx = grid_x0 + colw * 20
        gap = tw / 2 + 18 * SS
        d.line([(grid_x0 + colw * 0.5, by), (midx - gap, by)], fill=INK + (90,), width=max(1, int(0.8 * SS)))
        d.line([(midx + gap, by), (grid_x0 + colw * 39.5, by)], fill=INK + (90,), width=max(1, int(0.8 * SS)))
        d.text((midx - tw / 2, by - 22 * SS), title, font=f_title, fill=INK + (235,))
        for xx in (grid_x0 + colw * 0.5, grid_x0 + colw * 39.5):
            d.line([(xx, by - 8 * SS), (xx, by)], fill=INK + (90,), width=max(1, int(0.8 * SS)))
    else:
        cols = 20
        grid_x0 = mx + 30 * SS
        grid_w = W - grid_x0 - mx
        colw = grid_w / cols
        block_h = (H - top - 140 * SS) / 2
        for bi, (a, b) in enumerate(blocks):
            btop = top + block_h * bi
            rowh = (block_h - 90 * SS) / 4
            vw, vh = colw * 0.62, rowh * 0.64
            for day in range(a, b + 1):
                x = grid_x0 + colw * (day - a + 0.5)
                big = day in (1, 10, 20, 21, 30, 40)
                y0 = btop - (22 if big else 12) * SS
                d.line([(x, y0), (x, btop - 6 * SS)], fill=INK + (150 if big else 70,), width=max(1, int(0.8 * SS)))
                if big:
                    s = str(day)
                    tw = d.textlength(s, font=f_num)
                    d.text((x - tw / 2, y0 - 36 * SS), s, font=f_num, fill=INK + (230,))
            for r, sc in enumerate(SCENTS):
                cy = btop + rowh * (r + 0.5) + 6 * SS
                if bi == 0:
                    pass
                d.text((mx - 4 * SS, cy - 14 * SS), sc[0][0], font=f_small, fill=INK + (190,))
                for day in range(a, b + 1):
                    cx = grid_x0 + colw * (day - a + 0.5)
                    vessel(d, cx, cy, vw, vh, day, sc, rng)
        cap = '2026년 가을 배치. 매일 병을 한 번 돌리고 기록했습니다.'
        d.text((grid_x0, H - 84 * SS), cap, font=f_ui, fill=INK + (190,))

    img = img.resize((W // SS, H // SS), Image.LANCZOS)
    for p in out_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if p.endswith('.webp'):
            img.save(p, 'WEBP', quality=86, method=6)
        else:
            img.save(p, 'PNG', optimize=True)
        print(p, os.path.getsize(p))


out_dir = os.path.join(ROOT, 'design', 'works', 'perfume')
# The site draws this plate live on a canvas (works/perfume/js/plate.js) so its text stays crisp
# and readable at every width; these PNGs are the reference artwork.
plate('wide', [os.path.join(out_dir, 'forty-days.png')], ground=(238, 229, 214))
