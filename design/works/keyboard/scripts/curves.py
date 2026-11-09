"""Print SVG path data for the three force curves (static charts in works/keyboard/index.html).
viewBox 0 0 320 200: x = travel 0-4.2 mm, y = force 0-100 gf (plot area 8..312 x 8..184)."""
SW = {
    'goyo': {'press': [[0, 32], [0.15, 35], [2.0, 45], [3.5, 56], [3.75, 60], [3.9, 74], [4.0, 96]],
             'release': [[4.0, 80], [3.85, 52], [3.5, 50], [2.0, 39], [0.15, 29], [0, 26]], 'act': [2.0, 45]},
    'maru': {'press': [[0, 34], [0.25, 50], [0.5, 62], [0.75, 52], [1.3, 42], [2.0, 47], [3.3, 57], [3.6, 62], [3.7, 76], [3.8, 96]],
             'release': [[3.8, 78], [3.65, 52], [3.2, 49], [2.0, 40], [1.3, 35], [0.7, 44], [0.45, 46], [0.2, 36], [0, 29]], 'act': [2.0, 47]},
    'ttogak': {'press': [[0, 36], [0.6, 44], [1.5, 55], [1.75, 58], [1.9, 36], [2.2, 40], [3.1, 62], [3.4, 66], [3.5, 80], [3.6, 98]],
               'release': [[3.6, 80], [3.45, 56], [3.0, 52], [2.0, 38], [1.6, 30], [1.4, 46], [0.6, 37], [0, 30]], 'act': [1.75, 58]},
}
X0, X1, Y0, Y1 = 8, 312, 184, 8
def px(mm, gf):
    return X0 + (X1 - X0) * mm / 4.2, Y0 + (Y1 - Y0) * gf / 100
def d(pts):
    return 'M' + ' L'.join('%.1f %.1f' % px(*p) for p in pts)
for k, v in SW.items():
    ax, ay = px(*v['act'])
    print(k)
    print('  press  ', d(v['press']))
    print('  release', d(v['release']))
    print('  act     cx=%.1f cy=%.1f' % (ax, ay))
