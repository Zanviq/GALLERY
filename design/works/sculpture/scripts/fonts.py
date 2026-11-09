"""Subset the fonts of works/sculpture to the characters the page uses and self-host them.

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/sculpture/scripts/fonts.py

Asks the Google Fonts css2 API for a `text=` subset of each face (woff2), writes them to
works/sculpture/fonts/ and writes works/sculpture/css/fonts.css. Then checks, with fontTools,
that every character each face is asked to set really has a glyph, and draws the favicon
(the syllable 닳 in Noto Serif KR 900, as an SVG path) into works/sculpture/img/favicon.svg.

  Noto Serif KR 200  the "worn" weight: the second syllable of the title and the lead sentence
  Noto Serif KR 400  every character in the page (body, captions, alt text)
  Noto Serif KR 900  headings, the title's first syllable, catalogue titles
  Schibsted Grotesk 400 / 700  Latin, figures and punctuation only (dates, sizes, numbers)

Licences: both SIL OFL 1.1 and neither declares a Reserved Font Name (Noto Serif KR on Google
Fonts: "Copyright 2012 Google Inc."; Schibsted Grotesk: "Copyright 2023 The Schibsted-Grotesk
Project Authors"), so the subsets keep their names. The licence texts sit in works/sculpture/fonts/.
Re-run whenever the copy changes.
"""
import html
import pathlib
import re
import sys
import urllib.parse
import urllib.request

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'sculpture'
OUT = SITE / 'fonts'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')

ASCII = ''.join(chr(c) for c in range(32, 127))
EXTRA = '–—·×‘’“”…'

FACES = [
    # (file stem, css family, google query, weight, which text set)
    ('noto-serif-kr-200', 'Noto Serif KR', 'Noto Serif KR:wght@200', 200, 'worn'),
    ('noto-serif-kr-400', 'Noto Serif KR', 'Noto Serif KR:wght@400', 400, 'all'),
    ('noto-serif-kr-900', 'Noto Serif KR', 'Noto Serif KR:wght@900', 900, 'heavy'),
    ('schibsted-grotesk-400', 'Schibsted Grotesk', 'Schibsted Grotesk:wght@400', 400, 'latin'),
    ('schibsted-grotesk-700', 'Schibsted Grotesk', 'Schibsted Grotesk:wght@700', 700, 'latin'),
]


def page():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    return re.sub(r'<!--.*?-->', '', text, flags=re.S)


def inner(fragments):
    text = html.unescape(re.sub(r'<[^>]+>', '', ' '.join(fragments)))
    return set(ch for ch in text if ord(ch) >= 32)


def by_class(src, names):
    out = []
    for m in re.finditer(r'<(\w+)\b[^>]*class="([^"]*)"[^>]*>', src):
        if not set(m.group(2).split()) & names:
            continue
        tag, start = m.group(1), m.end()
        depth, i = 1, start
        pat = re.compile(r'<(/?)' + tag + r'\b[^>]*>')
        for t in pat.finditer(src, start):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                i = t.start()
                break
        out.append(src[start:i])
    return out


def sets():
    src = page()
    everything = set(ch for ch in html.unescape(src) if ord(ch) >= 32) | set(ASCII) | set(EXTRA)
    everything.discard('﻿')
    heavy = inner(re.findall(r'<h[1-3]\b[^>]*>(.*?)</h[1-3]>', src, flags=re.S)
                  + by_class(src, {'t-900', 'poster__new', 'poster__artist', 'row__ko', 'bio__name', 'no', 'row__no'}))
    worn = inner(by_class(src, {'t-200', 'poster__worn', 'lead'}))
    heavy |= set(ASCII)
    worn |= set('0123456789.,')
    return {'all': everything, 'heavy': heavy, 'worn': worn, 'latin': set(ASCII) | set(EXTRA)}


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')


def check(path, chars):
    font = TTFont(path)
    cmap = font.getBestCmap()
    missing = sorted(ch for ch in chars if not ch.isspace() and ord(ch) not in cmap)
    return font, missing


def favicon(font):
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord('닳')]
    upm = font['head'].unitsPerEm
    pen = SVGPathPen(gs)
    # flip y, centre the glyph in a 64x64 box with a little margin
    g = gs[name]
    scale = 50 / upm
    tp = TransformPen(pen, (scale, 0, 0, -scale, (64 - g.width * scale) / 2, 32 + 0.38 * upm * scale))
    g.draw(tp)
    d = pen.getCommands()
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
           '<rect width="64" height="64" fill="#1E9A47"/>'
           f'<path d="{d}" fill="#0A0A0A"/></svg>\n')
    (SITE / 'img' / 'favicon.svg').write_text(svg, encoding='utf-8')
    print('wrote img/favicon.svg', len(svg), 'bytes')


def main():
    s = sets()
    print({k: len(v) for k, v in s.items()}, 'characters per set')
    OUT.mkdir(exist_ok=True)
    rules, bad = [], False
    for stem, family, query, weight, which in FACES:
        chars = ''.join(sorted(s[which]))
        url = ('https://fonts.googleapis.com/css2?family=' + urllib.parse.quote(query, safe=':@;.,')
               + '&display=swap&text=' + urllib.parse.quote(chars, safe=''))
        css = fetch(url)
        srcs = re.findall(r'src:\s*url\(([^)]+)\)\s*format\([\'"]?woff2', css)
        if len(srcs) != 1:
            sys.exit(f'{stem}: expected one woff2, got {len(srcs)}\n{css[:400]}')
        data = fetch(srcs[0], binary=True)
        path = OUT / f'{stem}.woff2'
        path.write_bytes(data)
        font, missing = check(path, s[which])
        print(f'{stem}.woff2  {len(data) / 1024:.1f} KB  missing: {"".join(missing) or "none"}')
        if missing and which != 'latin':
            bad = True
        if stem == 'noto-serif-kr-900':
            favicon(font)
        rules.append(
            '@font-face {\n'
            f"  font-family: '{family}';\n"
            f"  src: url('../fonts/{stem}.woff2') format('woff2');\n"
            f'  font-weight: {weight};\n'
            '  font-style: normal;\n'
            '  font-display: swap;\n'
            '}\n')
    header = ('/* Generated by design/works/sculpture/scripts/fonts.py: subsets of Noto Serif KR and\n'
              '   Schibsted Grotesk (both SIL OFL 1.1) holding only the characters this page uses. */\n')
    (SITE / 'css' / 'fonts.css').write_text(header + '\n'.join(rules), encoding='utf-8')
    print('wrote css/fonts.css')
    if bad:
        sys.exit('some characters are missing')


if __name__ == '__main__':
    main()
