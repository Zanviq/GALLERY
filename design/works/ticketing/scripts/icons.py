"""Raster favicons for works/ticketing (dev tool): python -I icons.py <works/ticketing/img>"""
import sys
from PIL import Image, ImageDraw
out = sys.argv[1]
for size, name in ((32, 'favicon-32.png'), (180, 'apple-touch-icon.png')):
    s = size / 32
    im = Image.new('RGB', (size, size), '#FF4F9A')
    d = ImageDraw.Draw(im)
    d.rectangle([round(4 * s), round(9 * s), round(15 * s) - 1, round(23 * s) - 1], fill='#FFFFFF')
    d.rectangle([round(17 * s), round(9 * s), round(28 * s) - 1, round(23 * s) - 1], fill='#000000')
    im.save(f'{out}/{name}')
