"""Subset the two web fonts to the glyphs works/keyboard actually uses.

    <fontenv python> -I subset.py <font-src-dir>

font-src-dir holds WantedSansVariable.ttf and Archivo.ttf (Archivo[wdth,wght]).
Writes works/keyboard/fonts/wanted-sans.woff2 and archivo.woff2.
Re-run after changing any Korean copy in index.html or js/*.js.
"""
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'works', 'keyboard'))
SRC = sys.argv[1]


def page_text():
    chunks = []
    for root, _dirs, files in os.walk(SITE):
        if 'vendor' in root:
            continue
        for name in files:
            if name.endswith(('.html', '.js', '.css')):
                with open(os.path.join(root, name), encoding='utf-8') as fh:
                    chunks.append(fh.read())
    text = '\n'.join(chunks)
    text = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), text)
    return text


text = page_text()
ascii_set = ''.join(chr(c) for c in range(0x20, 0x7F))
jamo = ''.join(chr(c) for c in range(0x3131, 0x3164))  # compatibility jamo
extra = '₩×°–—‘’“”…·←↑→↓■□○●'
hangul = sorted({ch for ch in text if '가' <= ch <= '힣'})
chars = ''.join(sorted(set(ascii_set + jamo + extra + ''.join(hangul))))
print('hangul syllables:', len(hangul), 'total chars:', len(chars))

out_dir = os.path.join(SITE, 'fonts')
os.makedirs(out_dir, exist_ok=True)


def run(src, dst, text_chars, axes=None):
    font = TTFont(src)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'tnum', 'ccmp', 'locl', 'mark', 'mkmk', 'ljmo', 'vjmo', 'tjmo']
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(text=text_chars)
    sub.subset(font)
    if axes:
        font = instancer.instantiateVariableFont(font, axes)
    font.flavor = 'woff2'
    font.save(dst)
    print(os.path.basename(dst), os.path.getsize(dst) // 1024, 'KB')


run(os.path.join(SRC, 'WantedSansVariable.ttf'), os.path.join(out_dir, 'wanted-sans.woff2'), chars,
    axes={'wght': (400, 900)})
latin = ''.join(sorted(set(ascii_set + '₩×°–—‘’“”…←↑→↓')))
run(os.path.join(SRC, 'Archivo.ttf'), os.path.join(out_dir, 'archivo.woff2'), latin,
    axes={'wght': (400, 800), 'wdth': (100, 125)})
