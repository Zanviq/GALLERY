"""Cut out, grade and export the photographs for works/record (dev tool, not deployed).

    python -I prep_images.py <generated-images dir> <works/record/img dir>

- vinyl: fit the disc (ellipse -> circle), cut it to alpha with an anti-aliased edge and an open
  spindle hole, flatten the baked-in light so it can rotate (the fixed sheen is added in CSS),
  grade the vinyl to #00A3A1.
- arm: key the chroma-green background to alpha, despill, crop to the arm; prints the pivot and
  stylus positions in the exported image for js/turntable.js.
- photos: grade toward the page palette (turquoise kept and pulled to 180 deg, other hues mostly
  desaturated, whites neutral), crop, export webp.
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
TARGET_H = 179.6  # hue of #00A3A1


def load(name):
    im = cv2.imread(os.path.join(SRC, name), cv2.IMREAD_COLOR)
    return im[:, :, ::-1].astype(np.float32) / 255.0  # RGB 0..1


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def grade(rgb, keep_other=0.22, teal_pull=0.55, sat=1.0, gamma=1.0, lift_white=0.0):
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)  # H 0..360, S 0..1, V 0..1
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # weight of the turquoise/blue family (150..250 deg), soft edges
    w = smoothstep(130, 160, h) * (1 - smoothstep(240, 265, h))
    h2 = np.where(w > 0, h + (TARGET_H - h) * teal_pull * w, h)
    s2 = s * (w * sat + (1 - w) * keep_other)
    v2 = np.power(np.clip(v, 0, 1), gamma)
    if lift_white:
        v2 = v2 + (1 - v2) * lift_white * smoothstep(0.75, 0.95, v2) * (1 - s2)
    out = cv2.cvtColor(np.dstack([h2 % 360, np.clip(s2, 0, 1), np.clip(v2, 0, 1)]).astype(np.float32), cv2.COLOR_HSV2RGB)
    return np.clip(out, 0, 1)


def save(rgb, base, widths, q=82, alpha=None):
    img = (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)
    if alpha is not None:
        img = np.dstack([img, (np.clip(alpha, 0, 1) * 255 + 0.5).astype(np.uint8)])
        pil = Image.fromarray(img, 'RGBA')
    else:
        pil = Image.fromarray(img, 'RGB')
    for w in widths:
        h = round(pil.size[1] * w / pil.size[0])
        out = os.path.join(OUT, f'{base}-{w}.webp')
        pil.resize((w, h), Image.LANCZOS).save(out, 'WEBP', quality=q, method=6)
        print(f'{out}  {w}x{h}  {os.path.getsize(out) // 1024} KB')


def crop_aspect(rgb, aw, ah, fx=0.5, fy=0.5):
    H, W = rgb.shape[:2]
    if W / H > aw / ah:
        nw, nh = int(H * aw / ah), H
    else:
        nw, nh = W, int(W * ah / aw)
    x0 = min(max(int(fx * W - nw / 2), 0), W - nw)
    y0 = min(max(int(fy * H - nh / 2), 0), H - nh)
    return rgb[y0:y0 + nh, x0:x0 + nw]


# ---------------------------------------------------------------- vinyl
def vinyl():
    rgb = load('vinyl-1.jpg')
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    mask = ((hsv[..., 2] > 0.2) | (hsv[..., 1] > 0.35)).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cnts, key=cv2.contourArea)
    (ex, ey), (ma, mi), ang = cv2.fitEllipse(c)
    print('vinyl ellipse', round(ex, 1), round(ey, 1), round(ma, 1), round(mi, 1), round(ang, 1))
    # affine: ellipse -> circle of radius R (the mean of the semi-axes)
    a, b = ma / 2, mi / 2
    R = (a + b) / 2
    S = 1400
    k = (S / 2) / R  # output scale
    t = np.deg2rad(ang)
    rot = np.array([[np.cos(t), np.sin(t)], [-np.sin(t), np.cos(t)]])  # to ellipse axes
    scl = np.diag([R / a, R / b])
    M = k * (rot.T @ scl @ rot)
    off = np.array([S / 2, S / 2]) - M @ np.array([ex, ey])
    A = np.hstack([M, off[:, None]]).astype(np.float32)
    disc = cv2.warpAffine(rgb, A, (S, S), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    rr = np.hypot(xx - S / 2 + 0.5, yy - S / 2 + 0.5)
    Rpx = S / 2 - 3
    alpha = np.clip(Rpx - rr + 0.5, 0, 1)
    # label (white paper) radius and the spindle hole
    hsvd = cv2.cvtColor(disc, cv2.COLOR_RGB2HSV)
    white = (hsvd[..., 1] < 0.18) & (hsvd[..., 2] > 0.7) & (rr < Rpx * 0.5)
    rl = np.percentile(rr[white], 99.5)
    dark = (hsvd[..., 2] < 0.3) & (rr < rl * 0.3)
    rh = np.percentile(rr[dark], 95) if dark.any() else Rpx * 0.024
    print('label radius', round(rl / Rpx, 4), 'hole radius', round(rh / Rpx, 4))
    alpha *= np.clip(rr - Rpx * 0.024 + 0.5, 0, 1)
    vin = (rr > rl + 4) & (rr < Rpx - 6)
    # flatten the baked-in light: low-pass of V minus its radial mean
    V = hsvd[..., 2].copy()
    wgt = vin.astype(np.float32)
    small = (64, 64)
    lowV = cv2.resize(cv2.resize(V * wgt, small, interpolation=cv2.INTER_AREA), (S, S), interpolation=cv2.INTER_CUBIC)
    lowW = cv2.resize(cv2.resize(wgt, small, interpolation=cv2.INTER_AREA), (S, S), interpolation=cv2.INTER_CUBIC)
    low = lowV / np.maximum(lowW, 1e-3)
    ri = rr.astype(np.int32)
    sums = np.bincount(ri[vin], weights=low[vin], minlength=S)
    cnts_ = np.bincount(ri[vin], minlength=S)
    radial = sums / np.maximum(cnts_, 1)
    radial = np.convolve(radial, np.ones(9) / 9, mode='same')
    light = low - radial[np.clip(ri, 0, S - 1)]
    V2 = np.where(vin, V - light * 0.9, V)
    # grade the vinyl to #00A3A1: hue, saturation and value medians -> target
    h, s = hsvd[..., 0], hsvd[..., 1]
    hm, sm, vm = np.median(h[vin]), np.median(s[vin]), np.median(V2[vin])
    print('vinyl median hsv', round(hm, 1), round(sm, 3), round(vm, 3))
    h2 = np.where(vin | (rr >= Rpx - 6), TARGET_H + (h - hm) * 0.3, h)
    s2 = np.where(vin | (rr >= Rpx - 6), np.clip(s * (0.97 / sm), 0, 1), s)
    v2 = np.where(vin | (rr >= Rpx - 6), V2 * (0.62 / vm), V2)
    out = cv2.cvtColor(np.dstack([h2 % 360, s2, np.clip(v2, 0, 1)]).astype(np.float32), cv2.COLOR_HSV2RGB)
    # label: neutral white paper
    lab = rr <= rl + 4
    g = out[..., 1:2].repeat(3, axis=2)
    out = np.where(lab[..., None], np.clip(g * 1.04, 0, 1), out)
    save(out, 'vinyl', [1400, 800], q=84, alpha=alpha)
    return rl / Rpx


# ---------------------------------------------------------------- arm
def arm():
    rgb = load('arm-1.jpg')
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = g - np.maximum(r, b)
    alpha = 1 - smoothstep(0.06, 0.20, d)
    alpha = cv2.GaussianBlur(alpha.astype(np.float32), (3, 3), 0)
    # despill: green never above the brighter of red/blue, then neutralise the metal
    g2 = np.minimum(g, np.maximum(r, b))
    out = np.dstack([r, g2, b])
    grey = out.mean(axis=2, keepdims=True)
    out = grey + (out - grey) * 0.25
    ys, xs = np.where(alpha > 0.02)
    pad = 24
    x0, x1, y0, y1 = max(xs.min() - pad, 0), min(xs.max() + pad, rgb.shape[1]), max(ys.min() - pad, 0), min(ys.max() + pad, rgb.shape[0])
    out, alpha = out[y0:y1, x0:x1], alpha[y0:y1, x0:x1]
    print('arm crop', x0, y0, x1, y1, '-> size', x1 - x0, y1 - y0)
    save(out, 'arm', [1200, 700], q=86, alpha=alpha)


# ---------------------------------------------------------------- photos
def photos():
    cover = grade(load('cover-1.jpg'), teal_pull=0.6, sat=1.05, lift_white=0.4)
    save(cover, 'cover', [1200, 700], q=80)

    room = load('room-2.jpg')
    u8 = (room * 255).astype(np.uint8)
    m = np.zeros(u8.shape[:2], np.uint8)
    m[726:744, 1334:1364] = 255  # small maker's mark on the bass drum head
    room = cv2.inpaint(u8, m, 5, cv2.INPAINT_TELEA).astype(np.float32) / 255
    room = grade(room, teal_pull=0.5, keep_other=0.3, lift_white=0.3)
    save(room, 'room', [2400, 1600, 800], q=78)

    stack = grade(load('stack-1.jpg'), teal_pull=0.6, keep_other=0.12, sat=0.95, lift_white=0.3)
    stack = crop_aspect(stack, 4, 5, 0.5, 0.62)
    save(stack, 'stack', [1200, 700], q=80)

    test = grade(load('test-1.jpg'), teal_pull=0.6, keep_other=0.3, lift_white=0.45)
    save(test, 'test', [1600, 800], q=80)

    night = grade(load('night-1.jpg'), teal_pull=0.55, keep_other=0.08, sat=0.9, gamma=1.08)
    night = crop_aspect(night, 3, 2, 0.5, 0.5)
    save(night, 'night', [1600, 800], q=78)


what = sys.argv[3:] or ['vinyl', 'arm', 'photos']
if 'vinyl' in what:
    vinyl()
if 'arm' in what:
    arm()
if 'photos' in what:
    photos()
