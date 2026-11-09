// Draws the cloth with a photograph of the closed velvet curtain.
// At rest every pixel is the photograph. Moving the cloth carries the photograph with it; where
// the cloth gathers, the photograph is squeezed and its folds are deepened and darkened.
// WebGL first; a Canvas2D fallback draws the same mesh cell by cell.

const VS = `
attribute vec2 aPos;
attribute vec2 aUV;
attribute float aC;
attribute float aLead;
uniform vec2 uView;
varying vec2 vUV;
varying float vC;
varying float vLead;
varying vec2 vP;
void main() {
  vUV = aUV;
  vC = aC;
  vLead = aLead;
  vP = aPos;
  gl_Position = vec4(aPos.x / uView.x * 2.0 - 1.0, 1.0 - aPos.y / uView.y * 2.0, 0.0, 1.0);
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex;
uniform vec4 uSpot;
uniform vec2 uLight;
varying vec2 vUV;
varying float vC;
varying float vLead;
varying vec2 vP;
void main() {
  vec3 base = texture2D(uTex, vUV).rgb;
  vec3 mean = texture2D(uTex, vUV, 4.0).rgb;
  // gathered: the same folds, narrower and deeper, and less light reaching into them
  float k = clamp((vC - 1.0) / 4.0, 0.0, 1.0);
  vec3 col = mean * (1.0 - 0.28 * k) + (base - mean) * (1.0 + 1.4 * k);
  // the front-of-house light stays where it is while the cloth moves through it
  vec2 d = (vP - uSpot.xy) / uSpot.zw;
  col *= uLight.x + uLight.y * exp(-dot(d, d));
  // the turned lead edge of each panel
  col *= 1.0 - 0.5 * exp(-vLead * 0.35);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

const VS_SHADOW = `
attribute vec2 aPos;
attribute float aA;
uniform vec2 uView;
varying float vA;
void main() {
  vA = aA;
  gl_Position = vec4(aPos.x / uView.x * 2.0 - 1.0, 1.0 - aPos.y / uView.y * 2.0, 0.0, 1.0);
}`;

const FS_SHADOW = `
precision mediump float;
varying float vA;
void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, vA * vA); }`;

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
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
    const n = gl.getActiveUniform(p, i).name;
    u[n] = gl.getUniformLocation(p, n);
  }
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) {
    const n = gl.getActiveAttrib(p, i).name;
    a[n] = gl.getAttribLocation(p, n);
  }
  return { p, u, a };
}

/**
 * Texture coordinates for the rest shape: the photo covers each panel like `object-fit: cover`,
 * both panels meeting at the photo's own seam (u = 0.5). `aspect` is the photo's real width/height.
 */
export function mapUV(cu, aspect) {
  const halfW = aspect / 2;                                   // photo half, in photo heights
  const Hc = cu.L.hem - cu.L.top;
  const k = Math.max(cu.S / halfW, Hc);                       // px per photo height
  // a tall, narrow panel would show only two or three folds: pleat it a little tighter instead
  const uSpan = Math.min(0.5, (cu.S / k / aspect) * (cu.L.pleat || 1)), vSpan = Hc / k;
  const v0 = (1 - vSpan) * 0.35;
  const uv = new Float32Array(cu.n * 2);
  for (let p = 0; p < 2; p++) {
    for (let j = 0; j < cu.ny; j++) {
      for (let i = 0; i < cu.nx; i++) {
        const k2 = cu.idx(p, i, j) * 2;
        const f = 1 - i / (cu.nx - 1);                        // 0 at the lead edge
        uv[k2] = p === 0 ? 0.5 - f * uSpan : 0.5 + f * uSpan;
        uv[k2 + 1] = v0 + (j / (cu.ny - 1)) * vSpan;
      }
    }
  }
  return uv;
}

/** Per-vertex squeeze (rest width / current width across the weft) and lead-edge distance. */
function shapeTerms(cu, c, lead) {
  const { x, nx, ny, dx } = cu;
  for (let p = 0; p < 2; p++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = cu.idx(p, i, j);
        const a = i > 0 ? k - 1 : k, b = i < nx - 1 ? k + 1 : k;
        const span = Math.abs(x[b] - x[a]) / ((b - a) * dx || 1);
        c[k] = Math.min(8, 1 / Math.max(0.125, span));
        lead[k] = (nx - 1 - i) * dx;
      }
    }
  }
}

export function createGL(canvas, image, aspect) {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;
  let cloth, shadow, vbo, ibo, sbo, tex, verts, sverts, idx, uv, c, lead, mesh = null, W = 1, H = 1;

  function init() {
    cloth = program(gl, VS, FS);
    shadow = program(gl, VS_SHADOW, FS_SHADOW);
    vbo = gl.createBuffer();
    ibo = gl.createBuffer();
    sbo = gl.createBuffer();
    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const an = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if (an) gl.texParameterf(gl.TEXTURE_2D, an.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    gl.clearColor(0, 0, 0, 0);
    mesh = null;
  }
  init();

  function ensure(cu) {
    if (mesh === cu) return;
    mesh = cu;
    uv = mapUV(cu, aspect);
    c = new Float32Array(cu.n);
    lead = new Float32Array(cu.n);
    verts = new Float32Array(cu.n * 6);
    const { nx, ny } = cu;
    const cells = (nx - 1) * (ny - 1);
    idx = new Uint16Array(2 * cells * 6);
    let t = 0;
    for (let p = 0; p < 2; p++) {
      for (let j = 0; j < ny - 1; j++) {
        for (let i = 0; i < nx - 1; i++) {
          const a = cu.idx(p, i, j), b = a + 1, d = a + nx, e = d + 1;
          idx.set([a, b, e, a, e, d], t);
          t += 6;
        }
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    sverts = new Float32Array(2 * (ny - 1) * 6 * 3);
  }

  function attrib(prog, name, size, stride, off) {
    const loc = prog.a[name];
    if (loc === undefined || loc < 0) return;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4);
  }

  return {
    kind: 'webgl',
    resize(w, h, dpr) {
      W = w; H = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    restore() { init(); },
    draw(cu, light) {
      if (gl.isContextLost()) return;
      ensure(cu);
      shapeTerms(cu, c, lead);
      const { x, y } = cu;
      for (let k = 0, o = 0; k < cu.n; k++, o += 6) {
        verts[o] = x[k]; verts[o + 1] = y[k];
        verts[o + 2] = uv[k * 2]; verts[o + 3] = uv[k * 2 + 1];
        verts[o + 4] = c[k]; verts[o + 5] = lead[k];
      }
      gl.clear(gl.COLOR_BUFFER_BIT);

      // soft shadow the lead edges throw on the stage behind
      let s = 0;
      const sw = Math.max(26, W * 0.03);
      for (let p = 0; p < 2; p++) {
        const dir = p === 0 ? 1 : -1;
        for (let j = 0; j < cu.ny - 1; j++) {
          const a = cu.idx(p, cu.nx - 1, j), b = a + cu.nx;
          const ax = x[a], ay = y[a], bx = x[b], by = y[b];
          const q = [ax, ay, 0.62, ax + dir * sw, ay, 0, bx + dir * sw, by, 0, ax, ay, 0.62, bx + dir * sw, by, 0, bx, by, 0.62];
          sverts.set(q, s);
          s += 18;
        }
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(shadow.p);
      gl.uniform2f(shadow.u.uView, W, H);
      gl.bindBuffer(gl.ARRAY_BUFFER, sbo);
      gl.bufferData(gl.ARRAY_BUFFER, sverts, gl.DYNAMIC_DRAW);
      attrib(shadow, 'aPos', 2, 3, 0);
      attrib(shadow, 'aA', 1, 3, 2);
      gl.drawArrays(gl.TRIANGLES, 0, s / 3);
      for (const n of ['aPos', 'aA']) if (shadow.a[n] >= 0) gl.disableVertexAttribArray(shadow.a[n]);
      gl.disable(gl.BLEND);

      gl.useProgram(cloth.p);
      gl.uniform2f(cloth.u.uView, W, H);
      gl.uniform4f(cloth.u.uSpot, light.spot[0], light.spot[1], light.spot[2], light.spot[3]);
      gl.uniform2f(cloth.u.uLight, light.base, light.gain);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(cloth.u.uTex, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts);
      attrib(cloth, 'aPos', 2, 6, 0);
      attrib(cloth, 'aUV', 2, 6, 2);
      attrib(cloth, 'aC', 1, 6, 4);
      attrib(cloth, 'aLead', 1, 6, 5);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      // left panel first: the right one hangs in front of it at the seam
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      for (const n of ['aPos', 'aUV', 'aC', 'aLead']) if (cloth.a[n] >= 0) gl.disableVertexAttribArray(cloth.a[n]);
    },
  };
}

/**
 * Canvas2D fallback: each cell of the mesh is the matching slice of the photograph, drawn with an
 * affine transform onto the cell's skewed shape; then the same front-of-house light on top.
 */
export function create2D(canvas, image, aspect) {
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, uv = null, mesh = null;
  const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
  return {
    kind: '2d',
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
    },
    restore() {},
    draw(cu, light) {
      if (mesh !== cu) { mesh = cu; uv = mapUV(cu, aspect); }
      const { x, y, nx, ny } = cu;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let p = 0; p < 2; p++) {
        for (let j = 0; j < ny - 1; j++) {
          for (let i = 0; i < nx - 1; i++) {
            // origin at the corner with the smaller u, so the source slice runs left to right
            let o = cu.idx(p, i, j), r = o + 1;
            if (uv[r * 2] < uv[o * 2]) { const t = o; o = r; r = t; }
            const dn = o + nx;
            const sx = uv[o * 2] * iw, sy = uv[o * 2 + 1] * ih;
            const sw = Math.max(0.5, (uv[r * 2] - uv[o * 2]) * iw), sh = (uv[dn * 2 + 1] - uv[o * 2 + 1]) * ih;
            ctx.setTransform(
              dpr * (x[r] - x[o]) / sw, dpr * (y[r] - y[o]) / sw,
              dpr * (x[dn] - x[o]) / sh, dpr * (y[dn] - y[o]) / sh,
              dpr * x[o], dpr * y[o],
            );
            // a little past the cell: the next slice of the same photo covers the seam
            const edge = p === 0 && i === nx - 2;               // nothing to cover past the lead edge or the hem
            const ew = edge ? sw : Math.min(iw - sx, sw * 1.06 + 1);
            const eh = j === ny - 2 ? sh : Math.min(ih - sy, sh * 1.06 + 1);
            ctx.drawImage(image, sx, sy, ew, eh, 0, 0, ew, eh);
          }
        }
      }
      // the light: darken the cloth away from the pool (only where cloth was drawn)
      const [cx, cy, rx, ry] = light.spot;
      ctx.setTransform(dpr * rx, 0, 0, dpr * ry, dpr * cx, dpr * cy);
      ctx.globalCompositeOperation = 'source-atop';
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 3);
      for (let t = 0; t <= 1.0001; t += 0.125) {
        const lit = Math.min(1, light.base + light.gain * Math.exp(-((t * 3) ** 2)));
        g.addColorStop(Math.min(1, t), `rgba(0,0,0,${(1 - lit).toFixed(3)})`);
      }
      ctx.fillStyle = g;
      ctx.fillRect(-W / rx * 2 - 4, -H / ry * 2 - 4, (W / rx) * 4 + 8, (H / ry) * 4 + 8);
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
  };
}
