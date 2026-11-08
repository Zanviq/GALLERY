"""Convert the captures from make_stills.sh into the files the site and the gallery use.

    python -I finish_images.py <stills-dir> <repo-root>
"""
import os
import sys
from PIL import Image, ImageStat

S, R = sys.argv[1], sys.argv[2]
img_dir = os.path.join(R, 'works', 'perfume', 'img')


def check(im, name):
    st = ImageStat.Stat(im.convert('L'))
    if st.stddev[0] < 6 or st.mean[0] < 4:
        raise SystemExit(f'{name} looks blank (mean {st.mean[0]:.1f}, sd {st.stddev[0]:.1f})')


for sc in ['yuwol', 'jocheong', 'omi', 'meok']:
    for base, q in [(f'still-{sc}', 80), (f'still-{sc}-tall', 80), (f'bottle-{sc}', 82)]:
        im = Image.open(os.path.join(S, base + '.png')).convert('RGB')
        check(im, base)
        out = os.path.join(img_dir, base + '.webp')
        im.save(out, 'WEBP', quality=q, method=6)
        print(base, im.size, os.path.getsize(out))

t = Image.open(os.path.join(S, 'thumb.png')).convert('RGB')
check(t, 'thumb')
assert t.size == (1200, 900), t.size
tp = os.path.join(R, 'thumbnails', 'perfume.webp')
t.save(tp, 'WEBP', quality=82, method=6)
print('thumbnail', t.size, os.path.getsize(tp))

o = Image.open(os.path.join(S, 'og.png')).convert('RGB')
check(o, 'og')
assert o.size == (1200, 630), o.size
op = os.path.join(R, 'og', 'perfume.png')
o.save(op, 'PNG', optimize=True)
print('og', o.size, os.path.getsize(op))
