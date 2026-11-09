def L(h):
    v = [int(h[i:i+2], 16) / 255 for i in (1, 3, 5)]
    v = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in v]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
def cr(a, b):
    a, b = L(a), L(b); return (max(a, b) + 0.05) / (min(a, b) + 0.05)
for a, b, what in [('#2E0A1A', '#F6A3C2', 'ink on field'), ('#66183A', '#F6A3C2', 'ink-2 on field'),
                   ('#FFFFFF', '#D12F6B', 'white on case'), ('#F6A3C2', '#2E0A1A', 'field on ink'),
                   ('#2E0A1A', '#D12F6B', 'ink on case (focus ring)'), ('#F6A3C2', '#D12F6B', 'field on case'),
                   ('#9C5E76', '#2E0A1A', 'input border (field 55% on ink)')]:
    print(f'{what:34s} {cr(a, b):.2f}')
