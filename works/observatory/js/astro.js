// Small, self-contained positional astronomy for the planisphere.
// Accuracy: sidereal time to well under a second, sun ~0.01 deg, moon ~0.3 deg. Star and
// deep-sky positions are J2000; precession since then (~0.4 deg) is ignored, as on a paper chart.

export const LAT = 37.5;            // chart latitude (deg N)
export const LON = 127.5;           // chart longitude (deg E): clock runs 30 min ahead of the sky
export const KST = 9 * 3600000;     // UTC+9

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const norm = (d) => ((d % 360) + 360) % 360;

export function julian(ms) {
  return ms / 86400000 + 2440587.5;
}

/** Local sidereal time in degrees at the chart longitude. */
export function lstDeg(ms) {
  const d = julian(ms) - 2451545.0;
  const t = d / 36525;
  const gmst = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t;
  return norm(gmst + LON);
}

/** Equatorial (deg) -> horizontal {alt, az} in degrees, az from north through east. */
export function altAz(raDeg, decDeg, lst) {
  const h = (lst - raDeg) * RAD;
  const d = decDeg * RAD;
  const p = LAT * RAD;
  const sinAlt = Math.sin(p) * Math.sin(d) + Math.cos(p) * Math.cos(d) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(-Math.cos(d) * Math.sin(h), Math.sin(d) * Math.cos(p) - Math.cos(d) * Math.sin(p) * Math.cos(h));
  return { alt: alt * DEG, az: norm(az * DEG) };
}

/** Horizontal (deg) -> {dec, ha} in degrees (ha positive to the west). */
export function horizonToEq(altDeg, azDeg) {
  const a = altDeg * RAD;
  const z = azDeg * RAD;
  const p = LAT * RAD;
  const sinDec = Math.sin(p) * Math.sin(a) + Math.cos(p) * Math.cos(a) * Math.cos(z);
  const dec = Math.asin(sinDec);
  const sinH = -Math.sin(z) * Math.cos(a) / Math.cos(dec);
  const cosH = (Math.sin(a) - sinDec * Math.sin(p)) / (Math.cos(dec) * Math.cos(p));
  return { dec: dec * DEG, ha: Math.atan2(sinH, cosH) * DEG };
}

function eclToEq(lonDeg, latDeg, n) {
  const e = (23.439 - 0.0000004 * n) * RAD;
  const l = lonDeg * RAD;
  const b = latDeg * RAD;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  return { ra: norm(ra * DEG), dec: dec * DEG };
}

/** Ecliptic point at longitude lonDeg (latitude 0) in equatorial coordinates, J2000-ish. */
export function eclipticPoint(lonDeg) {
  return eclToEq(lonDeg, 0, 9500);
}

export function sun(ms) {
  const n = julian(ms) - 2451545.0;
  const L = norm(280.460 + 0.9856474 * n);
  const g = norm(357.528 + 0.9856003 * n) * RAD;
  const lon = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);
  return { lon: norm(lon), ...eclToEq(lon, 0, n) };
}

export function moon(ms) {
  const n = julian(ms) - 2451545.0;
  const Lp = norm(218.316 + 13.176396 * n);
  const Mp = norm(134.963 + 13.064993 * n) * RAD;
  const F = norm(93.272 + 13.229350 * n) * RAD;
  const D = norm(297.850 + 12.190749 * n) * RAD;
  const M = norm(357.529 + 0.98560028 * n) * RAD;
  const lon = Lp + 6.289 * Math.sin(Mp) + 1.274 * Math.sin(2 * D - Mp) + 0.658 * Math.sin(2 * D)
    + 0.214 * Math.sin(2 * Mp) - 0.186 * Math.sin(M) - 0.114 * Math.sin(2 * F);
  const lat = 5.128 * Math.sin(F) + 0.281 * Math.sin(Mp + F) + 0.278 * Math.sin(Mp - F)
    + 0.173 * Math.sin(2 * D - F);
  const s = sun(ms);
  const eq = eclToEq(lon, lat, n);
  const cosE = Math.cos(lat * RAD) * Math.cos((norm(lon) - s.lon) * RAD);
  const illum = (1 - cosE) / 2;
  const waxing = norm(lon - s.lon) < 180;
  return { lon: norm(lon), lat, ...eq, illum, waxing, elong: Math.acos(cosE) * DEG };
}

/** Topocentric altitude of the moon is lower by up to ~1 deg (parallax). */
export function moonAltAz(ms) {
  const m = moon(ms);
  const h = altAz(m.ra, m.dec, lstDeg(ms));
  h.alt -= 0.95 * Math.cos(h.alt * RAD);
  return { ...m, ...h };
}

export function sunAlt(ms) {
  const s = sun(ms);
  return altAz(s.ra, s.dec, lstDeg(ms)).alt;
}

/** First instant in [from, from+span) where f(t) crosses `level` in direction dir (+1 rising). */
export function findCrossing(f, level, from, span, dir, step = 600000) {
  let t0 = from;
  let v0 = f(t0) - level;
  for (let t = from + step; t <= from + span; t += step) {
    const v = f(t) - level;
    if ((dir > 0 && v0 < 0 && v >= 0) || (dir < 0 && v0 > 0 && v <= 0)) {
      let a = t - step;
      let b = t;
      for (let i = 0; i < 20; i++) {
        const m = (a + b) / 2;
        const vm = f(m) - level;
        if ((dir > 0) === (vm < 0)) a = m; else b = m;
      }
      return (a + b) / 2;
    }
    t0 = t;
    v0 = v;
  }
  return null;
}

/** Galactic (l, b) deg -> equatorial J2000 deg. */
export function galToEq(lDeg, bDeg) {
  const raNGP = 192.85948 * RAD;
  const decNGP = 27.12825 * RAD;
  const lNCP = 122.93192 * RAD;
  const l = lDeg * RAD;
  const b = bDeg * RAD;
  const sinDec = Math.sin(decNGP) * Math.sin(b) + Math.cos(decNGP) * Math.cos(b) * Math.cos(lNCP - l);
  const dec = Math.asin(sinDec);
  const y = Math.cos(b) * Math.sin(lNCP - l);
  const x = Math.cos(decNGP) * Math.sin(b) - Math.sin(decNGP) * Math.cos(b) * Math.cos(lNCP - l);
  return { ra: norm((raNGP + Math.atan2(y, x)) * DEG), dec: dec * DEG };
}

// --- KST calendar helpers -------------------------------------------------------------

/** Calendar parts of an instant in KST. */
export function kstParts(ms) {
  const d = new Date(ms + KST);
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(),
    wd: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

/** Instant (ms) of a KST calendar date plus minutes after midnight. */
export function kstInstant(y, m, d, minutes) {
  return Date.UTC(y, m - 1, d) - KST + minutes * 60000;
}

const COMPASS = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동',
  '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
const COMPASS8 = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];

export function compass(az, fine = false) {
  return fine ? COMPASS[Math.round(az / 22.5) % 16] : COMPASS8[Math.round(az / 45) % 8];
}
