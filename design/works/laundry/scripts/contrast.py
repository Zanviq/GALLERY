"""WCAG contrast for the laundry palette pairs.  python -I contrast.py"""
def lum(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)
P = dict(tile='#BEE9DA', steel='#C5CCD2', steelhi='#E4E8EB', steello='#8E99A3', graphite='#1F2428',
         panel='#2A3136', display='#121517', white='#FFFFFF', green='#12B76A', red='#F04438',
         ink2='#3B4744', ink2s='#3E464D', ongr='#E4E8EB', ongr2='#A7B1B9', segoff='#262C30', light='#F2F5F6', focus='#1F2428')
pairs = [('graphite','tile'),('ink2','tile'),('graphite','steel'),('ink2s','steel'),('graphite','steelhi'),('graphite','white'),
         ('ink2s','white'),('ongr','panel'),('ongr2','panel'),('ongr','graphite'),('ongr2','graphite'),('green','display'),('red','display'),
         ('green','panel'),('red','panel'),('segoff','display'),('light','display'),('steello','tile'),('steello','steel'),('graphite','green'),('white','red'),('graphite','red'),('white','green'),('focus','tile'),('focus','steel')]
for a, b in pairs:
    print(f'{a:9s} on {b:9s} {P[a]} / {P[b]}  {cr(P[a], P[b]):5.2f}')
extra = [('#A7B1B9', '#343C42', 'ckey meta on key'), ('#A7B1B9', '#3D464D', 'ckey meta on selected key'), ('#E4E8EB', '#3D464D', 'ckey name on selected'),
         ('#3E464D', '#B9C1C8', 'tile tag on steel bottom'), ('#1F2428', '#B9C1C8', 'tile word on steel bottom'), ('#3B4744', '#A6DBC8', 'footer credit on tile-shade'),
         ('#1F2428', '#A6DBC8', 'footer text'), ('#3E464D', '#E4E8EB', 'sheet note'), ('#1F2428', '#BCC4CA', 'step text on plate bottom'),
         ('#FFFFFF', '#1F2428', 'tile number on strip'), ('#A7B1B9', '#121517', 'display unit'), ('#E4E8EB', '#121517', 'display text'),
         ('#1F2428', '#F2F5F6', 'start key'), ('#E4E8EB', '#2A3136', 'quiet key'), ('#A7B1B9', '#121517', 'kind unselected'),
         ('#8E99A3', '#BEE9DA', 'non-text: seam'), ('#1F2428', '#E4E8EB', 'branch key text')]
for a, b, label in extra:
    print(f'{label:28s} {a} / {b}  {cr(a, b):5.2f}')
