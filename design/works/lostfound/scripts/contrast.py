"""Contrast ratios for every text/UI colour pair works/lostfound uses (WCAG 2.x formula).

    python -I design/works/lostfound/scripts/contrast.py
"""
import sys

sys.stdout.reconfigure(encoding='utf-8')
C = {
    'steel': '#5B6770', 'steel-deep': '#47525A', 'steel-lite': '#76828B', 'tag': '#FFFFFF',
    'marker': '#171B1F', 'pencil': '#5F6970', 'rule': '#AEB6BC', 'glow': '#39D98A', 'shade': '#EEF1F3',
}


def lum(h):
    h = h.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def ratio(a, b):
    la, lb = lum(C[a]), lum(C[b])
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


PAIRS = [
    # (fg, bg, need, what)
    ('tag', 'steel', 4.5, 'UI text on the locker wall'),
    ('tag', 'steel-deep', 4.5, 'top bar and drawer text'),
    ('marker', 'tag', 4.5, 'tag, note, statement and grid text'),
    ('marker', 'shade', 4.5, 'text on shaded paper (headers, selected row)'),
    ('pencil', 'tag', 4.5, 'secondary text, auto-X marks'),
    ('pencil', 'shade', 4.5, 'secondary text on shaded paper'),
    ('marker', 'glow', 4.5, 'text on a confirmed (green) tag'),
    ('glow', 'steel', 3.0, 'green tag edge against the wall (UI part)'),
    ('glow', 'steel-deep', 3.0, 'green solved mark in the case drawer (UI part)'),
    ('tag', 'steel-lite', 3.0, 'large white text on light steel (UI part only)'),
    ('rule', 'tag', 1.0, 'grid rules (decorative)'),
    ('tag', 'steel', 3.0, 'white tag string on the wall (UI part)'),
    ('steel-deep', 'tag', 4.5, 'dark steel text on paper (case title strip)'),
    ('tag', 'marker', 4.5, 'white text on marker-black buttons'),
]
bad = 0
for fg, bg, need, what in PAIRS:
    r = ratio(fg, bg)
    ok = r >= need
    bad += not ok
    print(f'{fg:>12} on {bg:<12} {r:5.2f}:1  need {need}  {"ok" if ok else "FAIL"}  {what}')
sys.exit(1 if bad else 0)
