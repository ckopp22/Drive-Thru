// Headless Burger Joint simulation: a greedy bot with a per-decision reaction delay stands in for a player.
// efficiency e: 1 = no delay (the bot's ceiling), lower = slower human. L = (1-e)*LAT seconds before each new walk.
import { LEVELS as L0, STATIONS, PRICES, TUNING, WORKER } from '../js/levels.js';
const LAT = +(process.env.LAT || 2.4);
const SPOT = { soda: [-1.9, -1.2], burger: [1.9, -1.2], fries: [-1.9, 1.6], burger2: [1.9, .4], fries2: [-1.9, .2], trash: [1.9, 1.6] };
const TRAYX = { 1: [0], 2: [-.6, .6], 3: [-1.1, 0, 1.1] };
const typeOf = k => STATIONS[k].type || k;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function sim(cfg, e, seed) {
  const R = rng(seed), rnd = n => Math.floor(R() * n);
  const lat = (1 - e) * LAT, dt = .05, order = ['soda', 'burger', 'fries'];
  const stKeys = ['soda', 'burger', 'fries', ...(cfg.extra ? ['burger2', 'fries2'] : [])].filter(k => cfg.items.includes(typeOf(k)));
  const st = {}; stKeys.forEach(k => (st[k] = { s: 'idle', p: 0, t: 0 }));
  const trays = Array.from({ length: cfg.trays }, () => []);
  const tx = TRAYX[cfg.trays];
  const W = { x: 0, z: .5, tgt: null, startAt: 0, hand: null };
  const lane = []; let gapT = TUNING.firstCarDelay, money = 0, served = 0, lost = 0, t = 0;
  const slotDur = k => TUNING.carArrive * clamp((7.5 - 2.4 * k) / 7.5, .35, 1);

  function makeOrder() {
    const size = 1 + rnd(cfg.maxItems), slots = [];
    while (slots.length < size) {
      const av = cfg.items.filter(x => cfg.doubles ? slots.filter(s => s === x).length < 2 : !slots.includes(x));
      slots.push(av[rnd(av.length)]);
    }
    return slots.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
  const moveCar = (c, k) => { c.slot = k; c.arrive = t + slotDur(k); c.state = 'moving'; };
  function depart(c, angry) {
    lane.splice(lane.indexOf(c), 1);
    if (c.tray != null) trays[c.tray].length = 0;
    lane.forEach((q, i) => { if (q.slot !== i) { if (q.state === 'moving') q.arrive = Math.max(q.arrive, t + .385); else q.arrive = t + .385; q.slot = i; q.state = 'moving'; } });
    if (angry) { lost++; money -= Math.min(money, TUNING.penalty); }
  }
  const price = slots => slots.reduce((n, x) => n + PRICES[x], 0);
  const miss = (need, have) => { const n = need.slice(); for (const h of have) { const i = n.indexOf(h); if (i >= 0) n.splice(i, 1); } return n; };

  function trySend() {
    const c = lane[0];
    if (!c || c.state !== 'waiting' || c.tray == null) return;
    if (miss(c.slots, trays[c.tray]).length || trays[c.tray].length !== c.slots.length) return;
    const base = price(c.slots), frac = c.pat / cfg.patience;
    const k = clamp((frac - TUNING.patRed) / (TUNING.tipFullAt - TUNING.patRed), 0, 1);
    money += base + Math.round(base * TUNING.tipMax * k); served++;
    depart(c, false);
  }

  function decide() {
    // Cars whose order is visible (arrived) and that have, or can get, a tray.
    const vis = lane.filter(c => c.state === 'waiting' || c.state === 'queued');
    for (const c of vis) if (c.tray == null) { const free = trays.findIndex((_, i) => !lane.some(q => q.tray === i)); if (free >= 0) c.tray = free; }
    const cars = vis.filter(c => c.tray != null);
    const need = c => miss(c.slots, trays[c.tray]);
    const demand = {}; for (const c of cars) for (const x of need(c)) demand[x] = (demand[x] || 0) + 1;
    const dist = (k) => Math.hypot(SPOT[k][0] - W.x, SPOT[k][1] - W.z);
    if (W.hand) {
      const c = cars.find(q => need(q).includes(W.hand));
      return c ? { kind: 'tray', i: c.tray, x: tx[c.tray], z: -2.1 } : { kind: 'trash', x: SPOT.trash[0], z: SPOT.trash[1] };
    }
    const ready = stKeys.filter(k => st[k].s === 'ready' && demand[typeOf(k)] > 0).sort((a, b) => dist(a) - dist(b));
    if (ready.length) return { kind: 'st', k: ready[0], x: SPOT[ready[0]][0], z: SPOT[ready[0]][1] };
    const prog = {}; stKeys.forEach(k => { if (st[k].s === 'making' || st[k].s === 'ready') prog[typeOf(k)] = (prog[typeOf(k)] || 0) + 1; });
    for (const c of cars) {
      const needs = need(c).slice().sort((a, b) => STATIONS[b].time - STATIONS[a].time);
      for (const x of needs) {
        if ((prog[x] || 0) >= demand[x]) continue;
        const idle = stKeys.filter(k => typeOf(k) === x && (st[k].s === 'idle' || st[k].s === 'burnt')).sort((a, b) => dist(a) - dist(b));
        if (idle.length) return { kind: 'st', k: idle[0], x: SPOT[idle[0]][0], z: SPOT[idle[0]][1] };
      }
    }
    return null;
  }

  function arrive(g) {
    if (g.kind === 'trash') W.hand = null;
    else if (g.kind === 'tray') { if (W.hand) { trays[g.i].push(W.hand); W.hand = null; trySend(); } }
    else {
      const s = st[g.k];
      if (s.s === 'ready' && !W.hand) { W.hand = typeOf(g.k); s.s = 'idle'; s.p = s.t = 0; }
      else if ((s.s === 'idle' || s.s === 'burnt') && !W.hand) { s.s = 'making'; s.p = 0; }
    }
  }

  while (t < cfg.time) {
    t += dt;
    // cars
    if (lane.length < 1 + (cfg.queue || 0)) { gapT -= dt; if (gapT <= 0) { const c = { slots: makeOrder(), pat: cfg.patience, tray: null, state: 'moving' }; lane.push(c); moveCar(c, lane.length - 1); gapT = cfg.gap; } }
    for (const c of [...lane]) {
      if (c.state === 'moving' && t >= c.arrive) c.state = lane[0] === c ? 'waiting' : 'queued';
      if (c.state === 'queued' && lane[0] === c) c.state = 'waiting';
      if (c.state === 'waiting') { c.pat -= dt; if (c.pat <= 0) depart(c, true); }
    }
    // stations
    for (const k of stKeys) {
      const s = st[k];
      if (s.s === 'making') { s.p += dt / STATIONS[k].time; if (s.p >= 1) { s.s = 'ready'; s.t = 0; } }
      else if (s.s === 'ready' && cfg.burn && STATIONS[k].burns && (s.t += dt) >= cfg.burn) s.s = 'burnt';
    }
    // worker
    if (!W.tgt) {
      const g = decide();
      if (g) { W.tgt = g; W.startAt = t + lat; }
    }
    if (W.tgt && t >= W.startAt) {
      const g = W.tgt, dx = g.x - W.x, dz = g.z - W.z, d = Math.hypot(dx, dz), step = WORKER.speed * dt;
      if (d <= step) { W.x = g.x; W.z = g.z; W.tgt = null; arrive(g); } else { W.x += dx / d * step; W.z += dz / d * step; }
    }
    trySend();
  }
  return { money, served, lost };
}

if (process.argv[1].endsWith('sim.mjs')) {
  const N = +(process.env.N || 60), effs = [1, .9, .8, .7, .6, .5];
  const lv = JSON.parse(process.env.LEVELS_JSON || 'null') || L0;
  console.log('lvl goal | mean $ at efficiency ' + effs.join('  ') + ' | pass% at ' + effs.join('  '));
  lv.forEach((cfg, i) => {
    const means = [], pass = [];
    for (const e of effs) {
      let sum = 0, p = 0;
      for (let s = 1; s <= N; s++) { const r = sim(cfg, e, s * 7919 + i); sum += r.money; if (r.money >= cfg.goal) p++; }
      means.push((sum / N).toFixed(0).padStart(4)); pass.push((100 * p / N).toFixed(0).padStart(3));
    }
    console.log(String(i + 1).padStart(3), String(cfg.goal).padStart(4), '|', means.join(' '), '|', pass.join(' '));
  });
}
