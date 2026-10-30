import { createWorld, reducedMotion } from './scene.js';
import { STATIONS, WORKER, TUNING, ENDLESS, endlessCfg, endlessMusicRate } from './levels.js';
import { createOrders } from './orders.js';
import * as audio from './audio.js';
import { activeShop, itemInfo, PIZZA_TOPS } from './shops.js';
import { createHospital } from './hospital.js';

const HOSPITAL_HINT = {
  medicine: 'Tap the 💊 MEDICINE cabinet, then tap the patient',
  bill: 'Tap the patient for their bill, then the PAY HERE register, then bring the paper back',
  bandage: 'Tap the BANDAGES cabinet, then the patient. Stay with them while it loads',
  id: 'Tap the patient and stay there while the photo loads'
};
const reduced = reducedMotion();
const buzz = p => { try { if (!reduced) navigator.vibrate && navigator.vibrate(p); } catch (e) {} }; // optional haptics, no-op where unsupported
const ITEMS = Object.keys(STATIONS);
const typeOf = k => STATIONS[k].type || k; // item a station makes (extra machines make burger/fries)

// Station/worker/tray rules. Keys come from tapping the 3D scene: soda, burger, fries, trash, tray0-2.
// hooks: { sfx(name), shake(key), send(items) -> bool }
// opts.burn: seconds a finished food item may wait before it burns (0 = never).
export function createLogic(world, hooks, opts = {}) {
  const worker = world.worker;
  const st = {};
  const pizza = !!activeShop().pizza; // dough -> table plate -> toppings -> oven
  const tables = [0, 1].map(() => ({ dough: false, tops: [] }));
  const sig = t => PIZZA_TOPS.filter(x => t.tops.includes(x)).join('+');
  const cups = !!activeShop().cups; // drinks need a cup from the cabinet before a machine starts
  ITEMS.forEach(k => (st[k] = { state: 'idle', p: 0, t: 0 }));
  const hands = [];
  const trays = Array.from({ length: opts.trays || 3 }, () => []);
  const away = trays.map(() => false);
  let carried = null; // a whole tray in the worker's hands: { from, items }
  const heldAge = {}; // burn timer of a held item, restored if it's set back on its machine
  const busy = () => hands.length > 0 || !!carried;
  const full = () => hands.length >= WORKER.maxHeld || !!carried;
  let active = null;

  const setHeld = () => worker.setHeld(hands);

  function tap(key) {
    hooks.sfx('tap');
    // An idle machine accepts the item you took from it back (set it down); otherwise busy hands can't use a machine.
    const putBack = ITEMS.includes(key) && st[key].state === 'idle' && hands.includes(typeOf(key));
    const canStart = pizza ? (hands[0] || '').startsWith('plate:') : cups ? hands.includes('cup') : !busy();
    if ((key === 'cabinet' || key === 'dough' || PIZZA_TOPS.includes(key)) && busy()) {
      hooks.shake(key);
      return false;
    }
    if (ITEMS.includes(key) && (st[key].state === 'ready' ? full() : st[key].state !== 'making' && !canStart && !putBack)) {
      hooks.shake(key);
      return false;
    }
    active = key;
    worker.walkTo(key);
    return true;
  }

  function arrive(key) {
    if (ITEMS.includes(key)) {
      const s = st[key];
      if (s.state === 'ready') {
        if (full()) return hooks.shake(key);
        hands.push(pizza ? s.item : typeOf(key));
        heldAge[typeOf(key)] = s.t;
        s.state = 'idle';
        s.p = 0;
        s.t = 0;
        setHeld();
        worker.kick();
        hooks.sfx('pickup');
      } else if (s.state === 'idle' || s.state === 'burnt') {
        if (s.state === 'idle' && hands.includes(typeOf(key))) {
          hands.splice(hands.indexOf(typeOf(key)), 1);
          s.state = 'ready';
          s.t = heldAge[typeOf(key)] || 0;
          setHeld();
          hooks.sfx('place');
          return;
        }
        if (pizza) {
          if (!(hands[0] || '').startsWith('plate:')) return hooks.shake(key);
          s.item = 'pizza:' + hands[0].slice(6);
          hands.length = 0;
          setHeld();
          world.viz[key].setType(s.item);
        } else if (cups) {
          if (!hands.includes('cup')) return hooks.shake(key);
          hands.splice(hands.indexOf('cup'), 1);
          setHeld();
        } else if (busy()) return hooks.shake(key);
        if (s.state === 'burnt') hooks.sfx('trash');
        s.state = 'making';
        s.p = 0;
        hooks.sfx('start');
      }
    } else if (key === 'dough' || PIZZA_TOPS.includes(key)) {
      if (busy()) return hooks.shake(key);
      hands.push(key);
      setHeld();
      worker.kick();
      hooks.sfx('pickup');
    } else if (key.startsWith('table')) {
      const t = tables[+key.slice(5)], h = hands[0];
      if (!carried && h === 'dough' && !t.dough) {
        t.dough = true;
        hands.length = 0;
        hooks.sfx('place');
      } else if (!carried && PIZZA_TOPS.includes(h) && t.dough && !t.tops.includes(h)) {
        t.tops.push(h);
        hands.length = 0;
        hooks.sfx('place');
      } else if (!carried && !h && t.dough) {
        hands.push('plate:' + sig(t));
        t.dough = false;
        t.tops = [];
        worker.kick();
        hooks.sfx('pickup');
      } else return hooks.shake(key);
      setHeld();
      world.setTable(key, t);
    } else if (key === 'cabinet') {
      if (busy()) return hooks.shake(key);
      hands.push('cup');
      setHeld();
      worker.kick();
      hooks.sfx('pickup');
    } else if (key.startsWith('tray')) {
      const i = +key.slice(4), tray = trays[i];
      if (carried) {
        if (carried.from !== i) return;
        trays[i] = carried.items;
        away[i] = false;
        carried = null;
        world.setTrayVisible(i, true);
        world.setTray(i, trays[i]);
        worker.setHeld([]);
        hooks.sfx('place');
      } else if (hands.length) {
        if (hands[0] === 'cup' || (pizza && !hands[0].startsWith('pizza:')) || tray.length >= WORKER.trayCap || away[i]) return;
        tray.push(hands.shift());
        setHeld();
        world.setTray(i, tray);
        hooks.sfx('place');
      } else if (tray.length) {
        carried = { from: i, items: tray.splice(0) };
        away[i] = true;
        world.setTray(i, tray);
        world.setTrayVisible(i, false);
        worker.setHeld(carried.items, true);
        worker.kick();
        hooks.sfx('pickup');
      }
    } else if (key === 'trash') {
      if (carried) {
        if (!carried.items.length) return;
        carried.items.length = 0;
        worker.setHeld([], true);
      } else if (hands.length) {
        hands.length = 0;
        setHeld();
      } else return;
      world.binPop();
      hooks.sfx('trash');
    }
  }
  worker.onArrive = arrive;

  function update(dt) {
    worker.update(dt);
    for (const k of ITEMS) {
      const s = st[k];
      if (!world.viz[k]) continue;
      if (s.state === 'making') {
        s.p = Math.min(1, s.p + dt / STATIONS[k].time);
        if (s.p >= 1) {
          s.state = 'ready';
          s.t = 0;
          hooks.sfx('ready');
          world.viz[k].ping();
        }
      } else if (s.state === 'ready' && opts.burn && STATIONS[k].burns && (s.t += dt) >= opts.burn) {
        s.state = 'burnt';
        hooks.sfx('burn');
      }
      world.viz[k].set(s.state, s.p, s.state === 'ready' && opts.burn && STATIONS[k].burns ? s.t / opts.burn : 0);
    }
  }

  // Bottom buttons: send tray i to the customer if it matches the order exactly.
  function sendTray(i) {
    hooks.sfx('tap');
    if (away[i] || !hooks.send(trays[i])) return false;
    trays[i].length = 0;
    world.setTray(i, trays[i]);
    return true;
  }

  return { st, hands, trays, tap, sendTray, update, get carried() { return carried; }, get active() { return active; } };
}

