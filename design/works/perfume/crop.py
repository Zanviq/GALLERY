"""python -I crop.py in.png out.png x0 y0 x1 y1"""
import sys
from PIL import Image
a = sys.argv
Image.open(a[1]).crop(tuple(int(v) for v in a[3:7])).save(a[2])
