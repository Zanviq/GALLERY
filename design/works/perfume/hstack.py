"""python -I hstack.py out.png h a.png b.png ... : place images side by side at height h."""
import sys
from PIL import Image
out, h = sys.argv[1], int(sys.argv[2])
ims = [Image.open(p).convert('RGB') for p in sys.argv[3:]]
ims = [im.resize((round(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
o = Image.new('RGB', (sum(i.width for i in ims), h))
x = 0
for im in ims:
    o.paste(im, (x, 0)); x += im.width
o.save(out)
