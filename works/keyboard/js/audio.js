// 스위치 소리 합성 (WebAudio). 샘플 파일 없이 잡음과 사인파로 만든다.

const BIG = new Set(['space', 'enter', 'lshift', 'rshift', 'bksp']);

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

export function audioSupported() {
  return !!(window.AudioContext || window.webkitAudioContext);
}

export function createAudio() {
  let ctx = null;
  let out = null;
  let noise = null;
  let enabled = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      comp.attack.value = 0.002;
      comp.release.value = 0.12;
      out = ctx.createGain();
      out.gain.value = 0.8;
      out.connect(comp).connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.5);
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 잡음 한 토막을 대역 통과 필터로 깎는다
  function burst(t, { f, q = 1, decay = 0.03, gain = 0.3, type = 'bandpass', attack = 0.0015 }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = f;
    filt.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(filt).connect(g).connect(out);
    src.start(t, Math.random() * 0.3);
    src.stop(t + attack + decay + 0.02);
  }

  // 짧은 사인파 '퉁' — 케이스 울림
  function tone(t, { f, f2 = f * 0.7, decay = 0.05, gain = 0.2, type = 'sine' }) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  function key(profile, id, phase, when = 0) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime + 0.004 + when;
    const big = BIG.has(id);
    const v = 1 + (hash(id) - 0.5) * 0.09 + (Math.random() - 0.5) * 0.05;
    const low = big ? 0.74 : 1;
    const long = big ? 1.45 : 1;
    const amp = big ? 1.1 : 1;

    if (profile === 'goyo') {
      if (phase === 'down') {
        burst(t + 0.011, { f: 1050 * v * low, q: 1.1, decay: 0.034 * long, gain: 0.55 * amp });
        tone(t + 0.011, { f: 205 * v * low, f2: 120, decay: 0.055 * long, gain: 0.32 * amp });
        burst(t + 0.012, { f: 430 * v * low, q: 5, decay: 0.06 * long, gain: 0.22 * amp });
      } else {
        burst(t, { f: 2300 * v, q: 1.4, decay: 0.018, gain: 0.16 * amp });
        tone(t, { f: 290 * v * low, f2: 220, decay: 0.03, gain: 0.07 });
      }
    } else if (profile === 'maru') {
      if (phase === 'down') {
        burst(t, { f: 3600 * v, q: 0.9, decay: 0.008, gain: 0.13, type: 'highpass' });
        burst(t + 0.022, { f: 1450 * v * low, q: 1.3, decay: 0.03 * long, gain: 0.5 * amp });
        tone(t + 0.022, { f: 225 * v * low, f2: 140, decay: 0.045 * long, gain: 0.24 * amp });
        burst(t + 0.023, { f: 520 * v * low, q: 4, decay: 0.05 * long, gain: 0.18 * amp });
      } else {
        burst(t, { f: 2700 * v, q: 1.2, decay: 0.016, gain: 0.18 * amp });
        burst(t + 0.006, { f: 3400 * v, q: 0.8, decay: 0.006, gain: 0.06, type: 'highpass' });
      }
    } else {
      // ttogak: 클릭
      if (phase === 'down') {
        burst(t + 0.006, { f: 4300 * v, q: 4.5, decay: 0.012, gain: 0.75 });
        tone(t + 0.006, { f: 3900 * v, f2: 3500, decay: 0.022, gain: 0.08, type: 'triangle' });
        burst(t + 0.024, { f: 1600 * v * low, q: 1.2, decay: 0.026 * long, gain: 0.34 * amp });
        tone(t + 0.024, { f: 240 * v * low, f2: 150, decay: 0.035 * long, gain: 0.16 * amp });
      } else {
        burst(t, { f: 3700 * v, q: 3.2, decay: 0.01, gain: 0.42 });
        burst(t + 0.008, { f: 2400 * v, q: 1.2, decay: 0.014, gain: 0.12 });
      }
    }
    if (big) {
      // 스태빌라이저 철사 '딸깍'
      burst(t + (phase === 'down' ? 0.03 : 0.012), { f: 2900 * v, q: 2.2, decay: 0.014, gain: 0.08 });
    }
  }

  // 들어 보기: 8타 리듬. onBeat(i, phase)
  const RHYTHM = [0, 0.17, 0.34, 0.6, 0.77, 0.94, 1.11, 1.46];
  const SAMPLE_KEYS = ['g', 'a', 'r', 'space', 'k', 'f', 'j', 'enter'];
  let timers = [];
  function sample(profile, onBeat) {
    stopSample();
    RHYTHM.forEach((t, i) => {
      const id = SAMPLE_KEYS[i];
      key(profile, id, 'down', t);
      key(profile, id, 'up', t + 0.11);
      timers.push(setTimeout(() => onBeat && onBeat(i, 'down', id), t * 1000));
      timers.push(setTimeout(() => onBeat && onBeat(i, 'up', id), (t + 0.11) * 1000));
    });
    const total = (RHYTHM[RHYTHM.length - 1] + 0.3) * 1000;
    return new Promise((res) => timers.push(setTimeout(() => { timers = []; res(); }, total)));
  }
  function stopSample() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  return {
    get enabled() { return enabled; },
    enable() {
      ensure();
      enabled = true;
    },
    disable() {
      enabled = false;
      stopSample();
    },
    key,
    sample,
    stopSample,
    SAMPLE_KEYS,
  };
}
