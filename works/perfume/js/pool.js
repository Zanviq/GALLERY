// 담금: the 청매 field as the surface of a steeping jar, seen from above.
//
// Ported from the first version's hero (js/hero.js, three.js): the same height-field wave sim for the
// pointer and the same slow, domain-warped flow that moves the surface on its own, shaded with the
// same caustic net and window reflection. What changed: raw WebGL2 instead of three.js, no 3D
// bottle (the photograph is the bottle now), a flat top-down view instead of a pool receding to a
// horizon, and the palette of the photographs: plum-green liquid, light from the window on the left,
// plaster-white reflections. The field averages to the flat --plum so text contrast never drops.
//
// Frame: sim (ping-pong, half float) -> derivatives -> surface shading straight into the canvas.

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const NOISE = `
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
}`;

// waves (r: height, g: velocity) + the slow flow of the whole surface (b), kept apart
const SIM = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uLapW;
uniform float uDamp;
uniform float uSpread;
uniform vec4 uBrushA;   // xy current (uv), z radius (plane), w strength
uniform vec2 uBrushB;   // previous (uv)
uniform vec2 uPlane;    // plane size covered by the sim
uniform float uFlowT;
uniform float uFlowScale;
in vec2 vUv;
out vec4 o;
${NOISE}
void main(){
  vec4 s = texture(uState, vUv);
  float h = s.r, v = s.g;
  float l = texture(uState, vUv - vec2(uTexel.x, 0.0)).r;
  float r = texture(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float d = texture(uState, vUv - vec2(0.0, uTexel.y)).r;
  float u = texture(uState, vUv + vec2(0.0, uTexel.y)).r;
  float lap = uLapW.x * (l + r - 2.0 * h) + uLapW.y * (d + u - 2.0 * h);
  v += lap;
  v *= uDamp;
  h = mix(h, (l + r + d + u) * 0.25, uSpread);
  h += v;
  h *= 0.9985;
  // soak up waves at the borders so nothing bounces back
  vec2 e = smoothstep(vec2(0.0), vec2(0.04), vUv) * smoothstep(vec2(0.0), vec2(0.04), 1.0 - vUv);
  v *= mix(0.9, 1.0, e.x * e.y);

  vec2 pa = (vUv - uBrushB) * uPlane;
  vec2 ba = (uBrushA.xy - uBrushB) * uPlane;
  float t = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  float dist = length(pa - ba * t);
  h -= uBrushA.w * exp(-dist * dist / (uBrushA.z * uBrushA.z));

  vec2 P = (vUv - 0.5) * uPlane * uFlowScale + vec2(3.7, 1.9);
  float ft = uFlowT;
  vec2 w = vec2(gnoise(P * 0.55 + vec2(0.0, ft * 0.11)), gnoise(P * 0.55 + vec2(5.2, -ft * 0.09)));
  float f = gnoise(P + w * 1.2 + vec2(ft * 0.07, ft * 0.05)) * 0.72
          + gnoise(P * 1.93 + w * 0.6 - vec2(ft * 0.13, -ft * 0.02)) * 0.23
          + gnoise(P * 3.9 + w * 0.3 + vec2(ft * 0.2, ft * 0.17)) * 0.05;
  o = vec4(h, v, f, 1.0);
}`;

const DERIV = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uCell;      // plane size of one texel
uniform float uRipple;
uniform float uFlowAmp;
in vec2 vUv;
out vec4 o;
float H(vec2 k){ vec4 s = texture(uState, vUv + k * uTexel); return s.r * uRipple + s.b * uFlowAmp; }
void main(){
  float c = H(vec2(0.0));
  float l = H(vec2(-1.0, 0.0)), r = H(vec2(1.0, 0.0)), d = H(vec2(0.0, -1.0)), u = H(vec2(0.0, 1.0));
  o = vec4((r - l) / (2.0 * uCell.x), (u - d) / (2.0 * uCell.y), (l + r + d + u - 4.0 * c), c);
}`;

const SURFACE = `#version 300 es
precision highp float;
uniform sampler2D uDeriv;
uniform vec2 uPlane;
uniform float uTime;
uniform vec3 uBase;      // the field: --plum, linear
uniform vec3 uLight;     // caustic light
uniform vec3 uKey;       // window reflection: plaster white
uniform float uShade;
uniform float uCaustic;
uniform float uCMean;    // mean of the caustic term, taken back out so the field averages to --plum
uniform float uFocus;
uniform float uGloss;
in vec2 vUv;
out vec4 o;
${NOISE}
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec4 D = texture(uDeriv, vUv);
  vec2 P = (vUv - 0.5) * uPlane;
  // a little fine texture on top of the slow swell
  vec2 fine = vec2(gnoise(P * 30.0 + uTime * 0.12), gnoise(P * 30.0 + 7.3 - uTime * 0.1)) * 0.004;
  vec3 n = normalize(vec3(-D.x + fine.x, 1.0, -D.y + fine.y));

  // soft window light from the left, as in every photograph on the page
  vec3 L = normalize(vec3(-0.62, 0.7, 0.36));
  float shade = clamp((dot(n, L) - L.y) * uShade, -0.07, 0.09);
  vec3 col = uBase * (1.0 + shade);

  // caustic net on the bottom of the jar, bent by the surface
  vec2 cp = P * 6.0 + n.xz * 2.2;
  float c1 = 1.0 - abs(gnoise(cp + vec2(uTime * 0.07, -uTime * 0.05)));
  float c2 = 1.0 - abs(gnoise(cp * 1.37 + vec2(-uTime * 0.05, uTime * 0.06) + 3.1));
  float caustic = pow(c1, 7.0) + pow(c2, 7.0) * 0.7;
  caustic *= 0.55 + clamp(-D.z * uFocus, -0.45, 1.2);
  col += (uLight - uBase) * uCaustic * (caustic - uCMean);

  // the window, reflected where the surface tilts toward it: thin sinuous highlights
  vec2 q = n.xz / n.y;
  vec2 wq = (q - vec2(-0.06, 0.03)) / vec2(0.01, 0.026);
  float win = exp(-pow(dot(wq, wq), 2.0));
  col = mix(col, uKey, clamp(win * uGloss, 0.0, 1.0));

  o = vec4(toSRGB(max(col, 0.0)) + (h12(gl_FragCoord.xy) - 0.5) / 255.0, 1.0);
}`;

// ---------------------------------------------------------------- helpers

const lin = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
};

