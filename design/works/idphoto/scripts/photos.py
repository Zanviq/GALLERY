"""Crop, level and export the generated ID photographs for works/idphoto/img (dev tool, not deployed).

    python -I design/works/idphoto/scripts/photos.py <raw dir> [name ...]

<raw dir> holds the Gemini generations (kept outside the repo, see IMAGES.md). For every photo the
landmarks were read off the full-size image by eye: the crown (top of the hair), the eye line (pupil
centres), the chin and the face's centre line, all in source pixels.

A "rule" output is cropped exactly as the shop would for that format: the script searches head size
and crown margin inside the format's bands so the chin and eye line also land in theirs, then cuts
the rectangle. The numbers it settles on are written to photos.json and printed, and the page states
them under each photo ("이 사진 3.4 cm"), so the overlay and the text describe the real crop.
A "loose" output uses a fixed smaller head so collars and shoulders show (the 촬영 전 준비 pairs).

Grading is deliberately small, because an ID photo has to keep true colour: the backdrop is pulled
flat towards one shared target (the brand blue #B9D3EA, or one paper white), so the set reads as one
studio, then every size gets the same fine monochrome grain.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = ROOT / 'works' / 'idphoto' / 'img'
RAW = pathlib.Path(sys.argv[1])
ONLY = set(sys.argv[2:])

FORMATS = {
    'passport': dict(w=35, h=45, head=(32, 36), crown=(3, 5), chin=(37, 39), eye=(23, 27)),
    'idcard': dict(w=35, h=45, head=(32, 36), crown=(3, 5), chin=(37, 39), eye=(23, 27)),
    'license': dict(w=35, h=45, head=(32, 36), crown=(3, 5), chin=(37, 39), eye=(23, 27)),
    'visa': dict(w=50, h=50, head=(25, 35), crown=(3, 7), chin=(32, 38), eye=(28, 35)),
    'job': dict(w=30, h=40, head=(24, 28), crown=(3, 5), chin=(29, 31), eye=(22, 26)),
}
WHITE = (244, 245, 246)
BLUE = (0xB9, 0xD3, 0xEA)

# landmarks in source pixels: crown, eye line, chin, centre x; bg is the backdrop the photo was shot on
PHOTOS = {
    'p1': dict(src='p1-passport.jpg', crown=252, eye=672, chin=1048, cx=894, bg='white'),
    'p2': dict(src='p2-idcard.jpg', crown=288, eye=888, chin=1478, cx=903, bg='white'),
    'p3': dict(src='p3-license.jpg', crown=497, eye=1004, chin=1452, cx=900, bg='blue', inset=70),  # blue print with a white border
    'p4': dict(src='p4-visa.jpg', crown=340, eye=932, chin=1460, cx=899, bg='white'),
    'p5': dict(src='p5-job.jpg', crown=285, eye=762, chin=1182, cx=899, bg='blue'),
    'r2': dict(src='r2-job-retouched.jpg', crown=285, eye=762, chin=1182, cx=899, bg='blue'),  # p5 after two retouch passes
    'b1': dict(src='b1-whitetop.jpg', crown=252, eye=672, chin=1048, cx=894, bg='white'),
    'b2': dict(src='b2b-glare.jpg', crown=340, eye=932, chin=1460, cx=899, bg='white'),
    'b3': dict(src='b3-fringe.jpg', crown=497, eye=1004, chin=1452, cx=900, bg='blue', inset=70),
}

LOOSE = dict(fmt='passport', head=25.5, crown=6.5)
OUTPUTS = [
    # name, photo, mode, format, widths
    ('passport', 'p1', 'rule', 'passport', (400, 700)),
    ('idcard', 'p2', 'rule', 'idcard', (400, 700)),
    ('license', 'p3', 'rule', 'license', (400, 700)),
    ('visa', 'p4', 'rule', 'visa', (560, 1000)),
    ('job', 'r2', 'rule', 'job', (340, 600)),
    ('job-before', 'p5', 'rule', 'job', (340, 600)),
    ('ready-clothes-no', 'b1', 'loose', 'passport', (260, 500)),
    ('ready-clothes-ok', 'p1', 'loose', 'passport', (260, 500)),
    ('ready-fringe-no', 'b3', 'loose', 'passport', (260, 500)),
    ('ready-fringe-ok', 'p3', 'loose', 'passport', (260, 500)),
    ('ready-glasses-no', 'b2', 'loose', 'passport', (260, 500)),
    ('ready-glasses-ok', 'p4', 'loose', 'passport', (260, 500)),
]


def fit(P, F, size):
    """Head size and crown margin (mm) that put crown, chin and eye line inside the format's bands,
    a little away from their edges, with the cut still inside the source image."""
    ratio = (P['eye'] - P['crown']) / (P['chin'] - P['crown'])
    hm, em = sum(F['head']) / 2, sum(F['eye']) / 2
    best = None
    for h10 in range(int(F['head'][0] * 10), int(F['head'][1] * 10) + 1):
        h = h10 / 10
        for c10 in range(int(F['crown'][0] * 10), int(F['crown'][1] * 10) + 1):
            c = c10 / 10
            chin = c + h
            eye = F['h'] - (c + ratio * h)
            if not (F['chin'][0] + .3 <= chin <= F['chin'][1] - .3 and F['eye'][0] + .3 <= eye <= F['eye'][1] - .3
                    and F['crown'][0] + .3 <= c <= F['crown'][1] - .3):
                continue
            k, m = (P['chin'] - P['crown']) / h, P.get('inset', 0)
            if (P['cx'] - F['w'] / 2 * k < m or P['cx'] + F['w'] / 2 * k > size[0] - m
                    or P['crown'] - c * k < m or P['crown'] + (F['h'] - c) * k > size[1] - m):
                continue
            score = (eye - em) ** 2 + .6 * (h - hm) ** 2 + .3 * (c - sum(F['crown']) / 2) ** 2
            if best is None or score < best[0]:
                best = (score, h, c, eye)
    if not best:
        raise SystemExit(f'no fit for ratio {ratio:.3f}')
    _, h, c, eye = best
    return dict(head=h, crown=c, chin=round(c + h, 1), eye=round(eye, 1), ratio=round(ratio, 3))


def grade(im, bg):
    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    ph, pw = max(4, int(H * .07)), max(4, int(W * .08))
    sample = np.concatenate([a[:ph, :pw].reshape(-1, 3), a[:ph, -pw:].reshape(-1, 3)])
    ref = np.median(sample, axis=0)
    target = np.array(BLUE if bg == 'blue' else WHITE, np.float32)
    d = np.sqrt(((a - ref) ** 2).sum(axis=2))
    d0, d1 = 16.0, 46.0
    w = np.clip((d1 - d) / (d1 - d0), 0, 1)[..., None] * .92
    a = a + w * (target - a)
    return a, ref


def grain(a, seed):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1.7, a.shape[:2]).astype(np.float32)[..., None]
    return Image.fromarray(np.clip(a + n, 0, 255).astype(np.uint8))


def main():
    OUT.mkdir(exist_ok=True)
    meta = {}
    cache = {}
    for name, pid, mode, fid, widths in OUTPUTS:
        if ONLY and name not in ONLY:
            continue
        P, F = PHOTOS[pid], FORMATS[fid]
        if P['src'] not in cache:
            cache[P['src']] = Image.open(RAW / P['src']).convert('RGB')
        src = cache[P['src']]
        if mode == 'rule':
            m = fit(P, F, src.size)
        else:
            m = dict(head=LOOSE['head'], crown=LOOSE['crown'])
        k = (P['chin'] - P['crown']) / m['head']  # source px per mm
        box = (P['cx'] - F['w'] / 2 * k, P['crown'] - m['crown'] * k, P['cx'] + F['w'] / 2 * k, P['crown'] + (F['h'] - m['crown']) * k)
        if box[0] < 0 or box[1] < 0 or box[2] > src.width or box[3] > src.height:
            print(f'!! {name}: crop {tuple(round(v) for v in box)} leaves the {src.size} source')
        big = max(widths)
        size = (big, round(big * F['h'] / F['w']))
        im = src.resize(size, Image.LANCZOS, box=box)
        a, ref = grade(im, P['bg'])
        base = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        files = []
        for i, wpx in enumerate(sorted(widths)):
            hpx = round(wpx * F['h'] / F['w'])
            small = base.resize((wpx, hpx), Image.LANCZOS) if wpx != big else base
            out = OUT / f'{name}-{wpx}.webp'
            grain(np.asarray(small).astype(np.float32), hash(name) % 1000 + i).save(out, 'WEBP', quality=82, method=6)
            files.append(f'{out.name} {wpx}x{hpx} {out.stat().st_size / 1024:.0f} KB')
        meta[name] = dict(photo=pid, format=fid, mode=mode, **{kk: (round(v, 2) if isinstance(v, float) else v) for kk, v in m.items()},
                          px_per_mm=round(k, 2), crop=[round(v) for v in box], backdrop_sample=[round(float(v)) for v in ref])
        print(name, meta[name], '|', '; '.join(files))
    if not ONLY or 'studio' in ONLY:
        # the shooting room: a 16:9 cut around the stool, no grading beyond the shared grain
        im = Image.open(RAW / 's3-studio.jpg').convert('RGB').crop((0, 190, 2528, 1612))
        for i, wpx in enumerate((800, 1600)):
            small = im.resize((wpx, round(wpx * 9 / 16)), Image.LANCZOS)
            out = OUT / f'studio-{wpx}.webp'
            grain(np.asarray(small).astype(np.float32), 900 + i).save(out, 'WEBP', quality=80, method=6)
            print(out.name, small.size, f'{out.stat().st_size / 1024:.0f} KB')
    path = pathlib.Path(__file__).resolve().parent.parent / 'photos.json'
    old = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    old.update(meta)
    path.write_text(json.dumps(old, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    main()
