// Hero: a pool of the selected scent (height-field wave sim + shaded surface) with a glass bottle
// hovering over it. One WebGL2 context through three.js.
//
// Frame:  sim (ping-pong) -> derivatives -> pool shading (into poolRT) -> scene
//         scene = fullscreen quad sampling poolRT + bottle (glass with transmission refracts the quad)

import {
  WebGLRenderer, Scene, PerspectiveCamera, OrthographicCamera, Mesh, Group, BufferGeometry, BufferAttribute,
  ShaderMaterial, MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, WebGLRenderTarget,
  HalfFloatType, LinearFilter, NearestFilter, RGBAFormat, ClampToEdgeWrapping, Vector2, Vector3, Vector4, Color,
  CanvasTexture, SRGBColorSpace, PMREMGenerator, NeutralToneMapping, PlaneGeometry, LatheGeometry, BackSide,
  SphereGeometry, DirectionalLight, HemisphereLight,
} from '../vendor/three.min.js';
import { SCENTS, byId } from './scents.js';

const HORIZON = 2.0;
const DMIN = 1 / HORIZON;
const DMAX = 1 / (HORIZON - 1);

// ---------------------------------------------------------------- GLSL

const NOISE = /* glsl */`
vec2 hash2(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}
float gnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
             mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)), dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}
`;

