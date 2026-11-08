// 가락 65 — 절차적으로 만드는 키보드 모델. 단위는 mm.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './../vendor/three/addons/RoundedBoxGeometry.js';
import { toCreasedNormals, mergeGeometries } from './../vendor/three/addons/BufferGeometryUtils.js';
import { KEYS, STAB_IDS } from './layout.js';

export const U = 19.05;
export const KEY_W = 16 * U;
export const KEY_D = 5 * U;
export const CASE_W = 319;
export const CASE_D = 112;
export const TILT = THREE.MathUtils.degToRad(6.5);

// 조립 좌표(기울어진 판 기준) 높이
const Y = {
  frameTop: 6.8,
  seam: -3.5,
  floorBottom: -14.5,
  floorTop: -12.6,
  capBase: 6.0,
  plateTop: 0,
  plateT: 1.5,
  pcbTop: -5.0,
  pcbT: 1.6,
  foamTop: -6.9,
  foamT: 3.4,
  weightT: 2.4,
};

// 행마다 키캡 높이(윗면 중심)와 기울기(+는 뒤가 높음)
const ROW_PROFILE = [
  { h: 9.5, tilt: 7.5 },
  { h: 8.2, tilt: 3.5 },
  { h: 7.7, tilt: 0 },
  { h: 7.9, tilt: -4 },
  { h: 8.0, tilt: -6.5 },
];

export function keyCenter(k) {
  return { x: (k.cx - 8) * U, z: (k.row - 2) * U };
}

// ---------- 공통 도우미 ----------

function roundedRectPath(path, w, d, r, cx = 0, cz = 0) {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cz - d / 2, y1 = cz + d / 2;
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0);
  path.quadraticCurveTo(x1, y0, x1, y0 + r);
  path.lineTo(x1, y1 - r);
  path.quadraticCurveTo(x1, y1, x1 - r, y1);
  path.lineTo(x0 + r, y1);
  path.quadraticCurveTo(x0, y1, x0, y1 - r);
  path.lineTo(x0, y0 + r);
  path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}

function roundedRectShape(w, d, r) {
  return roundedRectPath(new THREE.Shape(), w, d, r);
}

// 평면 모양을 y 방향으로 밀어 올린 입체. y0~y1 사이 (모서리 포함)
function extrudeY(shape, y0, y1, bevel = 0.8, segs = 3, curveSegs = 10) {
  const depth = Math.max(0.01, y1 - y0 - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: segs,
    curveSegments: curveSegs,
  });
  g.rotateX(-Math.PI / 2); // shape y → -z, 깊이 → +y
  g.translate(0, y0 + bevel, 0);
  return g;
}

// 바닥이 책상과 평행하도록 아래쪽 꼭짓점을 z 에 따라 내린다 (쐐기 모양 하판)
function wedgeBottom(geo, yBottom, band) {
  const pos = geo.attributes.position;
  const ca = Math.cos(TILT), sa = Math.sin(TILT);
  const front = CASE_D / 2;
  const worldFront = ca * yBottom - sa * front;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < yBottom + band) {
      const z = pos.getZ(i);
      const target = (worldFront + sa * z) / ca; // 이 z 에서 책상 높이가 되는 로컬 y
      pos.setY(i, y + (target - yBottom));
    }
  }
  pos.needsUpdate = true;
}

function noiseCanvas(size, base, amp, seed = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(255, base + (rnd() - 0.5) * amp));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---------- 키캡 ----------

function ringPoints(w, d, r, nx, nz, nc) {
  // 둥근 사각형 둘레를 고정된 개수로 샘플 (모든 링이 같은 순서·개수)
  const pts = [];
  const hw = w / 2, hd = d / 2;
  r = Math.min(r, hw - 0.01, hd - 0.01);
  const corner = (cx, cz, a0) => {
    for (let i = 0; i < nc; i++) {
      const a = a0 + (i / (nc - 1)) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  };
  const edge = (x0, z0, x1, z1, n) => {
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]);
    }
  };
  // 앞-오른쪽부터 반시계 (위에서 볼 때)
  corner(hw - r, hd - r, 0); // 오른쪽 앞 (0→90°: +x → +z)
  edge(hw - r, hd, -hw + r, hd, nx); // 앞 모서리
  corner(-hw + r, hd - r, Math.PI / 2);
  edge(-hw, hd - r, -hw, -hd + r, nz); // 왼쪽
  corner(-hw + r, -hd + r, Math.PI);
  edge(-hw + r, -hd, hw - r, -hd, nx); // 뒤
  corner(hw - r, -hd + r, Math.PI * 1.5);
  edge(hw, -hd + r, hw, hd - r, nz); // 오른쪽
  return pts;
}

