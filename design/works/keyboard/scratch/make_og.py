"""Compose og/keyboard.png (1200x630) and write the raster assets for works/keyboard.

    python -I make_og.py <shots-dir> <font-src-dir>

shots-dir: headless captures  still_main.png (1600x1000, ?still=main),
           still_layers.png (1600x1200, ?still=layers), thumb.png (1200x900, ?capture)
font-src-dir: WantedSansVariable.ttf, Archivo.ttf
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
SHOTS, FONTS = sys.argv[1], sys.argv[2]

PAPER = (230, 231, 227)
INK = (30, 31, 34)
INK2 = (85, 88, 94)
ACCENT = (227, 169, 47)


def font(name, size, axes):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    try:
        f.set_variation_by_axes(axes)
    except Exception as exc:  # pragma: no cover - older FreeType
        print('variation not applied', exc)
    return f


def mark(draw, x, y, s, fill):
    """Three keycaps, the middle one pressed."""
    q = s
    r = q * 0.24
    gap = q * 0.2
    for i in range(3):
        dy = q * 0.4 if i == 1 else 0
        x0 = x + i * (q + gap)
        draw.rounded_rectangle([x0, y + dy, x0 + q, y + dy + q], radius=r, fill=fill)


def og():
    W, H = 1200, 630
    S = 2  # supersample
    im = Image.new('RGB', (W * S, H * S), PAPER)
    d = ImageDraw.Draw(im)

    # keyboard: crop the still render (same paper colour, so edges vanish)
    kb = Image.open(os.path.join(SHOTS, 'still_main.png')).convert('RGB')
    bx0, by0, bx1 = 145, 290, 1490  # board bounds in the 1600x1000 still
    left, top, width = 470, 172, 700  # where the board should land (1x)
    sc = width / (bx1 - bx0) * S
    kb = kb.resize((int(kb.width * sc), int(kb.height * sc)), Image.LANCZOS)
    # 가장자리를 부드럽게 지워 그림자가 잘린 선이 보이지 않게
    mask = Image.new('L', kb.size, 0)
    md = ImageDraw.Draw(mask)
    f = 46 * S
    for i in range(f):
        v = int(255 * (i / f) ** 1.6)
        md.rectangle([i, i, kb.width - 1 - i, kb.height - 1 - i], outline=v)
    md.rectangle([f, f, kb.width - 1 - f, kb.height - 1 - f], fill=255)
    im.paste(kb, (int(left * S - bx0 * sc), int(top * S - by0 * sc)), mask)

    m = 64 * S
    mark(d, m, 56 * S, 15 * S, INK)
    latin = font('Archivo.ttf', 22 * S, [800, 125])
    d.text((m + 66 * S, 52 * S), 'GARAK 65', font=latin, fill=INK)

    head = font('WantedSansVariable.ttf', 92 * S, [820])
    d.text((m - 4 * S, 128 * S), '손가락이', font=head, fill=INK)
    d.text((m - 4 * S, 224 * S), '내는 가락.', font=head, fill=INK)

    body = font('WantedSansVariable.ttf', 25 * S, [500])
    d.text((m, 372 * S), '알루미늄 65% 키보드.', font=body, fill=INK2)
    d.text((m, 408 * S), '화면 속 키보드를 직접 쳐 보세요.', font=body, fill=INK2)

    # keycap-style label
    lab = font('WantedSansVariable.ttf', 22 * S, [650])
    bx, by, bw, bh = m, 486 * S, 196 * S, 52 * S
    d.rounded_rectangle([bx, by, bx + bw, by + bh], radius=9 * S, fill=ACCENT)
    d.rounded_rectangle([bx, by + bh - 4 * S, bx + bw, by + bh], radius=4 * S, fill=(176, 127, 20))
    d.rectangle([bx, by + bh - 9 * S, bx + bw, by + bh - 4 * S], fill=ACCENT)
    tb = d.textbbox((0, 0), '1차 예약 중', font=lab)
    d.text((bx + (bw - (tb[2] - tb[0])) / 2, by + 11 * S), '1차 예약 중', font=lab, fill=INK)

    # dimension line under the board, technical-drawing style
    y = 528 * S
    x0, x1 = 470 * S, 1170 * S
    d.line([x0, y, x1, y], fill=INK2, width=S)
    for xx in (x0, x1):
        d.line([xx, y - 7 * S, xx, y + 7 * S], fill=INK2, width=S)
    small = font('Archivo.ttf', 15 * S, [600, 112])
    t = '319 mm'
    tb = d.textbbox((0, 0), t, font=small)
    tw2 = tb[2] - tb[0]
    cx = (x0 + x1) / 2
    d.rectangle([cx - tw2 / 2 - 10 * S, y - 12 * S, cx + tw2 / 2 + 10 * S, y + 12 * S], fill=PAPER)
    d.text((cx - tw2 / 2, y - 11 * S), t, font=small, fill=INK2)

    im = im.resize((W, H), Image.LANCZOS)
    out = os.path.join(REPO, 'og', 'keyboard.png')
    im.save(out, optimize=True)
    print(out, os.path.getsize(out) // 1024, 'KB')


def rasters():
    site = os.path.join(REPO, 'works', 'keyboard', 'img')
    a = Image.open(os.path.join(SHOTS, 'still_main.png')).convert('RGB').crop((80, 220, 1560, 940))
    a.save(os.path.join(site, 'fallback.webp'), 'WEBP', quality=80, method=6)
    b = Image.open(os.path.join(SHOTS, 'still_layers.png')).convert('RGB')
    b.save(os.path.join(site, 'fallback-exploded.webp'), 'WEBP', quality=80, method=6)
    t = Image.open(os.path.join(SHOTS, 'thumb.png')).convert('RGB')
    assert t.size == (1200, 900), t.size
    t.save(os.path.join(REPO, 'thumbnails', 'keyboard.webp'), 'WEBP', quality=82, method=6)
    for p in (os.path.join(site, 'fallback.webp'), os.path.join(site, 'fallback-exploded.webp'),
              os.path.join(REPO, 'thumbnails', 'keyboard.webp')):
        print(p, os.path.getsize(p) // 1024, 'KB')


og()
rasters()
