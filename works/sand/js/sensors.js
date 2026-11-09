// Tilt and shake from the phone's motion sensors. Readings stay in this page; nothing is sent.

const DEG = Math.PI / 180;

export function sensorsPossible() {
  return typeof window.DeviceOrientationEvent !== 'undefined' &&
    matchMedia('(pointer: coarse)').matches;
}

/** Angle of gravity in the screen plane, in degrees; positive when the right edge is lower. */
function screenTilt(beta, gamma) {
  const b = beta * DEG, g = gamma * DEG;
  let x = Math.sin(g) * Math.cos(b);       // gravity across the screen
  let y = Math.sin(b);                     // gravity down the screen
  const turn = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  // 90: the phone is turned counter-clockwise, so its top points to the screen's left
  if (turn === 90) [x, y] = [y, -x];
  else if (turn === -90 || turn === 270) [x, y] = [-y, x];
  else if (turn === 180) [x, y] = [-x, -y];
  const m = Math.hypot(x, y);
  const proj = Math.atan2(x, y) / DEG;
  if (m >= 0.5) return proj;
  // nearly flat on a table: the projection is unstable, so lean on the roll angle instead
  const roll = turn ? proj : gamma;
  return roll + (proj - roll) * (m / 0.5);
}

/**
 * Ask for permission (iOS needs this inside the tap) and start listening.
 * Resolves true once real readings arrive, false if denied or silent.
 */
export function enableSensors({ onTilt, onShake }) {
  const asks = [];
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') asks.push(DeviceOrientationEvent.requestPermission());
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      asks.push(DeviceMotionEvent.requestPermission().catch(() => 'denied'));
    }
  } catch (e) {
    return Promise.resolve({ ok: false, stop() {} });
  }
  return Promise.all(asks).then((answers) => {
    if (answers.length && answers[0] !== 'granted') return { ok: false, stop() {} };
    let got = false, smooth = null;
    const peaks = [];
    let lastPeak = 0, lastSign = 0, lastShake = 0;
    const base = { x: 0, y: 0, z: 0 };

    const onOri = (e) => {
      if (e.beta == null || e.gamma == null) return;
      got = true;
      const t = Math.max(-35, Math.min(35, screenTilt(e.beta, e.gamma)));
      smooth = smooth == null ? t : smooth + (t - smooth) * 0.25;
      onTilt(smooth);
    };
    const onMot = (e) => {
      let a = e.acceleration;
      let x, y, z;
      if (a && a.x != null) { x = a.x; y = a.y; z = a.z; }
      else {
        a = e.accelerationIncludingGravity;
        if (!a || a.x == null) return;
        // high-pass: remove the slowly changing gravity part
        base.x += (a.x - base.x) * 0.1; base.y += (a.y - base.y) * 0.1; base.z += (a.z - base.z) * 0.1;
        x = a.x - base.x; y = a.y - base.y; z = a.z - base.z;
      }
      const now = performance.now();
      const mag = Math.hypot(x, y, z);
      if (mag < 12) return;
      const sign = Math.sign(Math.abs(x) > Math.abs(y) ? x : y);
      if (now - lastPeak < 80 || sign === lastSign) return;
      lastPeak = now; lastSign = sign;
      peaks.push(now);
      while (peaks.length && now - peaks[0] > 700) peaks.shift();
      if (peaks.length >= 3 && now - lastShake > 450) {
        lastShake = now;
        peaks.length = 0;
        onShake();
      }
    };
    window.addEventListener('deviceorientation', onOri);
    window.addEventListener('devicemotion', onMot);
    const stop = () => {
      window.removeEventListener('deviceorientation', onOri);
      window.removeEventListener('devicemotion', onMot);
    };
    return new Promise((resolve) => {
      setTimeout(() => {
        if (got) resolve({ ok: true, stop });
        else { stop(); resolve({ ok: false, stop() {} }); }
      }, 1500);
    });
  }, () => ({ ok: false, stop() {} }));
}
