"""Every character the page can show must be in the subset font.

    python -I design/works/curtain/scripts/fontcheck.py
"""
import pathlib
import re

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'curtain'

html = (SITE / 'index.html').read_text(encoding='utf-8')
text = re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.S))
for js in sorted((SITE / 'js').glob('*.js')):
    src = js.read_text(encoding='utf-8')
    text += ' '.join(re.findall(r"'([^'\n]*)'", src)) + ' '.join(re.findall(r'`([^`]*)`', src))
cmap = TTFont(SITE / 'fonts' / 'grandiflora.woff2').getBestCmap()
missing = sorted(set(c for c in text if ord(c) > 32 and ord(c) not in cmap))
print('chars checked:', len(set(text)), 'missing:', ' '.join(f'U+{ord(c):04X}' for c in missing) or 'none')
