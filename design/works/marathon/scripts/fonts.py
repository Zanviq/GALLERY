"""Subset the two families to the characters the page uses (build tool, not deployed).

    <scratchpad>/fontenv/Scripts/python.exe -I design/works/marathon/scripts/fonts.py

Sources (downloaded once into the scratchpad, see DESIGN.md / the licence files):
  GasoekOne-Regular.ttf          google/fonts ofl/gasoekone (OFL 1.1, no Reserved Font Name)
  SpoqaHanSansNeo-{Regular,Bold}.ttf   spoqa/spoqa-han-sans Original/SpoqaHanSansNeo (OFL 1.1,
                                 Reserved Font Name "Spoqa Han Sans Neo")
A subset is a Modified Version under the OFL, so the Spoqa subsets are renamed to the family
"Goteunnae Sans" with <scratchpad>/tools/rename_font.py (BRIEF §5); CSS uses that name only.
Writes works/marathon/fonts/*.woff2 and checks that every character on the page is covered.
"""
import html as htmlmod
import pathlib
import re
import subprocess
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

sys.stdout.reconfigure(encoding='utf-8')
ROOT = pathlib.Path(__file__).resolve().parents[4]
SITE = ROOT / 'works' / 'marathon'
SCRATCH = pathlib.Path(r'C:\Users\jaemi\AppData\Local\Temp\claude\7e6ff043f79a9415'
                       r'\ab92f51c-d44a-48f8-b922-d120aba180a3\scratchpad')
SRC = SCRATCH / 'marathon' / 'fonts'
RENAME = SCRATCH / 'tools' / 'rename_font.py'
TEXT_FAMILY = 'Goteunnae Sans'
ASCII = ''.join(chr(c) for c in range(32, 127))


def page_text():
    text = (SITE / 'index.html').read_text(encoding='utf-8')
    body = text
    for js in sorted((SITE / 'js').glob('*.js')):
        body += js.read_text(encoding='utf-8')
    return htmlmod.unescape(body)


def display_text():
    """Text set in Gasoek One: headings, times, big figures, the brand and the footer mark."""
    src = htmlmod.unescape((SITE / 'index.html').read_text(encoding='utf-8'))
    parts = []
    parts += re.findall(r'<h[1-3][^>]*>(.*?)</h[1-3]>', src, flags=re.S)
    parts += re.findall(r'<time[^>]*>(.*?)</time>', src, flags=re.S)
    for cls in ('hero__date', 'steps__when', 'foot__mark', 'top__brand', 'ev__dist'):
        parts += re.findall(r'class="' + cls + r'"[^>]*>(.*?)</(?:p|a|span)>', src, flags=re.S)
    parts += re.findall(r'<td class="t">(.*?)</td>', src)
    parts += re.findall(r'<ul class="paces[^"]*">(.*?)</ul>', src, flags=re.S)
    parts += re.findall(r'<b>(.*?)</b>', src)
    t = re.sub(r'<[^>]+>', '', ' '.join(parts))
    return t


def subset_font(src, out, chars):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.name_languages = ['*']
    opts.name_legacy = True
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    font = subset.load_font(str(src), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(font)
    subset.save_font(font, str(out), opts)
    return out.stat().st_size


def note_origin(path):
    """Name ID 7 of the source repeats the reserved name; replace it with a plain origin note."""
    font = TTFont(str(path))
    for rec in font['name'].names:
        if rec.nameID == 7:
            rec.string = ('Renamed subset of Spoqa Han Sans Neo by Spoqa, '
                          'SIL Open Font License 1.1 (Reserved Font Name).')
    font.save(str(path))


def covered(path, chars):
    cmap = TTFont(str(path)).getBestCmap()
    return sorted({c for c in chars if ord(c) >= 32 and ord(c) not in cmap and not c.isspace()})


def main():
    all_chars = ''.join(sorted(set(page_text()) | set(ASCII) | set('–·…')))
    disp = ''.join(sorted(set(display_text()) | set(ASCII) | set('–·')))
    out = SITE / 'fonts'
    out.mkdir(exist_ok=True)
    jobs = [
        (SRC / 'GasoekOne-Regular.ttf', out / 'gasoek-one.woff2', disp, None),
        (SRC / 'spoqa-dl' / 'SpoqaHanSansNeo-Regular.ttf', out / 'goteunnae-sans-400.woff2', all_chars, TEXT_FAMILY),
        (SRC / 'spoqa-dl' / 'SpoqaHanSansNeo-Bold.ttf', out / 'goteunnae-sans-700.woff2', all_chars, TEXT_FAMILY),
    ]
    ok = True
    for src, dst, chars, family in jobs:
        subset_font(src, dst, chars)
        if family:   # Reserved Font Name: the subset must not carry the original family name
            subprocess.run([sys.executable, '-I', str(RENAME), str(dst), family], check=True)
            note_origin(dst)
        size = dst.stat().st_size
        miss = covered(dst, chars.replace('\n', ''))
        hangul = [c for c in miss if '\uac00' <= c <= '\ud7a3' or c.isalnum()]
        print(f'{dst.name}: {size / 1024:.1f} KB, {len(set(chars))} chars, missing {"".join(miss)!r}')
        if hangul:
            ok = False
    if not ok:
        sys.exit('some letters are missing from a font')


if __name__ == '__main__':
    main()
