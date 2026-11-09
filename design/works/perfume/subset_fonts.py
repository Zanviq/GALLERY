"""Subset the OFL fonts to the glyphs works/perfume actually uses.

    <scratchpad>/fontenv/Scripts/python.exe -I subset_fonts.py <fonts-src-dir> <repo-root>

Collects every character from works/perfume/index.html and js/*.js, then writes woff2 files to
works/perfume/fonts/. Re-run after any copy change.

- Hahmlet: every Hangul + Latin character on the page, weight axis narrowed to 200-400.
- Newsreader: only the Latin set in it (the DAMGEUM wordmark in roman; scent numbers, Latin
  scent names and day numbers in italic), weight 300-400.
- IBM Plex Sans KR 400/500: every character on the page. "Plex" is a Reserved Font Name, so the
  subsets are renamed "Damgeum Sans" in the name table (CSS uses that name too) and the licence
  file beside them says so. This script never overwrites that licence file.
"""
import glob
import io
import os
import sys

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
extra = '‘’“”–—…·×%°'
chars = set(text) | set(extra)
hangul = ''.join(sorted(c for c in chars if '가' <= c <= '힣' or '㄰' <= c <= '㆏'))
latin = ''.join(sorted(c for c in chars if ord(c) < 0x3000 and c.isprintable()))
print('hangul glyphs:', len(hangul), 'latin glyphs:', len(latin))

NEWS_ROMAN = 'DAMGEU '
NEWS_ITALIC = '0123456789.–- NoYuwlNrkOmiMe'


def rename(font, family):
    name = font['name']

    def get(nid):
        rec = name.getName(nid, 3, 1, 0x409) or name.getName(nid, 1, 0, 0)
        return rec.toUnicode() if rec else None

    style = get(17) or get(2) or 'Regular'
    ps = (family + '-' + style).replace(' ', '')
    for rec in list(name.names):
        nid = rec.nameID
        if nid in (1, 16, 21):
            rec.string = family
        elif nid in (4, 18):
            rec.string = family if style == 'Regular' else f'{family} {style}'
        elif nid == 6:
            rec.string = ps
        elif nid == 3:
            rec.string = f'{ps};subset'
    name.names = [r for r in name.names
                  if not (r.nameID in (1, 4, 16, 18, 21) and r.toUnicode() not in (family, f'{family} {style}'))]


def build(src, out, text_chars, axes=None, family=None):
    font = TTFont(os.path.join(SRC, src), lazy=False)
    if axes:
        font = instancer.instantiateVariableFont(font, axes)
        buf = io.BytesIO()
        font.save(buf)
        buf.seek(0)
        font = TTFont(buf, lazy=False)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'pnum', 'lnum', 'tnum']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    sub = subset.Subsetter(opts)
    sub.populate(text=text_chars)
    sub.subset(font)
    if family:
        rename(font, family)
    path = os.path.join(OUT, out)
    font.flavor = 'woff2'
    font.save(path)
    print(out, os.path.getsize(path))


build('Hahmlet.ttf', 'hahmlet.woff2', hangul + latin, {'wght': (200, 400)})
build('Newsreader.ttf', 'newsreader.woff2', NEWS_ROMAN, {'wght': (300, 400), 'opsz': (12, 72)})
build('Newsreader-Italic.ttf', 'newsreader-italic.woff2', NEWS_ITALIC, {'wght': (300, 400), 'opsz': (12, 72)})
build('IBMPlexSansKR-Regular.ttf', 'plex-kr-400.woff2', hangul + latin, family='Damgeum Sans')
build('IBMPlexSansKR-Medium.ttf', 'plex-kr-500.woff2', hangul + latin, family='Damgeum Sans')

for lic in ('Hahmlet-OFL.txt', 'Newsreader-OFL.txt'):
    with open(os.path.join(SRC, lic), encoding='utf-8') as f:
        body = f.read()
    with open(os.path.join(OUT, lic), 'w', encoding='utf-8', newline='\n') as f:
        f.write(body)
