"""Contrast of the page tokens (WCAG relative luminance)."""
def L(h):
    v = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    v = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in v]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
def cr(a, b):
    a, b = L(a), L(b); return (max(a, b) + 0.05) / (min(a, b) + 0.05)
for a, b, what in [('#FFFFFF', '#5E1224', 'white on cherry'), ('#0B0B0C', '#FFFFFF', 'black on white'), ('#5A5A60', '#FFFFFF', 'grey on white'),
                   ('#E5CDD3', '#5E1224', 'on-cherry-2 on cherry'), ('#B2B2B8', '#0B0B0C', 'on-black-2 on black'), ('#D4D4D8', '#FFFFFF', 'grey-l on white'),
                   ('#5E1224', '#0B0B0C', 'cherry on black'), ('#FFFFFF', '#0B0B0C', 'white on black'), ('#5E1224', '#FFFFFF', 'cherry (focus ring) on white')]:
    print(f'{what:30s} {cr(a, b):.2f}')
