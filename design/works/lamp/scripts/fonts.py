"""Subset, rename and check the fonts of works/lamp (dev tool, not deployed).

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/lamp/scripts/fonts.py <dir with source fonts>

Sources (not committed): MaruBuri-{ExtraLight,Light,Regular,SemiBold}.ttf from NAVER's Hangeul
webfont CDN, HankenGrotesk[wght].ttf from google/fonts.
- MaruBuri is subset to the characters of index.html and js/*.js and renamed "Gyeotbang Serif"
  (NAVER reserves the MaruBuri name, BRIEF §5). ExtraLight only carries the two display words.
- Hanken Grotesk (no Reserved Font Name) is subset to printable ASCII and a few symbols.
Then every character on the page is checked against the subset that sets it.
"""
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

SRC = sys.argv[1]
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SITE = os.path.join(ROOT, 'works', 'lamp')
OUT = os.path.join(SITE, 'fonts')
os.makedirs(OUT, exist_ok=True)
FAMILY = 'Gyeotbang Serif'


def page_text():
    html = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
    js = ''.join(open(os.path.join(SITE, 'js', f), encoding='utf-8').read()
                 for f in sorted(os.listdir(os.path.join(SITE, 'js'))) if f.endswith('.js'))
    text = re.sub(r'&nbsp;', ' ', html + js)
    return text


ASCII = ''.join(chr(c) for c in range(32, 127))
EXTRA = '–—−×°·…‘’“” '  # U+00A0: the no-break space between numbers and units (&nbsp;,   in JS)
text = page_text()
korean_all = ''.join(sorted(set(ch for ch in text if ord(ch) > 126) | set(ASCII) | set(EXTRA)))
display = ''.join(sorted(set('이슥곁방 ')))


def make(src, out, chars, rename=True):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'tnum', 'lnum', 'ccmp', 'locl']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.drop_tables += ['DSIG']
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(font)
    subset.save_font(font, out, opts)
    return out


jobs = [
    ('MaruBuri-ExtraLight.ttf', 'gyeotbang-serif-200.woff2', display),
    ('MaruBuri-Light.ttf', 'gyeotbang-serif-300.woff2', korean_all),
    ('MaruBuri-Regular.ttf', 'gyeotbang-serif-400.woff2', korean_all),
    ('MaruBuri-SemiBold.ttf', 'gyeotbang-serif-600.woff2', korean_all),
]
for src, out, chars in jobs:
    path = make(os.path.join(SRC, src), os.path.join(OUT, out), chars)
    # Rename the family (Reserved Font Name), same logic as tools/rename_font.py.
    f = TTFont(path)
    name = f['name']
    style = (name.getName(17, 3, 1, 0x409) or name.getName(2, 3, 1, 0x409)).toUnicode()
    style = {'ExtraLight': 'ExtraLight', 'Light': 'Light', 'Regular': 'Regular', 'SemiBold': 'SemiBold'}.get(style, style)
    ps = (FAMILY + '-' + style).replace(' ', '')
    keep = []
    for rec in name.names:
        nid = rec.nameID
        if nid in (1, 16, 21):
            rec.string = FAMILY
        elif nid in (4, 18):
            rec.string = FAMILY if style == 'Regular' else f'{FAMILY} {style}'
        elif nid == 6:
            rec.string = ps
        elif nid == 3:
            rec.string = f'{ps};subset'
        if rec.langID not in (0x409, 0) and nid in (1, 3, 4, 6, 16, 18, 21):
            continue  # drop localised family names (they carry the reserved Korean name)
        keep.append(rec)
    name.names = keep
    f.save(path)
    left = [r.toUnicode() for r in f['name'].names if 'maru' in r.toUnicode().lower() or '마루' in r.toUnicode()]
    print(f'{out}: {os.path.getsize(path) / 1024:.1f} KB, {len(f.getGlyphOrder())} glyphs, reserved name left: {left}')

hanken = ASCII + EXTRA
path = make(os.path.join(SRC, 'HankenGrotesk.ttf'), os.path.join(OUT, 'hanken-grotesk.woff2'), hanken)
print(f'hanken-grotesk.woff2: {os.path.getsize(path) / 1024:.1f} KB')

# Coverage: every non-space character on the page must be in the 400/300/600 subsets;
# the display words in the 200 subset; and every ASCII/symbol in Hanken.
missing = {}
for fn, chars in [('gyeotbang-serif-400.woff2', korean_all), ('gyeotbang-serif-300.woff2', korean_all),
                  ('gyeotbang-serif-600.woff2', korean_all), ('gyeotbang-serif-200.woff2', display),
                  ('hanken-grotesk.woff2', hanken)]:
    cmap = TTFont(os.path.join(OUT, fn)).getBestCmap()
    need = set(chars) - set(' \n\t')
    miss = sorted(ch for ch in need if ord(ch) not in cmap)
    if miss:
        missing[fn] = miss
page_chars = set(ch for ch in text if ord(ch) > 126) - set(korean_all)
print('page chars outside the subset list:', sorted(page_chars))
print('missing glyphs:', {k: ''.join(v) for k, v in missing.items()} or 'none')
