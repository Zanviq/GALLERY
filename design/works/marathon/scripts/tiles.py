"""Cut a full-page capture into viewport-sized tiles for review (dev tool)."""
import sys
from PIL import Image
src, prefix, th = sys.argv[1], sys.argv[2], int(sys.argv[3])
start = int(sys.argv[4]) if len(sys.argv) > 4 else 0
im = Image.open(src)
y, i = start, 0
while y < im.height:
    im.crop((0, y, im.width, min(y + th, im.height))).save(f'{prefix}{i:02d}.png')
    y += th; i += 1
print(i, 'tiles')
