// WebGL 캔버스 하나를 여러 '무대(slot)' 사이로 옮겨 다니며 그린다.
import * as THREE from 'three';
import { RoomEnvironment } from './../vendor/three/addons/RoomEnvironment.js';
import { buildKeyboard, paintAtlas, CASE_W, CASE_D } from './model.js';
import { KEYS, BY_ID } from './layout.js';
import { COLORWAYS, LAYERS } from './data.js';

const DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => {
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const STEM_COLORS = { goyo: '#cfc8b6', maru: '#6fa38d', ttogak: '#d24b2c' };

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl');
  } catch (e) {
    return false;
  }
}

export async function createScene(opts) {
  const { reducedMotion, colorway: cwId, switchId, fonts, onKeyPointer, capture, still } = opts;
  const canvas = document.createElement('canvas');
  canvas.className = 'gl';
  canvas.setAttribute('aria-hidden', 'true');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const maxDpr = isTouch ? 1.75 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new RoomEnvironment();
  scene.environment = pmrem.fromScene(envScene, 0.035).texture;
  scene.environmentIntensity = 0.8;
  envScene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();

  const key = new THREE.DirectionalLight('#fffaf2', 2.4);
  key.position.set(-220, 560, 300);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#f4f4f2', 0.85);
  rim.position.set(380, 200, -420);
  scene.add(rim);

  let cw = COLORWAYS[cwId];
  const kb = buildKeyboard({
    colorway: cw,
    switchColor: STEM_COLORS[switchId],
    anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()),
    fonts,
  });
  scene.add(kb.root);

  const camera = new THREE.PerspectiveCamera(30, 1, 10, 6000);

  // ---------- 상태 ----------
  const state = {
    slot: null, // { el, name, snap }
    slots: [],
    explodeTarget: 0,
    explode: 0, // main 무대 스크롤 진행도(보간된 값)
    activeLayer: -1,
    layerLift: new Array(LAYERS.length).fill(0),
    switchTravel: 4.0,
    switchFeel: { bump: 0, click: 0 },
    switchId,
    pointer: { x: 0, y: 0, sx: 0, sy: 0 },
    drag: { rot: 0, vel: 0, active: false },
    colorAnim: null,
    keyAnims: new Map(),
    needs: true,
    running: false,
    visible: !document.hidden,
    time: 0,
    introDone: reducedMotion || capture,
    lastInput: performance.now(),
    idleAmp: 1,
  };
  const poke = () => { state.lastInput = performance.now(); loop(); };
  ['pointermove', 'keydown', 'scroll', 'touchstart'].forEach((t) => window.addEventListener(t, poke, { passive: true }));

  // ---------- 무대(slot) ----------
  function registerSlot(el, name) {
    const snap = document.createElement('canvas');
    snap.className = 'snap';
    snap.setAttribute('aria-hidden', 'true');
    el.appendChild(snap);
    const s = { el, name, snap, vis: 0 };
    state.slots.push(s);
    return s;
  }

  function slotHidden(s) {
    return s.el.offsetParent === null;
  }

  // 화면에 가장 넓게 보이는 무대를 고른다 (스크롤마다, 요소 4개라 가볍다)
  function pickSlot() {
    const vh = window.innerHeight, vw = window.innerWidth;
    let best = null;
    state.slots.forEach((s) => {
      if (slotHidden(s)) { s.vis = 0; return; }
      const r = s.el.getBoundingClientRect();
      const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      s.vis = h * w;
      if (s.vis > 0 && (!best || s.vis > best.vis)) best = s;
    });
    if (best && best !== state.slot) moveTo(best);
    state.offscreen = !best;
    if (best) invalidate();
  }
  let pickQueued = false;
  window.addEventListener('scroll', () => {
    if (pickQueued) return;
    pickQueued = true;
    requestAnimationFrame(() => { pickQueued = false; pickSlot(); });
  }, { passive: true });

  function sizeOf(el) {
    const r = el.getBoundingClientRect();
    return { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
  }

  function moveTo(s) {
    if (state.slot) snapshot(state.slot);
    state.slot = s;
    s.el.appendChild(canvas);
    s.snap.style.visibility = 'hidden';
    resize();
  }

  function resize() {
    if (!state.slot) return;
    const { w, h } = sizeOf(state.slot.el);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    invalidate();
  }

  function snapshot(s) {
    // 이 무대의 장면을 그려서 2D 캔버스에 남긴다
    const { w, h } = sizeOf(s.el);
    if (w < 2 || h < 2) return;
    const prevSlot = state.slot;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const prevSize = renderer.getSize(new THREE.Vector2());
    const prevDpr = renderer.getPixelRatio();
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    state.slot = s;
    applyView(s.name, true);
    renderer.render(scene, camera);
    s.snap.width = Math.round(w * dpr);
    s.snap.height = Math.round(h * dpr);
    const ctx = s.snap.getContext('2d');
    ctx.clearRect(0, 0, s.snap.width, s.snap.height);
    ctx.drawImage(canvas, 0, 0, s.snap.width, s.snap.height);
    s.snap.style.visibility = 'visible';
    // 되돌리기
    state.slot = prevSlot;
    renderer.setPixelRatio(prevDpr);
    renderer.setSize(prevSize.x, prevSize.y, false);
    if (prevSlot) {
      const sz = sizeOf(prevSlot.el);
      camera.aspect = sz.w / sz.h;
    }
    invalidate();
  }

  function snapshotAll() {
    state.slots.forEach((s) => { if (s !== state.slot && !slotHidden(s)) snapshot(s); });
  }

  // ---------- 카메라와 분해 ----------
  const tmpV = new THREE.Vector3();
  const target = new THREE.Vector3();

  function explodeOffsets(e, spacing) {
    // 위층부터 차례로 벌어진다. 아래층일수록 조금씩 앞으로 나와 윗면이 보인다.
    return LAYERS.map((L, i) => {
      const d = (i / (LAYERS.length - 1)) * 0.32;
      const t = smooth(clamp((e - d) / 0.68));
      const extraZ = L.id === 'weight' ? 46 : 0; // 무게추는 흡음재에 가리지 않게 앞으로 뺀다
      return { y: (3.5 - i) * spacing * t, z: ((i - 3.5) * spacing * 0.3 + extraZ) * t };
    });
  }

  function setLayerPositions(e, spacing, lift) {
    const offs = explodeOffsets(e, spacing);
    LAYERS.forEach((L, i) => {
      kb.layers[L.id].position.y = offs[i].y + (lift ? lift[i] : 0);
      kb.layers[L.id].position.z = offs[i].z;
    });
    // 그림자는 하판을 따라가고, 벌어질수록 옅게
    const bo = offs[LAYERS.length - 1];
    const a = kb.tilt.rotation.x;
    kb.shadow.position.y = 0.05 + bo.y * Math.cos(a) - bo.z * Math.sin(a);
    kb.shadow.position.z = -2 + bo.y * Math.sin(a) + bo.z * Math.cos(a);
    kb.shadow.material.opacity = lerp(shadowBase, 0.32, clamp(e * 1.4));
  }

  function fitDistance(wv, hv, aspect, fovDeg) {
    const vf = (fovDeg * DEG) / 2;
    const hf = Math.atan(Math.tan(vf) * aspect);
    return Math.max(wv / 2 / Math.tan(hf), hv / 2 / Math.tan(vf));
  }

  // 무대별 시점. 반환: az, el(도), 채움 크기, 화면 이동, 분해 정도
  function viewFor(name, aspect) {
    const portrait = aspect < 0.9;
    const wide = aspect > 1.25;
    if (still && name === 'main') {
      // 대체 이미지용 정지 화면
      if (still === 'layers') return { az: 33, el: 22, w: 450, h: 420, sx: 0, sy: 0.01, explode: 1, spacing: 34 };
      return { az: 22, el: 30, w: 372, h: 250, sx: 0, sy: 0.03, explode: 0, spacing: 0 };
    }
    if (name === 'main') {
      const p = state.explode;
      const ex = smooth(clamp((p - 0.06) / 0.24)) * (1 - smooth(clamp((p - 0.86) / 0.12)));
      const hero = {
        az: portrait ? 16 : 22,
        el: portrait ? 40 : 30,
        w: portrait ? 392 : wide ? 560 : 470,
        h: portrait ? 260 : wide ? 380 : 330,
        sx: wide ? clamp(0.165 + (aspect - 1.6) * 0.08, 0.165, 0.2) : 0,
        sy: portrait ? 0.13 : wide ? 0.15 : 0.12,
      };
      const exploded = {
        az: portrait ? 26 : 32 + (clamp((p - 0.3) / 0.56)) * 8,
        el: portrait ? 24 : 22,
        w: portrait ? 380 : 540,
        h: portrait ? 560 : 470,
        sx: wide ? clamp(0.07 + (aspect - 1.6) * 0.09, 0.07, 0.13) : 0,
        sy: portrait ? 0.1 : 0.035,
      };
      const end = { ...hero, sx: wide ? 0.04 : 0, sy: portrait ? 0.06 : 0.05, az: portrait ? 14 : 20 };
      const back = smooth(clamp((p - 0.86) / 0.12));
      const from = p < 0.5 ? hero : end;
      const t = p < 0.5 ? smooth(clamp((p - 0.04) / 0.26)) : 1 - back;
      return {
        az: lerp(from.az, exploded.az, t),
        el: lerp(from.el, exploded.el, t),
        w: lerp(from.w, exploded.w, t),
        h: lerp(from.h, exploded.h, t),
        sx: lerp(from.sx, exploded.sx, t),
        sy: lerp(from.sy, exploded.sy, t),
        explode: ex,
        spacing: portrait ? 40 : 34,
        sway: p < 0.04 || p > 0.97,
      };
    }
    if (name === 'layers') {
      return { az: portrait ? 26 : 34, el: portrait ? 24 : 22, w: portrait ? 380 : 470, h: portrait ? 560 : 470, sx: 0, sy: portrait ? 0.05 : 0.03, explode: 1, spacing: portrait ? 40 : 34 };
    }
    if (name === 'color') {
      return { az: -26 + state.drag.rot, el: 19, w: 408, h: 270, sx: 0.02, sy: 0.03, explode: 0, spacing: 0, turn: true };
    }
    // typing
    return { az: 0, el: portrait ? 58 : 54, w: 400, h: portrait ? 190 : 160, sx: 0, sy: 0.02, explode: 0, spacing: 0, shadow: 0.55 };
  }

  let swayT = 0;
  let shadowBase = 0.85;
  function applyView(name, still = false) {
    const aspect = camera.aspect;
    const v = viewFor(name, aspect);
    const lift = name === 'main' || name === 'layers' ? state.layerLift : null;
    shadowBase = v.shadow ?? 0.85;
    setLayerPositions(v.explode, v.spacing, lift);

    let az = v.az, el = v.el;
    if (!reducedMotion && !still) {
      if (v.sway) {
        az += Math.sin(swayT * 0.32) * 2.6 + state.pointer.sx * 3.2;
        el += Math.sin(swayT * 0.23 + 1.2) * 1.1 - state.pointer.sy * 2.0;
      }
      if (v.turn && !state.drag.active) az += Math.sin(swayT * 0.21) * 5;
    }
    // 분해 정도에 따라 보이는 높이가 커진다
    const fov = camera.fov;
    const dist = fitDistance(v.w, v.h, aspect, fov) * 1.0;
    // 목표점: 조립 상태의 키보드 가운데(분해 시에도 층 가운데가 같은 높이)
    target.set(0, 18, 0);
    const azr = az * DEG, elr = el * DEG;
    camera.position.set(
      target.x + dist * Math.sin(azr) * Math.cos(elr),
      target.y + dist * Math.sin(elr),
      target.z + dist * Math.cos(azr) * Math.cos(elr),
    );
    camera.lookAt(target);
    camera.near = dist * 0.2;
    camera.far = dist * 4;
    // 렌즈 이동으로 보드 위치를 옮긴다 (원근은 그대로)
    renderer.getSize(tmpV2);
    const w = tmpV2.x, h = tmpV2.y;
    if (v.sx || v.sy) camera.setViewOffset(w, h, -v.sx * w, -v.sy * h, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  const tmpV2 = new THREE.Vector2();

  // ---------- 키 누름 ----------
  function pressCurve(t) {
    const f = state.switchFeel;
    if (f.click) {
      if (t < 12) return 0.5 * easeOut(t / 12);
      if (t < 16) return 0.5;
      return 0.5 + 0.5 * easeOut(clamp((t - 16) / 10));
    }
    if (f.bump) {
      if (t < 9) return 0.14 * easeOut(t / 9);
      if (t < 20) return 0.14;
      return 0.14 + 0.86 * easeOut(clamp((t - 20) / 22));
    }
    return easeOut(clamp(t / 34));
  }

  function press(id) {
    if (!BY_ID.has(id)) return;
    const now = performance.now();
    const a = state.keyAnims.get(id);
    if (a && a.down) return;
    state.keyAnims.set(id, { down: true, t0: now, from: a ? a.pos : 0, pos: a ? a.pos : 0, releaseAt: 0 });
    loop();
  }

  function release(id) {
    const a = state.keyAnims.get(id);
    if (!a || !a.down) return;
    const now = performance.now();
    a.down = false;
    a.releaseAt = Math.max(now, a.t0 + 70);
    loop();
  }

  function releaseAll() {
    state.keyAnims.forEach((a, id) => release(id));
  }

  const stemMatrix = new THREE.Matrix4();
  const stemPos = new THREE.Vector3();
  const KEY_INDEX = new Map(KEYS.map((k, i) => [k.id, i]));

  function updateKeys(now) {
    let active = false;
    state.keyAnims.forEach((a, id) => {
      let pos;
      if (a.down) {
        pos = lerp(a.from, 1, pressCurve(now - a.t0));
        active = active || pos < 0.999;
      } else if (now < a.releaseAt) {
        pos = lerp(a.from, 1, pressCurve(now - a.t0));
        active = true;
      } else {
        if (a.relFrom === undefined) a.relFrom = lerp(a.from, 1, pressCurve(a.releaseAt - a.t0));
        const t = clamp((now - a.releaseAt) / 95);
        pos = a.relFrom * (1 - easeOutBack(t));
        if (t >= 1) {
          pos = 0;
          state.keyAnims.delete(id);
        } else active = true;
      }
      a.pos = pos;
      const mesh = kb.keyMeshes.get(id);
      const travel = state.switchTravel;
      mesh.position.y = mesh.userData.baseY - pos * travel;
      const i = KEY_INDEX.get(id);
      kb.stemInst.getMatrixAt(i, stemMatrix);
      stemPos.setFromMatrixPosition(stemMatrix);
      stemMatrix.setPosition(stemPos.x, kb.stemBaseY - pos * travel, stemPos.z);
      kb.stemInst.setMatrixAt(i, stemMatrix);
      kb.stemInst.instanceMatrix.needsUpdate = true;
    });
    return active;
  }

  // ---------- 포인터로 키 누르기 ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const capMeshes = [...kb.keyMeshes.values()];
  const pointers = new Map();

  function keyAt(clientX, clientY) {
    if (!state.slot) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(capMeshes, false)[0];
    return hit ? hit.object.userData.key.id : null;
  }

  function onPointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const id = keyAt(e.clientX, e.clientY);
    const isColor = state.slot && state.slot.name === 'color';
    const p = { id, x: e.clientX, y: e.clientY, t: performance.now(), pressed: false, timer: 0, dragging: false, type: e.pointerType };
    pointers.set(e.pointerId, p);
    if (isColor) {
      state.drag.active = true;
      state.drag.vel = 0;
      p.lastX = e.clientX;
    }
    if (!id) return;
    if (e.pointerType === 'mouse' && !isColor) {
      p.pressed = true;
      onKeyPointer(id, true);
    } else {
      p.timer = setTimeout(() => {
        if (pointers.get(e.pointerId) === p && !p.dragging) {
          p.pressed = true;
          onKeyPointer(id, true);
        }
      }, 70);
    }
  }

  function onPointerMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse' && state.slot) {
        canvas.style.cursor = keyAt(e.clientX, e.clientY) ? 'pointer' : '';
      }
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.dragging && Math.hypot(dx, dy) > 7) {
      p.dragging = true;
      clearTimeout(p.timer);
      if (p.pressed) { onKeyPointer(p.id, false); p.pressed = false; }
    }
    if (p.dragging && state.drag.active) {
      const step = e.clientX - p.lastX;
      p.lastX = e.clientX;
      state.drag.rot = clamp(state.drag.rot + step * 0.35, -120, 120);
      state.drag.vel = step * 0.35;
      loop();
    }
  }

  function onPointerUp(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    clearTimeout(p.timer);
    if (state.drag.active && pointers.size === 0) { state.drag.active = false; loop(); }
    if (p.pressed) onKeyPointer(p.id, false);
    else if (p.id && !p.dragging && e.type === 'pointerup') {
      onKeyPointer(p.id, true);
      setTimeout(() => onKeyPointer(p.id, false), 60);
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // ---------- 색 구성 ----------
  const fromCase = new THREE.Color();
  const toCase = new THREE.Color();
  function setColorway(id, animate = true) {
    cw = COLORWAYS[id];
    paintAtlas(kb.atlas.canvas, kb.atlas.cells, cw, fonts);
    kb.atlas.texture.needsUpdate = true;
    fromCase.copy(kb.materials.caseMat.color);
    toCase.set(cw.caseColor);
    state.colorAnim = { t0: performance.now(), dur: animate && !reducedMotion ? 380 : 0, rough0: kb.materials.caseMat.roughness, rough1: cw.caseRough };
    loop();
  }

  function repaintLegends() {
    paintAtlas(kb.atlas.canvas, kb.atlas.cells, cw, fonts);
    kb.atlas.texture.needsUpdate = true;
    invalidate();
  }

  function updateColor(now) {
    const a = state.colorAnim;
    if (!a) return false;
    const t = a.dur ? clamp((now - a.t0) / a.dur) : 1;
    const e = easeInOut(t);
    kb.materials.caseMat.color.copy(fromCase).lerp(toCase, e);
    kb.materials.caseMat.roughness = lerp(a.rough0, a.rough1, e);
    if (t >= 1) {
      state.colorAnim = null;
      setTimeout(snapshotAll, 30);
      return false;
    }
    return true;
  }

  // ---------- 스위치 ----------
  function setSwitch(id, sw) {
    state.switchId = id;
    state.switchTravel = sw.travel;
    state.switchFeel = sw.feel;
    kb.materials.stemMat.color.set(STEM_COLORS[id]);
    invalidate();
  }

  // ---------- 분해 단계 ----------
  function setActiveLayer(i, instant = false) {
    state.activeLayer = i;
    state.liftInstant = instant || reducedMotion;
    loop();
  }

  function updateLift() {
    let moving = false;
    for (let i = 0; i < LAYERS.length; i++) {
      const goal = i === state.activeLayer ? 7 : 0;
      const cur = state.layerLift[i];
      const next = state.liftInstant ? goal : cur + (goal - cur) * 0.18;
      state.layerLift[i] = Math.abs(next - goal) < 0.02 ? goal : next;
      if (state.layerLift[i] !== goal) moving = true;
    }
    return moving;
  }

  // ---------- 지시선 기준점 화면 좌표 ----------
  const anchorTmp = new THREE.Vector3();
  function layerAnchors() {
    if (!state.slot) return null;
    const { w, h } = sizeOf(state.slot.el);
    kb.root.updateMatrixWorld(true);
    return LAYERS.map((L) => {
      anchorTmp.copy(kb.anchors[L.id]);
      kb.layers[L.id].localToWorld(anchorTmp);
      anchorTmp.project(camera);
      return { id: L.id, x: (anchorTmp.x * 0.5 + 0.5) * w, y: (-anchorTmp.y * 0.5 + 0.5) * h };
    });
  }

  // ---------- 루프 ----------
  let listeners = [];
  function onFrame(fn) { listeners.push(fn); }

  function invalidate() {
    state.needs = true;
    loop();
  }

  function loop() {
    if (state.running || !state.visible) return;
    state.running = true;
    requestAnimationFrame(frame);
  }

  let last = performance.now();
  function frame(now) {
    state.running = false;
    if (!state.visible || !state.slot || state.offscreen) return;
    const dt = Math.min(64, now - last);
    last = now;
    let keepGoing = false;

    // 스크롤 진행도 보간
    const d = state.explodeTarget - state.explode;
    if (Math.abs(d) > 0.0004) {
      state.explode += d * (reducedMotion ? 1 : 1 - Math.pow(0.86, dt / 16.7));
      keepGoing = true;
    } else state.explode = state.explodeTarget;

    // 포인터 시차
    const ps = state.pointer;
    ps.sx += (ps.x - ps.sx) * 0.06;
    ps.sy += (ps.y - ps.sy) * 0.06;

    if (updateKeys(now)) keepGoing = true;
    if (updateColor(now)) keepGoing = true;
    if (updateLift()) keepGoing = true;

    // 드래그 관성
    if (!state.drag.active && Math.abs(state.drag.vel) > 0.01) {
      state.drag.rot = clamp(state.drag.rot + state.drag.vel, -120, 120);
      state.drag.vel *= 0.92;
      keepGoing = true;
    }

    const name = state.slot.name;
    const v = viewFor(name, camera.aspect);
    // 가만히 있으면 10초 뒤 천천히 멈춘다 (계속 움직이는 화면을 만들지 않는다)
    const quiet = now - state.lastInput > 10000;
    state.idleAmp += ((quiet ? 0 : 1) - state.idleAmp) * Math.min(1, dt / 900);
    const idle = !reducedMotion && !capture && ((v.sway) || (v.turn && !state.drag.active)) && state.idleAmp > 0.002;
    if (idle) {
      swayT += (dt / 1000) * state.idleAmp;
      keepGoing = true;
    }

    applyView(name);
    renderer.render(scene, camera);
    listeners.forEach((fn) => fn());
    state.needs = false;
    if (keepGoing) loop();
  }

  document.addEventListener('visibilitychange', () => {
    state.visible = !document.hidden;
    if (state.visible) { last = performance.now(); invalidate(); } else releaseAll();
  });

  window.addEventListener('resize', () => {
    pickSlot();
    resize();
    clearTimeout(resize.t);
    resize.t = setTimeout(snapshotAll, 250);
  });

  // 첫 등장: 왼쪽에서 오른쪽으로 한 번 물결처럼 눌림
  function intro() {
    if (state.introDone) return;
    state.introDone = true;
    KEYS.forEach((k) => {
      const delay = 260 + (k.cx / 16) * 520 + k.row * 26;
      setTimeout(() => press(k.id), delay);
      setTimeout(() => release(k.id), delay + 80);
    });
  }

  return {
    canvas,
    registerSlot,
    pickSlot,
    snapshotAll,
    invalidate,
    press,
    release,
    releaseAll,
    setColorway,
    repaintLegends,
    setSwitch,
    setActiveLayer,
    layerAnchors,
    onFrame,
    intro,
    get slotName() { return state.slot ? state.slot.name : null; },
    get slotEl() { return state.slot ? state.slot.el : null; },
    setExplode(p, instant = false) {
      state.explodeTarget = p;
      if (instant) state.explode = p;
      loop();
    },
    get explode() { return state.explode; },
    setPointer(x, y) {
      state.pointer.x = x;
      state.pointer.y = y;
    },
    resize,
    renderer,
    debug: { camera, scene, kb, state },
  };
}

export { CASE_W, CASE_D };
