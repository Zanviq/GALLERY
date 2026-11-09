"""Check that every character shadowplay can show exists in the subset fonts.

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/shadowplay/scripts/font_check.py
"""
import pathlib
import re
import sys

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'shadowplay'


def cmap(name):
    f = TTFont(SITE / 'fonts' / name)
    return set(f.getBestCmap().keys())


def main():
    html = (SITE / 'index.html').read_text(encoding='utf-8')
    body = html.split('<body>', 1)[1]
    head_title = re.findall(r'<title>(.*?)</title>', html)
    text = re.sub(r'<[^>]+>', ' ', body) + ' '.join(head_title)
    for js in sorted((SITE / 'js').glob('*.js')):
        src = js.read_text(encoding='utf-8')
        text += ' '.join(re.findall(r"'([^'\n]*)'|`([^`]*)`", src) and
                         [a or b for a, b in re.findall(r"'([^'\n]*)'|`([^`]*)`", src)])
    gamja = cmap('gamja-flower.woff2')
    moirai = cmap('moirai-one.woff2')
    h1 = re.sub(r'<[^>]+>', '', re.findall(r'<h1[^>]*>(.*?)</h1>', html, flags=re.S)[0])
    miss = sorted(set(ch for ch in text if ord(ch) > 32 and ord(ch) not in gamja))
    miss_t = sorted(set(ch for ch in h1 if ord(ch) > 32 and ord(ch) not in moirai))
    print('Gamja Flower glyphs:', len(gamja), 'missing:', ''.join(miss) or 'none')
    print('Moirai One glyphs:', len(moirai), 'missing in title:', ''.join(miss_t) or 'none')
    sys.exit(1 if miss or miss_t else 0)


if __name__ == '__main__':
    main()
