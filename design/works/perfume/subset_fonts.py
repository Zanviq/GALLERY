"""Subset the OFL fonts to the glyphs works/perfume actually uses.

    python -I subset_fonts.py <fonts-src-dir> <repo-root> [<extra sys.path for brotli>]

Collects every character from works/perfume/index.html and js/*.js, then writes woff2 files to
works/perfume/fonts/. Re-run after any copy change. Variable axes are narrowed to what the CSS uses.
"""
import glob
import io
import os
import sys

if len(sys.argv) > 3:
    sys.path.insert(0, sys.argv[3])

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

SRC, ROOT = sys.argv[1], sys.argv[2]
SITE = os.path.join(ROOT, 'works', 'perfume')
OUT = os.path.join(SITE, 'fonts')
os.makedirs(OUT, exist_ok=True)

text = ''
for p in [os.path.join(SITE, 'index.html')] + glob.glob(os.path.join(SITE, 'js', '*.js')):
    with open(p, encoding='utf-8') as f:
        text += f.read()
ascii_set = ''.join(chr(c) for c in range(0x20, 0x7f))
extra = '‘’“”–—…·×%₩°'
chars = set(text) | set(ascii_set) | set(extra)
hangul = ''.join(sorted(c for c in chars if '가' <= c <= '힣' or '㄰' <= c <= '㆏'))
latin = ''.join(sorted(c for c in chars if ord(c) < 0x3000 and c.isprintable()))
print('hangul glyphs:', len(hangul), 'latin glyphs:', len(latin))


def build(src, out, text_chars, axes=None):
    font = TTFont(os.path.join(SRC, src), lazy=False)
    if axes:
        font = instancer.instantiateVariableFont(font, axes)
        buf = io.BytesIO()
        font.save(buf)
        buf.seek(0)
        font = TTFont(buf, lazy=False)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'pnum', 'lnum', 'onum', 'tnum', 'case']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text_chars)
    sub.subset(font)
    path = os.path.join(OUT, out)
    font.flavor = 'woff2'
    font.save(path)
    print(out, os.path.getsize(path))


build('Hahmlet.ttf', 'hahmlet.woff2', hangul + latin, {'wght': (200, 400)})
build('Newsreader.ttf', 'newsreader.woff2', latin, {'wght': (300, 400), 'opsz': (12, 72)})
build('Newsreader-Italic.ttf', 'newsreader-italic.woff2', latin, {'wght': (250, 400), 'opsz': (12, 72)})
build('IBMPlexSansKR-Regular.ttf', 'plex-kr-400.woff2', hangul + latin)
build('IBMPlexSansKR-Medium.ttf', 'plex-kr-500.woff2', hangul + latin)

for name, lic in [('Hahmlet', 'Hahmlet-OFL.txt'), ('Newsreader', 'Newsreader-OFL.txt'), ('IBM Plex Sans KR', 'IBMPlexSansKR-OFL.txt')]:
    with open(os.path.join(SRC, lic), encoding='utf-8') as f:
        body = f.read()
    with open(os.path.join(OUT, lic), 'w', encoding='utf-8', newline='\n') as f:
        f.write(body)
