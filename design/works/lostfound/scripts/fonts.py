"""Subset the two families to every character works/lostfound can show, and check coverage.

    <fontenv>/python.exe -I design/works/lostfound/scripts/fonts.py <dir with the source TTFs>
    <fontenv>/python.exe -I design/works/lostfound/scripts/fonts.py --check

Sources (downloaded once into the scratch folder, not kept in the repo), github.com/google/fonts:
  ofl/poorstory/PoorStory-Regular.ttf          Yoon Design, SIL OFL 1.1, no Reserved Font Name
  ofl/nanumpenscript/NanumPenScript-Regular.ttf  Sandoll / NHN (NAVER), SIL OFL 1.1 with Reserved Font
                                                 Names "Nanum", "NanumPen", "Naver NanumPen" and others

A subset is a Modified Version under the OFL, so the Nanum Pen Script subset is renamed
"Kkoripyo Pen" (꼬리표 펜) inside the font and in CSS. Poor Story keeps its name (no RFN).
Both subsets hold the same set: every character in index.html and js/*.js (page copy, every case,
every hint template) plus printable ASCII. Re-run after changing copy or cases; it fails if a
character is missing from a source font.
"""
import html
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'lostfound'
OUT = SITE / 'fonts'

FACES = [
    # (source file, out stem, css family, renamed family or None)
    ('poorstory_PoorStory-Regular.ttf', 'poorstory', 'Poor Story', None),
    ('nanumpenscript_NanumPenScript-Regular.ttf', 'kkoripyo-pen', 'Kkoripyo Pen', 'Kkoripyo Pen'),
]


def used_chars():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    text = html.unescape(text)
    for js in sorted((SITE / 'js').glob('*.js')):
        src = js.read_text(encoding='utf-8')
        src = re.sub(r'(?m)^\s*//[^\n]*', '', src)
        src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        text += src
    chars = set(ch for ch in text if ord(ch) >= 32)
    chars |= set(chr(c) for c in range(32, 127))
    chars |= set('×‘’“”')
    chars.discard('﻿')
    return chars


def rename(font, family):
    style = 'Regular'
    ps = family.replace(' ', '') + '-' + style
    values = {1: family, 2: style, 3: f'{ps};subset for gallery.zanviq.dev/lostfound', 4: family, 6: ps, 16: family, 17: style}
    table = font['name']
    for rec in list(table.names):
        if rec.nameID in (1, 2, 3, 4, 6, 16, 17, 18, 21, 22):
            table.removeNames(nameID=rec.nameID, platformID=rec.platformID, platEncID=rec.platEncID, langID=rec.langID)
    for nid, val in values.items():
        table.setName(val, nid, 3, 1, 0x409)
        table.setName(val, nid, 1, 0, 0)
    table.setName('Modified Version (subset) of Nanum Pen Script by Sandoll Communication for NHN Corporation, '
                  'renamed under the SIL Open Font License 1.1 Reserved Font Name clause.', 10, 3, 1, 0x409)


def check():
    chars = used_chars()
    bad = 0
    for _, stem, family, _ in FACES:
        font = TTFont(OUT / f'{stem}.woff2')
        cmap = font.getBestCmap()
        missing = sorted(ch for ch in chars if ord(ch) not in cmap and not ch.isspace())
        names = sorted({r.toUnicode() for r in font['name'].names if r.nameID in (1, 4, 6, 16)})
        print(f'{family}: {len(chars)} characters used, names {names}, missing: {"".join(missing) if missing else "none"}')
        if any('nanum' in n.lower() for n in names):
            print('  RESERVED NAME STILL PRESENT')
            bad += 1
        bad += len(missing)
    return bad


def main():
    if sys.argv[1:] == ['--check']:
        sys.exit(1 if check() else 0)
    src = pathlib.Path(sys.argv[1])
    chars = used_chars()
    print(len(chars), 'distinct characters')
    OUT.mkdir(exist_ok=True)
    rules = []
    for fname, stem, family, newfam in FACES:
        font = TTFont(src / fname)
        cmap = font.getBestCmap()
        absent = sorted(ch for ch in chars if ord(ch) not in cmap and not ch.isspace())
        if absent:
            print(f'{family}: not in source font:', ''.join(absent))
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'vert', 'vrt2']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.hinting = False
        opts.desubroutinize = True
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[ord(c) for c in chars])
        sub.subset(font)
        if newfam:
            rename(font, newfam)
        font.flavor = 'woff2'
        path = OUT / f'{stem}.woff2'
        font.save(path)
        print(f'{path.name}: {path.stat().st_size / 1024:.1f} KB')
        rules.append('@font-face {\n'
                     f"  font-family: '{family}';\n"
                     f"  src: url('../fonts/{stem}.woff2') format('woff2');\n"
                     '  font-weight: 400;\n  font-style: normal;\n  font-display: swap;\n}\n')
    header = ('/* Generated by design/works/lostfound/scripts/fonts.py: subsets holding only the characters this game shows.\n'
              '   Poor Story: Yoon Design, SIL OFL 1.1 (fonts/OFL-PoorStory.txt).\n'
              '   Kkoripyo Pen: a renamed subset of Nanum Pen Script (Sandoll / NHN), SIL OFL 1.1 with Reserved\n'
              '   Font Names, see fonts/OFL-KkoripyoPen.txt. */\n')
    (SITE / 'css' / 'fonts.css').write_text(header + '\n'.join(rules), encoding='utf-8')
    sys.exit(1 if check() else 0)


if __name__ == '__main__':
    main()
