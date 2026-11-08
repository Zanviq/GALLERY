"""Subset the OFL fonts to the characters this site uses and write woff2 files.

python -I subset_fonts.py <fontdir> <pylib-with-brotli>

- Anybody (wdth/wght, upright + italic): Latin only
- Hahmlet (wght): Hangul that appears in display contexts (headings, act names, stage/tide names)
- IBM Plex Sans KR 400/600: every character in index.html and the js files
Run again whenever copy changes.
"""
import glob, json, os, re, sys
from html.parser import HTMLParser

FONTDIR, PYLIB = sys.argv[1], sys.argv[2]
sys.path.insert(0, PYLIB)  # brotli for woff2
from fontTools import subset  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
SITE = os.path.join(REPO, 'works', 'festival')
OUT = os.path.join(SITE, 'fonts')
os.makedirs(OUT, exist_ok=True)

page = open(os.path.join(SITE, 'index.html'), encoding='utf-8').read()
js = ''.join(open(p, encoding='utf-8').read() for p in glob.glob(os.path.join(SITE, 'js', '*.js')))
everything = page + js

ascii_ = ''.join(chr(c) for c in range(0x20, 0x7F))
latin1 = ''.join(chr(c) for c in range(0xA0, 0x100))
punct = '–—‘’“”…·•×←→↗₩№'


class Display(HTMLParser):
    """Collect text inside elements that are set in Hahmlet."""
    TAGS = {'h1', 'h2', 'h3', 'summary'}
    CLASSES = ('sec-title', 'mast__ko', 'top__brand', 'menu', 'foot__mark', 'stub__name', 'plain__day', 'days__dow',
               'map__label', 'map__sealabel', 'dock__panel-title', 'lead__text')

    def __init__(self):
        super().__init__()
        self.depth = 0
        self.stack = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get('class', '') or ''
        hit = tag in self.TAGS or any(c in cls for c in self.CLASSES)
        if tag in ('br', 'img', 'input', 'meta', 'link', 'path', 'circle', 'rect'):
            return
        self.stack.append(hit)
        if hit:
            self.depth += 1

    def handle_endtag(self, tag):
        if tag in ('br', 'img', 'input', 'meta', 'link', 'path', 'circle', 'rect'):
            return
        if self.stack and self.stack.pop():
            self.depth -= 1

    def handle_data(self, data):
        if self.depth > 0:
            self.text.append(data)


p = Display()
p.feed(page)
data_src = open(os.path.join(SITE, 'js', 'data.js'), encoding='utf-8').read()
data_hangul = ''.join(re.findall(r'[가-힣]', data_src))
# strings set in Hahmlet from JS (marked with /*hl*/ in the source)
js_hl = ''.join(re.findall(r"/\*hl\*/\s*'([^']*)'", js))
# Hahmlet text that only exists in JS: ticket names, the sold-out mark
tickets_src = open(os.path.join(SITE, 'js', 'tickets.js'), encoding='utf-8').read()
js_display = ''.join(re.findall(r"name: '([^']*)'", tickets_src)) + '마감'
display = ''.join(p.text) + data_hangul + js_hl + js_display + '너울' + '0123456789.–'


def chars(s):
    return sorted({c for c in s if ord(c) >= 0x20})


def run(src, dst, text, extra_features=()):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'tnum', 'ljmo', 'vjmo', 'tjmo', *extra_features]
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    font = subset.load_font(src, opts)
    s = subset.Subsetter(opts)
    s.populate(text=''.join(text))
    s.subset(font)
    subset.save_font(font, dst, opts)
    print(f'{os.path.basename(dst):28s} {os.path.getsize(dst) / 1024:7.1f} KB  ({len(text)} chars)')


lat = chars(ascii_ + latin1 + punct)
run(os.path.join(FONTDIR, 'anybody', 'Anybody[wdth,wght].ttf'), os.path.join(OUT, 'anybody.woff2'), lat)
run(os.path.join(FONTDIR, 'anybody', 'Anybody-Italic[wdth,wght].ttf'), os.path.join(OUT, 'anybody-italic.woff2'), lat)
run(os.path.join(FONTDIR, 'hahmlet', 'Hahmlet[wght].ttf'), os.path.join(OUT, 'hahmlet.woff2'), chars(display + ascii_))
body = chars(everything + ascii_ + punct)
run(os.path.join(FONTDIR, 'ibmplexsanskr', 'IBMPlexSansKR-Regular.ttf'), os.path.join(OUT, 'plex-kr-400.woff2'), body)
run(os.path.join(FONTDIR, 'ibmplexsanskr', 'IBMPlexSansKR-SemiBold.ttf'), os.path.join(OUT, 'plex-kr-600.woff2'), body)
