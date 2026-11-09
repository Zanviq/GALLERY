"""Check that every character on the page exists in both subset fonts (dev tool).
    <scratchpad>/fontenv/Scripts/python.exe -I design/works/ramen/scripts/glyphs.py
"""
import html, pathlib, re
from fontTools.ttLib import TTFont
SITE = pathlib.Path(__file__).resolve().parents[4] / 'works' / 'ramen'
text = (SITE / 'index.html').read_text(encoding='utf-8')
text = html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', text, flags=re.S)))
text += ''.join(re.findall(r"[`'\"]([^`'\"]*[가-힣][^`'\"]*)[`'\"]", (SITE / 'js' / 'main.js').read_text(encoding='utf-8')))
chars = {c for c in text if ord(c) > 32 and not c.isspace()}
for f in sorted((SITE / 'fonts').glob('*.woff2')):
    cmap = TTFont(f).getBestCmap()
    missing = sorted(c for c in chars if ord(c) not in cmap)
    print(f.name, len(cmap), 'glyphs; missing:', [hex(ord(c)) for c in missing] or 'none')
