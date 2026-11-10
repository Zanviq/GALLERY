"""Check that every character on the page exists in the subset fonts (run with the fontenv python).

Covers index.html, the CSS, every script, and every syllable the typing line (js/hangul.js) can build.
"""
import importlib.util
import os
import re

from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'works', 'keyboard'))
text = ''
for name in ('index.html', 'css/site.css', 'js/reserve.js', 'js/try.js', 'js/hangul.js', 'js/audio.js'):
    text += open(os.path.join(SITE, name), encoding='utf-8').read()
text = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', text, flags=re.S)
text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)  # CSS comments are never rendered
text = re.sub(r'^\s*//.*$', '', text, flags=re.M)  # JS line comments are never rendered

# the typing line's syllables, from the same generator the subset uses
spec = importlib.util.spec_from_file_location('sub', os.path.join(HERE, '..', 'scratch', 'subset.py'))
src = open(spec.origin, encoding='utf-8').read()
ns = {}
exec(src[src.index('def line_syllables'):src.index('text = page_text()')], ns)
line = ns['line_syllables']()

chars = {c for c in text if ord(c) > 32} | line | set('ㅁㄴㅇㄹㅎㅗㅓㅏㅣㅘㅚ')
ws = set(TTFont(os.path.join(SITE, 'fonts', 'wanted-sans.woff2')).getBestCmap())
ar = set(TTFont(os.path.join(SITE, 'fonts', 'archivo.woff2')).getBestCmap())
missing = sorted(hex(ord(c)) for c in chars if ord(c) not in ws)
print('chars', len(chars), '(line syllables', len(line), ') missing in Wanted Sans:', missing)
wide = set('GARAK0123456789.,×°–-ASDFGHJKL')
print('missing in Archivo:', sorted(c for c in wide if ord(c) not in ar))
