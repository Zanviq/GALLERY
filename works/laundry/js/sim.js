// Simulated machine board. Every machine's state is derived from timestamps on a simulated
// clock, so a throttled or hidden tab never drifts: tick() catches up on everything due.

import { BRANCHES, KIND, SIM_COURSES } from './data.js';

const MIN = 60000;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sim {
  constructor() {
    this.speed = 1;
    this.simNow = Date.now();
    this.lastReal = performance.now();
    this.state = new Map(); // branch id -> { branch, machines, nextArrival, rand }
  }

  now() {
    const r = performance.now();
    this.simNow += (r - this.lastReal) * this.speed;
    this.lastReal = r;
    return this.simNow;
  }

  setSpeed(s) {
    this.now();
    this.speed = s;
  }

  branch(id) {
    if (!this.state.has(id)) this.state.set(id, this.seed(BRANCHES.find((b) => b.id === id)));
    return this.state.get(id);
  }

  seed(branch) {
    const now = this.now();
    const day = Math.floor(now / 864e5);
    const rand = rng(day * 97 + BRANCHES.indexOf(branch) * 7919 + 13);
    const machines = branch.machines.map((m) => ({ ...m, state: 'free' }));
    for (const m of machines) {
      const r = rand();
      if (r < 0.4) continue;
      if (r < 0.86) this.startRunning(m, rand, now, rand());
      else {
        m.state = 'done';
        m.course = this.pickCourse(m, rand);
        m.doneAt = now - rand() * 6 * MIN;
        m.pickupAt = now + (0.5 + rand() * 9) * MIN;
      }
    }
    // One running washer finishes soon, so the first visit shows a change.
    const soon = machines.find((m) => m.kind === 'washer' && m.state === 'run') || machines.find((m) => m.kind === 'washer');
    if (soon) {
      if (soon.state !== 'run') this.startRunning(soon, rand, now, 0.5);
      soon.endsAt = now + (40 + rand() * 50) * 1000;
    }
    return { branch, machines, rand, nextArrival: now + this.gap(branch, rand) };
  }

  pickCourse(m, rand) {
    // the bedding course needs a 30kg washer
    const list = SIM_COURSES[m.kind].filter(([name]) => name !== '이불' || m.kg >= 30);
    return list[Math.floor(rand() * list.length)];
  }

  startRunning(m, rand, now, frac = 0) {
    const [name, min] = this.pickCourse(m, rand);
    m.state = 'run';
    m.course = [name, min];
    const total = min * MIN;
    m.endsAt = now + Math.max(MIN, total * (1 - frac));
    m.startedAt = m.endsAt - total;
    m.doneAt = m.pickupAt = undefined;
  }

  gap(branch, rand) {
    return -Math.log(1 - rand()) * branch.rate * 1000;
  }

  // Process every event that is due. Returns the machines that finished, for notifications.
  tick() {
    const now = this.now();
    const finished = [];
    for (const st of this.state.values()) {
      for (let guard = 0; guard < 4000; guard++) {
        // earliest due event in this branch
        let ev = null, at = Infinity;
        for (const m of st.machines) {
          if (m.state === 'run' && m.endsAt < at) { at = m.endsAt; ev = ['end', m]; }
          else if (m.state === 'done' && m.pickupAt < at) { at = m.pickupAt; ev = ['pickup', m]; }
        }
        if (st.nextArrival < at) { at = st.nextArrival; ev = ['arrive']; }
        if (!ev || at > now) break;
        if (ev[0] === 'end') {
          const m = ev[1];
          m.state = 'done';
          m.doneAt = m.endsAt;
          m.pickupAt = m.endsAt + (2 + st.rand() * 14) * MIN;
          finished.push({ branch: st.branch, machine: m });
        } else if (ev[0] === 'pickup') {
          const m = ev[1];
          m.state = 'free';
          // Someone taking clean washing out of a washer often moves on to a dryer.
          if (m.kind === 'washer' && st.rand() < 0.65) this.occupy(st, 'dryer', at);
        } else {
          const r = st.rand();
          const kind = r < 0.6 ? 'washer' : r < 0.93 ? 'dryer' : 'special';
          this.occupy(st, kind, at);
          st.nextArrival = at + this.gap(st.branch, st.rand);
        }
      }
    }
    return finished;
  }

  occupy(st, group, at) {
    const free = st.machines.filter((m) => m.state === 'free' && KIND[m.kind].group === group);
    if (!free.length) return;
    const m = free[Math.floor(st.rand() * free.length)];
    this.startRunning(m, st.rand, at, 0);
  }
}
