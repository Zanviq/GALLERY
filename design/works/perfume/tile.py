"""python -I tile.py out.png w h a.png b.png ... : stack images vertically at w x h each."""
import sys
from PIL import Image
out, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims = [Image.open(p).convert('RGB').resize((w, h), Image.LANCZOS) for p in sys.argv[4:]]
o = Image.new('RGB', (w, h * len(ims)))
for i, im in enumerate(ims):
    o.paste(im, (0, h * i))
o.save(out)
