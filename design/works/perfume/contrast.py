import sys
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
P={
 'yuwol':dict(night='#18200f',night2='#222b17',on='#eef1e2',onm='#b4bb9c',glow='#cdd78f',paper='#e3e7d2',paper2='#d6dcc2',ink='#1a2010',inkm='#4f573d',acc='#4a5a12'),
 'jocheong':dict(night='#231206',night2='#30190a',on='#f6ead8',onm='#c7ae8f',glow='#f0b85e',paper='#eedfc3',paper2='#e5d2b0',ink='#2a1708',inkm='#6a4a2a',acc='#7a3f06'),
 'omi':dict(night='#240a10',night2='#321019',on='#f7e6e6',onm='#cba3a8',glow='#eb9fae',paper='#efdcdc',paper2='#e6cccd',ink='#2a0f15',inkm='#6a4249',acc='#8c1f36'),
 'meok':dict(night='#101215',night2='#191c20',on='#e9ecef',onm='#a7adb4',glow='#bfcad6',paper='#e0e2e4',paper2='#d3d6d9',ink='#15181c',inkm='#4d545c',acc='#2f3a46'),
}
for k,p in P.items():
    out=[]
    for fg,bg in [('on','night'),('onm','night'),('onm','night2'),('glow','night'),('glow','night2'),('ink','paper'),('inkm','paper'),('inkm','paper2'),('acc','paper'),('acc','paper2')]:
        out.append(f"{fg}/{bg} {cr(p[fg],p[bg]):.2f}")
    print(k, ' | '.join(out))
