"""Print a font's name table (copyright, licence, family) and basic coverage. Dev tool.
    <fontenv>/python.exe -I names.py font.ttf [...]
"""
import sys
from fontTools.ttLib import TTFont
sys.stdout.reconfigure(encoding='utf-8')
for p in sys.argv[1:]:
    f = TTFont(p)
    print('==', p)
    for r in f['name'].names:
        if r.nameID in (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13, 14, 16, 17) and r.platformID == 3:
            print(r.nameID, r.langID, repr(r.toUnicode())[:400])
    cmap = f.getBestCmap()
    print('glyphs', len(cmap), 'hangul', sum(1 for c in cmap if 0xAC00 <= c <= 0xD7A3), 'upm', f['head'].unitsPerEm,
          'asc', f['hhea'].ascent, 'desc', f['hhea'].descent, 'gap', f['hhea'].lineGap,
          'typo', f['OS/2'].sTypoAscender, f['OS/2'].sTypoDescender, f['OS/2'].sTypoLineGap, 'win', f['OS/2'].usWinAscent, f['OS/2'].usWinDescent)
