"""WCAG contrast of the page's colour pairs (dev tool).  python -I contrast.py"""
SKY, SKY2, INK, INK2, PAPER, RED = '#59B7F0', '#8FCFF6', '#0B0C0D', '#3B4148', '#FFFFFF', '#D7142C'


def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + .05) / (lb + .05)


PAIRS = [
    ('ink on sky (all text on sky)', INK, SKY, 4.5),
    ('ink on sky-2 (chip hover)', INK, SKY2, 4.5),
    ('ink on paper', INK, PAPER, 4.5),
    ('ink-2 on paper (captions, details)', INK2, PAPER, 4.5),
    ('red on paper (17:00 줄 끊기)', RED, PAPER, 4.5),
    ('paper on ink (match, footer)', PAPER, INK, 4.5),
    ('paper on red (액막이연)', PAPER, RED, 4.5),
    ('red on ink (3분 20m 64명, large)', RED, INK, 3.0),
    ('sky on ink (footer mark, large)', SKY, INK, 3.0),
    ('paper on ink-hover red button', PAPER, RED, 4.5),
]
for name, a, b, need in PAIRS:
    r = ratio(a, b)
    print(f'{r:5.2f}  {"ok " if r >= need else "LOW"} (needs {need})  {name}')
