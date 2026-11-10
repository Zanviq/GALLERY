"""Favicon PNGs for works/lamp, drawn like img/favicon.svg: the lamp as a 'ㄱ' with its base (dev tool).

    python -I design/works/lamp/scripts/icons.py
Also writes fonts/OFL-*.txt licence files from the Hanken Grotesk OFL text in <src dir> if given.
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SITE = os.path.join(ROOT, 'works', 'lamp')


def icon(size, radius_frac=6 / 32):
    s = 8  # supersample
    W = size * s
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = W / 32
    d.rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * radius_frac), fill=(11, 12, 14, 255))

    def line(x0, y0, x1, y1, w, col):
        d.line([x0 * u, y0 * u, x1 * u, y1 * u], fill=col, width=int(w * u))
        for x, y in ((x0, y0), (x1, y1)):
            r = w * u / 2
            d.ellipse([x * u - r, y * u - r, x * u + r, y * u + r], fill=col)
    line(7, 8.5, 23.5, 8.5, 3, (255, 255, 255, 255))
    line(23.5, 8.5, 23.5, 25, 2, (158, 165, 173, 255))
    line(17, 25.5, 29, 25.5, 2.4, (158, 165, 173, 255))
    return im.resize((size, size), Image.LANCZOS)


icon(32).save(os.path.join(SITE, 'img', 'favicon-32.png'))
icon(180, 0).save(os.path.join(SITE, 'img', 'apple-touch-icon.png'))
print('icons written')

if len(sys.argv) > 1:
    ofl = open(os.path.join(sys.argv[1], 'OFL-HankenGrotesk.txt'), encoding='utf-8').read()
    body = ofl[ofl.index('This Font Software is licensed'):]
    head = (
        'Gyeotbang Serif (gyeotbang-serif-200/300/400/600.woff2)\n'
        'A modified version of MaruBuri (마루 부리) ExtraLight, Light, Regular and SemiBold.\n'
        'Copyright line in the font files: © NAVER Corp. © NAVER Cultural Foundation Corp.\n'
        'NAVER releases MaruBuri under the SIL Open Font License 1.1, on the same terms as its Nanum fonts,\n'
        'whose licence reserves the NAVER font names. "MaruBuri" and "마루 부리" are therefore treated as\n'
        'Reserved Font Names: these files are subsets (only the glyphs this page uses) and are renamed\n'
        '"Gyeotbang Serif" in the name table and in every CSS reference.\n\n'
    )
    open(os.path.join(SITE, 'fonts', 'OFL-GyeotbangSerif.txt'), 'w', encoding='utf-8', newline='\n').write(head + body)
    open(os.path.join(SITE, 'fonts', 'OFL-HankenGrotesk.txt'), 'w', encoding='utf-8', newline='\n').write(
        'Hanken Grotesk (hanken-grotesk.woff2), subset to printable ASCII and a few symbols.\n' + ofl)
    print('licences written')
