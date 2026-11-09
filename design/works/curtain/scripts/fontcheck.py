"""Every character the page can show must be in both subset fonts.

    fontenv/Scripts/python.exe -I design/works/curtain/scripts/fontcheck.py
"""
import pathlib
import re

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'curtain'

html = (SITE / 'index.html').read_text(encoding='utf-8')
text = re.sub(r'<[^>]+>', ' ', re.sub(r'<(script|style)[^>]*>.*?</\1>', ' ', html, flags=re.S))
text += ' '.join(re.findall(r'(?:content|alt|aria-label)="([^"]*)"', html))
for js in sorted((SITE / 'js').glob('*.js')):
    src = js.read_text(encoding='utf-8')
    text += ' '.join(re.findall(r"'([^'\n]*)'", src)) + ' '.join(re.findall(r'`([^`]*)`', src))
for name in ('grandiflora.woff2', 'baekyeol-sans.woff2'):
    cmap = TTFont(SITE / 'fonts' / name).getBestCmap()
    missing = sorted(set(c for c in text if ord(c) > 32 and ord(c) not in cmap))
    print(f'{name}: {len(set(text))} chars checked, missing:', ' '.join(f'U+{ord(c):04X}' for c in missing) or 'none')
