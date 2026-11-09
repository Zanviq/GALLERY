"""Check that every character a web font draws on the page is in its subset file.

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/riso/scripts/fontcheck.py <check.mjs output file>

Reads the FONTCHARS line printed by check.mjs (characters per computed font family, taken from the
rendered page, so JS-made text is included) and compares with the woff2 cmaps.
"""
import json
import pathlib
import sys

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
FILES = {
    'Black Han Sans': ROOT / 'works' / 'riso' / 'fonts' / 'black-han-sans.woff2',
    'Gowun Dodum': ROOT / 'works' / 'riso' / 'fonts' / 'gowun-dodum.woff2',
}
line = next(l for l in pathlib.Path(sys.argv[1]).read_text(encoding='utf-8').splitlines() if l.startswith('FONTCHARS '))
used = json.loads(line[len('FONTCHARS '):])
ok = True
for fam, chars in used.items():
    if fam not in FILES:
        print(f'{fam}: not a web font of this page ({len(chars)} chars) -> {chars[:40]}')
        continue
    cmap = TTFont(str(FILES[fam])).getBestCmap()
    missing = ''.join(c for c in chars if ord(c) not in cmap)
    print(f'{fam}: {len(chars)} chars used, missing: {missing or "none"}')
    ok &= not missing
sys.exit(0 if ok else 1)