function keycapGeometry(k, uv) {
  const prof = ROW_PROFILE[k.row];
  const bw = k.w * U - 0.9;
  const bd = U - 0.9;
  const tw = bw - 6.6;
  const td = bd - 6.9;
  const tzOff = -0.55; // 윗면이 조금 뒤로
  const tilt = Math.tan(THREE.MathUtils.degToRad(prof.tilt));
  const dish = k.w >= 6 ? 0.18 : k.w >= 2 ? 0.42 : 0.55;
  const nx = Math.max(2, Math.round(tw / 2.2));
  const nz = Math.max(2, Math.round(td / 2.2));
  const nc = 6;
  const hEdge = prof.h; // 윗면 가장자리 높이(중심선 기준)

  const rings = [
    { t: 0, y: 0, w: bw, d: bd, r: 1.1, zo: 0, top: false },
    { t: 0.36, y: hEdge * 0.36, w: 0, d: 0, r: 1.5, zo: tzOff * 0.36, top: false },
    { t: 0.74, y: hEdge * 0.74, w: 0, d: 0, r: 1.9, zo: tzOff * 0.74, top: false },
    { t: 0.94, y: hEdge - 0.55, w: tw + 0.62, d: td + 0.62, r: 2.35, zo: tzOff, top: 'edge' },
    { t: 1, y: hEdge, w: tw, d: td, r: 2.2, zo: tzOff, top: 'face', s: 1 },
    { y: hEdge, s: 0.8, top: 'face' },
    { y: hEdge, s: 0.58, top: 'face' },
    { y: hEdge, s: 0.36, top: 'face' },
    { y: hEdge, s: 0.14, top: 'face' },
  ];
  // 벽 링 크기: 아래→위 선형 + 살짝 볼록
  rings.forEach((rg) => {
    if (rg.top === false && rg.t > 0) {
      const tt = rg.t;
      rg.w = bw + (tw + 0.62 - bw) * tt - Math.sin(tt * Math.PI) * 0.18;
      rg.d = bd + (td + 0.62 - bd) * tt - Math.sin(tt * Math.PI) * 0.18;
    }
    if (rg.s !== undefined && rg.s < 1) {
      rg.w = tw * rg.s; rg.d = td * rg.s; rg.r = 2.2 * rg.s; rg.zo = tzOff;
    }
  });

  const positions = [];
  const uvs = [];
  const sideU = uv.u0 + 0.004, sideV = uv.v1 - 0.004;
  const edge = 0.012;
  let per = 0;
  rings.forEach((rg) => {
    const pts = ringPoints(rg.w, rg.d, rg.r, nx, nz, nc);
    per = pts.length;
    pts.forEach(([x, z0]) => {
      const z = z0 + rg.zo;
      let y = rg.y;
      if (rg.top) y += -(z - tzOff) * tilt;
      positions.push(x, y, z);
      // 윗면은 셀에 그대로, 옆면은 셀 테두리(바탕색)에 붙여 각인이 번지지 않게 한다
      let fu = x / tw + 0.5, fv = 0.5 - (z - tzOff) / td;
      if (rg.top !== 'face') {
        fu = Math.min(1 - edge, Math.max(edge, fu));
        fv = Math.min(1 - edge, Math.max(edge, fv));
      }
      uvs.push(uv.u0 + fu * (uv.u1 - uv.u0), uv.v0 + fv * (uv.v1 - uv.v0));
    });
  });
  // 가운데 점
  positions.push(0, hEdge - dish, tzOff);
  uvs.push((uv.u0 + uv.u1) / 2, (uv.v0 + uv.v1) / 2);
  const centerIndex = positions.length / 3 - 1;

  // 윗면 오목(dish): face 링(s<1)에만, 가장자리 링은 0
  for (let ri = 5; ri < rings.length; ri++) {
    for (let i = 0; i < per; i++) {
      const idx = (ri * per + i) * 3;
      const x = positions[idx];
      const xn = Math.min(1, Math.abs(x) / (tw / 2));
      positions[idx + 1] -= dish * (1 - xn * xn);
    }
  }

  const index = [];
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let i = 0; i < per; i++) {
      const a = ri * per + i;
      const b = ri * per + ((i + 1) % per);
      const c = (ri + 1) * per + i;
      const d = (ri + 1) * per + ((i + 1) % per);
      index.push(a, c, b, b, c, d);
    }
  }
  const last = (rings.length - 1) * per;
  for (let i = 0; i < per; i++) {
    index.push(last + i, centerIndex, last + ((i + 1) % per));
  }
  // 바닥면 (안 보이지만 분해 시 아래에서 막아 준다)
  const bottomCenter = positions.length / 3;
  positions.push(0, 0.2, 0);
  uvs.push(sideU, sideV);
  for (let i = 0; i < per; i++) index.push(i, (i + 1) % per, bottomCenter);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  // 앞뒤 방향 확인: 윗면 법선이 +y 가 되도록 감김 순서를 맞췄다
  return g;
}