const FS_VERT = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const SIM_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uLapW;
uniform float uDamp;
uniform float uSpread;
uniform vec4 uBrushA;   // xy current (sim uv), z radius (plane), w strength
uniform vec2 uBrushB;   // previous (sim uv)
uniform vec2 uPlane;    // plane width, depth covered by the sim
uniform vec4 uRing;     // xy origin (sim uv), z radius (plane), w strength
uniform float uFlowT;
uniform float uFlowScale;
varying vec2 vUv;
${NOISE}
void main(){
  vec4 s = texture2D(uState, vUv);
  float h = s.r, v = s.g;
  float l = texture2D(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float r = texture2D(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float d = texture2D(uState, vUv - vec2(0.0, uTexel.y)).r;
  float u = texture2D(uState, vUv + vec2(0.0, uTexel.y)).r;
  float lap = uLapW.x * (l + r - 2.0 * h) + uLapW.y * (d + u - 2.0 * h);
  v += lap;
  v *= uDamp;
  h = mix(h, (l + r + d + u) * 0.25, uSpread);
  h += v;
  h *= 0.9985;
  // soak up waves at the borders so nothing bounces back
  vec2 e = smoothstep(vec2(0.0), vec2(0.04), vUv) * smoothstep(vec2(0.0), vec2(0.04), 1.0 - vUv);
  float edge = e.x * e.y;
  v *= mix(0.9, 1.0, edge);

  vec2 pa = (vUv - uBrushB) * uPlane;
  vec2 ba = (uBrushA.xy - uBrushB) * uPlane;
  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  float dist = length(pa - ba * t);
  h -= uBrushA.w * exp(-dist * dist / (uBrushA.z * uBrushA.z));

  float rd = length((vUv - uRing.xy) * uPlane);
  h += uRing.w * exp(-pow((rd - uRing.z) / 0.04, 2.0));

  // slow flow of the whole surface (domain-warped noise), kept separate from the waves
  vec2 P = vec2((vUv.x - 0.5) * uPlane.x, vUv.y * uPlane.y) * uFlowScale;
  float ft = uFlowT;
  vec2 w = vec2(gnoise(P * 0.55 + vec2(0.0, ft * 0.11)), gnoise(P * 0.55 + vec2(5.2, -ft * 0.09)));
  float f = gnoise(P + w * 1.2 + vec2(ft * 0.07, ft * 0.05)) * 0.72
          + gnoise(P * 1.93 + w * 0.6 - vec2(ft * 0.13, -ft * 0.02)) * 0.23
          + gnoise(P * 3.9 + w * 0.3 + vec2(ft * 0.2, ft * 0.17)) * 0.05;
  gl_FragColor = vec4(h, v, f, 1.0);
}
`;

const DERIV_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uCell;      // plane size of one texel
uniform float uRipple;
uniform float uFlowAmp;
varying vec2 vUv;
float H(vec2 o){ vec4 s = texture2D(uState, vUv + o * uTexel); return s.r * uRipple + s.b * uFlowAmp; }
void main(){
  float c = H(vec2(0.0));
  float l = H(vec2(-1.0, 0.0)), r = H(vec2(1.0, 0.0)), d = H(vec2(0.0, -1.0)), u = H(vec2(0.0, 1.0));
  gl_FragColor = vec4((r - l) / (2.0 * uCell.x), (u - d) / (2.0 * uCell.y), (l + r + d + u - 4.0 * c), c);
}
`;

const POOL_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uDeriv;
uniform float uAspect;
uniform float uTime;
uniform float uNormal;
uniform float uCamH;
uniform vec3 uDeepA, uBodyA, uLightA, uKeyA, uFloorA; uniform vec2 uParA;
uniform vec3 uDeepB, uBodyB, uLightB, uKeyB, uFloorB; uniform vec2 uParB;
uniform vec2 uOrigin;     // pour origin, plane coords
uniform float uFrontR;    // pour front radius (plane)
uniform float uFrontOn;   // 1 while pouring
uniform vec4 uBottle;     // bottle shadow: center uv, radius uv
uniform vec3 uLightPos;   // xy uv of the light pool, z falloff
uniform float uTextSide;  // 1 = darken left for text
uniform vec4 uBox;        // strip lights: azimuth, elevation, half width, thickness
uniform float uStrip;
uniform float uTextBottom; // 1 = text sits on the lower part (portrait)
varying vec2 vUv;
${NOISE}
float rect(vec2 p, vec2 hs, float soft){
  vec2 q = abs(p) - hs;
  return 1.0 - smoothstep(-soft, soft, max(q.x, q.y));
}
vec3 studio(vec3 R, vec3 key, float gloss){
  float az = atan(R.x, R.z);
  float el = asin(clamp(R.y, -1.0, 1.0));
  // long strip lights: on a swelling surface they break into sinuous highlights
  float span = smoothstep(uBox.z, uBox.z * 0.55, abs(az - uBox.x));
  float s1 = exp(-pow((el - uBox.y) / uBox.w, 2.0));
  float s2 = exp(-pow((el - uBox.y - 0.075) / (uBox.w * 0.55), 2.0));
  float s3 = exp(-pow((el - uBox.y + 0.11) / (uBox.w * 0.4), 2.0)) * smoothstep(uBox.z * 0.8, 0.0, abs(az - uBox.x - 0.06));
  float sky = 0.025 + 0.06 * smoothstep(0.0, 0.9, el);
  return key * ((s1 * 15.0 + s2 * 8.0 + s3 * 6.0) * span * gloss * uStrip + sky);
}
void main(){
  vec2 uv = vUv;
  float d = 1.0 / (${HORIZON.toFixed(3)} - uv.y);
  vec2 suv = vec2((uv.x - 0.5) * d / ${DMAX.toFixed(3)} + 0.5, (d - ${DMIN.toFixed(3)}) / ${(DMAX - DMIN).toFixed(3)});
  vec4 D = texture2D(uDeriv, suv);
  vec2 P = vec2((uv.x - 0.5) * uAspect * d, d);
  // a little fine texture on top of the slow swell
  vec2 fine = vec2(gnoise(P * 30.0 + uTime * 0.12), gnoise(P * 30.0 + 7.3 - uTime * 0.1)) * 0.004;
  vec3 n = normalize(vec3(-D.x * uNormal + fine.x, 1.0, -D.y * uNormal + fine.y));

  // palette: B spreads from the pour origin with a ragged, slow front
  float fd = length((P - uOrigin) * vec2(1.0, 1.6));
  float rag = gnoise(P * 7.0 + uTime * 0.15) * 0.05 + gnoise(P * 2.3 - uTime * 0.05) * 0.09;
  float m = mix(1.0, 1.0 - smoothstep(uFrontR - 0.09, uFrontR + 0.01, fd + rag), uFrontOn);
  vec3 deep = mix(uDeepA, uDeepB, m);
  vec3 body = mix(uBodyA, uBodyB, m);
  vec3 lightC = mix(uLightA, uLightB, m);
  vec3 key = mix(uKeyA, uKeyB, m);
  vec3 floorC = mix(uFloorA, uFloorB, m);
  vec2 par = mix(uParA, uParB, m);      // x clarity, y gloss
  // the moving edge of the new liquid catches light
  float rim = uFrontOn * exp(-pow((fd + rag - uFrontR) / 0.025, 2.0)) * 0.6;

  vec3 Pw = vec3(P.x, 0.0, P.y);
  vec3 V = normalize(Pw - vec3(0.0, uCamH, 0.0));
  vec3 R = reflect(V, n);
  float cosT = clamp(dot(-V, n), 0.0, 1.0);
  float F = 0.035 + 0.965 * pow(1.0 - cosT, 5.0);

  // light pool on the surface
  vec2 lp = uv - uLightPos.xy; lp.x *= uAspect;
  float pool = exp(-dot(lp, lp) * uLightPos.z);
  vec3 L = normalize(vec3(0.35, 0.9, 0.6));
  float lambert = clamp(dot(n, L) * 1.25 - 0.25, 0.0, 1.0);

  // caustic net on the floor, bent by the surface normal
  vec2 cp = P * vec2(7.5, 9.0) + n.xz * 2.2;
  float c1 = 1.0 - abs(gnoise(cp + vec2(uTime * 0.07, -uTime * 0.05)));
  float c2 = 1.0 - abs(gnoise(cp * 1.37 + vec2(-uTime * 0.05, uTime * 0.06) + 3.1));
  float caustic = pow(c1, 7.0) + pow(c2, 7.0) * 0.7;
  caustic *= 0.55 + clamp(-D.z * 140.0, -0.45, 1.2);

  float lit = pool * (0.6 + 0.4 * lambert);
  vec3 col = mix(deep, body, clamp(lit * 0.72, 0.0, 1.0));
  col += floorC * caustic * pool * par.x * 0.35;
  col += lightC * caustic * pow(pool, 2.0) * par.x * 0.22;
  col = mix(col, lightC * 0.8, pow(pool, 6.0) * 0.12 * par.x);

  // bottle: a soft shadow with a focused, tinted core of light that went through the glass
  vec2 bq = (uv - uBottle.xy) / uBottle.zw;
  float bs = exp(-dot(bq, bq) * 1.4);
  vec2 cq = (bq - vec2(0.18, 0.1)) * vec2(1.7, 1.3);
  float core = exp(-dot(cq, cq) * 2.2);
  col *= 1.0 - bs * 0.55;
  // light focused through the liquid in the bottle: a warm, rippled patch inside the shadow
  col += mix(lightC, body, 0.35) * core * (0.25 + 0.9 * caustic) * (0.35 + 0.65 * par.x) * 0.55;

  // far away the pool falls into darkness
  float far = smoothstep(0.35, 1.0, uv.y);
  col = mix(col, deep * 0.5, far * 0.65);
  // keep the text side quiet
  col *= mix(1.0, mix(0.55, 1.0, smoothstep(0.1, 0.6, uv.x)), uTextSide);

  vec3 env = studio(R, key, par.y);
  // leave the strip under the top bar calm, and the text area on portrait screens
  env *= 1.0 - 0.85 * smoothstep(0.84, 0.97, uv.y);
  float lowQuiet = smoothstep(0.64, 0.4, uv.y) * uTextBottom;
  env *= 1.0 - 0.8 * lowQuiet;
  col *= 1.0 - 0.3 * lowQuiet;
  col = col * (1.0 - F) + env * F;
  float spec = pow(max(dot(R, normalize(vec3(0.42, 0.36, 0.83))), 0.0), 1600.0);
  col += key * spec * 3.0 * par.y;
  col += key * rim * (0.2 + 0.6 * pool);

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

const QUAD_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uPool;
uniform float uFade;
varying vec2 vUv;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  gl_FragColor = vec4(texture2D(uPool, vUv).rgb * uFade, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += (h12(gl_FragCoord.xy) - 0.5) / 255.0;
}
`;

const LIQUID_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vV;
varying vec4 vClip;
varying vec3 vLocal;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vLocal = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  vClip = projectionMatrix * viewMatrix * wp;
  gl_Position = vClip;
}
`;

const LIQUID_FRAG = /* glsl */`
precision highp float;
uniform sampler2D uPool;
uniform vec3 uSigma;     // absorption per unit length
uniform vec3 uBody;
uniform vec3 uLight;
uniform vec3 uKey;
uniform float uLevel;
uniform float uBase;
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying vec4 vClip;
varying vec3 vLocal;
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(vV);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec2 suv = vClip.xy / vClip.w * 0.5 + 0.5;
  float top = step(uLevel - 0.004, vLocal.y) * step(0.6, N.y);
  // looking through the liquid, the pool behind is pulled toward the centre and flipped a little
  vec2 off = N.xy * (0.10 + 0.08 * (1.0 - ndv));
  vec3 bg = texture2D(uPool, clamp(suv - off, 0.002, 0.998)).rgb;
  float pathLen = mix(2.4, 0.9, ndv);
  vec3 tr = exp(-uSigma * pathLen);
  float h = clamp((vLocal.y - uBase) / (uLevel - uBase), 0.0, 1.0);
  // light comes through from behind and above: brightest high on the far side
  vec3 scatter = uBody * (0.16 + 0.42 * h) + uLight * 0.12 * pow(h, 4.0);
  vec3 col = bg * tr * 1.15 + scatter * (1.0 - tr);
  col += uLight * pow(1.0 - ndv, 2.0) * 0.12 * smoothstep(-0.2, 0.8, N.x);
  // light gathered on the floor of the liquid
  col += uLight * 0.22 * exp(-pow((vLocal.y - uBase) / 0.07, 2.0)) * (0.4 + 0.6 * ndv);
  // surface seen from above: brighter, catches the softbox
  vec3 topCol = mix(uBody, uLight, 0.45) * 0.65 + uKey * 0.08;
  col = mix(col, topCol, top);
  // thin bright meniscus line where liquid meets glass
  float men = smoothstep(uLevel - 0.03, uLevel - 0.004, vLocal.y) * (1.0 - top) * pow(1.0 - ndv, 0.5);
  col += uLight * men * 0.55;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------- helpers

const lin = (hex) => new Color(hex); // three converts hex (sRGB) to linear working space
const fsGeom = () => {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  return g;
};
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// a lathe whose cross-section is a superellipse: rings [{y, ax, az, n}], ax = 0 closes with a pole
function squircleLathe(rings, segs) {
  const pos = [];
  const idx = [];
  const start = [];
  for (const r of rings) {
    start.push(pos.length / 3);
    if (r.ax === 0) { pos.push(0, r.y, 0); continue; }
    const e = 2 / (r.n || 4);
    for (let i = 0; i < segs; i++) {
      const th = (i / segs) * Math.PI * 2;
      const c = Math.cos(th), s = Math.sin(th);
      pos.push(Math.sign(c) * Math.abs(c) ** e * r.ax, r.y, Math.sign(s) * Math.abs(s) ** e * r.az);
    }
  }
  for (let k = 0; k < rings.length - 1; k++) {
    const A = rings[k], B = rings[k + 1], a0 = start[k], b0 = start[k + 1];
    if (A.ax === 0 && B.ax === 0) continue;
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      if (A.ax === 0) idx.push(a0, b0 + i, b0 + j);
      else if (B.ax === 0) idx.push(a0 + i, b0, a0 + j);
      else idx.push(a0 + i, b0 + j, a0 + j, a0 + i, b0 + i, b0 + j);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const GLASS_RINGS = [
  { y: 0.0, ax: 0 },
  { y: 0.0, ax: 0.64, az: 0.39 },
  { y: 0.012, ax: 0.73, az: 0.46 },
  { y: 0.045, ax: 0.772, az: 0.5 },
  { y: 0.1, ax: 0.785, az: 0.52 },
  { y: 1.84, ax: 0.785, az: 0.52 },
  { y: 1.9, ax: 0.772, az: 0.505 },
  { y: 1.948, ax: 0.735, az: 0.478 },
  { y: 1.982, ax: 0.62, az: 0.42, n: 3.6 },
  { y: 1.998, ax: 0.42, az: 0.35, n: 2.8 },
  { y: 2.01, ax: 0.3, az: 0.3, n: 2 },
  { y: 2.12, ax: 0.29, az: 0.29, n: 2 },
  { y: 2.12, ax: 0 },
];
const LIQ_BASE = 0.3;
const LIQ_LEVEL = 1.66;
const LIQUID_RINGS = [
  { y: LIQ_BASE, ax: 0 },
  { y: LIQ_BASE, ax: 0.6, az: 0.355 },
  { y: LIQ_BASE + 0.03, ax: 0.66, az: 0.405 },
  { y: LIQ_BASE + 0.08, ax: 0.675, az: 0.42 },
  { y: LIQ_LEVEL - 0.012, ax: 0.675, az: 0.42 },
  { y: LIQ_LEVEL, ax: 0.668, az: 0.413 },
  { y: LIQ_LEVEL, ax: 0 },
];
const BOTTLE_H = 2.84;
const BOTTLE_W = 1.57;

function drawLabel(canvas, scent) {
  const W = canvas.width, H = canvas.height;
  const c = canvas.getContext('2d');
  c.fillStyle = '#f1ebe0';
  c.fillRect(0, 0, W, H);
  // paper fibre
  const rnd = mulberry(7);
  for (let i = 0; i < 1400; i++) {
    c.fillStyle = `rgba(90,70,40,${0.025 + rnd() * 0.04})`;
    c.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 3, 1);
  }
  const ink = '#2a2118';
  c.fillStyle = ink;
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  c.font = '400 30px Hahmlet, serif';
  c.fillText('담금', W / 2, 74);
  c.font = '400 15px Newsreader, serif';
  c.letterSpacing = '6px';
  c.fillText('DAMGEUM', W / 2 + 3, 102);
  c.letterSpacing = '0px';
  c.fillRect(W / 2 - 18, 132, 36, 1.5);
  c.font = 'italic 300 34px Newsreader, serif';
  c.fillText(`No.${scent.no}`, W / 2, 210);
  c.font = `250 ${scent.name.length > 1 ? 118 : 132}px Hahmlet, serif`;
  c.fillText(scent.name, W / 2, 352);
  c.font = 'italic 300 34px Newsreader, serif';
  c.fillText(scent.latin, W / 2, 414);
  c.fillRect(W / 2 - 18, 456, 36, 1.5);
  c.font = '400 19px "Damgeum Sans", sans-serif';
  c.fillText(scent.conc.replace('오 드 퍼퓸', 'eau de parfum').replace('엑스트레', 'extrait'), W / 2, 500);
  c.fillText('50 ml', W / 2, 530);
  c.font = '400 16px "Damgeum Sans", sans-serif';
  c.fillStyle = 'rgba(42,33,24,.78)';
  c.fillText('담근 날 2026. 9. 14', W / 2, 584);
  c.fillText('거른 날 2026. 10. 25', W / 2, 610);
}
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function envScene(tint) {
  const s = new Scene();
  s.background = new Color(0x050404);
  const add = (w, h, color, x, y, z, ry = 0, rx = 0) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color, side: 2 }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); s.add(m); return m;
  };
  add(2.4, 7, new Color(1, 0.97, 0.92).multiplyScalar(9), 5.2, 1.2, -1.2, -Math.PI / 2.4);
  add(0.6, 7, new Color(1, 1, 1).multiplyScalar(5), -5.6, 1.0, 0.8, Math.PI / 2.2);
  add(5, 5, new Color(1, 0.98, 0.95).multiplyScalar(1.3), 0, 7, 0, 0, Math.PI / 2);
  add(14, 3, tint.clone().multiplyScalar(0.55), 0, -3.2, -2, 0, -Math.PI / 2.3);
  add(1.6, 3.6, new Color(1, 0.96, 0.9).multiplyScalar(1.4), 1.6, 1.0, 6.5, Math.PI);
  const dome = new Mesh(new SphereGeometry(20, 24, 12), new MeshBasicMaterial({ color: tint.clone().multiplyScalar(0.05), side: BackSide }));
  s.add(dome);
  return s;
}

// ---------------------------------------------------------------- hero

export function initHero({ canvas, section, scentId, reduced = false, capture = null, onReady, onFail }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!capture });
  } catch (e) {
    onFail && onFail(e);
    return null;
  }
  const gl = renderer.getContext();
  const ext = renderer.extensions;
  if (!(gl instanceof WebGL2RenderingContext) || !(ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'))) {
    renderer.dispose();
    onFail && onFail(new Error('float targets unsupported'));
    return null;
  }
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;
  if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = 0.75;

  const coarse = matchMedia('(pointer: coarse)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  let dprCap = weak ? 1.5 : 2;
  let poolScale = coarse || weak ? 0.5 : 0.6;
  const simBase = coarse || weak ? 230 : 330;

  const ortho = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsg = fsGeom();

  // --- sim targets (created on resize)
  const rtOpts = { type: HalfFloatType, format: RGBAFormat, depthBuffer: false, stencilBuffer: false, wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping };
  let simA, simB, deriv, poolRT;
  let simW = 0, simH = 0;
  const plane = new Vector2(1, 1);

  const simMat = new ShaderMaterial({
    vertexShader: FS_VERT, fragmentShader: SIM_FRAG, depthTest: false, depthWrite: false,
    uniforms: {
      uState: { value: null }, uTexel: { value: new Vector2() }, uLapW: { value: new Vector2(0.4, 0.4) },
      uDamp: { value: 0.97 }, uSpread: { value: 0.1 }, uBrushA: { value: new Vector4(-1, -1, 0.03, 0) },
      uBrushB: { value: new Vector2(-1, -1) }, uPlane: { value: plane }, uRing: { value: new Vector4(0, 0, 0, 0) },
      uFlowT: { value: 0 }, uFlowScale: { value: 2.2 },
    },
  });
  const derivMat = new ShaderMaterial({
    vertexShader: FS_VERT, fragmentShader: DERIV_FRAG, depthTest: false, depthWrite: false,
    uniforms: { uState: { value: null }, uTexel: { value: new Vector2() }, uCell: { value: new Vector2() }, uRipple: { value: 1 }, uFlowAmp: { value: 0.012 } },
  });
  const pal = (s) => ({
    deep: lin(s.liquid.deep), body: lin(s.liquid.body), light: lin(s.liquid.light), key: lin(s.liquid.key), floor: lin(s.liquid.floor),
    par: new Vector2(s.liquid.clarity, s.liquid.gloss),
  });
  const poolMat = new ShaderMaterial({
    vertexShader: FS_VERT, fragmentShader: POOL_FRAG, depthTest: false, depthWrite: false,
    uniforms: {
      uDeriv: { value: null }, uAspect: { value: 1.6 }, uTime: { value: 0 }, uNormal: { value: 1 }, uCamH: { value: 0.55 },
      uDeepA: { value: new Color() }, uBodyA: { value: new Color() }, uLightA: { value: new Color() }, uKeyA: { value: new Color() }, uFloorA: { value: new Color() }, uParA: { value: new Vector2() },
      uDeepB: { value: new Color() }, uBodyB: { value: new Color() }, uLightB: { value: new Color() }, uKeyB: { value: new Color() }, uFloorB: { value: new Color() }, uParB: { value: new Vector2() },
      uOrigin: { value: new Vector2() }, uFrontR: { value: 0 }, uFrontOn: { value: 0 },
      uBottle: { value: new Vector4(0.66, 0.2, 0.12, 0.05) }, uLightPos: { value: new Vector3(0.66, 0.45, 3.0) }, uTextSide: { value: 1 },
      uBox: { value: new Vector4(0.42, 0.63, 0.2, 0.05) }, uStrip: { value: 1 }, uTextBottom: { value: 0 },
    },
  });
  const passScene = new Scene();
  const passQuad = new Mesh(fsg, simMat);
  passQuad.frustumCulled = false;
  passScene.add(passQuad);

  // --- main scene
  const scene = new Scene();
  const camera = new PerspectiveCamera(20, 1, 0.1, 100);
  const quadMat = new ShaderMaterial({
    vertexShader: FS_VERT, fragmentShader: QUAD_FRAG, depthTest: false, depthWrite: false,
    uniforms: { uPool: { value: null }, uFade: { value: 1 } },
  });
  const bg = new Mesh(fsg, quadMat);
  bg.frustumCulled = false;
  bg.renderOrder = -10;
  scene.add(bg);

  const keyLight = new DirectionalLight(0xfff1df, 2.4);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);
  scene.add(new HemisphereLight(0xfff6ea, 0x3a2414, 0.55));

  const bottle = new Group();
  const inner = new Group();
  bottle.add(inner);
  inner.position.y = -BOTTLE_H / 2;
  scene.add(bottle);

  const glassMat = new MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.035, transmission: 1, thickness: 0.85, ior: 1.52,
    attenuationColor: new Color('#e9f2ea'), attenuationDistance: 3.2, specularIntensity: 1, envMapIntensity: 2.0,
  });
  if ('dispersion' in glassMat) glassMat.dispersion = 0.25;
  const glass = new Mesh(squircleLathe(GLASS_RINGS, 168), glassMat);
  inner.add(glass);

  const liquidMat = new ShaderMaterial({
    vertexShader: LIQUID_VERT, fragmentShader: LIQUID_FRAG,
    uniforms: {
      uPool: { value: null }, uSigma: { value: new Vector3(1, 1, 1) }, uBody: { value: new Color() }, uLight: { value: new Color() },
      uKey: { value: new Color() }, uLevel: { value: LIQ_LEVEL }, uBase: { value: LIQ_BASE }, uTime: { value: 0 },
    },
  });
  const liquid = new Mesh(squircleLathe(LIQUID_RINGS, 120), liquidMat);
  inner.add(liquid);

  const capMat = new MeshPhysicalMaterial({ color: new Color('#ece6dc'), roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.22, envMapIntensity: 0.9 });
  const capPts = [[0, 2.075], [0.326, 2.075], [0.343, 2.085], [0.35, 2.11], [0.35, 2.76], [0.346, 2.795], [0.333, 2.818], [0.31, 2.832], [0.2, 2.838], [0, 2.84]].map(([x, y]) => new Vector2(x, y));
  const cap = new Mesh(new LatheGeometry(capPts, 96), capMat);
  inner.add(cap);
  const collarMat = new MeshStandardMaterial({ color: new Color('#b89a6a'), metalness: 1, roughness: 0.32, envMapIntensity: 1.1 });
  const collarPts = [[0.296, 2.0], [0.318, 2.0], [0.322, 2.006], [0.322, 2.07], [0.318, 2.076], [0.296, 2.076]].map(([x, y]) => new Vector2(x, y));
  const collar = new Mesh(new LatheGeometry(collarPts, 96), collarMat);
  inner.add(collar);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 400; labelCanvas.height = 660;
  const labelTex = new CanvasTexture(labelCanvas);
  labelTex.colorSpace = SRGBColorSpace;
  labelTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const labelMat = new MeshStandardMaterial({ map: labelTex, roughness: 0.92, metalness: 0, envMapIntensity: 0.55 });
  const label = new Mesh(new PlaneGeometry(0.62, 1.023), labelMat);
  label.position.set(0, 1.02, 0.5232);
  // drawn in a second pass after the glass, so the glass never refracts a ghost of it
  const labelScene = new Scene();
  const labelRoot = new Group();
  const labelInner = new Group();
  labelInner.position.y = -BOTTLE_H / 2;
  labelInner.add(label);
  labelRoot.add(labelInner);
  labelScene.add(labelRoot);
  const keyLight2 = new DirectionalLight(0xfff1df, 2.4);
  keyLight2.position.set(4, 6, 5);
  labelScene.add(keyLight2);
  labelScene.add(new HemisphereLight(0xfff6ea, 0x3a2414, 0.55));

  // environment per scent (prefiltered once)
  const pmrem = new PMREMGenerator(renderer);
  const envs = {};
  const envFor = (s) => {
    if (!envs[s.id]) {
      const es = envScene(lin(s.liquid.body));
      envs[s.id] = pmrem.fromScene(es, 0.035).texture;
      es.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    return envs[s.id];
  };

  // --- state
  let current = byId(scentId);
  const phys = { ...current.physics };
  const physFrom = { ...phys };
  let physTo = { ...phys };
  const A = pal(current);
  const B = pal(current);
  const setPal = (prefix, p) => {
    const u = poolMat.uniforms;
    u['uDeep' + prefix].value.copy(p.deep); u['uBody' + prefix].value.copy(p.body); u['uLight' + prefix].value.copy(p.light);
    u['uKey' + prefix].value.copy(p.key); u['uFloor' + prefix].value.copy(p.floor); u['uPar' + prefix].value.copy(p.par);
  };
  setPal('A', A); setPal('B', B);
  const liqFrom = { body: new Color(), light: new Color(), key: new Color(), sigma: new Vector3() };
  const liqTo = { body: new Color(), light: new Color(), key: new Color(), sigma: new Vector3() };
  const sigmaOf = (s) => {
    const c = lin(s.liquid.body);
    const k = 1.15 - s.liquid.clarity * 0.55;
    return new Vector3(-Math.log(Math.max(c.r, 0.004)) * k, -Math.log(Math.max(c.g, 0.004)) * k, -Math.log(Math.max(c.b, 0.004)) * k);
  };
  const setLiquid = (dst, s) => { dst.body.copy(lin(s.liquid.body)); dst.light.copy(lin(s.liquid.light)); dst.key.copy(lin(s.liquid.key)); dst.sigma.copy(sigmaOf(s)); };
  setLiquid(liqFrom, current); setLiquid(liqTo, current);
  const applyLiquid = (t) => {
    const u = liquidMat.uniforms;
    u.uBody.value.copy(liqFrom.body).lerp(liqTo.body, t);
    u.uLight.value.copy(liqFrom.light).lerp(liqTo.light, t);
    u.uKey.value.copy(liqFrom.key).lerp(liqTo.key, t);
    u.uSigma.value.copy(liqFrom.sigma).lerp(liqTo.sigma, t);
  };
  applyLiquid(1);
  scene.environment = envFor(current);

  let pour = null;
  let queued = null;
  let labelFor = null;
  const redrawLabel = (s) => { drawLabel(labelCanvas, s); labelTex.needsUpdate = true; labelFor = s.id; };
  redrawLabel(current);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { redrawLabel(byId(labelFor)); requestFrame(); });
  }

  // --- layout
  let W = 1, H = 1, aspect = 1;
  const layout = { sx: 0.66, sy: 0.47, frac: 0.6 };
  const bottleBase = new Vector3();
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    aspect = W / H;
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    // framing: shift-lens so the bottle sits where the layout wants it, without keystoning
    if (capture === 'bottle') Object.assign(layout, { sx: 0.5, sy: 0.5, frac: 0.7 });
    else if (aspect >= 1.05) Object.assign(layout, { sx: aspect > 1.5 ? 0.665 : 0.68, sy: 0.53, frac: aspect > 1.5 ? 0.6 : 0.54 });
    else if (aspect >= 0.7) Object.assign(layout, { sx: 0.5, sy: 0.25, frac: 0.31 });
    else Object.assign(layout, { sx: 0.5, sy: 0.28, frac: 0.34 });
    const tanH = Math.tan((camera.fov * Math.PI) / 360);
    let dist = BOTTLE_H / (layout.frac * 2 * tanH);
    const maxWFrac = aspect < 1 ? 0.5 : 0.3;
    dist = Math.max(dist, BOTTLE_W / (maxWFrac * 2 * tanH * aspect));
    const pitch = 0.11;
    camera.position.set(0, Math.sin(pitch) * dist + 0.1, Math.cos(pitch) * dist);
    camera.lookAt(0, 0.1, 0);
    camera.aspect = aspect;
    camera.setViewOffset(W, H, (0.5 - layout.sx) * W, (0.5 - layout.sy) * H, W, H);
    camera.updateProjectionMatrix();

    // sim sized so its cells are square on the plane
    const pw = aspect * DMAX, pd = DMAX - DMIN;
    const ratio = pw / pd;
    const nw = Math.round(Math.min(720, simBase * Math.sqrt(ratio)));
    const nh = Math.round(Math.min(480, simBase / Math.sqrt(ratio)));
    plane.set(pw, pd);
    if (Math.abs(nw - simW) > 8 || Math.abs(nh - simH) > 8 || !simA) {
      simW = nw; simH = nh;
      [simA, simB, deriv].forEach((t) => t && t.dispose());
      simA = new WebGLRenderTarget(simW, simH, { ...rtOpts, minFilter: NearestFilter, magFilter: NearestFilter });
      simB = simA.clone();
      deriv = new WebGLRenderTarget(simW, simH, { ...rtOpts, minFilter: LinearFilter, magFilter: LinearFilter });
      for (const t of [simA, simB]) { renderer.setRenderTarget(t); renderer.setClearColor(0x000000, 0); renderer.clear(); }
      renderer.setRenderTarget(null);
    }
    const cellX = pw / simW, cellZ = pd / simH;
    // weights sum to 0.5: keeps the wave + viscous-spread scheme stable for every frequency
    const wx = 1 / (cellX * cellX), wz = 1 / (cellZ * cellZ), k = 0.5 / (wx + wz);
    simMat.uniforms.uLapW.value.set(wx * k, wz * k);
    simMat.uniforms.uTexel.value.set(1 / simW, 1 / simH);
    derivMat.uniforms.uTexel.value.set(1 / simW, 1 / simH);
    derivMat.uniforms.uCell.value.set(cellX, cellZ);

    const pwPx = Math.max(2, Math.round(W * dpr * poolScale)), phPx = Math.max(2, Math.round(H * dpr * poolScale));
    if (!poolRT) poolRT = new WebGLRenderTarget(pwPx, phPx, { ...rtOpts, minFilter: LinearFilter, magFilter: LinearFilter });
    else poolRT.setSize(pwPx, phPx);
    poolMat.uniforms.uAspect.value = aspect;
    poolMat.uniforms.uTextSide.value = aspect >= 1.05 && capture !== 'bottle' ? 1 : 0;
    poolMat.uniforms.uLightPos.value.set(layout.sx + (aspect >= 1.05 ? 0.03 : 0), aspect >= 1.05 ? 0.36 : 0.6, aspect >= 1.05 ? 4.0 : 4.5);
    // put the softbox reflection behind the bottle, on the side away from the text
    const sx = aspect >= 1.05 ? layout.sx + 0.08 : 0.72;
    const sy = aspect >= 1.05 ? 0.66 : 0.8;
    poolMat.uniforms.uStrip.value = capture === 'bottle' ? 0.5 : aspect >= 1.05 ? 1 : 0.7;
    poolMat.uniforms.uTextBottom.value = aspect < 1.05 && capture !== 'bottle' ? 1 : 0;
    const dd = 1 / (HORIZON - sy);
    poolMat.uniforms.uBox.value.set(Math.atan((sx - 0.5) * aspect), Math.atan(0.55 / dd), aspect >= 1.05 ? 0.42 : 0.5, 0.012);
    requestFrame();
  }

  function updateBottleShadow() {
    bottle.updateMatrixWorld();
    bottleBase.set(0, 0, 0).applyMatrix4(inner.matrixWorld).project(camera);
    const ux = bottleBase.x * 0.5 + 0.5, uy = bottleBase.y * 0.5 + 0.5;
    const top = new Vector3(0, BOTTLE_H, 0).applyMatrix4(inner.matrixWorld).project(camera);
    const hUv = (top.y - bottleBase.y) * 0.5;
    poolMat.uniforms.uBottle.value.set(ux - 0.05 * hUv, uy - 0.07 * hUv, 0.36 * hUv / aspect, 0.075 * hUv);
  }

  // --- pointer
  const ptr = { x: -1, y: -1, px: -1, py: -1, down: false, last: 0, speed: 0, inside: false, ring: 0 };
  const tilt = new Vector2();
  const tiltTarget = new Vector2();
  const toSim = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    const u = (cx - r.left) / r.width, v = 1 - (cy - r.top) / r.height;
    const d = 1 / (HORIZON - v);
    return [(u - 0.5) * d / DMAX + 0.5, (d - DMIN) / (DMAX - DMIN), u, v];
  };
  let stirred = false;
  const onMove = (e) => {
    if (reduced) return;
    const [sx, sy, u, v] = toSim(e.clientX, e.clientY);
    const now = performance.now();
    if (ptr.x < 0 || now - ptr.last > 120) { ptr.px = sx; ptr.py = sy; } else { ptr.px = ptr.x; ptr.py = ptr.y; }
    const dt = Math.max(8, now - ptr.last);
    const dx = (sx - ptr.px) * plane.x, dy = (sy - ptr.py) * plane.y;
    ptr.speed = Math.min(4, Math.hypot(dx, dy) / (dt / 1000));
    ptr.x = sx; ptr.y = sy; ptr.last = now; ptr.inside = true;
    tiltTarget.set((u - layout.sx) * 2, (v - (1 - layout.sy)) * 2);
    if (!stirred && ptr.speed > 0.2) { stirred = true; section.dispatchEvent(new CustomEvent('stir')); }
    wake();
  };
  const onDown = (e) => {
    if (reduced) return;
    const [sx, sy] = toSim(e.clientX, e.clientY);
    ptr.px = ptr.x = sx; ptr.py = ptr.y = sy; ptr.last = performance.now();
    ptr.ring = 1;
    wake();
  };
  const onLeave = () => { ptr.inside = false; tiltTarget.set(0, 0); };
  section.addEventListener('pointermove', onMove, { passive: true });
  section.addEventListener('pointerdown', onDown, { passive: true });
  section.addEventListener('pointerleave', onLeave, { passive: true });

  // --- loop
  let running = false, raf = 0, last = 0, time = capture ? 8 : 0, flowT = capture ? 8 : 0, lastInput = 0;
  let visible = true, frameNo = 0, ready = false;
  const lerp = (a, b, t) => a + (b - a) * t;

  function step(dt) {
    // pour progress
    if (pour) {
      pour.t = Math.min(1, pour.t + dt / pour.dur);
      const e = pour.t * pour.t * (3 - 2 * pour.t);
      poolMat.uniforms.uFrontR.value = e * pour.maxR;
      poolMat.uniforms.uFrontOn.value = 1;
      const lt = smooth(0.15, 0.8, pour.t);
      applyLiquid(lt);
      for (const k of ['damping', 'spread', 'brush', 'flow', 'amp']) phys[k] = lerp(physFrom[k], physTo[k], smooth(0, 0.6, pour.t));
      phys.steps = physTo.steps;
      if (pour.t > 0.42 && labelFor !== pour.to.id) { redrawLabel(pour.to); scene.environment = envFor(pour.to); }
      if (pour.t >= 1) finishPour();
    }
    const steps = reduced ? 1 : phys.steps;
    const damp = Math.pow(phys.damping, 1 / steps);
    simMat.uniforms.uDamp.value = damp;
    simMat.uniforms.uSpread.value = Math.min(0.25, phys.spread / steps);
    flowT += dt * phys.flow * (reduced ? 0 : 1);
    simMat.uniforms.uFlowT.value = flowT;
    simMat.uniforms.uFlowScale.value = lerp(3.8, 2.3, Math.min(1, phys.spread / 0.32));
    derivMat.uniforms.uFlowAmp.value = 0.0042 * phys.amp;
    derivMat.uniforms.uRipple.value = 1.0;

    const brushOn = ptr.inside && performance.now() - ptr.last < 90;
    for (let i = 0; i < steps; i++) {
      const u = simMat.uniforms;
      u.uState.value = simA.texture;
      if (brushOn && i === 0) {
        const str = Math.min(0.009, 0.0025 + ptr.speed * 0.0035) * phys.amp;
        u.uBrushA.value.set(ptr.x, ptr.y, phys.brush * (1 + Math.min(1, ptr.speed) * 0.5), str);
        u.uBrushB.value.set(ptr.px, ptr.py);
        ptr.px = ptr.x; ptr.py = ptr.y;
      } else if (ptr.ring > 0 && i === 0) {
        u.uBrushA.value.set(ptr.x, ptr.y, phys.brush * 1.6, 0.05 * phys.amp);
        u.uBrushB.value.set(ptr.x, ptr.y);
        ptr.ring = 0;
      } else {
        u.uBrushA.value.w = 0;
      }
      if (pour && i === 0) {
        u.uRing.value.set(pour.simOrigin.x, pour.simOrigin.y, poolMat.uniforms.uFrontR.value, 0.0045 * (1 - pour.t) * phys.amp);
      } else u.uRing.value.w = 0;
      passQuad.material = simMat;
      renderer.setRenderTarget(simB);
      renderer.render(passScene, ortho);
      [simA, simB] = [simB, simA];
    }
    passQuad.material = derivMat;
    derivMat.uniforms.uState.value = simA.texture;
    renderer.setRenderTarget(deriv);
    renderer.render(passScene, ortho);

    poolMat.uniforms.uDeriv.value = deriv.texture;
    poolMat.uniforms.uTime.value = time;
    poolMat.uniforms.uNormal.value = 1.0;
    passQuad.material = poolMat;
    renderer.setRenderTarget(poolRT);
    renderer.render(passScene, ortho);
    renderer.setRenderTarget(null);
    quadMat.uniforms.uPool.value = poolRT.texture;
    liquidMat.uniforms.uPool.value = poolRT.texture;
  }

  function animateBottle(dt) {
    const k = reduced ? 1 : 1 - Math.pow(0.001, dt);
    tilt.lerp(tiltTarget, Math.min(1, k * 0.9));
    const t = reduced || capture ? 8.8 : time;
    bottle.rotation.y = Math.sin(t * (Math.PI * 2) / 16) * 0.24 - 0.3 + tilt.x * 0.09;
    bottle.rotation.x = -tilt.y * 0.04;
    bottle.rotation.z = Math.sin(t * 0.37) * 0.012;
    bottle.position.y = reduced || capture ? 0 : Math.sin(t * 0.55) * 0.035;
  }

  function render(dt) {
    time += reduced ? 0 : dt;
    animateBottle(dt);
    updateBottleShadow();
    step(dt);
    renderer.render(scene, camera);
    labelRoot.position.copy(bottle.position);
    labelRoot.rotation.copy(bottle.rotation);
    labelScene.environment = scene.environment;
    renderer.autoClear = false;
    renderer.render(labelScene, camera);
    renderer.autoClear = true;
    frameNo++;
    if (!ready) {
      ready = true;
      onReady && onReady();
    }
  }

  // weak GPUs show up as long gaps between animation frames: measure once, lower the resolution once
  let probeLast = 0, probeAcc = 0, probeN = 0, probeCount = 0;
  function probe(now) {
    probeCount++;
    if (probeLast && probeCount > 30 && probeN < 90) {
      const g = now - probeLast;
      if (g < 250) { probeAcc += g; probeN++; }
      if (probeN === 90 && probeAcc / probeN > 24 && dprCap > 1) {
        dprCap = 1; poolScale = Math.max(0.4, poolScale * 0.8); resize();
      }
    }
    probeLast = now;
  }

  function loop(now) {
    raf = 0;
    if (!running) return;
    probe(now);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    const idle = !pour && now - lastInput > 2500;
    // idle: ~30 fps is plenty for a slow flow
    if (idle && (frameNo & 1) && !capture) { frameNo++; last = now; raf = requestAnimationFrame(loop); return; }
    last = now;
    render(dt);
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduced) return;
    running = true; last = 0; probeLast = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function wake() { lastInput = performance.now(); if (visible && !document.hidden) start(); }
  function requestFrame() {
    if (reduced || !running) {
      // render a few frames so the sim settles into a still surface
      requestAnimationFrame(() => { for (let i = 0; i < (ready ? 1 : 3); i++) render(0.016); });
    }
  }

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  }, { threshold: 0 });
  io.observe(canvas);
  const onVis = () => { if (document.hidden) stop(); else if (visible) start(); };
  document.addEventListener('visibilitychange', onVis);
  let rzT = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rzT); rzT = setTimeout(resize, ready ? 120 : 0); });
  ro.observe(canvas);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); onFail && onFail(new Error('context lost')); }, false);

  function startPour(to, originUV) {
    const from = current;
    current = to;
    Object.assign(physFrom, phys);
    physTo = { ...to.physics };
    const prevB = pal(from);
    setPal('A', prevB);
    setPal('B', pal(to));
    setLiquid(liqFrom, from); setLiquid(liqTo, to);
    // origin: where the bottle stands, unless the caller says otherwise
    let u = originUV ? originUV[0] : poolMat.uniforms.uBottle.value.x;
    let v = originUV ? originUV[1] : poolMat.uniforms.uBottle.value.y;
    v = Math.min(0.95, Math.max(0.02, v));
    const d = 1 / (HORIZON - v);
    const P = new Vector2((u - 0.5) * aspect * d, d);
    poolMat.uniforms.uOrigin.value.copy(P);
    const corners = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([cu, cv]) => {
      const cd = 1 / (HORIZON - cv);
      return Math.hypot(((cu - 0.5) * aspect * cd - P.x), (cd - P.y) * 1.6);
    });
    pour = { to, t: 0, dur: queued ? 1000 : 2100, maxR: Math.max(...corners) + 0.25, simOrigin: new Vector2((u - 0.5) * d / DMAX + 0.5, (d - DMIN) / (DMAX - DMIN)) };
    wake();
  }
  function finishPour() {
    const to = pour.to;
    pour = null;
    setPal('A', pal(to)); setPal('B', pal(to));
    poolMat.uniforms.uFrontOn.value = 0;
    applyLiquid(1);
    Object.assign(phys, to.physics);
    if (labelFor !== to.id) { redrawLabel(to); scene.environment = envFor(to); }
    if (queued && queued.id !== to.id) { const q = queued; queued = null; startPour(q.scent, q.origin); }
    else queued = null;
  }

  function setScent(id, { originUV = null, instant = false } = {}) {
    const to = byId(id);
    if (pour) {
      if (pour.to.id === id) return;
      queued = { id, scent: to, origin: originUV };
      pour.dur = Math.min(pour.dur, (pour.t * pour.dur) + 220); // hurry the current pour
      return;
    }
    if (to.id === current.id) return;
    if (instant || reduced || !visible) {
      current = to;
      setPal('A', pal(to)); setPal('B', pal(to));
      setLiquid(liqFrom, to); setLiquid(liqTo, to); applyLiquid(1);
      Object.assign(phys, to.physics);
      redrawLabel(to); scene.environment = envFor(to);
      requestFrame();
      return;
    }
    startPour(to, originUV);
  }

  resize();
  // warm the other environments while idle so a pour never stalls
  const warm = () => SCENTS.forEach((s) => envFor(s));
  if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 3000 }); else setTimeout(warm, 1200);
  if (reduced) requestFrame(); else start();

  return {
    setScent,
    // capture/test only: freeze a pour at progress t
    preview(id, t) {
      if (!pour) startPour(byId(id));
      pour.t = Math.min(0.999, t);
      stop();
      for (let i = 0; i < 3; i++) render(0.0001);
    },
    isVisible: () => visible,
    dispose() {
      stop(); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
    },
  };
}
