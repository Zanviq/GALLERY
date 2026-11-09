"""WCAG contrast for the 담금 palette (dev tool).  python -I contrast.py"""
P = {
    'plaster': '#EEF1EF',   # ground: the atelier's lime-plaster wall in every photograph
    'plaster2': '#E2E6E4',  # recessed panel / chip fill on plaster
    'plum': '#A9C25A',      # field: 청매, the unripe June plum the year starts with
    'ink': '#15191B',       # 먹: text, the ink the dates are written in
    'ink2': '#4E575B',      # secondary text on plaster
    'leaf': '#2B3A0E',      # secondary text on the plum field (plum-leaf green)
}


def lum(h):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def cr(a, b):
    la, lb = sorted([lum(P.get(a, a)), lum(P.get(b, b))], reverse=True)
    return (la + 0.05) / (lb + 0.05)


for fg, bg in [('ink', 'plaster'), ('ink2', 'plaster'), ('ink2', 'plaster2'), ('ink', 'plum'),
               ('leaf', 'plum'), ('plaster', 'ink'), ('#A7AFB2', 'ink'), ('plum', 'ink'),
               ('ink', 'plaster2')]:
    print(f'{fg:>8} on {bg:<8} {cr(fg, bg):5.2f}')
