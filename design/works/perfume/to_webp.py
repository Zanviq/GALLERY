"""python -I to_webp.py <out-dir> <quality> <in.png>... : convert PNG captures to webp, same basename."""
import os
import sys
from PIL import Image
out, q = sys.argv[1], int(sys.argv[2])
for p in sys.argv[3:]:
    im = Image.open(p).convert('RGB')
    dst = os.path.join(out, os.path.splitext(os.path.basename(p))[0] + '.webp')
    im.save(dst, 'WEBP', quality=q, method=6)
    print(os.path.basename(dst), im.size, os.path.getsize(dst))
