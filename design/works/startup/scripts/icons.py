"""Raster favicons for 물길 from the same geometry as img/favicon.svg.

    python -I design/works/startup/scripts/icons.py
"""
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[4]
IMG = ROOT / 'works' / 'startup' / 'img'
INK = (19, 41, 61)
SEA = (244, 247, 247)
SIGNAL = (226, 83, 28)


def cubic(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        a = (1 - t) ** 3
        b = 3 * (1 - t) ** 2 * t
        c = 3 * (1 - t) * t ** 2
        d = t ** 3
        pts.append((a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]))
    return pts


def mark(size, radius_ratio=7 / 32, pad=0.0):
    k = 8
    S = size * k
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_ratio), fill=INK)
    u = S / 32 * (1 - pad * 2)
    o = S * pad

    def P(x, y):
        return (o + x * u, o + y * u)
    w = int(2.3 * u)
    # upper and lower curves converge into the middle line (favicon.svg paths)
    upper = cubic(P(5, 9.5), P(9.8, 9.5), P(12.9, 10.9), P(16.4, 14.2)) + cubic(P(16.4, 14.2), P(18.8, 16.4), P(21.6, 16.5), P(27, 16))
    lower = cubic(P(5, 22.5), P(9.8, 22.5), P(12.9, 21.1), P(16.4, 17.8)) + cubic(P(16.4, 17.8), P(18.8, 15.6), P(21.6, 15.5), P(27, 16))
    for line in (upper, lower, [P(5, 16), P(27, 16)]):
        d.line(line, fill=SEA, width=w, joint='curve')
        for end in (line[0], line[-1]):
            d.ellipse([end[0] - w / 2, end[1] - w / 2, end[0] + w / 2, end[1] + w / 2], fill=SEA)
    c = P(24.5, 16)
    r = 2.9 * u
    d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=SIGNAL)
    return im.resize((size, size), Image.LANCZOS)


def main():
    mark(32).save(IMG / 'favicon-32.png')
    # apple touch icon: full-bleed square (iOS rounds it), mark slightly inset
    t = mark(180, radius_ratio=0, pad=0.08)
    t.convert('RGB').save(IMG / 'apple-touch-icon.png')
    print('ok')


if __name__ == '__main__':
    main()
