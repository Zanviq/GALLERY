"""Check that text set in each face exists in that face's subset.
    <fontenv>/python.exe -I glyphs.py <works/laundry/fonts> <jua-text.txt from check.mjs>
Also re-checks every character of index.html + js/*.js against the body face."""
import pathlib, re, sys, html
from fontTools.ttLib import TTFont
fonts = pathlib.Path(sys.argv[1])
jua = set(TTFont(fonts / 'jua.woff2').getBestCmap())
body = [set(TTFont(fonts / f'ppodeuk-round-{w}.woff2').getBestCmap()) for w in (400, 700, 800)]
t = pathlib.Path(sys.argv[2]).read_text(encoding='utf-8')
miss = sorted({c for c in t if not c.isspace() and ord(c) not in jua})
print('Jua-set text:', len(set(t)), 'chars; missing in Jua subset:', ' '.join(f'U+{ord(c):04X}' for c in miss) or 'none')
site = fonts.parent
src = html.unescape(re.sub(r'<!--.*?-->', '', (site / 'index.html').read_text(encoding='utf-8'), flags=re.S))
for js in (site / 'js').glob('*.js'):
    src += js.read_text(encoding='utf-8')
chars = {c for c in src if not c.isspace() and ord(c) >= 32}
for w, cm in zip((400, 700, 800), body):
    m = sorted(c for c in chars if ord(c) not in cm)
    print(f'body {w}: missing', ' '.join(f'U+{ord(c):04X}' for c in m) or 'none')
