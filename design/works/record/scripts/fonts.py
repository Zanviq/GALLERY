"""Subset the fonts of works/record to the glyphs the page uses, rename the NAVER family, check coverage.

    <scratchpad>/fontenv/Scripts/python.exe -I fonts.py <font source dir> <rename_font.py>

- Moirai One (OFL, no Reserved Font Name): only the characters set in display type.
- Nanum Barun Gothic 400/700 (OFL, NAVER reserves "NanumBarunGothic"): every character in the HTML
  (text and attributes) and the JS files, renamed "Gipeun Sans" in the name table.
- Fails loudly if any needed character is missing from a subset.
"""
import glob
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

from fontTools import subset
from fontTools.ttLib import TTFont

SRC, RENAMER = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'works', 'record'))
OUT = os.path.join(WORK, 'fonts')
os.makedirs(OUT, exist_ok=True)

DISPLAY = {'hero__title', 'h2', 'facts__big', 'nums__big', 'order__big', 'show__big', 'foot__word',
           'top__brand', 'label__side', 'label__title', 'sleeve__title', 'pre__done-h'}


class Collect(HTMLParser):
    def __init__(self):
        super().__init__()
        self.all, self.display, self.stack = set(), set(), []

    def handle_starttag(self, tag, attrs):
        cls = set((dict(attrs).get('class') or '').split())
        void = tag in ('img', 'meta', 'link', 'input', 'br', 'source')
        if not void:
            self.stack.append(bool(cls & DISPLAY))
        for k, v in attrs:
            if v and k in ('alt', 'aria-label', 'aria-valuetext', 'title', 'content', 'placeholder', 'value'):
                self.all.update(v)

    def handle_endtag(self, tag):
        if self.stack:
            self.stack.pop()

    def handle_data(self, data):
        self.all.update(data)
        if any(self.stack):
            self.display.update(data)


html = open(os.path.join(WORK, 'index.html'), encoding='utf-8').read()
c = Collect()
c.feed(html)
text = set(c.all)
for js in glob.glob(os.path.join(WORK, 'js', '*.js')):
    text.update(open(js, encoding='utf-8').read())
text.update(chr(i) for i in range(0x20, 0x7f))
text.update('·–—…“”‘’《》「」⅓×')
display = set(c.display) | set('AB0123456789.,:-원 ') | set('예약했습니다')
text = {ch for ch in text if ch >= ' ' and ch not in '​'}
display = {ch for ch in display if ch >= ' '}


def make(src, out, chars, rename=None):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'frac', 'ccmp', 'locl']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.hinting = False
    opts.notdef_outline = True
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(chars)))
    sub.subset(font)
    subset.save_font(font, out, opts)
    if rename:
        subprocess.run([sys.executable, '-I', RENAMER, out, rename], check=True)
    cmap = TTFont(out).getBestCmap()
    missing = sorted(ch for ch in chars if ch.strip() and ord(ch) not in cmap)
    print(f'{os.path.basename(out)}: {len(chars)} chars, {os.path.getsize(out) // 1024} KB, missing {"".join(missing) or "none"}')
    return missing


miss = []
miss += make(os.path.join(SRC, 'MoiraiOne-Regular.ttf'), os.path.join(OUT, 'moirai-one.woff2'), display)
miss += make(os.path.join(SRC, 'NanumBarunGothicWeb.ttf'), os.path.join(OUT, 'gipeun-sans-400.woff2'), text, 'Gipeun Sans')
miss += make(os.path.join(SRC, 'NanumBarunGothicWebBold.ttf'), os.path.join(OUT, 'gipeun-sans-700.woff2'), text, 'Gipeun Sans')
if miss:
    print('MISSING GLYPHS:', ''.join(sorted(set(miss))))
    sys.exit(1)
