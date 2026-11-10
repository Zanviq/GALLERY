"""Subset the page fonts to the characters the page uses, and check coverage (dev tool, not deployed).

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/kite/scripts/fonts.py <jua.ttf> <freesentation-dir>

- Jua (OFL, no Reserved Font Name) only gets what is set in Jua: headings, dates, times, numbers,
  names, the wind's Beaufort names, plus ASCII digits and punctuation.
- Freesentation 4 Regular and 7 Bold (OFL 1.1, no Reserved Font Name) get every character of the HTML
  and the JS strings. Its name table says "Freesentation is a trademark of Lee Juim", so the modified
  (subset) fonts are renamed to "Hanui Text" and the CSS uses only that name.
Re-run after every copy change. Exits non-zero if any character on the page is missing.
"""
import os
import re
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
SITE = os.path.join(ROOT, 'works', 'kite')
OUT = os.path.join(SITE, 'fonts')

JUA_CLASSES = [
    'hero__title', 'hero__day', 'head__title', 'day__date', 'runs__time', 'make__title', 'kite__name',
    'rules', 'akmagi__title', 'steps__time', 'addr', 'bring__title', 'foot__mark', 'mark', 'wind__name',
    'map__label--river', 'match__nums', 'hero__facts',
]


def page_text():
    html = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
    js = ''
    for f in sorted(os.listdir(os.path.join(SITE, 'js'))):
        js += open(os.path.join(SITE, 'js', f), encoding='utf-8').read()
    return html, js


def visible(html):
    t = re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.S)
    alts = ' '.join(re.findall(r'(?:alt|aria-label|title)="([^"]*)"', t))
    t = re.sub(r'<[^>]+>', ' ', t)
    return t.replace('&amp;', '&') + ' ' + alts


def jua_text(html, js):
    parts = []
    for cls in JUA_CLASSES:
        for m in re.finditer(r'<(\w+)[^>]*class="[^"]*\b' + re.escape(cls) + r'\b[^"]*"[^>]*>', html):
            tag = m.group(1)
            # text up to the element's closing tag (good enough: these elements do not nest their own tag)
            end = html.find(f'</{tag}>', m.end())
            if tag in ('ol', 'ul'):
                end = html.find(f'</{tag}>', m.end())
            parts.append(re.sub(r'<[^>]+>', ' ', html[m.end():end]))
    # Beaufort names in wind.js
    parts += re.findall(r"'([가-힣]+)'", js)
    parts.append(''.join(chr(c) for c in range(0x20, 0x7f)))
    parts.append('–·…‘’“”→')
    return set(''.join(parts))


def all_text(html, js):
    chars = set(visible(html))
    chars |= set(''.join(re.findall(r"'([^']*)'", js)))
    chars |= set(''.join(re.findall(r'`([^`]*)`', js)))
    chars |= set(chr(c) for c in range(0x20, 0x7f))
    chars |= set('–—·…‘’“”→←×')
    return chars


def clean(chars):
    return {c for c in chars if c.isprintable() and c not in ' ﻿'}


def subset_font(src, dst, chars, rename=None, style=None):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'tnum', 'ccmp', 'locl', 'mark', 'mkmk']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(chars)))
    sub.subset(font)
    if rename:
        name = font['name']
        ps = (rename + '-' + style).replace(' ', '')
        keep = []
        for r in name.names:
            nid = r.nameID
            if nid in (1, 16):
                r.string = rename
            elif nid in (2, 17):
                r.string = style
            elif nid in (4, 18):
                r.string = f'{rename} {style}'
            elif nid == 6:
                r.string = ps
            elif nid == 3:
                r.string = f'{ps};subset of Freesentation 2.001'
            # drop the Korean-language family names, which still say 프리젠테이션
            if r.langID != 0x409 and r.platformID == 3 and nid in (1, 4, 16, 17, 18):
                continue
            keep.append(r)
        name.names = keep
        if 'CFF ' in font:
            font['CFF '].cff.fontNames = [ps]
    subset.save_font(font, dst, opts)
    cmap = font.getBestCmap()
    missing = sorted(c for c in chars if ord(c) not in cmap and not c.isspace())
    print(f'{os.path.relpath(dst, ROOT)}  {os.path.getsize(dst) // 1024} KB  glyphs {len(cmap)}  missing {"".join(missing) or "-"}')
    return missing


def main():
    jua, fs_dir = sys.argv[1], sys.argv[2]
    html, js = page_text()
    os.makedirs(OUT, exist_ok=True)
    every = clean(all_text(html, js))
    disp = clean(jua_text(html, js))
    bad = []
    m = subset_font(jua, os.path.join(OUT, 'jua.woff2'), disp)
    # Jua is display only; anything it lacks falls back to Hanui Text, which must have everything
    if m:
        print('  (Jua lacks these; they fall back to Hanui Text):', ''.join(m))
    for w, f, style in ((400, 'Freesentation-4Regular.ttf', 'Regular'), (700, 'Freesentation-7Bold.ttf', 'Bold')):
        bad += subset_font(os.path.join(fs_dir, f), os.path.join(OUT, f'hanui-text-{w}.woff2'), every,
                           rename='Hanui Text', style=style)
    print('characters on the page:', len(every), ' set in Jua:', len(disp))
    if bad:
        print('MISSING in Hanui Text:', ''.join(sorted(set(bad))))
        sys.exit(1)


if __name__ == '__main__':
    main()
