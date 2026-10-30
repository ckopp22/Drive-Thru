import { createWorld } from './scene.js';
import { LEVELS, STATIONS, WORKER } from './levels.js';
import * as audio from './audio.js';

const ICON = { soda: '🥤', burger: '🍔', fries: '🍟', car: '🚗', trash: '🗑️' };
const ITEMS = Object.keys(STATIONS);
const LEDGE_TIME = 1.2;

// Station/worker rules (MDD 4, 5.2, 5.3). hooks: { sfx(name), shake(key) }
export function createLogic(world, hooks) {
  const worker = world.worker;
  const st = {};
  ITEMS.forEach(k => (st[k] = { state: 'idle', p: 0 }));
  const hands = [];
  let active = null;
  let ledgeT = 0;

  const setHeld = () => worker.setHeld(hands);

  function tap(key) {
    hooks.sfx('tap');
    if (ITEMS.includes(key) && st[key].state === 'ready' && hands.length >= WORKER.maxHeld) {
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
        if (hands.length >= WORKER.maxHeld) return hooks.shake(key);
        hands.push(key);
        s.state = 'idle';
        s.p = 0;
        setHeld();
        worker.kick();
        hooks.sfx('pickup');
      } else if (s.state === 'idle') {
        s.state = 'making';
        s.p = 0;
        hooks.sfx('start');
      }
    } else if (key === 'car') {
      if (!hands.length) return;
      world.showLedge(hands);
      ledgeT = LEDGE_TIME;
      hands.length = 0;
      setHeld();
      hooks.sfx('handover');
    } else if (key === 'trash') {
      if (!hands.length) return;
      hands.length = 0;
      setHeld();
      world.binPop();
      hooks.sfx('trash');
    }
  }
  worker.onArrive = arrive;

  function update(dt) {
    worker.update(dt);
    for (const k of ITEMS) {
      const s = st[k];
      if (s.state === 'making') {
        s.p = Math.min(1, s.p + dt / STATIONS[k].time);
        if (s.p >= 1) {
          s.state = 'ready';
          hooks.sfx('ready');
        }
      }
      world.viz[k].set(s.state, s.p);
    }
    if (ledgeT > 0 && (ledgeT -= dt) <= 0) world.clearLedge();
  }

  return { st, hands, tap, update, get active() { return active; } };
}

// Builds the gameplay screen into root. Returns a teardown function.
// cb: { exit(), restart(), debugResult(pass) }
export function startGame(root, level, cb) {
  const cfg = LEVELS[level - 1];
  const order = ['soda', 'burger', 'fries', 'car', 'trash'].filter(k => k === 'car' || k === 'trash' || cfg.items.includes(k));

  const el = document.createElement('div');
  el.className = 'screen game';
  el.innerHTML = `
    <canvas></canvas>
    <button class="round-btn pause-btn" aria-label="Pause">⏸</button>
    <div class="level-label">Level ${level}</div>
    <pre class="debug" hidden></pre>
    <div class="bar">${order.map(k => `<button class="act" data-k="${k}">${ICON[k]}</button>`).join('')}</div>`;
  root.appendChild(el);

  const world = createWorld(el.querySelector('canvas'));
  const btns = {};
  el.querySelectorAll('.act').forEach(b => (btns[b.dataset.k] = b));

  const shake = k => {
    const b = btns[k];
    b.classList.remove('shake');
    void b.offsetWidth;
    b.classList.add('shake');
  };
  const logic = createLogic(world, { sfx: n => audio.playSfx(n), shake });

  let paused = false, running = true, raf = 0, last = 0, clock = 0;
  let frames = 0, fpsT = 0, fps = 0, debug = false;

  order.forEach(k => btns[k].addEventListener('pointerdown', e => {
    e.preventDefault();
    if (paused) return;
    logic.tap(k);
  }));

  // Triple tap on the level label toggles the debug overlay.
  const dbg = el.querySelector('.debug');
  let taps = [];
  el.querySelector('.level-label').addEventListener('pointerdown', () => {
    const now = performance.now();
    taps = taps.filter(t => now - t < 700).concat(now);
    if (taps.length >= 3) {
      taps = [];
      debug = !debug;
      dbg.hidden = !debug;
    }
  });

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    const step = paused ? 0 : dt;
    clock += step;
    logic.update(step);
    world.update(step, clock);
    world.render();

    for (const k in btns) btns[k].classList.toggle('on', logic.active === k);
    frames++;
    fpsT += dt;
    if (fpsT >= .5) {
      fps = Math.round(frames / fpsT);
      frames = 0;
      fpsT = 0;
      if (debug) {
        const r = world.renderer.info.render;
        dbg.textContent = `${fps} fps  tris ${r.triangles}  calls ${r.calls}\n${world.worker.stateText()}\nhands: ${logic.hands.join(',') || '-'}\n` +
          ITEMS.map(k => `${k}: ${logic.st[k].state} ${Math.round(logic.st[k].p * 100)}%`).join('\n');
      }
    }
  }

  const start = () => { last = performance.now(); raf = requestAnimationFrame(frame); };
  const onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else if (running) start();
  };
  const onResize = () => world.resize();
  const onOrient = () => setTimeout(onResize, 250);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onOrient);

  function pauseMenu() {
    paused = true;
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `
      <div class="card">
        <h3>Paused</h3>
        <div class="stack">
          <button class="btn yellow wide" id="resume">Resume</button>
          <button class="btn wide" id="restart">Restart</button>
          <button class="btn wide" id="quit">Level Select</button>
          <div class="test-row"><button class="btn small green" id="tp">Test: Pass</button><button class="btn small" id="tf">Test: Fail</button></div>
        </div>
      </div>`;
    el.appendChild(m);
    const q = s => m.querySelector(s);
    q('#resume').addEventListener('click', () => { m.remove(); paused = false; });
    q('#restart').addEventListener('click', () => cb.restart());
    q('#quit').addEventListener('click', () => cb.exit());
    q('#tp').addEventListener('click', () => cb.debugResult(true));
    q('#tf').addEventListener('click', () => cb.debugResult(false));
  }
  el.querySelector('.pause-btn').addEventListener('click', () => { audio.playSfx('tap'); pauseMenu(); });

  world.resize();
  start();

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onOrient);
    world.dispose();
  };
}
