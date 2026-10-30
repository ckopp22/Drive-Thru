import { makeCar, CAR_VARIANTS, CAR_COLORS, LANE_Z } from './scene.js';
import { TUNING } from './levels.js';
import { activeShop, itemInfo } from './shops.js';

const ORDER = ['soda', 'burger', 'fries'];
const START_X = -7.5, END_X = 8, SPACING = 2.4;
const TAG_Y = 1.0; // anchor height above the lane for the order bubble
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = n => Math.floor(Math.random() * n);

// Order = list of item slots, e.g. ['soda', 'burger', 'burger'].
export function makeOrder(cfg) {
  if (activeShop().pizza) {
    // Each pizza is a random non-empty set of the level's toppings, written as a sorted signature.
    return Array.from({ length: 1 + rnd(cfg.maxItems) }, () => {
      const pool = cfg.toppings.slice(), tops = [];
      for (let n = 1 + rnd(Math.min(cfg.maxToppings, pool.length)); n > 0; n--) tops.push(pool.splice(rnd(pool.length), 1)[0]);
      return 'pizza:' + cfg.toppings.filter(t => tops.includes(t)).join('+');
    }).sort();
  }
  const size = 1 + rnd(cfg.maxItems);
  const slots = [];
  while (slots.length < size) {
    const avail = cfg.items.filter(t => cfg.doubles ? slots.filter(s => s === t).length < 2 : !slots.includes(t));
    slots.push(avail[rnd(avail.length)]);
  }
  return slots.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

export const orderValue = slots => slots.reduce((n, t) => n + itemInfo(t).price, 0);

// Tip in whole dollars: full at/above tipFullAt patience left, none at/below patRed, linear between.
export function tipFor(base, frac) {
  const k = clamp((frac - TUNING.patRed) / (TUNING.tipFullAt - TUNING.patRed), 0, 1);
  return Math.round(base * TUNING.tipMax * k);
}

// Cars, orders, patience (MDD 5.4). overlay: HTML layer over the canvas.
// cb: { onArrive(slots), onSend({base, tip, total, frac, pos}), onAngry({pos}) }
export function createOrders(world, cfg, overlay, cb) {
  const stats = { served: 0, lost: 0, patSum: 0 };
  const leaving = [];
  const lane = []; // cars in line; lane[0] is at the window
  let gapT = TUNING.firstCarDelay;
  let lastVariant = -1, lastColor = -1;

  const pick = (n, last) => { let i; do i = rnd(n); while (i === last && n > 1); return i; };

  function moveTo(c, tx) {
    c.x0 = c.group.position.x;
    c.tx = tx;
    c.t = 0;
    c.dur = TUNING.carArrive * clamp(Math.abs(tx - c.x0) / 7.5, .35, 1);
    c.state = 'moving';
  }

  function spawn() {
    lastVariant = pick(CAR_VARIANTS, lastVariant);
    lastColor = pick(CAR_COLORS.length, lastColor);
    const group = makeCar(lastVariant, CAR_COLORS[lastColor]);
    group.position.set(START_X, 0, LANE_Z);
    world.addCar(group);
    const slots = makeOrder(cfg);
    const tag = document.createElement('div');
    tag.className = 'car-tag queued';
    tag.hidden = true;
    tag.innerHTML = `<div class="bubble">${slots.map(t => activeShop().itemIcons ? `<img class="slot" src="${world.itemIcon(t)}" alt="">` : `<span class="slot">${itemInfo(t).icon}</span>`).join('')}</div><div class="pbar"><i></i></div>`;
    overlay.appendChild(tag);
    const c = {
      group, tag, slots, state: 'moving', t: 0, pat: cfg.patience, angry: false, x0: START_X, tx: 0, dur: 1,
      bar: tag.querySelector('.pbar'), fill: tag.querySelector('.pbar i'), band: ''
    };
    moveTo(c, -SPACING * lane.length);
    lane.push(c);
  }

  function tagPos(c) {
    return world.project(c.group.position.x, TAG_Y, LANE_Z);
  }

  function depart(c, angry) {
    c.state = 'leaving';
    c.t = 0;
    c.angry = angry;
    c.x0 = c.group.position.x;
    c.dur = angry ? TUNING.carLeaveAngry : TUNING.carLeave;
    if (angry) {
      c.tag.className = 'car-tag angry';
      c.tag.innerHTML = '<div class="emote">😡</div>';
    } else {
      c.tag.remove();
    }
    leaving.push(c);
    lane.shift();
    lane.forEach((q, i) => moveTo(q, -SPACING * i));
  }

  function send(c) {
    if (c !== lane[0] || c.state !== 'waiting') return;
    const frac = c.pat / cfg.patience;
    const base = orderValue(c.slots);
    const tip = tipFor(base, frac);
    stats.served++;
    stats.patSum += frac;
    const pos = tagPos(c);
    depart(c, false);
    cb.onSend({ base, tip, total: base + tip, frac, pos });
  }

  // True when `items` is exactly what the waiting car ordered.
  function matches(items) {
    const car = lane[0];
    return !!car && car.state === 'waiting' && items.length === car.slots.length &&
      [...items].sort().join() === [...car.slots].sort().join();
  }

  // Sends a tray: pays out and the car leaves if it matches exactly. Returns whether it was sent.
  function trySend(items) {
    if (!matches(items)) return false;
    send(lane[0]);
    return true;
  }

  function update(dt) {
    if (lane.length < 1 + (cfg.queue || 0)) {
      gapT -= dt;
      if (gapT <= 0) { spawn(); gapT = cfg.gap; }
    }
    for (const c of [...lane]) {
      c.t += dt;
      if (c.state === 'moving') {
        const u = Math.min(1, c.t / c.dur);
        c.group.position.x = c.x0 + (c.tx - c.x0) * (1 - (1 - u) ** 3);
        c.group.position.y = u < 1 ? Math.abs(Math.sin(c.t * 22)) * .02 : 0;
        if (u >= 1) {
          c.tag.hidden = false;
          if (c.tx === 0) {
            c.state = 'waiting';
            c.tag.classList.remove('queued');
            cb.onArrive(c.slots);
          } else {
            c.state = 'queued';
          }
        }
      } else if (c.state === 'waiting') {
        c.pat -= dt;
        const frac = clamp(c.pat / cfg.patience, 0, 1);
        c.fill.style.transform = `scaleX(${frac})`;
        const band = frac > TUNING.patGreen ? 'g' : frac > TUNING.patRed ? 'y' : 'r';
        if (band !== c.band) { c.band = band; c.bar.className = 'pbar ' + band; }
        if (c.pat <= 0) {
          stats.lost++;
          const pos = tagPos(c);
          depart(c, true);
          cb.onAngry({ pos });
        }
      }
    }
    for (let i = leaving.length - 1; i >= 0; i--) {
      const c = leaving[i];
      c.t += dt;
      const u = Math.min(1, c.t / c.dur);
      c.group.position.x = c.x0 + (END_X - c.x0) * u * u;
      c.group.position.y = Math.abs(Math.sin(c.t * 26)) * .02;
      c.group.rotation.y = c.angry ? Math.sin(c.t * 40) * .05 : 0;
      if (u >= 1) {
        world.removeCar(c.group);
        c.tag.remove();
        leaving.splice(i, 1);
      }
    }
    for (const c of [...lane, ...leaving]) {
      if (c.tag.hidden || !c.tag.isConnected) continue;
      const p = tagPos(c);
      c.tag.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
      c.tag.style.visibility = p.x < 30 ? 'hidden' : '';
    }
  }

  return { update, matches, trySend, stats, get car() { return lane[0] || null; } };
}
