"""Subset the two fonts to what the page sets, and check coverage (run with the fontenv python, -I).

    <scratchpad>/fontenv/Scripts/python.exe -I subset_fonts.py <dir with RIDIBatang.otf> <dir with LibreCaslonText.ttf>

- RIDIBatang (OFL 1.1, (c) 2019 RIDI & Sandoll, no Reserved Font Name; name ID 7 records "RIDIBatang"
  as a RIDI trademark) -> fonts/saheul-batang.woff2, family renamed "Saheul Batang" so the modified
  subset is never mistaken for the original.
- Libre Caslon Text (OFL 1.1, no Reserved Font Name), variable wght pinned to 400 -> fonts/caslon-text.woff2.
  Only digits, Latin and the punctuation used in numerals and units.
Then every character of index.html, the CSS and the scripts is checked against the subsets.
"""
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'works', 'coffee'))
OUT = os.path.join(SITE, 'fonts')
os.makedirs(OUT, exist_ok=True)
ridi_dir, caslon_dir = sys.argv[1], sys.argv[2]


def page_text():
    text = ''
    for name in ('index.html', 'css/site.css', 'js/main.js', 'js/grinder.js', 'js/sound.js'):
        text += open(os.path.join(SITE, name), encoding='utf-8').read()
    for ent, ch in (('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'), ('&nbsp;', '\u00a0')):  # keep U+00A0 (number + unit)
        text = text.replace(ent, ch)
    return text


text = page_text()
chars = {c for c in text if ord(c) >= 32}
chars |= {chr(c) for c in range(32, 127)}
chars |= set('–—·…‘’“”°μ×')
batang_text = ''.join(sorted(chars))
caslon_text = ''.join(sorted(set(chr(c) for c in range(32, 127)) | set('–—·°μ×’\u00a0')))


def make(src, dst, keep, family=None, pin=None):
    font = TTFont(src)
    if pin:
        font = instancer.instantiateVariableFont(font, pin)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'lnum', 'pnum', 'tnum', 'onum', 'ccmp', 'locl', 'mark', 'mkmk']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(text=keep)
    sub.subset(font)
    if family:
        name = font['name']
        style = 'Regular'
        ps = family.replace(' ', '') + '-' + style
        for rec in name.names:
            if rec.nameID in (1, 16, 21):
                rec.string = family
            elif rec.nameID in (4, 18):
                rec.string = family
            elif rec.nameID == 6:
                rec.string = ps
            elif rec.nameID == 3:
                rec.string = ps + ';subset'
        name.names = [r for r in name.names if not (r.nameID in (1, 4, 16, 18, 21) and r.toUnicode() != family)]
        if 'CFF ' in font:
            cff = font['CFF '].cff
            cff.fontNames = [ps]
            top = cff.topDictIndex[0]
            for k in ('FullName', 'FamilyName'):
                if hasattr(top, k):
                    setattr(top, k, family)
    font.save(dst)
    print(os.path.basename(dst), os.path.getsize(dst) // 1024, 'KB', len(font.getBestCmap()), 'chars')
    return set(font.getBestCmap())


b = make(os.path.join(ridi_dir, 'RIDIBatang.otf'), os.path.join(OUT, 'saheul-batang.woff2'), batang_text, family='Saheul Batang')
c = make(os.path.join(caslon_dir, 'LibreCaslonText.ttf'), os.path.join(OUT, 'caslon-text.woff2'), caslon_text, pin={'wght': 400})

# coverage: everything rendered must be in Saheul Batang (Caslon only sets digits and Latin)
visible = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
visible = re.sub(r'^\s*//.*$', '', visible, flags=re.M)
need = {ch for ch in visible if ord(ch) > 32}
miss_b = sorted(hex(ord(ch)) + ' ' + ch for ch in need if ord(ch) not in b)
num_need = set('0123456789,.:–-+g°Cμm×')
miss_c = sorted(ch for ch in num_need if ord(ch) not in c)
print('characters checked', len(need))
print('missing in Saheul Batang:', miss_b or 'none')
print('missing in Caslon (numerals/units):', miss_c or 'none')