const mmss = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;

// Builds the gameplay screen into root. Returns a teardown function.
// cb: { exit(), restart(), finish({ level, pass, money, served, lost }) }
// opts.endless: endless mode (level is 0; cfg comes from endlessCfg and changes every wave). Finish gets { endless, money, served, wave }.
export function startGame(root, level, levels, cb, opts = {}) {
  const endless = !!opts.endless;
  const over = activeShop().endless || {};
  const cfg = endless ? endlessCfg(1, over) : levels[level - 1];
  const foods = activeShop().foods;
  const ICON = Object.fromEntries(Object.entries(foods).map(([k, f]) => [k, f.icon]));
  const MACHINE = Object.fromEntries(Object.entries(foods).map(([k, f]) => [k, f.machine]));

  const el = document.createElement('div');
  el.className = 'screen game';
  el.innerHTML = `
    <canvas></canvas>
    <div class="overlay"></div>
    <div class="hud">
      ${endless
        ? `<div class="hud-money"><div class="row">💰 <b class="money">$0</b></div></div>
      <div class="hud-time hud-lives" aria-label="Lives">${'<span class="heart">❤️</span>'.repeat(ENDLESS.lives)}</div>`
        : `<div class="hud-money"><div class="row">💰 <b class="money">$0</b><span class="goal">/ $${cfg.goal}</span></div><div class="goalbar"><i></i></div></div>
      <div class="hud-time">⏱️ <b class="time">${mmss(cfg.time)}</b></div>`}
    </div>
    <button class="round-btn pause-btn" aria-label="Pause">⏸</button>
    <div class="level-label">${endless ? 'Wave 1' : 'Level ' + level}</div>
    <div class="debug" hidden>
      <pre></pre>
      <div class="dbtns">${endless
        ? '<button class="btn small green" data-d="wave1">Wave +1</button><button class="btn small green" data-d="wave5">Wave +5</button><button class="btn small" data-d="life">-Life</button><button class="btn small" data-d="cash">+$50</button><button class="btn small yellow" data-d="speed">x1</button>'
        : '<button class="btn small green" data-d="pass">Pass</button><button class="btn small" data-d="fail">Fail</button><button class="btn small yellow" data-d="speed">x1</button>'}</div>
    </div>
    <div class="hint" hidden></div>
    <div class="bar">${Array.from({ length: cfg.trays }, (_, i) => `<button class="act" data-k="${i}"><b>${i + 1}</b><span class="mini"></span></button>`).join('')}</div>`;
  root.appendChild(el);

  const world = createWorld(el.querySelector('canvas'));
  world.setTrayCount(cfg.trays);
  world.setExtra(!!cfg.extra);
  if (endless) world.setFries(false);
  if (cfg.workerSpeed) world.worker.speed = cfg.workerSpeed;
  if (activeShop().pizza) world.setFixtures(['dough', ...cfg.toppings]);
  const overlay = el.querySelector('.overlay');
  const btns = [...el.querySelectorAll('.act')];
  const minis = btns.map(b => b.querySelector('.mini'));

  const shake = b => {
    b.classList.remove('shake');
    void b.offsetWidth;
    b.classList.add('shake');
  };

  let paused = false, running = true, ended = false, raf = 0, last = 0, clock = 0;
  let frames = 0, fpsT = 0, fps = 0, debug = false, speed = 1;
  let goalHit = false;
  let lives = ENDLESS.lives, wave = 1, waveOffset = 0, dying = 0, over_ = false; // endless state (dying: s left before the game over screen)
  let money = 0, timeLeft = cfg.time, lastSec = Math.ceil(timeLeft), shownMoney = -1, shownSec = -1;

  // HUD
  const moneyEl = el.querySelector('.money'), timeEl = el.querySelector('.time');
  const timeBox = el.querySelector('.hud-time'), moneyBox = el.querySelector('.hud-money');
  const goalFill = el.querySelector('.goalbar i'), goalBar = el.querySelector('.goalbar');
  const hearts = [...el.querySelectorAll('.heart')], levelLabel = el.querySelector('.level-label');
  function drawHud() {
    if (money !== shownMoney) {
      if (shownMoney >= 0) { moneyBox.classList.remove('bump'); void moneyBox.offsetWidth; moneyBox.classList.add('bump'); }
      shownMoney = money;
      moneyEl.textContent = `$${money}`;
      if (!endless) goalFill.style.width = `${Math.min(100, money / cfg.goal * 100)}%`;
      if (!endless) goalBar.classList.toggle('met', money >= cfg.goal);
      if (!endless && money >= cfg.goal && !goalHit) {
        goalHit = true;
        moneyBox.classList.add('goal-pulse');
        const b = document.createElement('div');
        b.className = 'goal-banner';
        b.textContent = '⭐ Goal reached!';
        el.appendChild(b);
        setTimeout(() => b.remove(), 2200); // play continues until the timer ends
        audio.playSfx('ready');
      }
    }
    if (endless) return;
    const sec = Math.ceil(timeLeft);
    if (sec !== shownSec) {
      shownSec = sec;
      timeEl.textContent = mmss(sec);
      timeBox.classList.toggle('low', sec <= 10);
    }
  }

  // Floating text and coins at a screen position (px, canvas space).
  function floatText(text, pos, cls) {
    const f = document.createElement('div');
    f.className = 'float ' + cls;
    f.textContent = text;
    f.style.left = pos.x + 'px';
    f.style.top = pos.y + 'px';
    f.addEventListener('animationend', () => f.remove());
    if (reduced) setTimeout(() => f.remove(), 900);
    overlay.appendChild(f);
  }
  // Coins pop up from the order and fly to the money counter.
  function coins(pos) {
    if (reduced) return;
    const o = overlay.getBoundingClientRect(), m = moneyBox.getBoundingClientRect();
    const tx = m.left + m.width * .2 - o.left - pos.x, ty = m.top + m.height / 2 - o.top - pos.y;
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('div');
      c.className = 'coin';
      c.textContent = '$';
      c.style.left = pos.x + 'px';
      c.style.top = pos.y + 'px';
      c.style.setProperty('--ox', (Math.random() * 90 - 45) + 'px');
      c.style.setProperty('--oy', (-20 - Math.random() * 50) + 'px');
      c.style.setProperty('--dx', (tx + Math.random() * 16 - 8) + 'px');
      c.style.setProperty('--dy', ty + 'px');
      c.style.animationDelay = (i * 45) + 'ms';
      c.addEventListener('animationend', () => c.remove());
      overlay.appendChild(c);
    }
  }

  // Centered banner (goal reached, wave up) that removes itself.
  function banner(text, cls = '') {
    const b = document.createElement('div');
    b.className = 'goal-banner ' + cls;
    b.textContent = text;
    el.appendChild(b);
    setTimeout(() => b.remove(), 2200);
  }

  // Endless: apply a wave's settings to the live cfg (orders and the logic read it as they go).
  const lopts = { burn: cfg.burn, trays: cfg.trays };
  function setWave(w, announce) {
    const hadFries = cfg.items.includes('fries'), hadExtra = !!cfg.extra, hadBurn = cfg.burn > 0;
    wave = w;
    Object.assign(cfg, endlessCfg(w, over));
    lopts.burn = cfg.burn;
    levelLabel.textContent = `Wave ${w}`;
    world.setExtra(!!cfg.extra);
    world.setFries(cfg.items.includes('fries'), announce && !hadFries);
    audio.setMusicRate(endlessMusicRate(w));
    if (!announce) return;
    const news = [!hadFries && cfg.items.includes('fries') && '🍟 Fries!', !hadExtra && cfg.extra && '🍳 2nd grill & fryer!', !hadBurn && cfg.burn && '🔥 Food burns!'].filter(Boolean).join(' ');
    banner(`⬆️ Wave up!${news ? '\n' + news : ''}`, 'wave');
    audio.playSfx('waveUp');
  }
  function loseLife() {
    if (lives <= 0) return;
    const h = hearts[--lives];
    h.textContent = '🖤';
    h.classList.add('broke');
    const box = h.parentNode;
    box.classList.remove('hit');
    void box.offsetWidth;
    box.classList.add('hit');
    audio.playSfx('heartBreak');
    buzz([40, 30, 60]);
    if (lives <= 0) {
      dying = 1.4; // let the last heart break and the car drive off before the screen changes
      orders.halt();
    }
  }

  // Level 1 tutorial hints: each shown once per attempt, dismissible.
  const hintEl = el.querySelector('.hint');
  const shownHints = new Set();
  let hintNow = null;
  function showHint(id, html) {
    if (level !== 1 || shownHints.has(id)) return;
    shownHints.add(id);
    hintNow = id;
    hintEl.innerHTML = html;
    hintEl.hidden = false;
  }
  function endHint(id) {
    if (hintNow !== id) return;
    hintNow = null;
    hintEl.hidden = true;
  }
  hintEl.addEventListener('pointerdown', () => { hintNow = null; hintEl.hidden = true; });

  const ordersCb = {
    onArrive: slots => showHint('make', activeShop().pizza ? 'Dough 🍞 → table plate, add each topping, then the oven' : `${activeShop().cups ? 'Grab a cup 🥛 from the cabinet, then tap' : 'Tap'} the ${MACHINE[slots[0]]} ${ICON[slots[0]]} to make it`),
    onSend: ({ total, pos }) => {
      money += total;
      endHint('send');
      floatText(`+$${total}`, pos, 'pos');
      coins(pos);
      audio.playSfx('deliver');
      audio.playSfx('cash');
      world.worker.bounce();
      buzz([15, 40, 15]);
    },
    onAngry: ({ pos }) => {
      if (endless) loseLife(); // the only penalty in endless
      const lost = endless ? 0 : Math.min(money, TUNING.penalty);
      money -= lost;
      if (lost) floatText(`-$${lost}`, pos, 'neg');
      hintEl.hidden = true;
      hintNow = null;
      audio.playSfx('angry');
      buzz(70);
    }
  };

  let orders, logic;
  if (activeShop().hospital) {
    const h = createHospital(world, cfg, overlay, {
      ...ordersCb,
      onArrive: kinds => showHint('make', HOSPITAL_HINT[kinds[0]]),
      sfx: n => audio.playSfx(n),
      shake: k => world.wobble(k),
      binPop: () => world.binPop()
    });
    orders = h.orders;
    logic = h.logic;
  } else {
    orders = createOrders(world, cfg, overlay, ordersCb);
    logic = createLogic(world, {
      sfx: n => {
        audio.playSfx(n);
        if (n === 'pickup') buzz(12);
        else if (n === 'place') world.worker.hop();
      },
      shake: k => world.wobble(k),
      send: items => orders.trySend(items)
    }, lopts);
  }

  // Small icon bubble above the worker showing what they carry (hands, or the items on a carried tray).
  const HELD_EMOJI = { cup: '🥛', dough: '🍞', sauce: '🥫', cheese: '🧀', pepperoni: '🍕', mushroom: '🍄' };
  const heldTag = document.createElement('div');
  heldTag.className = 'held-tag';
  heldTag.hidden = true;
  overlay.appendChild(heldTag);
  let heldKey = '';
  function drawHeld() {
    if (activeShop().hospital) return;
    const items = logic.carried ? logic.carried.items : logic.hands;
    const key = items.join();
    if (key !== heldKey) {
      heldKey = key;
      heldTag.hidden = !items.length;
      heldTag.innerHTML = items.map(x => HELD_EMOJI[x] ? `<span class="slot">${HELD_EMOJI[x]}</span>` : x.startsWith('plate:') ? '<span class="slot">🍕</span>'
        : activeShop().itemIcons ? `<img class="slot" src="${world.itemIcon(x)}" alt="">` : `<span class="slot">${ICON[x] || itemInfo(x).icon}</span>`).join('');
    }
    if (heldTag.hidden) return;
    const p = world.project(world.worker.group.position.x, 2.15, world.worker.group.position.z);
    heldTag.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  // Tap machines, trays and the bin in the 3D scene.
  el.querySelector('canvas').addEventListener('pointerdown', e => {
    e.preventDefault();
    if (paused || ended || dying) return;
    const k = world.pick(e.clientX, e.clientY);
    if (!k || (ITEMS.includes(k) && !(STATIONS[k].type ? cfg.extra : cfg.items.includes(k)))) return;
    logic.tap(k);
    if (ITEMS.includes(k)) endHint('make');
  });

  // Bottom buttons 1-3 send that tray.
  btns.forEach((b, i) => b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (paused || ended || dying) return;
    if (!logic.sendTray(i)) shake(b);
  }));

  // Triple tap on the level label toggles the debug overlay.
  const dbg = el.querySelector('.debug pre');
  const dbgBox = el.querySelector('.debug');
  let taps = [];
  el.querySelector('.level-label').addEventListener('pointerdown', () => {
    const now = performance.now();
    taps = taps.filter(t => now - t < 700).concat(now);
    if (taps.length >= 3) {
      taps = [];
      debug = !debug;
      dbgBox.hidden = !debug;
    }
  });
  // Debug Pass/Fail end the shift right now through the normal results flow.
  dbgBox.addEventListener('click', e => {
    const d = e.target.dataset && e.target.dataset.d;
    if (d === 'wave1' || d === 'wave5') {
      waveOffset += d === 'wave1' ? ENDLESS.perWave : ENDLESS.perWave * 5;
      checkWave();
    }
    else if (d === 'life') { if (!dying) loseLife(); }
    else if (d === 'cash') money += 50;
    else if (d === 'pass') { money = Math.max(money, cfg.goal); timeLeft = 0; }
    else if (d === 'fail') { money = 0; timeLeft = 0; }
    else if (d === 'speed') { speed = speed === 1 ? 4 : speed === 4 ? 10 : 1; e.target.textContent = 'x' + speed; }
  });

  function finish() {
    ended = true;
    if (endless) {
      audio.playSfx('levelFail');
      return cb.finish({ endless: true, money, served: orders.stats.served, lost: orders.stats.lost, wave });
    }
    const pass = money >= cfg.goal;
    audio.playSfx(pass ? 'levelPass' : 'levelFail');
    cb.finish({ level, pass, money, served: orders.stats.served, lost: orders.stats.lost });
  }

  // Endless: wave = 1 + customers served / perWave (debug jumps add to waveOffset).
  function checkWave() {
    const w = 1 + Math.floor((orders.stats.served + waveOffset) / ENDLESS.perWave);
    if (w !== wave) setWave(w, true);
  }

  function tick(step) {
    if (endless) {
      if (dying && (dying -= step) <= 0) { dying = 0; over_ = true; }
    } else timeLeft -= step;
    const sec = Math.ceil(timeLeft);
    if (sec !== lastSec) {
      lastSec = sec;
      if (!endless && sec <= 10 && sec > 0) audio.playSfx('tick');
    }
    logic.update(step);
    orders.update(step);
    if (world.worker.moving) audio.playSfx('walk');
    for (const k of ITEMS) audio.setLoop('st' + k, logic.st[k].state === 'making' ? (k.startsWith('soda') || activeShop().id === 'coffee' ? 'fill' : 'sizzle') : null);
    world.update(step, clock);
    if (logic.hands.length) { endHint('make'); if (!activeShop().hospital) showHint('tray', 'Tap a numbered tray to set it down'); }
    const m = logic.trays.findIndex(t => orders.matches(t));
    if (m >= 0) { endHint('tray'); showHint('send', `Order ready! Press ${m + 1} below`); }
    if (endless) {
      if (!dying) checkWave();
      if (over_) finish();
    } else if (timeLeft <= 0) { timeLeft = 0; finish(); }
  }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    const step = paused ? 0 : dt;
    for (let i = 0, n = paused ? 1 : speed; i < n && !ended; i++) {
      clock += step;
      tick(step);
    }
    if (ended || !running) return;
    drawHud();
    world.render();
    drawHeld();

    logic.trays.forEach((t, i) => {
      const key = t.join();
      if (minis[i].dataset.k !== key) {
        minis[i].dataset.k = key;
        minis[i].innerHTML = t.map(x => activeShop().itemIcons ? `<img src="${world.itemIcon(x)}" alt="">` : (ICON[x] || itemInfo(x).icon)).join('');
      }
      btns[i].classList.toggle('match', orders.matches(t));
    });
    frames++;
    fpsT += dt;
    if (fpsT >= .5) {
      fps = Math.round(frames / fpsT);
      frames = 0;
      fpsT = 0;
      if (debug) {
        const r = world.renderer.info.render, o = orders.stats;
        dbg.textContent = `${fps} fps  tris ${r.triangles}  calls ${r.calls}\n${world.worker.stateText()}\nhands: ${logic.hands.join(',') || (logic.carried ? 'tray ' + (logic.carried.from + 1) : '-')}\ntrays: ${logic.trays.map(t => t.join('+') || '-').join(' | ')}\n` +
          ITEMS.map(k => `${k}: ${logic.st[k].state} ${Math.round(logic.st[k].p * 100)}%`).join('\n') +
          (endless
            ? `\n$${money}  lives ${lives}  wave ${wave}  served ${o.served}  (next wave in ${ENDLESS.perWave - ((o.served + waveOffset) % ENDLESS.perWave)})\nmax ${cfg.maxItems} items  doubles ${cfg.doubles}  extra ${!!cfg.extra}  fries ${cfg.items.includes('fries')}\npatience ${cfg.patience}s  gap ${cfg.gapRange[0].toFixed(1)}-${cfg.gapRange[1].toFixed(1)}s  burn ${cfg.burn}s  music x${endlessMusicRate(wave)}`
            : `\n$${money}/${cfg.goal}  time ${Math.ceil(timeLeft)}s`) +
          `\ncars served ${o.served}  lost ${o.lost}\navg patience at send ${o.served ? Math.round(o.patSum / o.served * 100) + '%' : '-'}`;
      }
    }
  }

  const start = () => { last = performance.now(); raf = requestAnimationFrame(frame); };
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      if (endless) pauseMenu(); // coming back shows the pause menu instead of costing lives
    }
    else if (running) start();
  };
  const onResize = () => { if (running) world.resize(); }; // the delayed rotate handler can fire after teardown
  const onOrient = () => setTimeout(onResize, 250);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrient);

  function pauseMenu() {
    if (paused || ended) return;
    paused = true;
    audio.setGamePaused(true);
    el.classList.add('paused');
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `
      <div class="card">
        <h3>Paused</h3>
        <div class="stack">
          <button class="btn yellow wide" id="resume">Resume</button>
          <button class="btn wide" id="restart">Restart</button>
          <button class="btn wide" id="quit">Level Select</button>
        </div>
      </div>`;
    el.appendChild(m);
    const q = s => m.querySelector(s);
    q('#resume').addEventListener('click', () => { m.remove(); paused = false; audio.setGamePaused(false); el.classList.remove('paused'); });
    q('#restart').addEventListener('click', () => cb.restart());
    q('#quit').addEventListener('click', () => cb.exit());
  }
  el.querySelector('.pause-btn').addEventListener('click', () => { audio.playSfx('tap'); pauseMenu(); });

  world.resize();
  drawHud();
  start();

  return () => {
    running = false;
    audio.setGamePaused(false);
    audio.stopLoops();
    if (endless) audio.setMusicRate(1);
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrient);
    world.dispose();
  };
}
