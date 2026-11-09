"""Check that every character on the page exists in the subset fonts (run with the fontenv python)."""
import os, re
from fontTools.ttLib import TTFont
SITE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..', 'works', 'keyboard'))
text = ''
for name in ('index.html', 'js/reserve.js', 'css/site.css'):
    text += open(os.path.join(SITE, name), encoding='utf-8').read()
text = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', text, flags=re.S)
text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)  # CSS comments are never rendered
chars = {c for c in text if ord(c) > 32}
ws = set(TTFont(os.path.join(SITE, 'fonts', 'wanted-sans.woff2')).getBestCmap())
ar = set(TTFont(os.path.join(SITE, 'fonts', 'archivo.woff2')).getBestCmap())
missing = sorted(hex(ord(c)) for c in chars if ord(c) not in ws)
print('chars', len(chars), 'missing in Wanted Sans:', missing)
wide = set('GARAK0123456789.,×°–-')
print('missing in Archivo:', sorted(c for c in wide if ord(c) not in ar))