// ---------- 키캡 각인 아틀라스 ----------

const ATLAS_W = 2048;
const ATLAS_H = 1024;
const CELL_H = 124;
const GAP = 16;

export function layoutAtlas() {
  // 각 키 윗면 비율에 맞춰 셀을 줄줄이 채운다
  const cells = new Map();
  let x = 0, y = 0;
  KEYS.forEach((k) => {
    const tw = k.w * U - 0.9 - 6.6;
    const td = U - 0.9 - 6.9;
    const cw = Math.round(CELL_H * (tw / td));
    if (x + cw + GAP > ATLAS_W) { x = 0; y += CELL_H + GAP; }
    cells.set(k.id, { x: x + GAP / 2, y: y + GAP / 2, w: cw, h: CELL_H });
    x += cw + GAP;
  });
  return cells;
}

function drawMark(ctx, cx, cy, s, color) {
  // 키캡 세 개, 가운데가 눌림
  ctx.fillStyle = color;
  const q = s / 3.4, gap = s * 0.06;
  const r = q * 0.22;
  const xs = [cx - q - gap - q / 2, cx - q / 2, cx + q / 2 + gap];
  xs.forEach((x, i) => {
    const y = cy - q / 2 + (i === 1 ? q * 0.32 : 0);
    ctx.beginPath();
    ctx.roundRect(x, y, q, q, r);
    ctx.fill();
  });
}

