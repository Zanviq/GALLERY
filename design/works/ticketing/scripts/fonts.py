"""Subset the fonts of works/ticketing to the characters the page uses (dev tool, not deployed).

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/ticketing/scripts/fonts.py <pretendard dir> <rename_font.py>

- Apjul Sans = Pretendard 1.3.9 (official GitHub release, public/static/*.otf), subset with
  fontTools to every character in index.html + js/*.js, then renamed (OFL Reserved Font Name
  "Pretendard") with the shared rename_font.py.
- Big Shoulders Display: Google Fonts css2 `text=` subset (variable wght 500..900), ASCII and the
  few symbols set in it.
Re-run whenever copy changes.
"""
import html
import pathlib
import re
import subprocess
import sys
import urllib.parse
import urllib.request

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'ticketing'
OUT = SITE / 'fonts'
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
PT_DIR = pathlib.Path(sys.argv[1])
RENAMER = sys.argv[2]
WEIGHTS = [('400', 'Regular'), ('600', 'SemiBold'), ('800', 'ExtraBold')]


def used_chars():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    for js in sorted((SITE / 'js').glob('*.js')):
        text += js.read_text(encoding='utf-8')
    text = html.unescape(text)
    chars = set(ch for ch in text if ord(ch) >= 32)
    chars |= set(chr(c) for c in range(32, 127))
    chars |= set('·–—‘’“”…×−→←↑↓〈〉※')
    chars.discard('﻿')
    return ''.join(sorted(chars))


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')


def main():
    chars = used_chars()
    print(len(chars), 'unique characters;', sum(1 for c in chars if '가' <= c <= '힣'), 'hangul syllables')
    OUT.mkdir(exist_ok=True)
    for w, style in WEIGHTS:
        src = PT_DIR / f'Pretendard-{style}.otf'
        dst = OUT / f'apjul-sans-{w}.woff2'
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['kern', 'liga', 'calt', 'tnum', 'case', 'ccmp', 'locl', 'mark', 'mkmk']
        opts.hinting = False
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        font = subset.load_font(str(src), opts)
        s = subset.Subsetter(options=opts)
        s.populate(text=chars)
        s.subset(font)
        subset.save_font(font, str(dst), opts)
        subprocess.run([sys.executable, '-I', RENAMER, str(dst), 'Apjul Sans'], check=True)
        print(f'{dst.name}  {dst.stat().st_size / 1024:.1f} KB')

    num_text = ''.join(chr(c) for c in range(32, 127)) + '·×−'
    url = ('https://fonts.googleapis.com/css2?family=' + urllib.parse.quote('Big Shoulders Display:wght@500..900', safe=':@;.,')
           + '&display=swap&text=' + urllib.parse.quote(num_text, safe=''))
    css = fetch(url)
    srcs = re.findall(r'src:\s*url\(([^)]+)\)\s*format\([\'"]?woff2', css)
    if len(srcs) != 1:
        sys.exit('big shoulders: expected one woff2\n' + css[:400])
    data = fetch(srcs[0], binary=True)
    (OUT / 'big-shoulders.woff2').write_bytes(data)
    print(f'big-shoulders.woff2  {len(data) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