// 청매 liquid: watery, so rings travel far and stay crisp (the first version's 유월 physics)
const PHYS = { damping: 0.985, spread: 0.06, brush: 0.022, flow: 1.0, steps: 2, amp: 0.8 };

/**
 * createPool(canvas, { host, interactive, reduced, quiet })
 * host: the element that receives the pointer and decides the size (the section).
 * interactive: pointer stirs the surface. quiet (0..1): lowers every effect (for fields under forms).
 * Returns null when WebGL2 with half-float targets is not available (the CSS field stays flat).
 */
export function createPool(canvas, { host = canvas.parentElement, interactive = true, reduced = false, quiet = 0 } = {}) {
  let gl;
  try {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  } catch (e) { gl = null; }
  if (!gl) return null;
  if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) return null;

  const shader = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERT);
  const program = (fsrc) => {
    const fs = shader(gl.FRAGMENT_SHADER, fsrc);
    if (!vs || !fs) return null;
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  };
  const simP = program(SIM), derivP = program(DERIV), surfP = program(SURFACE);
  if (!simP || !derivP || !surfP) return null;

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const target = (w, h, filter) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t, f, ok };
  };
  const drop = (o) => { if (o) { gl.deleteTexture(o.t); gl.deleteFramebuffer(o.f); } };

  const coarse = matchMedia('(pointer: coarse)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  let dprCap = weak ? 1 : 1.5;
  let surfScale = weak ? 0.5 : 0.6;
  const k = 1 - Math.min(1, Math.max(0, quiet));

  const base = lin('#a9c25a');
  const light = lin('#d4e496');
  const key = lin('#eef1ef');

  let simA, simB, deriv, simW = 0, simH = 0;
  const plane = [1, 1];
  const cell = [1, 1];
  let lapW = [0.25, 0.25];
  let W = 1, H = 1;

  function resize() {
    const r = host.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    canvas.width = Math.max(2, Math.round(W * dpr * surfScale));
    canvas.height = Math.max(2, Math.round(H * dpr * surfScale));
    // the same liquid at every width: plane units are a fixed number of CSS pixels
    const ppu = W < 600 ? 640 : 820;
    plane[0] = W / ppu; plane[1] = H / ppu;
    // square sim cells of about 4 CSS px, never more than ~110k of them
    const px = Math.max(coarse ? 5 : 4, Math.sqrt((W * H) / 110000));
    const nw = Math.max(16, Math.round(W / px)), nh = Math.max(16, Math.round(H / px));
    if (!simA || Math.abs(nw - simW) > 6 || Math.abs(nh - simH) > 6) {
      [simA, simB, deriv].forEach(drop);
      simW = nw; simH = nh;
      simA = target(simW, simH, gl.NEAREST);
      simB = target(simW, simH, gl.NEAREST);
      deriv = target(simW, simH, gl.LINEAR);
      if (!simA.ok || !simB.ok || !deriv.ok) { fail(); return; }
    }
    cell[0] = plane[0] / simW; cell[1] = plane[1] / simH;
    // weights sum to 0.5: keeps the wave + viscous-spread scheme stable for every frequency
    const wx = 1 / (cell[0] * cell[0]), wz = 1 / (cell[1] * cell[1]), s = 0.5 / (wx + wz);
    lapW = [wx * s, wz * s];
    if (!running) requestAnimationFrame(() => { if (!running && !dead) render(0); });
  }

  // --- pointer: stirring leaves rings; a tap drops one
  const ptr = { x: -1, y: -1, px: -1, py: -1, last: 0, speed: 0, inside: false, drop: 0 };
  const toUv = (cx, cy) => {
    const r = host.getBoundingClientRect();
    return [(cx - r.left) / r.width, 1 - (cy - r.top) / r.height];
  };
  const onMove = (e) => {
    const [u, v] = toUv(e.clientX, e.clientY);
    const now = performance.now();
    if (ptr.x < 0 || now - ptr.last > 120) { ptr.px = u; ptr.py = v; } else { ptr.px = ptr.x; ptr.py = ptr.y; }
    const dt = Math.max(8, now - ptr.last);
    ptr.speed = Math.min(4, Math.hypot((u - ptr.px) * plane[0], (v - ptr.py) * plane[1]) / (dt / 1000));
    ptr.x = u; ptr.y = v; ptr.last = now; ptr.inside = true;
    wake();
  };
  const onDown = (e) => {
    const [u, v] = toUv(e.clientX, e.clientY);
    ptr.px = ptr.x = u; ptr.py = ptr.y = v; ptr.last = performance.now();
    ptr.drop = 1;
    wake();
  };
  const onLeave = () => { ptr.inside = false; };
  if (interactive) {
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', onDown, { passive: true });
    host.addEventListener('pointerleave', onLeave, { passive: true });
  }

  // --- frame
  let time = 20, flowT = 20;
  const pass = (prog, out, w, h) => {
    gl.useProgram(prog.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null);
    gl.viewport(0, 0, w, h);
  };
  function render(dt) {
    const calm = reduced ? 0.6 : 1;
    time += dt * calm;
    flowT += dt * PHYS.flow * calm;
    const steps = reduced ? 1 : PHYS.steps;
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);

    // sim
    const brushOn = interactive && ptr.inside && performance.now() - ptr.last < 90;
    const su = simP.u;
    for (let i = 0; i < steps; i++) {
      pass(simP, simB, simW, simH);
      gl.bindTexture(gl.TEXTURE_2D, simA.t);
      gl.uniform1i(su.uState, 0);
      gl.uniform2f(su.uTexel, 1 / simW, 1 / simH);
      gl.uniform2f(su.uLapW, lapW[0], lapW[1]);
      gl.uniform1f(su.uDamp, Math.pow(PHYS.damping, 1 / steps));
      gl.uniform1f(su.uSpread, Math.min(0.25, PHYS.spread / steps));
      gl.uniform2f(su.uPlane, plane[0], plane[1]);
      gl.uniform1f(su.uFlowT, flowT);
      gl.uniform1f(su.uFlowScale, 3.5);
      const amp = PHYS.amp * calm * k;
      if (brushOn && i === 0) {
        const str = Math.min(0.009, 0.0025 + ptr.speed * 0.0035) * amp;
        gl.uniform4f(su.uBrushA, ptr.x, ptr.y, PHYS.brush * (1 + Math.min(1, ptr.speed) * 0.5), str);
        gl.uniform2f(su.uBrushB, ptr.px, ptr.py);
        ptr.px = ptr.x; ptr.py = ptr.y;
      } else if (ptr.drop && i === 0) {
        gl.uniform4f(su.uBrushA, ptr.x, ptr.y, PHYS.brush * 1.6, 0.05 * amp);
        gl.uniform2f(su.uBrushB, ptr.x, ptr.y);
        ptr.drop = 0;
      } else {
        gl.uniform4f(su.uBrushA, -1, -1, PHYS.brush, 0);
        gl.uniform2f(su.uBrushB, -1, -1);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      [simA, simB] = [simB, simA];
    }

    // derivatives
    pass(derivP, deriv, simW, simH);
    gl.bindTexture(gl.TEXTURE_2D, simA.t);
    const du = derivP.u;
    gl.uniform1i(du.uState, 0);
    gl.uniform2f(du.uTexel, 1 / simW, 1 / simH);
    gl.uniform2f(du.uCell, cell[0], cell[1]);
    gl.uniform1f(du.uRipple, 1.2);
    gl.uniform1f(du.uFlowAmp, 0.016 * PHYS.amp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // surface
    pass(surfP, null, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, deriv.t);
    const uu = surfP.u;
    gl.uniform1i(uu.uDeriv, 0);
    gl.uniform2f(uu.uPlane, plane[0], plane[1]);
    gl.uniform1f(uu.uTime, time);
    gl.uniform3fv(uu.uBase, base);
    gl.uniform3fv(uu.uLight, light);
    gl.uniform3fv(uu.uKey, key);
    gl.uniform1f(uu.uShade, 0.32 * k * k);
    gl.uniform1f(uu.uCaustic, 0.45 * k);
    gl.uniform1f(uu.uCMean, 0.26);
    gl.uniform1f(uu.uFocus, 14);
    gl.uniform1f(uu.uGloss, 0.3 * k * k);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!canvas.classList.contains('is-on')) canvas.classList.add('is-on');
  }

  // weak GPUs show up as long gaps between frames: measure once, lower the resolution once
  let probeLast = 0, probeAcc = 0, probeN = 0, probeCount = 0;
  function probe(now) {
    probeCount++;
    if (probeLast && probeCount > 30 && probeN < 90) {
      const g = now - probeLast;
      if (g < 250) { probeAcc += g; probeN++; }
      if (probeN === 90 && probeAcc / probeN > 24 && (dprCap > 1 || surfScale > 0.4)) {
        dprCap = 1; surfScale = Math.max(0.4, surfScale * 0.8); resize();
      }
    }
    probeLast = now;
  }

  let running = false, dead = false, visible = false, raf = 0, last = 0, frameNo = 0, lastInput = -1e9;
  function loop(now) {
    raf = 0;
    if (!running) return;
    probe(now);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    frameNo++;
    // ~30 fps is plenty for the slow flow; full rate only while the surface is being stirred
    const busy = interactive && now - lastInput < 2500;
    if (!busy && (frameNo & 1)) { raf = requestAnimationFrame(loop); return; }
    last = now;
    render(dt);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (running || dead) return;
    running = true; last = 0; probeLast = 0;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }
  function wake() { lastInput = performance.now(); if (visible && !document.hidden) start(); }
  function fail() {
    dead = true; stop();
    canvas.classList.remove('is-on');
  }

  const io = new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible && !document.hidden) start(); else stop();
  }, { threshold: 0 });
  io.observe(host);
  const onVis = () => { if (document.hidden) stop(); else if (visible) start(); };
  document.addEventListener('visibilitychange', onVis);
  let rzT = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rzT); rzT = setTimeout(resize, simA ? 120 : 0); });
  ro.observe(host);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail(); }, false);

  resize();
  if (dead) return null;

  return {
    setReduced(v) { reduced = !!v; },
    isRunning: () => running,
    // capture/test only: advance the surface by n frames now
    advance(n = 1, dt = 1 / 30) { for (let i = 0; i < n; i++) render(dt); },
  };
}
