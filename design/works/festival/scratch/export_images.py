"""Turn the headless captures into the gallery thumbnail (webp, 1200x900) and the share image (png, 1200x630)."""
import sys
from PIL import Image, ImageStat
shots, repo = sys.argv[1], sys.argv[2]
t = Image.open(f'{shots}/thumb.png').convert('RGB')
o = Image.open(f'{shots}/og.png').convert('RGB')
for name, im in (('thumb', t), ('og', o)):
    st = ImageStat.Stat(im)
    print(name, im.size, 'mean', [round(m) for m in st.mean], 'stddev', [round(s) for s in st.stddev])
assert t.size == (1200, 900) and o.size == (1200, 630)
t.save(f'{repo}/thumbnails/festival.webp', 'WEBP', quality=82, method=6)
o.save(f'{repo}/og/festival.png', 'PNG', optimize=True)
print('saved')
