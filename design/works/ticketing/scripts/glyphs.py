"""Check that every character in index.html + js/*.js exists in the Apjul Sans subsets (dev tool)."""
import html, pathlib, sys
from fontTools.ttLib import TTFont
SITE = pathlib.Path(__file__).resolve().parents[4] / 'works' / 'ticketing'
text = (SITE / 'index.html').read_text(encoding='utf-8') + ''.join(p.read_text(encoding='utf-8') for p in (SITE / 'js').glob('*.js'))
chars = set(html.unescape(text)) - set('\n\r\t﻿')
for w in ('400', '600', '800'):
    f = TTFont(SITE / 'fonts' / f'apjul-sans-{w}.woff2')
    cmap = f.getBestCmap()
    missing = sorted(c for c in chars if ord(c) not in cmap and ord(c) >= 32)
    print(w, f['name'].getDebugName(1), 'missing:', ''.join(missing) or 'none')