export function paintAtlas(canvas, cells, cw, fonts) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const latin = fonts.latin;
  const hangul = fonts.hangul;
  const setStretch = (v) => { if ('fontStretch' in ctx) ctx.fontStretch = v; };
  KEYS.forEach((k) => {
    const c = cells.get(k.id);
    const g = k.group;
    const bg = g === 'accent' ? cw.accent : g === 'mod' ? cw.mod : cw.alpha;
    const fg = g === 'accent' ? cw.accentLegend : g === 'mod' ? cw.modLegend : cw.alphaLegend;
    const sub = g === 'mod' ? cw.modSub : cw.alphaSub;
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x - GAP / 2, c.y - GAP / 2, c.w + GAP, c.h + GAP);
    ctx.clip();
    ctx.fillStyle = bg;
    ctx.fillRect(c.x - GAP / 2, c.y - GAP / 2, c.w + GAP, c.h + GAP);
    const h = c.h;
    const padX = h * 0.17, padY = h * 0.16;
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x + 3, c.y + 3, c.w - 6, c.h - 6);
    ctx.clip();
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fg;
    if (k.ko) {
      setStretch('semi-expanded');
      ctx.font = `600 ${Math.round(h * 0.42)}px ${latin}`;
      ctx.textAlign = 'left';
      ctx.fillText(k.top, c.x + padX, c.y + padY + h * 0.29);
      setStretch('normal');
      ctx.font = `600 ${Math.round(h * 0.33)}px ${hangul}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = sub;
      ctx.fillText(k.ko, c.x + c.w - padX, c.y + h - padY);
      if (k.homing) {
        ctx.fillStyle = fg;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(c.x + c.w / 2 - h * 0.12, c.y + h - h * 0.13, h * 0.24, h * 0.035);
        ctx.globalAlpha = 1;
      }
    } else if (k.sub !== undefined) {
      setStretch('semi-expanded');
      ctx.textAlign = 'left';
      ctx.font = `500 ${Math.round(h * 0.27)}px ${latin}`;
      ctx.fillText(k.top, c.x + padX, c.y + padY + h * 0.22);
      ctx.font = `600 ${Math.round(h * 0.34)}px ${latin}`;
      ctx.fillText(k.sub, c.x + padX, c.y + h - padY - h * 0.02);
    } else if (k.mark) {
      drawMark(ctx, c.x + c.w / 2, c.y + h / 2, h * 0.42, fg);
    } else if (k.arrow) {
      setStretch('normal');
      ctx.textAlign = 'center';
      ctx.font = `600 ${Math.round(h * 0.34)}px ${hangul}`;
      ctx.fillText(k.label, c.x + c.w / 2, c.y + h * 0.62);
    } else if (k.label) {
      const isKo = /[가-힣]/.test(k.label);
      setStretch(isKo ? 'normal' : 'semi-expanded');
      ctx.textAlign = 'left';
      ctx.font = `650 ${Math.round(h * (isKo ? 0.26 : 0.245))}px ${isKo ? hangul : latin}`;
      ctx.fillText(k.label, c.x + padX, c.y + padY + h * 0.21);
    }
    // PBT 표면의 아주 옅은 얼룩
    ctx.globalAlpha = 0.035;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 ? '#000' : '#fff';
      ctx.fillRect(c.x + Math.random() * c.w, c.y + Math.random() * h, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.restore();
  });
}

// ---------- 기판 텍스처 ----------

function pcbCanvas(font) {
  const W = 1536, H = Math.round(1536 * (KEY_D + 1.4) / (KEY_W + 1.2));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16231f';
  ctx.fillRect(0, 0, W, H);
  const sx = W / (KEY_W + 1.2), sz = H / (KEY_D + 1.4);
  const px = (x) => (x + (KEY_W + 1.2) / 2) * sx;
  const pz = (z) => (z + (KEY_D + 1.4) / 2) * sz;
  // 배선
  ctx.strokeStyle = 'rgba(70,110,92,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 46; i++) {
    const y = (i + 0.5) * (H / 46);
    ctx.beginPath();
    ctx.moveTo(0, y);
    let x = 0;
    while (x < W) {
      const step = 40 + ((i * 37 + x) % 90);
      x += step;
      ctx.lineTo(x, y + (((x / 50) | 0) % 3 === 0 ? 6 : 0));
    }
    ctx.stroke();
  }
  // 스위치 자리: 금색 패드와 실크 인쇄
  KEYS.forEach((k) => {
    const { x, z } = keyCenter(k);
    const cx = px(x), cz = pz(z);
    const s = 14 * sx;
    ctx.strokeStyle = 'rgba(232,230,220,0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - s / 2, cz - s / 2, s, s);
    ctx.fillStyle = '#c8a24e';
    ctx.beginPath(); ctx.arc(cx - 3.8 * sx, cz - 2.6 * sz, 1.5 * sx, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 2.5 * sx, cz - 5.1 * sz, 1.5 * sx, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b1210';
    ctx.beginPath(); ctx.arc(cx, cz, 2.0 * sx, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(232,230,220,0.55)';
    ctx.font = `500 ${Math.round(2.4 * sx)}px ${font}`;
    ctx.fillText('SW', cx + 3.4 * sx, cz + 5.6 * sz);
  });
  ctx.fillStyle = 'rgba(232,230,220,0.8)';
  ctx.font = `700 ${Math.round(4.2 * sx)}px ${font}`;
  ctx.fillText('GARAK 65  REV.B  2026', px(-KEY_W / 2 + 4), pz(KEY_D / 2 - 1.6));
  return c;
}

function brassCanvas(font) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 256);
  // 헤어라인 결
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.fillRect(0, Math.random() * 256, 1024, 1);
  }
  ctx.fillStyle = 'rgba(60,40,10,0.55)';
  drawMark(ctx, 512, 104, 120, 'rgba(60,40,10,0.55)');
  ctx.font = `700 34px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('GARAK 65 — BRASS 420 g', 512, 200);
  return c;
}

function shadowCanvas() {
  // 가장자리가 완전히 투명해야 평면 모서리가 보이지 않는다
  const W = 512, H = 320;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const drawBlur = (w, h, blur, alpha) => {
    ctx.save();
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = W * 2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(W / 2 - w / 2 - W * 2, H / 2 - h / 2, w, h, 14);
    ctx.fill();
    ctx.restore();
  };
  drawBlur(W * 0.56, H * 0.36, 28, 0.42);
  drawBlur(W * 0.53, H * 0.33, 10, 0.5);
  return c;
}
export const SHADOW_PLANE = { w: 603, d: 342 };

