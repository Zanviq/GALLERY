"""Contrast ratios for the lamp palette (dev tool).  python -I design/works/lamp/scripts/contrast.py"""


def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


ROOM, WHITE, TEXT, STEEL, STEEL2, STEEL3, STEEL4 = '#0B0C0E', '#FFFFFF', '#E8EAED', '#9EA5AD', '#737A82', '#24282D', '#15171A'
for name, fg, bg, need in [
    ('white on room', WHITE, ROOM, 4.5), ('text on room', TEXT, ROOM, 4.5), ('steel on room', STEEL, ROOM, 4.5),
    ('steel on panel', STEEL, STEEL4, 4.5), ('text on panel', TEXT, STEEL4, 4.5),
    ('steel-2 borders on room (UI)', STEEL2, ROOM, 3.0), ('steel-2 on panel (UI)', STEEL2, STEEL4, 3.0),
    ('room on white (checked, button)', ROOM, WHITE, 4.5), ('focus ring white on room', WHITE, ROOM, 3.0),
    ('steel on white? (not used)', STEEL, WHITE, 0),
]:
    r = ratio(fg, bg)
    print(f'{name:34s} {r:5.2f}  {"ok" if r >= need else "LOW"}')
