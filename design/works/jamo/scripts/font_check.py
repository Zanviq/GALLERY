"""Check that every character in works/jamo (index.html and js/*.js) is in fonts/orbit.woff2.

    <fontenv>/python -I design/works/jamo/scripts/font_check.py
"""
import sys

from fontTools.ttLib import TTFont

sys.path.insert(0, __import__('os').path.dirname(__file__))
from hangul import SITE  # noqa: E402

sys.stdout.reconfigure(encoding='utf-8')

cmap = TTFont(SITE / 'fonts' / 'orbit.woff2').getBestCmap()
text = (SITE / 'index.html').read_text(encoding='utf-8')
for js in sorted((SITE / 'js').glob('*.js')):
    text += js.read_text(encoding='utf-8')
chars = sorted(set(ch for ch in text if ord(ch) >= 32 and not ch.isspace()) - {'﻿'})
missing = [ch for ch in chars if ord(ch) not in cmap]
print(f'{len(chars)} distinct characters in page and scripts, {len(cmap)} in the subset')
print('missing:', ''.join(missing) if missing else 'none')
sys.exit(1 if missing else 0)