// ---------- 모델 조립 ----------

export function buildKeyboard({ colorway, switchColor, anisotropy = 4, fonts }) {
  const root = new THREE.Group(); // 화면 회전용
  const tilt = new THREE.Group(); // 타건 각도
  tilt.rotation.x = TILT;
  // 앞-아래 모서리를 책상(y=0)에 붙인다
  const frontBottomLocalY = Y.floorBottom;
  tilt.position.y = -(Math.cos(TILT) * frontBottomLocalY - Math.sin(TILT) * (CASE_D / 2));
  root.add(tilt);

  const layers = {};
  const addLayer = (id) => {
    const g = new THREE.Group();
    g.name = id;
    tilt.add(g);
    layers[id] = g;
    return g;
  };

  // 재질
  const bead = new THREE.CanvasTexture(noiseCanvas(256, 150, 70, 3));
  bead.wrapS = bead.wrapT = THREE.RepeatWrapping;
  bead.repeat.set(1 / 9, 1 / 9);
  const caseMat = new THREE.MeshPhysicalMaterial({
    color: colorway.caseColor,
    metalness: 0.6,
    roughness: colorway.caseRough,
    roughnessMap: bead,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
  });
  const innerMat = new THREE.MeshStandardMaterial({ color: '#8d9093', metalness: 0.9, roughness: 0.5 });
  const plateMat = new THREE.MeshStandardMaterial({ color: '#7d8186', metalness: 1, roughness: 0.55 });
  const brassMap = new THREE.CanvasTexture(brassCanvas(fonts.latin));
  brassMap.colorSpace = THREE.SRGBColorSpace;
  const brassMat = new THREE.MeshPhysicalMaterial({
    color: '#d6ad62', metalness: 1, roughness: 0.24, map: brassMap, clearcoat: 0.2,
  });
  const foamMat = new THREE.MeshStandardMaterial({ color: '#d9d5cb', roughness: 0.96, metalness: 0 });
  const gasketMat = new THREE.MeshStandardMaterial({ color: '#3a3c3f', roughness: 0.85 });
  const pcbMap = new THREE.CanvasTexture(pcbCanvas(fonts.latin));
  pcbMap.colorSpace = THREE.SRGBColorSpace;
  pcbMap.anisotropy = anisotropy;
  const pcbMat = new THREE.MeshStandardMaterial({ map: pcbMap, roughness: 0.5, metalness: 0.05 });
  const housingTopMat = new THREE.MeshPhysicalMaterial({ color: '#4a4c51', roughness: 0.32, metalness: 0, clearcoat: 0.35 });
  const housingBotMat = new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.45 });
  const stemMat = new THREE.MeshStandardMaterial({ color: switchColor, roughness: 0.38 });
  const stabMat = new THREE.MeshStandardMaterial({ color: '#2c2d30', roughness: 0.55 });

  // --- 하판 (쐐기) ---
  const bottom = addLayer('bottom');
  {
    const outer = roundedRectShape(CASE_W, CASE_D, 7.5);
    const walls = roundedRectShape(CASE_W, CASE_D, 7.5);
    walls.holes.push(roundedRectPath(new THREE.Path(), CASE_W - 9, CASE_D - 9, 3.5));
    const wallGeo = extrudeY(walls, Y.floorBottom, Y.seam, 1.3, 5, 14);
    wedgeBottom(wallGeo, Y.floorBottom, 1.6);
    const floor = roundedRectShape(CASE_W - 8.6, CASE_D - 8.6, 3.4);
    const floorGeo = extrudeY(floor, Y.floorBottom + 0.2, Y.floorTop, 0, 1, 8);
    wedgeBottom(floorGeo, Y.floorBottom + 0.2, 0.3);
    const wallMesh = new THREE.Mesh(toCreasedNormals(wallGeo, 0.6), caseMat);
    const floorMesh = new THREE.Mesh(toCreasedNormals(floorGeo, 0.6), innerMat);
    bottom.add(wallMesh, floorMesh);
    void outer;
  }

  // --- 황동 무게추 ---
  const weight = addLayer('weight');
  {
    const g = new RoundedBoxGeometry(206, Y.weightT, 48, 3, 1.2);
    // 윗면에만 무늬가 보이도록 UV 를 위에서 내려다본 평면으로 다시 잡는다
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 206 + 0.5, 0.5 - pos.getZ(i) / 48);
    const m = new THREE.Mesh(g, brassMat);
    m.position.set(0, Y.floorTop + Y.weightT / 2 + 0.05, -22);
    weight.add(m);
  }

  // --- 흡음재 ---
  const foam = addLayer('foam');
  {
    const g = new RoundedBoxGeometry(KEY_W - 2, Y.foamT, KEY_D - 2, 2, 1.0);
    const m = new THREE.Mesh(g, foamMat);
    m.position.y = Y.foamTop - Y.foamT / 2;
    foam.add(m);
  }

  // --- 기판 ---
  const pcb = addLayer('pcb');
  {
    const g = new THREE.BoxGeometry(KEY_W + 1.2, Y.pcbT, KEY_D + 1.4);
    const m = new THREE.Mesh(g, pcbMat);
    m.position.y = Y.pcbTop - Y.pcbT / 2;
    pcb.add(m);
    // USB-C 단자
    const usb = new THREE.Mesh(new RoundedBoxGeometry(9, 3.3, 7.5, 2, 1.4), plateMat);
    usb.position.set(-KEY_W / 2 + 40, Y.pcbTop + 1.6, -KEY_D / 2 + 3);
    pcb.add(usb);
  }

  // --- 보강판 + 가스켓 ---
  const plate = addLayer('plate');
  {
    const shape = roundedRectShape(KEY_W + 1.0, KEY_D + 1.4, 1.2);
    KEYS.forEach((k) => {
      const { x, z } = keyCenter(k);
      const h = new THREE.Path();
      // 셰이프 좌표의 y 는 회전 후 -z 가 된다
      roundedRectPath(h, 14, 14, 0.5, x, -z);
      shape.holes.push(h);
    });
    const g = extrudeY(shape, -Y.plateT, 0, 0.15, 1, 4);
    const m = new THREE.Mesh(toCreasedNormals(g, 0.5), plateMat);
    plate.add(m);
    const gasketGeo = new RoundedBoxGeometry(13, 3.2, 4.2, 2, 0.9);
    const gx = [-120, -60, 0, 60, 120];
    gx.forEach((x) => {
      [-1, 1].forEach((side) => {
        const gm = new THREE.Mesh(gasketGeo, gasketMat);
        gm.position.set(x, -0.6, side * (KEY_D / 2 + 1.6));
        plate.add(gm);
      });
    });
    [-1, 1].forEach((side) => {
      const gm = new THREE.Mesh(gasketGeo, gasketMat);
      gm.rotation.y = Math.PI / 2;
      gm.position.set(side * (KEY_W / 2 + 1.6), -0.6, 0);
      plate.add(gm);
    });
  }

  // --- 스위치 (인스턴스) ---
  const switches = addLayer('switches');
  const dummy = new THREE.Object3D();
  const topGeo = new RoundedBoxGeometry(15.4, 5.2, 15.4, 2, 1.6);
  const botGeo = new THREE.BoxGeometry(13.8, 5.0, 13.8);
  const stemGeo = mergeGeometries([
    new THREE.BoxGeometry(4.2, 3.6, 1.3),
    new THREE.BoxGeometry(1.3, 3.6, 4.2),
    new THREE.CylinderGeometry(2.9, 2.9, 0.8, 20).translate(0, -1.4, 0),
  ]);
  const n = KEYS.length;
  const topInst = new THREE.InstancedMesh(topGeo, housingTopMat, n);
  const botInst = new THREE.InstancedMesh(botGeo, housingBotMat, n);
  const stemInst = new THREE.InstancedMesh(stemGeo, stemMat, n);
  KEYS.forEach((k, i) => {
    const { x, z } = keyCenter(k);
    dummy.position.set(x, 2.6, z); dummy.updateMatrix(); topInst.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, -2.5, z); dummy.updateMatrix(); botInst.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 5.2 + 1.8, z); dummy.updateMatrix(); stemInst.setMatrixAt(i, dummy.matrix);
  });
  stemInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  switches.add(topInst, botInst, stemInst);
  // 스태빌라이저
  {
    const stabGeo = new RoundedBoxGeometry(6.6, 6.0, 11, 2, 1.2);
    const wireMat = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.3 });
    KEYS.filter((k) => STAB_IDS.has(k.id)).forEach((k) => {
      const { x, z } = keyCenter(k);
      const half = k.w >= 6 ? 50 : 11.9;
      [-1, 1].forEach((s) => {
        const m = new THREE.Mesh(stabGeo, stabMat);
        m.position.set(x + s * half, 2.4, z);
        switches.add(m);
      });
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, half * 2, 8), wireMat);
      wire.rotation.z = Math.PI / 2;
      wire.position.set(x, 0.9, z + 6.4);
      switches.add(wire);
    });
  }

  // --- 상판 ---
  const top = addLayer('top');
  {
    const shape = roundedRectShape(CASE_W, CASE_D, 7.5);
    shape.holes.push(roundedRectPath(new THREE.Path(), KEY_W + 1.6, KEY_D + 2.0, 1.6));
    const g = extrudeY(shape, Y.seam + 0.12, Y.frameTop, 1.6, 2, 14);
    const m = new THREE.Mesh(toCreasedNormals(g, 0.6), caseMat);
    top.add(m);
    // 앞 베젤 위 황동 명판
    const badgeMat = new THREE.MeshStandardMaterial({ color: '#c79f58', metalness: 1, roughness: 0.3 });
    const badge = new THREE.Mesh(new RoundedBoxGeometry(22, 0.6, 3.0, 2, 0.28), badgeMat);
    badge.position.set(CASE_W / 2 - 34, Y.frameTop + 0.05, CASE_D / 2 - 4.2);
    top.add(badge);
  }

  // --- 키캡 ---
  const caps = addLayer('caps');
  const cells = layoutAtlas();
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = ATLAS_W;
  atlasCanvas.height = ATLAS_H;
  paintAtlas(atlasCanvas, cells, colorway, fonts);
  const atlas = new THREE.CanvasTexture(atlasCanvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = anisotropy;
  atlas.generateMipmaps = true;
  const capMat = new THREE.MeshPhysicalMaterial({
    map: atlas,
    roughness: 0.6,
    metalness: 0,
    sheen: 0.25,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color('#ffffff'),
  });
  const keyMeshes = new Map();
  KEYS.forEach((k) => {
    const c = cells.get(k.id);
    const uv = {
      u0: c.x / ATLAS_W, u1: (c.x + c.w) / ATLAS_W,
      v1: 1 - c.y / ATLAS_H, v0: 1 - (c.y + c.h) / ATLAS_H,
    };
    const g = keycapGeometry(k, uv);
    const m = new THREE.Mesh(g, capMat);
    const { x, z } = keyCenter(k);
    m.position.set(x, Y.capBase, z);
    m.userData.key = k;
    m.userData.baseY = Y.capBase;
    caps.add(m);
    keyMeshes.set(k.id, m);
  });

  // --- 그림자 ---
  const shadowTex = new THREE.CanvasTexture(shadowCanvas());
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(SHADOW_PLANE.w, SHADOW_PLANE.d),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, color: '#000000', opacity: 0.85 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.05, -2);
  shadow.renderOrder = -1;
  root.add(shadow);

  // 층별 지시선 기준점 (조립 좌표, 오른쪽 앞 모서리 근처)
  const anchors = {
    caps: new THREE.Vector3(KEY_W / 2 - 30, Y.capBase + 8.5, KEY_D / 2 - 10),
    top: new THREE.Vector3(CASE_W / 2 - 2, Y.frameTop - 2, CASE_D / 2 - 20),
    switches: new THREE.Vector3(KEY_W / 2 - 12, 5.5, KEY_D / 2 - 12),
    plate: new THREE.Vector3(KEY_W / 2 - 2, -0.7, KEY_D / 2 - 18),
    pcb: new THREE.Vector3(KEY_W / 2, Y.pcbTop - 0.8, KEY_D / 2 - 16),
    foam: new THREE.Vector3(KEY_W / 2 - 3, Y.foamTop - Y.foamT / 2, KEY_D / 2 - 14),
    weight: new THREE.Vector3(100, Y.floorTop + Y.weightT, -6),
    bottom: new THREE.Vector3(CASE_W / 2 - 1, Y.seam - 4, CASE_D / 2 - 20),
  };

  return {
    root, tilt, layers, keyMeshes, stemInst, shadow, anchors,
    materials: { caseMat, capMat, stemMat },
    atlas: { canvas: atlasCanvas, texture: atlas, cells },
    stemBaseY: 5.2 + 1.8,
  };
}
