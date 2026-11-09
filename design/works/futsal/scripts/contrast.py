"""Contrast ratios for the futsal palette (dev tool).  python -I contrast.py"""
import itertools
C = {
    'court': '#1C4FA0', 'claret': '#761C3C', 'white': '#FFFFFF', 'ink': '#0D1B2E',
    'runoff': '#163F80', 'court-hi': '#2A5DAE',
}
def lum(h):
    h = h.lstrip('#'); out = []
    for i in (0, 2, 4):
        c = int(h[i:i+2], 16) / 255
        out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]
def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)
for a, b in itertools.combinations(C, 2):
    print(f'{a:9s} on {b:9s} {ratio(C[a], C[b]):5.2f}')
