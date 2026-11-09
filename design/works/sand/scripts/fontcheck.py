"""Check that every character the sand page can show exists in the subset font.

    <fontenv python> -I design/works/sand/scripts/fontcheck.py

Text comes from index.html (element text and aria-label/alt/title attributes, without scripts,
styles and comments) and from string literals in js/*.js (comments removed).
"""
import html
import pathlib
import re
import sys

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'sand'


def html_text():
    src = (SITE / 'index.html').read_text(encoding='utf-8')
    src = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    src = re.sub(r'<(script|style|svg)\b.*?</\1>', '', src, flags=re.S)
    attrs = ' '.join(re.findall(r'(?:aria-label|alt|title)="([^"]*)"', src))
    body = re.search(r'<body>(.*)</body>', src, flags=re.S).group(1)
    text = re.sub(r'<[^>]+>', ' ', body)
    title = re.search(r'<title>(.*?)</title>', src).group(1)
    return html.unescape(text + ' ' + attrs + ' ' + title)


def js_text():
    out = []
    for js in sorted((SITE / 'js').glob('*.js')):
        src = js.read_text(encoding='utf-8')
        src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
        src = re.sub(r'(?m)(^|[^:\'"`])//.*$', r'\1', src)
        out += re.findall(r"'((?:[^'\\\n]|\\.)*)'", src)
        out += re.findall(r'"((?:[^"\\\n]|\\.)*)"', src)
        out += re.findall(r'`((?:[^`\\]|\\.)*)`', src)
    return ' '.join(out)


def main():
    font = TTFont(SITE / 'fonts' / 'bwp.woff2')
    cmap = set(font.getBestCmap())
    text = html_text() + ' ' + js_text()
    missing = sorted({ch for ch in text if ch.strip() and ord(ch) not in cmap})
    if missing:
        print('MISSING', ' '.join(f'{c} U+{ord(c):04X}' for c in missing))
        sys.exit(1)
    print(f'font ok: {len({c for c in text if c.strip()})} distinct visible characters all in bwp.woff2 ({len(cmap)} in cmap)')


if __name__ == '__main__':
    main()
