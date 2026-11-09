"""Subset Gowun Batang (400, 700) and Orbit (400) to the characters the page uses.

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/nighttrain/scripts/fonts.py <font source dir>

The source dir holds the Google Fonts originals (github.com/google/fonts, ofl/gowunbatang and
ofl/orbit): GowunBatang-Regular.ttf, GowunBatang-Bold.ttf, Orbit-Regular.ttf and their OFL.txt.
Neither licence declares a Reserved Font Name, so the family names stay as they are.
Scans works/nighttrain/index.html, js/*.js and css/*.css (content strings), writes woff2 files to
works/nighttrain/fonts/ and prints any character a face does not have. Re-run after copy changes.
"""
import pathlib
import re
import shutil
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'nighttrain'
OUT = SITE / 'fonts'
SRC = pathlib.Path(sys.argv[1])

FACES = [
    ('gowun-batang-400', 'gowunbatang_GowunBatang-Regular.ttf'),
    ('gowun-batang-700', 'gowunbatang_GowunBatang-Bold.ttf'),
    ('orbit-400', 'orbit_Orbit-Regular.ttf'),
]
FEATURES = ['kern', 'liga', 'ccmp', 'locl', 'mark', 'mkmk', 'tnum', 'case']


def used_chars():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    for js in sorted((SITE / 'js').glob('*.js')):
        text += js.read_text(encoding='utf-8')
    for css in sorted((SITE / 'css').glob('*.css')):
        text += ''.join(re.findall(r"content:\s*'([^']*)'", css.read_text(encoding='utf-8')))
    text = text.replace('&amp;', '&')
    chars = {ch for ch in text if ord(ch) >= 32}
    chars |= {chr(c) for c in range(32, 127)}
    chars |= set('·–—→←↑↓×−〃…‘’“”')
    chars.discard('﻿')
    return chars


def main():
    chars = used_chars()
    OUT.mkdir(exist_ok=True)
    sys.stdout.reconfigure(encoding='utf-8')
    for stem, src in FACES:
        font = TTFont(SRC / src)
        cmap = font.getBestCmap()
        missing = sorted(ch for ch in chars if ord(ch) not in cmap and not ch.isspace())
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = FEATURES
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.hinting = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[ord(c) for c in chars if ord(c) in cmap])
        sub.subset(font)
        out = OUT / f'{stem}.woff2'
        font.flavor = 'woff2'
        font.save(out)
        print(f'{out.name}: {out.stat().st_size / 1024:.1f} KB, missing: {"".join(missing) or "none"}')
    shutil.copy(SRC / 'gowunbatang_OFL.txt', OUT / 'OFL-GowunBatang.txt')
    shutil.copy(SRC / 'orbit_OFL.txt', OUT / 'OFL-Orbit.txt')


if __name__ == '__main__':
    main()
