// WebGL renderer for the curtain: one shaded velvet mesh plus silver stitches.
// No library; two small programs. Colours arrive as sRGB hex and are shaded in linear light.

const VS = `
attribute vec3 aPos;
attribute vec3 aNor;
attribute vec4 aMat;
uniform vec2 uView;
uniform float uZ;
varying vec3 vN;
varying vec2 vMat;
varying float vCrush;
varying float vCav;
varying vec2 vScreen;
void main() {
  vN = aNor;
  vMat = aMat.xy;
  vCrush = aMat.z;
  vCav = aMat.w;
  vScreen = aPos.xy;
  gl_Position = vec4(aPos.x / uView.x * 2.0 - 1.0, 1.0 - aPos.y / uView.y * 2.0, -aPos.z * uZ, 1.0);
}`;

const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uDeep;
uniform vec3 uVelvet;
uniform vec3 uSheen;
uniform vec3 uBack;
uniform vec3 uL;
uniform vec4 uSpot;
uniform vec2 uRail;
uniform vec3 uLamp;
varying vec3 vN;
varying vec2 vMat;
varying float vCrush;
varying float vCav;
varying vec2 vScreen;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec3 N = normalize(vN);
  float back = smoothstep(0.08, -0.08, N.z);
  N *= N.z < 0.0 ? -1.0 : 1.0;
  float ndv = clamp(N.z, 0.0, 1.0);
  float ndl = dot(N, uL);
  float wrap = clamp((ndl + 0.3) / 1.3, 0.0, 1.0);
  float edge = 1.0 - ndv;

  // pile: long streaks along the warp, and the slight unevenness of a real dye lot
  float streak = vnoise(vMat * vec2(0.42, 0.018)) * 0.6 + vnoise(vMat * vec2(1.3, 0.06)) * 0.4;
  float lot = vnoise(vMat * 0.006);
  // crushed pile reads as a brushed patch, not a glow: break it up along the nap
  float nap = vnoise(vMat * vec2(0.8, 0.09)) * 0.65 + vnoise(vMat * vec2(2.1, 0.3)) * 0.35;
  float crush = clamp(vCrush, 0.0, 1.0);
  crush *= 0.75 * smoothstep(0.3, 0.8, nap * 0.8 + crush * 0.4);

  // velvet: dark where the pile points at you, blooming toward the silhouette of each fold
  float bloom = pow(edge, 1.3);
  vec3 body = mix(uDeep, uVelvet, clamp(0.12 + 0.88 * wrap * (0.38 + 1.25 * bloom) + crush * 0.3, 0.0, 1.0));
  body *= 0.94 + 0.12 * streak + 0.08 * (lot - 0.5);
  float sheenAmt = pow(edge, 2.0) * (0.3 + 0.7 * clamp(ndl + 0.45, 0.0, 1.0)) * 1.05;
  sheenAmt += crush * (0.10 + 0.3 * edge) * (0.7 + 0.6 * streak);
  vec3 front = body * (0.32 + 0.9 * wrap) + uSheen * sheenAmt;

  // the plain-woven back: flat, dull, a little lighter
  vec3 rev = uBack * (0.35 + 0.65 * wrap) * (0.94 + 0.08 * streak);
  vec3 col = mix(front, rev, back);

  // folds: cavities lose light, ridges keep it
  float ao = clamp(1.0 + vCav * 0.5, 0.3, 1.18);
  col *= ao;

  // the front-of-house spot: a soft pool, falling off to the sides and up into the flies
  vec2 d = (vScreen - uSpot.xy) / uSpot.zw;
  float spot = 0.1 + 1.16 * exp(-dot(d, d) * 1.8);
  spot *= mix(0.45, 1.0, smoothstep(uRail.x, uRail.x + uRail.y, vScreen.y));
  col *= spot;

  // the bulb behind lights whatever back face turns toward it
  float lampD = length(vScreen - uLamp.xy) / uLamp.z;
  col += uBack * back * 0.6 * exp(-lampD * lampD) ;

  col = col / (1.0 + col * 0.35);
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}`;

const VS_THREAD = `
attribute vec3 aPos;
attribute float aT;
uniform vec2 uView;
uniform float uZ;
varying float vT;
void main() {
  vT = aT;
  gl_Position = vec4(aPos.x / uView.x * 2.0 - 1.0, 1.0 - aPos.y / uView.y * 2.0, -aPos.z * uZ, 1.0);
}`;

const FS_THREAD = `
precision mediump float;
uniform vec3 uLo;
uniform vec3 uHi;
uniform float uGain;
varying float vT;
void main() {
  float k = 1.0 - abs(vT);
  vec3 c = mix(uLo, uHi, k * k) * uGain;
  gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
}`;

export function lin(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link');
  const u = {}, a = {};
  const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nu; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < na; i++) { const info = gl.getActiveAttrib(p, i); a[info.name] = gl.getAttribLocation(p, info.name); }
  return { p, u, a };
}

export function createGLRenderer(canvas, colors) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, powerPreference: 'low-power' });
  if (!gl) return null;
  let cloth, thread, vbo, ibo, tbo, verts, threadData, W = 1, H = 1;
  let bufferFor = null;

  function init() {
    cloth = program(gl, VS, FS);
    thread = program(gl, VS_THREAD, FS_THREAD);
    vbo = gl.createBuffer();
    ibo = gl.createBuffer();
    tbo = gl.createBuffer();
    bufferFor = null;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 0);
  }
  init();

  const C = {
    deep: lin(colors.deep), velvet: lin(colors.velvet), sheen: lin(colors.sheen), back: lin(colors.back),
    lo: lin(colors.silverLo), hi: lin(colors.silverHi),
  };
  const Ldir = (() => { const v = [-0.22, -0.55, 0.8]; const l = Math.hypot(...v); return v.map((c) => c / l); })();

  function ensure(cu) {
    if (bufferFor === cu) return;
    verts = new Float32Array(cu.clothCount * 10);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cu.visibleIdx.byteLength, gl.DYNAMIC_DRAW);
    threadData = new Float32Array(4096 * 4);
    bufferFor = cu;
  }

  function buildThreads(cu) {
    // one quad (6 vertices x 4 floats) per stitch or mending thread
    const out = [];
    const { x, y, z, nrm } = cu;
    const w = Math.max(0.8, cu.dx * 0.08);
    const quad = (ax, ay, az, bx, by, bz, width) => {
      let px = -(by - ay), py = bx - ax;
      const l = Math.hypot(px, py) || 1;
      px = (px / l) * width; py = (py / l) * width;
      out.push(
        ax - px, ay - py, az, -1, bx - px, by - py, bz, -1, bx + px, by + py, bz, 1,
        ax - px, ay - py, az, -1, bx + px, by + py, bz, 1, ax + px, ay + py, az, 1,
      );
    };
    for (let c = 0; c < cu.linkCount; c++) {
      if (!cu.alive[c]) continue;
      const a = cu.la[c], b = cu.lb[c];
      if (cu.mendingLink[c] && cu.len(c) > cu.rest0[c] * 1.15) {
        quad(x[a], y[a], z[a] + 1, x[b], y[b], z[b] + 1, w * 0.6);
        continue;
      }
      if (!cu.stitched[c]) continue;
      // a short slanted stitch across the mended link, lifted off the pile along the normal
      const mxp = (x[a] + x[b]) / 2, myp = (y[a] + y[b]) / 2, mzp = (z[a] + z[b]) / 2;
      const nx = (nrm[a * 3] + nrm[b * 3]) / 2, ny = (nrm[a * 3 + 1] + nrm[b * 3 + 1]) / 2, nz = (nrm[a * 3 + 2] + nrm[b * 3 + 2]) / 2;
      let dx = x[b] - x[a], dy = y[b] - y[a], dz = z[b] - z[a];
      const dl = Math.hypot(dx, dy, dz) || 1;
      dx /= dl; dy /= dl; dz /= dl;
      // across = normal x along
      let cx = ny * dz - nz * dy, cy = nz * dx - nx * dz, cz = nx * dy - ny * dx;
      const cl = Math.hypot(cx, cy, cz) || 1;
      const half = cu.dx * 0.42;
      cx = (cx / cl) * half; cy = (cy / cl) * half; cz = (cz / cl) * half;
      const sl = half * 0.35;
      const lift = 0.9;
      quad(
        mxp - cx - dx * sl + nx * lift, myp - cy - dy * sl + ny * lift, mzp - cz - dz * sl + nz * lift,
        mxp + cx + dx * sl + nx * lift, myp + cy + dy * sl + ny * lift, mzp + cz + dz * sl + nz * lift, w,
      );
    }
    return out;
  }

  return {
    kind: 'webgl',
    gl,
    resize(w, h, dpr) {
      W = w; H = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    restore() { init(); },
    draw(cu, scene) {
      if (gl.isContextLost()) return;
      ensure(cu);
      cu.computeShading();
      const { x, y, z, nrm, cav, crush, mx, my } = cu;
      for (let k = 0, o = 0; k < cu.clothCount; k++, o += 10) {
        verts[o] = x[k]; verts[o + 1] = y[k]; verts[o + 2] = z[k];
        verts[o + 3] = nrm[k * 3]; verts[o + 4] = nrm[k * 3 + 1]; verts[o + 5] = nrm[k * 3 + 2];
        verts[o + 6] = mx[k]; verts[o + 7] = my[k]; verts[o + 8] = crush[k]; verts[o + 9] = cav[k];
      }
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const zs = 1 / 2000;

      gl.useProgram(cloth.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, cu.visibleIdx.subarray(0, cu.visibleCount));
      const a = cloth.a, u = cloth.u;
      gl.enableVertexAttribArray(a.aPos); gl.vertexAttribPointer(a.aPos, 3, gl.FLOAT, false, 40, 0);
      gl.enableVertexAttribArray(a.aNor); gl.vertexAttribPointer(a.aNor, 3, gl.FLOAT, false, 40, 12);
      gl.enableVertexAttribArray(a.aMat); gl.vertexAttribPointer(a.aMat, 4, gl.FLOAT, false, 40, 24);
      gl.uniform2f(u.uView, W, H);
      gl.uniform1f(u.uZ, zs);
      gl.uniform3fv(u.uDeep, C.deep); gl.uniform3fv(u.uVelvet, C.velvet);
      gl.uniform3fv(u.uSheen, C.sheen); gl.uniform3fv(u.uBack, C.back);
      gl.uniform3fv(u.uL, Ldir);
      gl.uniform4f(u.uSpot, scene.spot[0], scene.spot[1], scene.spot[2], scene.spot[3]);
      gl.uniform2f(u.uRail, scene.railY, scene.railFade);
      gl.uniform3f(u.uLamp, scene.lamp[0], scene.lamp[1], scene.lamp[2] * scene.lampLevel + 1e-3);
      gl.drawElements(gl.TRIANGLES, cu.visibleCount, gl.UNSIGNED_SHORT, 0);
      gl.disableVertexAttribArray(a.aNor); gl.disableVertexAttribArray(a.aMat);

      const quads = buildThreads(cu);
      if (quads.length) {
        if (quads.length > threadData.length) threadData = new Float32Array(quads.length * 2);
        threadData.set(quads);
        gl.useProgram(thread.p);
        gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
        gl.bufferData(gl.ARRAY_BUFFER, threadData.subarray(0, quads.length), gl.STREAM_DRAW);
        const ta = thread.a, tu = thread.u;
        gl.enableVertexAttribArray(ta.aPos); gl.vertexAttribPointer(ta.aPos, 3, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(ta.aT); gl.vertexAttribPointer(ta.aT, 1, gl.FLOAT, false, 16, 12);
        gl.uniform2f(tu.uView, W, H);
        gl.uniform1f(tu.uZ, zs);
        gl.uniform3fv(tu.uLo, C.lo); gl.uniform3fv(tu.uHi, C.hi);
        gl.uniform1f(tu.uGain, 0.85);
        gl.drawArrays(gl.TRIANGLES, 0, quads.length / 4);
        gl.disableVertexAttribArray(ta.aT);
      }
    },
  };
}
