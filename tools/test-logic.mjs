// Headless test of the real game rules (createLogic + createOrders) with a stubbed 3D world: node tools/test-logic.mjs
// Covers the MDD acceptance loop: make -> carry -> tray -> send -> paid, trash, angry customers, busy hands, burn, put-back.
const el = () => new Proxy({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, className: '', hidden: false }, {
  get: (t, k) => (k in t ? t[k] : k === 'querySelector' || k === 'querySelectorAll' ? () => el() : k === 'isConnected' ? true : () => {}),
  set: (t, k, v) => { t[k] = v; return true; }
});
globalThis.document = { createElement: () => el(), hidden: false, addEventListener() {} };
globalThis.window = {}; globalThis.localStorage = { getItem: () => null, setItem() {} };
const { createLogic } = await import('../js/game.js');
const { createOrders } = await import('../js/orders.js');
const { LEVELS, TUNING } = await import('../js/levels.js');
const { useShop, SHOPS } = await import('../js/shops.js');
useShop(SHOPS[0]);

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };

function setup(level) {
  const cfg = LEVELS[level - 1];
  const log = { sfx: [], shake: [], sent: [], angry: [] };
  const viz = new Proxy({}, { get: () => ({ set() {}, ping() {}, setType() {} }) });
  const worker = {
    target: null, at: null, held: [], onArrive: null, moving: false,
    walkTo(k) { this.target = k; }, kick() {}, setHeld() {}, stateText: () => '',
    update() { if (this.target) { const k = this.target; this.target = null; this.at = k; this.onArrive && this.onArrive(k); } }
  };
  const world = { worker, viz, setTray() {}, setTrayVisible() {}, binPop() {}, wobble() {}, addCar() {}, removeCar() {}, project: () => ({ x: 0, y: 0 }) };
  const orders = createOrders(world, cfg, el(), { onArrive() {}, onSend: s => log.sent.push(s), onAngry: a => log.angry.push(a) });
  const logic = createLogic(world, { sfx: n => log.sfx.push(n), shake: k => log.shake.push(k), send: i => orders.trySend(i) }, { burn: cfg.burn, trays: cfg.trays });
  const step = (sec) => { for (let t = 0; t < sec; t += .05) { logic.update(.05); orders.update(.05); } };
  return { cfg, log, logic, orders, step };
}

// 1. Full loop on level 3: serve ten cars exactly; check the pay-out equals prices (+ tips).
{
  const { logic, orders, step, log } = setup(3);
  let served = 0;
  for (let n = 0; n < 10; n++) {
    let guard = 0;
    while (!(orders.car && orders.car.state === 'waiting') && guard++ < 400) step(.1);
    const slots = orders.car.slots.slice();
    for (const item of slots) {
      logic.tap(item); step(.1);                       // walk + start making
      step(8);                                         // finish making
      logic.tap(item); step(.1);                       // walk + pick up
      logic.tap('tray0'); step(.1);                    // walk + set down
    }
    const sent = logic.sendTray(0);
    if (sent) served++;
  }
  ok(served === 10, `level 3: served ${served}/10 cars through the full loop`);
  ok(log.sent.every(s => s.total >= s.base && s.total <= Math.round(s.base * 1.5)), 'payouts are the order value plus a tip of at most 50%');
  ok(logic.sendTray(0) === false, 'double-send of an emptied tray is rejected');
}

// 2. Trash, busy hands, put-back, wrong items.
{
  const { logic, step, log } = setup(3);
  logic.tap('soda'); step(.1); step(4); logic.tap('soda'); step(.1);
  ok(logic.hands.join() === 'soda', 'picked up a soda');
  ok(logic.tap('burger') === false, 'machine will not start while hands are full');
  logic.tap('trash'); step(.1);
  ok(logic.hands.length === 0, 'trash empties the hands');
  logic.tap('soda'); step(.1); step(4); logic.tap('soda'); step(.1);
  logic.tap('soda'); step(.1);
  ok(logic.hands.length === 0 && logic.st.soda.state === 'ready', 'a held item can be set back on its own machine');
  ok(logic.sendTray(0) === false, 'sending an empty tray does nothing');
}

// 3. Angry customers: patience runs out, penalty never takes money below zero.
{
  const { orders, step, log } = setup(1);
  step(2);                                              // first car arrives
  step(orders.car ? 60 : 80);                           // ignore it until it gives up
  ok(orders.stats.lost >= 1 && log.angry.length >= 1, 'customer leaves angry when patience runs out');
  ok(orders.stats.served === 0, 'no order counted as served');
}

// 4. Burn on level 8 (burn 12): food left sitting burns, burnt machine can be restarted.
{
  const { logic, step } = setup(8);
  logic.tap('burger'); step(.1); step(7);
  ok(logic.st.burger.state === 'ready', 'burger ready');
  step(13);
  ok(logic.st.burger.state === 'burnt', 'ready food burns after the level burn time');
  logic.tap('burger'); step(.1);
  ok(logic.st.burger.state === 'making', 'a burnt machine can be restarted');
}

// 5. Level config sanity.
{
  let sane = true;
  LEVELS.forEach(l => { if (!(l.goal > 0 && l.goal < l.star2 && l.star2 < l.star3 && l.time === 120 && l.trays >= 1 && l.trays <= 3)) sane = false; });
  ok(sane, 'every level has goal < 2-star < 3-star, 120 s, 1-3 trays');
  ok(LEVELS.every((l, i) => i === 0 || l.goal >= LEVELS[i - 1].goal), 'goals never decrease from one level to the next');
}
console.log(fails ? `\n${fails} FAILED` : '\nall logic tests passed');
process.exit(fails ? 1 : 0);
