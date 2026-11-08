"""Writes the plain (no-JS / screen reader / reduced motion) lineup lists into
works/festival/index.html between <!-- lineup:start --> and <!-- lineup:end -->.

python -I gen_html.py
"""
import html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
SITE = os.path.join(REPO, 'works', 'festival')
src = open(os.path.join(SITE, 'js', 'data.js'), encoding='utf-8').read()
DATA = json.loads(src[src.index('{'):src.rindex('}') + 1])
ACTS = {a['id']: a for a in DATA['acts']}
STAGES = {s['id']: s['name'] for s in DATA['stages']}


def hangul(s):
    return any('가' <= c <= '힣' for c in s)


out = []
for d in DATA['days']:
    month, day = d['md'].split('.')
    out.append(f'<div class="plain" data-day="{d["id"]}">')
    out.append(f'  <h2 class="plain__day">{month}월 {day}일 {d["dowLong"]} <span>{d["tide"]}</span></h2>')
    out.append('  <ol class="plain__list">')
    for row in d['rows']:
        for aid in row:
            a = ACTS[aid]
            name = html.escape(a['name'])
            if hangul(a['name']):
                nm = f'<span class="plain__name">{name}</span>'
            else:
                nm = f'<span class="plain__name" lang="en">{name}</span> <span class="plain__ko">{html.escape(a["ko"])}</span>'
            meta = f'{html.escape(a["genre"])}, {STAGES[a["stage"]]} {a["start"]}–{a["end"]}'
            out.append(f'    <li>{nm} <span class="plain__meta">{meta}</span></li>')
    out.append('  </ol>')
    out.append('</div>')

path = os.path.join(SITE, 'index.html')
page = open(path, encoding='utf-8').read()
block = '<!-- lineup:start -->\n' + '\n'.join(out) + '\n<!-- lineup:end -->'
page = re.sub(r'<!-- lineup:start -->.*?<!-- lineup:end -->', lambda m: block, page, flags=re.S)
open(path, 'w', encoding='utf-8', newline='\n').write(page)
print('lineup lists written')
