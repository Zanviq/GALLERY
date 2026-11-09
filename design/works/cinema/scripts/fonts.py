"""Subset Diphylleia and LINE Seed Sans KR to what works/cinema uses.

    <fontenv>/python.exe -I design/works/cinema/scripts/fonts.py <dir with source fonts>

Sources (downloaded once into the scratch folder, not kept in the repo):
  Diphylleia-Regular.ttf      github.com/google/fonts/ofl/diphylleia   (OFL 1.1, no Reserved Font Name)
  LINESeedKR-Rg.ttf, -Bd.ttf  seed.line.me/src/images/fonts/LINE_Seed_Sans_KR.zip, TTF folder
                              (OFL 1.1, "(c) LY Corporation", no Reserved Font Name; name ID 7 says
                              "LINE Seed KR is a registered trademark of LY Corporation")

Neither licence declares a Reserved Font Name. LINE Seed's family name is a registered trademark, so the
subset (a modified version) is renamed to "Jeommyeol Sans" anyway, in the name table and in CSS/JS.
Diphylleia keeps its name.

Diphylleia: only the display text (headings, the title, dates, theatre names, the wax-pencil note).
Jeommyeol Sans 400 / 700: every character on the page and in the scripts.
Fails if a used character is missing or has an empty outline.
"""
import html
import pathlib
import re
import subprocess
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'cinema'
OUT = SITE / 'fonts'
SRC = pathlib.Path(sys.argv[1])
RENAMER = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None

DISPLAY_TAGS = re.compile(r'<(h1|h2|h3)\b[^>]*>(.*?)</\1>', re.S)
DISPLAY_CLASS = re.compile(
    r'class="[^"]*\b(top__mark|foot__mark|release__date|cinemas__name|gv__day|note__by|hero__log|poster__tag'
    r'|poster__date|script__h)\b[^"]*"[^>]*>(.*?)</(a|p|span|h2)>', re.S)
# strings the canvas draws in Diphylleia (js/frames.js, js/sheet.js)
DISPLAY_JS = '점멸 예고편 3안'


def page_text():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    return html.unescape(text)


def js_text():
    out = ''
    for js in sorted((SITE / 'js').glob('*.js')):
        src = js.read_text(encoding='utf-8')
        src = re.sub(r'(?m)^\s*//[^\n]*', '', src)
        src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        out += src
    return out


def all_chars():
    chars = set(ch for ch in page_text() + js_text() if ord(ch) >= 32)
    chars |= set(chr(c) for c in range(32, 127))
    chars |= set('·‘’“”…–—')
    chars.discard('﻿')
    return chars


def display_chars():
    t = page_text()
    parts = [m.group(2) for m in DISPLAY_TAGS.finditer(t)] + [m.group(2) for m in DISPLAY_CLASS.finditer(t)]
    text = re.sub(r'<[^>]+>', '', ' '.join(parts)) + DISPLAY_JS
    chars = set(text) | set('0123456789')
    return set(ch for ch in chars if ord(ch) >= 32)


def check(font, chars, stem):
    cmap = font.getBestCmap()
    glyf = font['glyf'] if 'glyf' in font else None
    bad = []
    for ch in sorted(chars):
        if ch.isspace():
            continue
        g = cmap.get(ord(ch))
        if g is None:
            bad.append(f'{ch} U+{ord(ch):04X} missing')
        elif glyf is not None and glyf[g].numberOfContours == 0:
            bad.append(f'{ch} U+{ord(ch):04X} empty')
    if bad:
        print(f'{stem}: PROBLEM', ', '.join(bad))
    return not bad


FACES = [
    # source, out stem, css family, weight, char set, rename to
    ('Diphylleia-Regular.ttf', 'diphylleia-400', 'Diphylleia', 400, 'display', None),
    ('LINESeedKR-Rg.ttf', 'jeommyeol-sans-400', 'Jeommyeol Sans', 400, 'body', 'Jeommyeol Sans'),
    ('LINESeedKR-Bd.ttf', 'jeommyeol-sans-700', 'Jeommyeol Sans', 700, 'body', 'Jeommyeol Sans'),
]


def main():
    sets = {'display': display_chars(), 'body': all_chars()}
    print({k: len(v) for k, v in sets.items()}, 'characters')
    print('display:', ''.join(sorted(sets['display'])))
    OUT.mkdir(exist_ok=True)
    rules = []
    ok = True
    for src, stem, family, weight, which, rename in FACES:
        font = TTFont(SRC / src)
        chars = sets[which]
        ok &= check(font, chars, stem)
        cmap = font.getBestCmap()
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'vert', 'vrt2']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.hinting = False
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[ord(c) for c in chars if ord(c) in cmap])
        sub.subset(font)
        path = OUT / f'{stem}.woff2'
        font.flavor = 'woff2'
        font.save(path)
        if rename and RENAMER:
            subprocess.run([sys.executable, '-I', str(RENAMER), str(path), rename], check=True)
        print(f'{path.name}  {path.stat().st_size / 1024:.1f} KB')
        rules.append('@font-face {\n'
                     f"  font-family: '{family}';\n"
                     f"  src: url('../fonts/{stem}.woff2') format('woff2');\n"
                     f'  font-weight: {weight};\n'
                     '  font-style: normal;\n'
                     '  font-display: swap;\n'
                     '}\n')
    header = ('/* Generated by design/works/cinema/scripts/fonts.py. Subsets holding only the characters this page uses.\n'
              '   Diphylleia: SIL OFL 1.1, Copyright 2022 The Diphylleia Project Authors (fonts/OFL-Diphylleia.txt).\n'
              '   Jeommyeol Sans: a renamed subset of LINE Seed Sans KR, SIL OFL 1.1, (c) LY Corporation\n'
              '   (fonts/OFL-LINESeedSansKR.txt). Neither declares a Reserved Font Name; LINE Seed is renamed because\n'
              '   its family name is a registered trademark. */\n')
    (SITE / 'css' / 'fonts.css').write_text(header + '\n'.join(rules), encoding='utf-8')
    print('wrote css/fonts.css')
    if not ok:
        sys.exit(1)


if __name__ == '__main__':
    main()
