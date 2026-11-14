"""Subset 이롭게 바탕체 Medium (as "Bamcha Batang") and Orbit 400 to the characters the page uses.

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/nighttrain/scripts/fonts.py <font source dir>

The source dir holds:
  IropkeBatangM.otf          github.com/iropke/font-iropke-batang (master), the official repo
                             linked from font.iropke.com/batang. OFL 1.1, Copyright (c) 2016,
                             이롭게(iropke), Reserved Font Name '이롭게 바탕체', 'iropke batang'.
                             A subset is a Modified Version, so the family is renamed
                             "Bamcha Batang" in the name table (and in css/site.css).
  orbit_Orbit-Regular.ttf    github.com/google/fonts ofl/orbit. OFL 1.1, no Reserved Font Name.
  orbit_OFL.txt
Scans works/nighttrain/index.html (entities decoded), js/*.js and css/*.css (content strings),
writes woff2 files to works/nighttrain/fonts/ and prints any character a face does not have.
Re-run after copy changes. (Until 2026-11-14 the serif was Gowun Batang 400/700.)
"""
import html
import pathlib
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'nighttrain'
OUT = SITE / 'fonts'
SRC = pathlib.Path(sys.argv[1])

# (output stem, source file, new family name or None)
FACES = [
    ('bamcha-batang-500', 'IropkeBatangM.otf', 'Bamcha Batang'),
    ('orbit-400', 'orbit_Orbit-Regular.ttf', None),
]
FEATURES = ['kern', 'liga', 'ccmp', 'locl', 'mark', 'mkmk', 'tnum', 'case']


def used_chars():
    text = html.unescape((SITE / 'index.html').read_text(encoding='utf-8'))
    for js in sorted((SITE / 'js').glob('*.js')):
        src = js.read_text(encoding='utf-8')
        text += src + re.sub(r'\\u([0-9A-Fa-f]{4})', lambda m: chr(int(m.group(1), 16)), src)
    for css in sorted((SITE / 'css').glob('*.css')):
        text += ''.join(re.findall(r"content:\s*'([^']*)'", css.read_text(encoding='utf-8')))
    chars = {ch for ch in text if ord(ch) >= 32}
    chars |= {chr(c) for c in range(32, 127)}
    chars |= set('·–—→←↑↓×−〃…‘’“” ')
    chars -= {'﻿', '⁠'}  # word joiner is default-ignorable; never drawn
    return chars


def rename(font, family):
    """OFL Reserved Font Name: the modified (subset) font must not carry the original name."""
    name = font['name']
    style = 'Medium'
    ps = family.replace(' ', '') + '-' + style
    keep = []
    for rec in name.names:
        nid = rec.nameID
        if nid in (1, 16):
            rec.string = family
        elif nid in (2,):
            rec.string = 'Regular'
        elif nid == 17:
            rec.string = style
        elif nid in (4, 18):
            rec.string = f'{family} {style}'
        elif nid == 6:
            rec.string = ps
        elif nid == 3:
            rec.string = f'{ps};subset;zanviq gallery'
        elif nid == 5:
            pass
        elif nid in (21, 22):
            continue
        keep.append(rec)
    # drop localised copies (they repeat the reserved Korean name)
    name.names = [r for r in keep if not (r.nameID in (1, 2, 3, 4, 6, 16, 17, 18) and r.langID not in (0x409, 0))]
    if 'CFF ' in font:
        cff = font['CFF '].cff
        cff.fontNames = [ps]
        top = cff.topDictIndex[0]
        for key in ('FullName', 'FamilyName'):
            if hasattr(top, key):
                setattr(top, key, f'{family} {style}' if key == 'FullName' else family)


def main():
    chars = used_chars()
    OUT.mkdir(exist_ok=True)
    sys.stdout.reconfigure(encoding='utf-8')
    for stem, src, family in FACES:
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
        opts.desubroutinize = True
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[ord(c) for c in chars if ord(c) in cmap])
        sub.subset(font)
        if family:
            rename(font, family)
        out = OUT / f'{stem}.woff2'
        font.flavor = 'woff2'
        font.save(out)
        print(f'{out.name}: {out.stat().st_size / 1024:.1f} KB, {len(font.getBestCmap())} chars, missing: {"".join(missing) or "none"}')


if __name__ == '__main__':
    main()
