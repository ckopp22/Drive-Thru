import { makePatient } from './scene.js';
import { TUNING } from './levels.js';
import { tipFor } from './orders.js';

// Hospital game mode: a patient line at each counter, one task each. Exposes the same shape as createLogic/createOrders
// so startGame can drive it: { logic, orders }. Keys: patL/patR (the patient at that counter), medicine, bandage, register, trash.
const KIND = {
  medicine: { icon: '💊', base: 4 },
  bill: { icon: '💵', base: 6 },
  bandage: { icon: '🩹', base: 5, work: 2.5 },
  id: { icon: '📷', base: 5, work: 3 }
};
const REG_TIME = 3;
const SIDES = [{ key: 'patL', sd: -1 }, { key: 'patR', sd: 1 }];
const X = 2.35, ZS = [-.2, 1.0, 2.2], START_Z = 5.5, END_X = 8, WALK = 2.6;
const SHIRTS = [0x6ec6ff, 0xffb3c7, 0xb8e986, 0xffd77a, 0xc9a7ff];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = n => Math.floor(Math.random() * n);

// cb: { sfx(name), shake(key), binPop(), onArrive(kinds), onSend({base, tip, total, frac, pos}), onAngry({pos}) }
export function createHospital(world, cfg, overlay, cb) {
  const worker = world.worker;
  const stats = { served: 0, lost: 0, patSum: 0 };
  const hands = [];
  const sides = SIDES.map((s, i) => ({ ...s, line: [], gapT: TUNING.firstCarDelay + i * 1.5 }));
  const leaving = [];
  const reg = { state: 'idle', p: 0 }; // idle | working | done
  let active = null;

  const bar = document.createElement('div');
  bar.className = 'car-tag';
  bar.hidden = true;
  bar.innerHTML = '<div class="bubble"><span class="slot">💵</span></div><div class="pbar prog"><i></i></div>';
  overlay.appendChild(bar);
  const regFill = bar.querySelector('.pbar i');

  // Badge over the worker's head showing what they're carrying.
  const HELD_ICON = { bill: '📄 Bill', billok: '✅ Paid bill', medicine: '💊', bandage: '🩹' };
  const heldTag = document.createElement('div');
  heldTag.className = 'car-tag';
  heldTag.hidden = true;
  heldTag.innerHTML = '<div class="bubble"><span class="slot"></span></div>';
  overlay.appendChild(heldTag);
  const heldSlot = heldTag.querySelector('.slot');
  const setHeld = () => worker.setHeld(hands);
  const tagPos = c => world.project(c.group.position.x, 2.1, c.group.position.z);

  function moveTo(c, tx, tz) {
    c.x0 = c.group.position.x; c.z0 = c.group.position.z; c.tx = tx; c.tz = tz; c.t = 0;
    c.dur = Math.max(.05, Math.hypot(tx - c.x0, tz - c.z0) / WALK);
    c.state = 'moving';
  }

  function spawn(side) {
    const kind = cfg.kinds[rnd(cfg.kinds.length)];
    const pm = makePatient(SHIRTS[rnd(SHIRTS.length)]);
    pm.group.position.set(side.sd * X, 0, START_Z);
    world.addCar(pm.group);
    const tag = document.createElement('div');
    tag.className = 'car-tag queued';
    tag.hidden = true;
    tag.innerHTML = `<div class="bubble"><span class="slot">${KIND[kind].icon}</span></div><div class="pbar"><i></i></div><div class="pbar prog" hidden><i></i></div>`;
    overlay.appendChild(tag);
    const c = {
      ...pm, side, kind, tag, state: 'moving', t: 0, dur: 1, pat: cfg.patience, phase: 0, progress: 0, started: false, angry: false,
      bar: tag.querySelectorAll('.pbar')[0], fill: tag.querySelectorAll('i')[0], progBar: tag.querySelectorAll('.pbar')[1], progFill: tag.querySelectorAll('i')[1], band: ''
    };
    moveTo(c, side.sd * X, ZS[side.line.length]);
    side.line.push(c);
  }

  function advance(side) {
    side.line.forEach((q, i) => moveTo(q, side.sd * X, ZS[i]));
  }

  function leave(c, angry) {
    const side = c.side;
    side.line.shift();
    c.state = 'leaving';
    c.t = 0;
    c.angry = angry;
    if (angry) {
      c.tag.className = 'car-tag angry';
      c.tag.innerHTML = `<div class="emote"><img src="${world.faceIcon('angry')}" alt="Angry"></div>`;
    } else c.tag.remove();
    leaving.push(c);
    advance(side);
  }

  function complete(c) {
    const frac = c.pat / cfg.patience, base = KIND[c.kind].base, tip = tipFor(base, frac);
    stats.served++;
    stats.patSum += frac;
    const pos = tagPos(c);
    if (c.kind === 'id') { // photo taken: camera flash
      const f = document.createElement('div');
      f.className = 'photo-flash';
      f.addEventListener('animationend', () => f.remove());
      setTimeout(() => f.remove(), 800);
      overlay.appendChild(f);
    }
    leave(c, false);
    cb.onSend({ base, tip, total: base + tip, frac, pos });
  }

  const first = key => {
    const s = sides.find(x => x.key === key), c = s && s.line[0];
    return c && c.state === 'waiting' ? c : null;
  };

  function tap(key) {
    cb.sfx('tap');
    const held = hands[0];
    if ((key === 'medicine' || key === 'bandage') && held) {
      cb.shake(key);
      return false;
    }
    if (key === 'register' && !(held === 'bill' || (!held && reg.state === 'done'))) {
      cb.shake(key);
      return false;
    }
    active = key;
    worker.walkTo(key);
    return true;
  }

  function arrive(key) {
    const held = hands[0];
    if (key === 'medicine' || key === 'bandage') {
      if (held) return cb.shake(key);
      hands.push(key);
      setHeld();
      worker.kick();
      cb.sfx('pickup');
    } else if (key === 'register') {
      if (held === 'bill') {
        if (reg.state === 'working') return cb.shake(key);
        // Drop the paper in; if a stamped one was waiting, swap it into your hands.
        hands.length = 0;
        if (reg.state === 'done') hands.push('billok');
        reg.state = 'working';
        reg.p = 0;
        setHeld();
        cb.sfx('start');
      } else if (!held && reg.state === 'done') {
        hands.push('billok');
        reg.state = 'idle';
        setHeld();
        worker.kick();
        cb.sfx('pickup');
      } else cb.shake(key);
    } else if (key === 'patL' || key === 'patR') {
      const c = first(key);
      if (!c) return cb.shake(key);
      if (c.kind === 'medicine') {
        if (held !== 'medicine') return cb.shake(key);
        hands.length = 0;
        setHeld();
        complete(c);
      } else if (c.kind === 'bill') {
        if (held === 'billok') {
          hands.length = 0;
          setHeld();
          complete(c);
        } else if (!held && c.phase === 0) {
          c.phase = 1;
          hands.push('bill');
          setHeld();
          worker.kick();
          cb.sfx('pickup');
        } else cb.shake(key);
      } else if (c.kind === 'bandage') {
        if (!c.started) {
          if (held !== 'bandage') return cb.shake(key);
          hands.length = 0;
          setHeld();
          c.started = true;
          cb.sfx('start');
        }
      } else if (!c.started) { // id photo: just stand there while it loads
        if (held) return cb.shake(key);
        c.started = true;
        cb.sfx('start');
      }
    } else if (key === 'trash') {
      if (!hands.length) return;
      hands.length = 0;
      setHeld();
      cb.binPop();
      cb.sfx('trash');
    }
  }
  worker.onArrive = arrive;

  function update(dt) {
    worker.update(dt);
    for (const side of sides) {
      if (side.line.length < 1 + (cfg.queue || 0)) {
        side.gapT -= dt;
        if (side.gapT <= 0) { spawn(side); side.gapT = cfg.gap; }
      }
      for (const c of [...side.line]) {
        c.t += dt;
        if (c.state === 'moving') {
          const u = Math.min(1, c.t / c.dur);
          c.group.position.x = c.x0 + (c.tx - c.x0) * u;
          c.group.position.z = c.z0 + (c.tz - c.z0) * u;
          const dz = c.tz - c.z0;
          c.group.rotation.y = Math.abs(dz) > .01 ? (dz < 0 ? Math.PI : 0) : -c.side.sd * Math.PI / 2;
          const sw = Math.sin(c.t * 12) * .7;
          c.legs[0].rotation.x = sw; c.legs[1].rotation.x = -sw;
          if (u >= 1) {
            c.legs[0].rotation.x = c.legs[1].rotation.x = 0;
            c.group.rotation.y = -c.side.sd * Math.PI / 2;
            c.tag.hidden = false;
            if (side.line[0] === c) {
              c.state = 'waiting';
              c.tag.classList.remove('queued');
              cb.onArrive([c.kind]);
            } else c.state = 'queued';
          }
        } else if (c.state === 'waiting') {
          c.pat -= dt;
          const frac = clamp(c.pat / cfg.patience, 0, 1);
          c.fill.style.transform = `scaleX(${frac})`;
          const band = frac > TUNING.patGreen ? 'g' : frac > TUNING.patRed ? 'y' : 'r';
          if (band !== c.band) { c.band = band; c.bar.className = 'pbar ' + band; c.tag.classList.toggle('urgent', band === 'r'); }
          const work = KIND[c.kind].work;
          // Bandage / ID bars only fill while the worker stands at this counter.
          if (work && c.started && worker.at === side.key && !worker.target) {
            c.progress += dt / work;
            if (c.progress >= 1) { complete(c); continue; }
          }
          if (work && c.started) {
            c.progBar.hidden = false;
            c.progFill.style.transform = `scaleX(${clamp(c.progress, 0, 1)})`;
          }
          if (c.pat <= 0) {
            stats.lost++;
            const pos = tagPos(c);
            leave(c, true);
            cb.onAngry({ pos });
          }
        }
      }
    }
    for (let i = leaving.length - 1; i >= 0; i--) {
      const c = leaving[i];
      c.t += dt;
      const sp = c.angry ? 5 : 3, sw = Math.sin(c.t * 14) * .7;
      c.group.position.x += c.side.sd * sp * dt;
      c.group.rotation.y = c.side.sd * Math.PI / 2;
      c.legs[0].rotation.x = sw; c.legs[1].rotation.x = -sw;
      if (Math.abs(c.group.position.x) > END_X) {
        world.removeCar(c.group);
        c.tag.remove();
        leaving.splice(i, 1);
      }
    }
    if (reg.state === 'working') {
      reg.p += dt / REG_TIME;
      if (reg.p >= 1) { reg.state = 'done'; cb.sfx('ready'); }
    }
    heldTag.hidden = !hands.length;
    if (hands.length) {
      if (heldSlot.textContent !== HELD_ICON[hands[0]]) heldSlot.textContent = HELD_ICON[hands[0]];
      const wp = world.project(worker.group.position.x, 2.3, worker.group.position.z);
      heldTag.style.transform = `translate(${wp.x.toFixed(1)}px, ${wp.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    bar.hidden = reg.state !== 'working';
    if (!bar.hidden) {
      regFill.style.transform = `scaleX(${clamp(reg.p, 0, 1)})`;
      const p = world.project(1.1, 2.3, -3.05);
      bar.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
    for (const c of [...sides.flatMap(s => s.line), ...leaving]) {
      if (c.tag.hidden || !c.tag.isConnected) continue;
      const p = tagPos(c);
      c.tag.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  return {
    orders: { update() {}, stats, matches: () => false, trySend: () => false },
    logic: {
      st: new Proxy({}, { get: () => ({ state: 'idle', p: 0 }) }),
      hands, trays: [], carried: null, tap, update, sendTray: () => false,
      get active() { return active; }
    }
  };
}
