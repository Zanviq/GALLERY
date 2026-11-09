"""Subset the two faces to the characters shadowplay uses and self-host them.

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/shadowplay/scripts/fonts.py

Moirai One (title only): the <h1> text plus the OG title.
Gamja Flower (everything else): every character in index.html and js/*.js (captions, canvas labels,
live-region messages) plus printable ASCII. Re-run whenever copy changes, then run font_check.py.
Both families are SIL OFL 1.1 with no Reserved Font Name, so the family names stay as they are.
"""
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'shadowplay'
OUT = SITE / 'fonts'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
OG_TITLE = '집채만 한 그림자'


def title_chars():
    html = (SITE / 'index.html').read_text(encoding='utf-8')
    parts = re.findall(r'<h1[^>]*>(.*?)</h1>', html, flags=re.S) + [OG_TITLE]
    text = re.sub(r'<[^>]+>', '', ' '.join(parts))
    return ''.join(sorted(set(ch for ch in text if ord(ch) >= 32)))


def all_chars():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    for js in sorted((SITE / 'js').glob('*.js')):
        text += js.read_text(encoding='utf-8')
    chars = set(ch for ch in text if ord(ch) >= 32)
    chars |= set(chr(c) for c in range(32, 127))
    chars.discard('﻿')
    return ''.join(sorted(chars))


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')


def get(family, chars, stem):
    url = ('https://fonts.googleapis.com/css2?family=' + urllib.parse.quote(family)
           + '&display=swap&text=' + urllib.parse.quote(chars, safe=''))
    css = fetch(url)
    srcs = re.findall(r'src:\s*url\(([^)]+)\)\s*format\([\'"]?woff2', css)
    if len(srcs) != 1:
        sys.exit(f'{stem}: expected one woff2, got {len(srcs)}\n{css[:400]}')
    data = fetch(srcs[0], binary=True)
    (OUT / f'{stem}.woff2').write_bytes(data)
    print(f'{stem}.woff2  {len(chars)} chars  {len(data) / 1024:.1f} KB')


def main():
    OUT.mkdir(exist_ok=True)
    get('Moirai One', title_chars(), 'moirai-one')
    get('Gamja Flower', all_chars(), 'gamja-flower')


if __name__ == '__main__':
    main()
