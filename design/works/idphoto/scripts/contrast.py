"""Contrast ratios for the idphoto palette (dev tool).  python -I contrast.py"""
import itertools
import sys
C = {
    'backdrop': '#B9D3EA', 'white': '#FFFFFF', 'ink': '#101214',
    'guide': '#1F5A92',
}
EXTRA = sys.argv[1:]
for i, h in enumerate(EXTRA):
    C[f'x{i}'] = h


def lum(h):
    h = h.lstrip('#'); out = []
    for i in (0, 2, 4):
        c = int(h[i:i+2], 16) / 255
        out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def mix(a, b, t):
    a = a.lstrip('#'); b = b.lstrip('#')
    return '#' + ''.join(f'{round(int(a[i:i+2], 16) * (1 - t) + int(b[i:i+2], 16) * t):02X}' for i in (0, 2, 4))


for a, b in itertools.combinations(C, 2):
    print(f'{a:9s} {C[a]} on {b:9s} {C[b]} {ratio(C[a], C[b]):5.2f}')
dim = mix(C['backdrop'], C['ink'], 0.58)
print('dim (backdrop under 58% ink)', dim, 'white on dim', round(ratio('#FFFFFF', dim), 2), 'backdrop on dim', round(ratio(C['backdrop'], dim), 2))
dimw = mix('#FFFFFF', C['ink'], 0.58)
print('dim (white under 58% ink)', dimw, 'white on dim', round(ratio('#FFFFFF', dimw), 2))
