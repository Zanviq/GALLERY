// Notes vessel: a glass cylinder in cross-section. Scroll pours the top, heart and base notes in
// that order; each new, heavier layer falls through the ones above and settles underneath.
// Raw WebGL1, one fullscreen triangle, renders only while something is still moving.

const VERT = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;          // pixels
uniform float uTime;
uniform vec3 uC0, uC1, uC2; // top, heart, base colours (linear-ish sRGB)
uniform vec3 uH;            // displayed thickness of top, heart, base
uniform vec4 uStream;       // x: layer index pouring (0..2, -1 none), y: rate 0..1, z: stream x, w: unused
uniform vec3 uWave;         // interface wave amplitudes: surface, top/heart, heart/base
uniform vec3 uCloud;        // lingering mix clouds per layer colour

vec2 hash2(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0; }
float gnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(dot(hash2(i), f), dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x), mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ return gnoise(p) * 0.6 + gnoise(p * 2.1 + 3.7) * 0.28 + gnoise(p * 4.3 - 1.3) * 0.12; }

// rounded box sdf (pixels)
float sdBox(vec2 p, vec2 b, vec4 r){
  r.xy = (p.x > 0.0) ? r.xy : r.zw;
  r.x = (p.y > 0.0) ? r.x : r.y;
  vec2 q = abs(p) - b + r.x;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

void main(){
  vec2 px = vUv * uRes;
  float s = uRes.x;                  // scale: vessel width = canvas width
  vec2 c = vec2(uRes.x * 0.5, uRes.y * 0.5);
  float wallW = s * 0.05;
  vec2 halfO = vec2(s * 0.46, uRes.y * 0.49);
  // outer glass: generous bottom radius, smaller at the open top
  vec4 rad = vec4(s * 0.12, s * 0.2, s * 0.12, s * 0.2);
  float dO = sdBox(px - c, halfO, rad);
  float dI = sdBox(px - c - vec2(0.0, s * 0.03), halfO - vec2(wallW, wallW + s * 0.03), rad - wallW * 0.6);
  float aa = 1.0;
  float inGlass = 1.0 - smoothstep(-aa, aa, dO);
  float inside = 1.0 - smoothstep(-aa, aa, dI);
  // open top: cut the rim
  float y = vUv.y;
  float x = (px.x - (c.x - halfO.x + wallW)) / (2.0 * (halfO.x - wallW));  // 0..1 across the interior

  // layer stack in uv.y (fill scale: interior bottom at 0.06, 50 ml at 0.74)
  float y0 = 0.06;
  float yBase = y0 + uH.z;
  float yHeart = yBase + uH.y;
  float ySurf = yHeart + uH.x;
  float t = uTime;
  float w1 = sin(x * 9.0 + t * 2.3) * 0.6 + sin(x * 17.0 - t * 3.1) * 0.4;
  float w2 = sin(x * 7.0 - t * 1.7 + 1.3) * 0.6 + sin(x * 13.0 + t * 2.2) * 0.4;
  float w3 = sin(x * 6.0 + t * 1.3 + 2.1) * 0.7 + sin(x * 11.0 - t * 1.9) * 0.3;
  // dip where the stream lands
  float dip = exp(-pow((x - uStream.z) / 0.09, 2.0)) * uStream.y;
  float eSurf = ySurf + w1 * uWave.x * 0.012 - dip * 0.008 * step(-0.5, uStream.x);
  float eTH = yHeart + w2 * uWave.y * 0.014;
  float eHB = yBase + w3 * uWave.z * 0.014;
  // menisci curve up at the walls
  float wallCurve = pow(abs(x - 0.5) * 2.0, 8.0) * 0.006;
  eSurf += wallCurve;

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  float liquid = step(y, eSurf) * step(y0 - 0.02, y) * step(0.0005, uH.x + uH.y + uH.z);

  // which layer
  vec3 lc = uC0;
  float which = 0.0;
  if (y < eHB) { lc = uC2; which = 2.0; } else if (y < eTH) { lc = uC1; which = 1.0; }
  if (uH.z < 0.0005 && which == 2.0) { lc = uC1; which = 1.0; }
  if (uH.y < 0.0005 && which == 1.0) { lc = uC0; which = 0.0; }

  // falling stream and its plume inside the liquid
  float pouring = step(-0.5, uStream.x) * uStream.y;
  vec3 sc = uStream.x < 0.5 ? uC0 : (uStream.x < 1.5 ? uC1 : uC2);
  float sx = uStream.z + sin(y * 23.0 + t * 6.0) * 0.006 * pouring;
  float sw = 0.016 + 0.012 * pouring;
  float streamAbove = (1.0 - smoothstep(sw * 0.6, sw, abs(x - sx))) * step(eSurf, y) * step(y, 0.97) * pouring;
  float target = uStream.x < 0.5 ? eSurf : (uStream.x < 1.5 ? eTH : eHB);
  float depthIn = clamp((eSurf - y) / max(eSurf - target, 0.001), 0.0, 1.0);
  float plumeW = sw * (1.0 + depthIn * 2.5);
  float n = fbm(vec2(x * 9.0, y * 6.0 - t * 1.4));
  float plume = (1.0 - smoothstep(plumeW * 0.3, plumeW, abs(x - sx + n * 0.03 * depthIn))) * step(target, y) * step(y, eSurf) * pouring;

  // lingering clouds of each colour where it passed through
  float cloudN = fbm(vec2(x * 5.0 + t * 0.15, y * 7.0 - t * 0.25));
  float cloudMask = smoothstep(0.0, 0.6, cloudN + 0.25) * exp(-pow((x - 0.5) / 0.3, 2.0));

  if (liquid > 0.5) {
    vec3 base = lc;
    // body: deeper in the middle of the cylinder, lighter at the walls, darker toward the bottom
    float across = 1.0 - pow(abs(x - 0.5) * 2.0, 2.0);
    base *= 0.82 + 0.18 * smoothstep(0.0, 0.08, min(x, 1.0 - x));
    float yl = clamp((y - y0) / 0.7, 0.0, 1.0);
    base *= mix(1.12, 0.9, across) * mix(0.86, 1.06, yl);
    // mixing: clouds of the layer colours hang near interfaces
    float nearTH = exp(-pow((y - eTH) / 0.05, 2.0));
    float nearHB = exp(-pow((y - eHB) / 0.05, 2.0));
    base = mix(base, uC1, cloudMask * uCloud.y * (nearTH + nearHB * 0.5) * 0.7 * step(0.5, abs(which - 1.0)));
    base = mix(base, uC2, cloudMask * uCloud.z * (nearHB + nearTH * 0.4) * 0.7 * step(which, 1.5));
    base = mix(base, sc, plume * 0.85);
    // soft interface lines
    float line = exp(-pow((y - eTH) * uRes.y / 1.2, 2.0)) * step(0.0005, uH.y) + exp(-pow((y - eHB) * uRes.y / 1.2, 2.0)) * step(0.0005, uH.z);
    base = mix(base, base * 1.25 + 0.04, line * 0.6);
    // surface meniscus highlight
    float men = exp(-pow((y - eSurf) * uRes.y / 1.6, 2.0));
    base += vec3(0.5) * men * 0.55;
    col = base;
    alpha = inside;
  }
  // stream above the surface
  if (streamAbove > 0.0) { col = mix(col, sc * 1.1, streamAbove); alpha = max(alpha, streamAbove * inside); }

  // glass: almost invisible body, crisp edges, a broad soft reflection and a thin hard one
  float wall = inGlass * (1.0 - inside);
  float edgeO = exp(-pow(dO / 0.9, 2.0));
  float edgeI = exp(-pow(dI / 0.9, 2.0));
  float gx = (px.x - (c.x - halfO.x)) / (2.0 * halfO.x);        // 0..1 across the outer glass
  float body = smoothstep(0.03, 0.2, y) * smoothstep(0.995, 0.9, y);
  float broad = exp(-pow((gx - 0.16) / 0.045, 2.0)) * 0.30 * body;
  float hard = exp(-pow((gx - 0.83) / 0.007, 2.0)) * 0.55 * body;
  float baseGlass = wall * smoothstep(0.075, 0.02, y) * 0.22;   // thick base catches light
  vec3 glassCol = vec3(0.95, 0.96, 0.97);
  float ga = wall * 0.06 + edgeO * 0.42 * inGlass + edgeI * 0.18 * inGlass + (broad + hard) * inGlass + baseGlass;
  float empty = inside * (1.0 - step(0.5, alpha));
  ga += empty * 0.02;
  float mouth = smoothstep(0.995, 0.975, y);
  ga *= mouth;
  // reflections sit on top of the liquid too
  vec3 outC = col * alpha * (1.0 - (broad + hard) * 0.6) + glassCol * ga;
  float outA = clamp(alpha + ga * (1.0 - alpha), 0.0, 1.0);
  gl_FragColor = vec4(outC, outA);
}
`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const VOL = [14 / 50 * 0.68, 20 / 50 * 0.68, 16 / 50 * 0.68]; // top, heart, base

export function createVessel(canvas, scent, { instant = false } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uTime', 'uC0', 'uC1', 'uC2', 'uH', 'uStream', 'uWave', 'uCloud'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  let colors = scent.liquid.layers.map(hex);
  let target = [0, 0, 0];      // amounts 0..1 for top, heart, base
  const shown = [0, 0, 0];
  const rate = [0, 0, 0];
  const wave = [0, 0, 0];
  const cloud = [0, 0, 0];
  let colorFrom = colors, colorT = 1;
  let time = 0, last = 0, raf = 0, visible = false, stillFrames = 0;

  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    const w = Math.max(2, Math.round(r.width * dpr)), h = Math.max(2, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    time += dt;
    let moving = false;
    for (let i = 0; i < 3; i++) {
      const prev = shown[i];
      shown[i] += (target[i] - shown[i]) * (instant ? 1 : 1 - Math.exp(-dt * 4.5));
      if (Math.abs(target[i] - shown[i]) < 0.0005) shown[i] = target[i];
      const inst = Math.max(0, (shown[i] - prev) / dt);
      rate[i] += (Math.min(1, inst * 3.5) - rate[i]) * (1 - Math.exp(-dt * 7));
      cloud[i] = Math.min(1, cloud[i] + rate[i] * dt * 1.6) * Math.exp(-dt * 0.45);
      if (Math.abs(target[i] - shown[i]) > 0.0005 || rate[i] > 0.01 || cloud[i] > 0.02) moving = true;
    }
    // interfaces wobble when something lands on them
    const hit = [rate[0] + rate[1] * 0.4 + rate[2] * 0.3, rate[1] + rate[2] * 0.5, rate[2]];
    for (let i = 0; i < 3; i++) {
      wave[i] = Math.min(1.2, wave[i] + hit[i] * dt * 3) * Math.exp(-dt * 0.9);
      if (wave[i] > 0.01) moving = true;
    }
    if (colorT < 1) { colorT = Math.min(1, colorT + dt / 0.9); moving = true; }
    draw();
    if (moving) stillFrames = 0; else stillFrames++;
    if (visible && stillFrames < 3) raf = requestAnimationFrame(frame);
  }

  function draw() {
    size();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    const e = colorT * colorT * (3 - 2 * colorT);
    const c = colors.map((col, i) => col.map((v, k) => colorFrom[i][k] + (v - colorFrom[i][k]) * e));
    gl.uniform3fv(U.uC0, c[0]); gl.uniform3fv(U.uC1, c[1]); gl.uniform3fv(U.uC2, c[2]);
    gl.uniform3f(U.uH, shown[0] * VOL[0], shown[1] * VOL[1], shown[2] * VOL[2]);
    let si = -1, sr = 0;
    for (let i = 0; i < 3; i++) if (rate[i] > sr + 0.02) { sr = rate[i]; si = i; }
    gl.uniform4f(U.uStream, si, Math.min(1, sr), 0.52 + Math.sin(time * 0.6) * 0.01, 0);
    gl.uniform3f(U.uWave, wave[0], wave[1], wave[2]);
    gl.uniform3f(U.uCloud, cloud[0], cloud[1], cloud[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function kick() {
    stillFrames = 0;
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }

  const io = new IntersectionObserver((en) => {
    visible = en[0].isIntersecting;
    if (visible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  io.observe(canvas);
  new ResizeObserver(() => { if (visible) { draw(); kick(); } }).observe(canvas);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); canvas.style.display = 'none'; const css = canvas.parentElement.querySelector('.vessel__css'); if (css) css.style.display = 'block'; });

  return {
    setProgress(p) {
      // pour i runs from p = i + 0.08 to i + 0.8
      target = [0, 1, 2].map((i) => { const t = Math.min(1, Math.max(0, (p - i - 0.08) / 0.72)); return t * t * (3 - 2 * t); });
      kick();
    },
    setScent(s) {
      const e = colorT * colorT * (3 - 2 * colorT);
      colorFrom = colors.map((col, i) => col.map((v, k) => colorFrom[i][k] + (v - colorFrom[i][k]) * e));
      colors = s.liquid.layers.map(hex);
      colorT = 0;
      kick();
    },
  };
}
