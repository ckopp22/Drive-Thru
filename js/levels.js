// Level config table (MDD section 6). time/patience/gap/burn in seconds.
// items: which item buttons exist; maxItems: max items per order; doubles: orders may repeat an item (2 burgers);
// extra: adds a second grill and fryer; queue: extra cars lined up behind the window car (their orders are visible); trays: how many serving trays (and bottom buttons) the level has; burn: seconds a finished food item may sit at its station before it burns (0 = never); notes: design hints.
const SB = ['soda', 'burger'];
const ALL = ['soda', 'burger', 'fries'];

export const LEVELS = [
  { time: 120, goal: 20, star2: 35, star3: 41, trays: 1,  items: SB,  patience: 35, gap: 5,   maxItems: 1, doubles: false, burn: 0, notes: 'Tutorial hints on screen' },
  { time: 120, goal: 24, star2: 45, star3: 60, trays: 2,  items: SB,  patience: 32, gap: 4,   maxItems: 2, doubles: false, burn: 0, notes: 'Orders of 1 or 2 items' },
  { time: 120, goal: 25, star2: 44, star3: 54, trays: 3,  items: ALL, patience: 40, gap: 4, maxItems: 2, doubles: false, burn: 0, notes: 'Fryer and fries button introduced' },
  { time: 120, goal: 27, star2: 50, star3: 68, trays: 3,  items: ALL, patience: 38, gap: 3.5, maxItems: 3, doubles: false, burn: 0, notes: 'Orders up to 3 items' },
  { time: 120, goal: 27, star2: 43, star3: 58, trays: 3, items: ALL, patience: 38, gap: 3, maxItems: 3, doubles: true,  burn: 0, notes: 'Double-quantity orders (2 burgers)' },
  { time: 120, goal: 30, star2: 62, star3: 90, trays: 3, items: ALL, patience: 38, gap: 3,   maxItems: 3, doubles: true,  queue: 1, burn: 0, notes: 'Cars queue up; see orders ahead' },
  { time: 120, goal: 30, star2: 60, star3: 95, trays: 3, items: ALL, patience: 40, gap: 2.5, maxItems: 4, doubles: true,  queue: 1, burn: 0, notes: 'Larger orders' },
  { time: 120, goal: 30, star2: 78, star3: 145, trays: 3, items: ALL, patience: 40, gap: 2.5, maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, notes: 'Food burns if left too long' },
  { time: 120, goal: 30, star2: 78, star3: 148, trays: 3, items: ALL, patience: 40, gap: 2,   maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, notes: 'Rush hour' },
  { time: 135, goal: 30, star2: 78, star3: 150, trays: 3, items: ALL, patience: 40, gap: 2,   maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, notes: 'Final shift' },
  // Levels 11-13 add sticky puddles (see game.js puddleStep): up to `max` on the floor, a new one every `every` s; a mop by the bin clears them.
  { time: 135, goal: 30, star2: 78, star3: 150, trays: 3, items: ALL, patience: 38, gap: 1.9, maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, puddles: { max: 3, every: 8 }, notes: 'Sticky puddles' },
  { time: 135, goal: 32, star2: 80, star3: 152, trays: 3, items: ALL, patience: 36, gap: 1.8, maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, puddles: { max: 5, every: 6 }, notes: 'More puddles' },
  { time: 135, goal: 34, star2: 82, star3: 154, trays: 3, items: ALL, patience: 34, gap: 1.7, maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, puddles: { max: 7, every: 4.5 }, notes: 'Puddle flood' },
  // Levels 14-15 add the endless-style "helper" (cfg.helper = how many) that wanders between machines and gets in the way.
  { time: 135, goal: 34, star2: 82, star3: 154, trays: 3, items: ALL, patience: 34, gap: 1.7, maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, puddles: { max: 5, every: 6 }, helper: 1, notes: 'A helper gets in the way' },
  { time: 135, goal: 36, star2: 84, star3: 156, trays: 3, items: ALL, patience: 32, gap: 1.6, maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, puddles: { max: 7, every: 4.5 }, helper: 2, notes: 'Two helpers' }
];

// Burger Joint only (levels 16-20): the milkshake levels. 16-19 keep one helper and no puddles; 20 is the 3 minute finale with both back.
const SH = [...ALL, 'shake'];
export const SHAKE_LEVELS = [
  { time: 135, goal: 30, star2: 70, star3: 130, trays: 3, items: SH, patience: 40, gap: 2.2, maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 1, notes: 'Shakes: milk from the fridge, then stand at the mixer', intro: '🥛 New: Shake! Grab milk from the fridge, then stand at the mixer' },
  { time: 135, goal: 32, star2: 72, star3: 134, trays: 3, items: SH, patience: 38, gap: 2.1, maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 1, notes: 'Shake rush' },
  { time: 135, goal: 34, star2: 74, star3: 138, trays: 3, items: SH, patience: 36, gap: 2,   maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 1, notes: 'Busier shakes' },
  { time: 135, goal: 36, star2: 76, star3: 142, trays: 3, items: SH, patience: 34, gap: 1.9, maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 1, notes: 'Shake crunch' },
  { time: 180, goal: 50, star2: 105, star3: 210, trays: 3, items: SH, patience: 32, gap: 1.8, maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 2, puddles: { max: 7, every: 4.5 }, notes: 'Grand finale: puddles and two helpers' }
];

// Coffee Shop only (levels 16-20): the donut levels. Same shape as the shake levels, with a little more patience for the extra walking.
const CD = [...ALL, 'donut'];
export const DONUT_LEVELS = [
  { time: 135, goal: 30, star2: 70, star3: 130, trays: 3, items: CD, patience: 44, gap: 2.2, maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 1, notes: 'Donuts: grab one from the table, then stand at the microwave', intro: '🍩 New: Donut! Grab one from the table, then stand at the microwave' },
  { time: 135, goal: 32, star2: 72, star3: 134, trays: 3, items: CD, patience: 42, gap: 2.1, maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 1, notes: 'Donut rush' },
  { time: 135, goal: 34, star2: 74, star3: 138, trays: 3, items: CD, patience: 40, gap: 2,   maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 1, notes: 'Busier donuts' },
  { time: 135, goal: 36, star2: 76, star3: 142, trays: 3, items: CD, patience: 38, gap: 1.9, maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 1, notes: 'Donut crunch' },
  { time: 180, goal: 50, star2: 105, star3: 210, trays: 3, items: CD, patience: 36, gap: 1.8, maxItems: 4, doubles: true, queue: 2, extra: true, burn: 12, helper: 2, puddles: { max: 7, every: 4.5 }, notes: 'Grand finale: puddles and two helpers' }
];

// Pizza Place only (levels 16-20): 16 adds slices (cutting table), 17 pickles. `toppings` are filled in by shops.js. 18 and 19 only cut patience; 20 is the 3 minute finale.
const PZ = { trays: 3, items: ['burger', 'slice'], gap: 2, maxItems: 3, doubles: false, queue: 2, extra: true, burn: 0 };
export const PIZZA_LEVELS = [
  { ...PZ, time: 135, goal: 30, star2: 70, star3: 130, patience: 60, helper: 1, maxToppings: 4, extraTops: [], notes: 'Slices', intro: '🔪 New: Slices! Take a baked cheese pizza to the cutting table and stand there to cut it' },
  { ...PZ, time: 135, goal: 32, star2: 72, star3: 134, patience: 56, helper: 1, maxToppings: 5, extraTops: ['pickles'], notes: 'Pickles', intro: '🥒 New topping: Pickles! The table is bottom right, by the mop' },
  { ...PZ, time: 135, goal: 34, star2: 74, star3: 138, patience: 48, helper: 1, maxToppings: 5, extraTops: ['pickles'], notes: 'Less patient customers' },
  { ...PZ, time: 135, goal: 36, star2: 76, star3: 142, patience: 40, helper: 1, maxToppings: 5, extraTops: ['pickles'], notes: 'Even less patient' },
  { ...PZ, time: 180, goal: 50, star2: 105, star3: 210, patience: 36, helper: 2, puddles: { max: 7, every: 4.5 }, maxToppings: 5, extraTops: ['pickles'], notes: 'Grand finale: puddles and two helpers' }
];

// Hospital only (levels 16-20): patients that want a toy from the toy chest. Each level cuts patience; 20 is the 3 minute finale.
const HP = { trays: 0, items: [], extra: false, burn: 0, queue: 2, gap: 3.2, maxItems: 1, doubles: false, kinds: ['medicine', 'bill', 'bandage', 'id', 'toy'] };
export const HOSPITAL_LEVELS = [
  { ...HP, time: 135, goal: 30, star2: 70, star3: 130, patience: 52, helper: 1, notes: 'Toy patients', intro: '🧸 New: Toy patients! Tap the toy chest, wait for the bar, then bring the toy' },
  { ...HP, time: 135, goal: 32, star2: 72, star3: 134, patience: 48, helper: 1, notes: 'Less patient' },
  { ...HP, time: 135, goal: 34, star2: 74, star3: 138, patience: 44, helper: 1, notes: 'Even less patient' },
  { ...HP, time: 135, goal: 36, star2: 76, star3: 142, patience: 40, helper: 1, notes: 'Impatient crowd' },
  { ...HP, time: 180, goal: 50, star2: 105, star3: 210, patience: 36, gap: 3, helper: 2, puddles: { max: 7, every: 4.5 }, notes: 'Grand finale: puddles and two helpers' }
];

// Stars: 1 star = reach the goal (passes the level), 2 and 3 stars at these multiples of the goal.
export const STAR_MULT = [1, 1.4, 1.8];
// Tuned with tools/sim.mjs: 1 star (the goal) is easy for a slow/young player, 2 stars needs a decent player, 3 stars a near-expert one.
// A level can set `star2` / `star3` ($) to override its 2- and 3-star amounts.
export const starGoals = cfg => [cfg.goal, cfg.star2 || cfg.goal * STAR_MULT[1], cfg.star3 || cfg.goal * STAR_MULT[2]];
export const starsFor = (money, cfg) => starGoals(cfg).filter(v => money >= v).length;

// Item prices in dollars.
export const PRICES = { soda: 2, burger: 4, fries: 3 };

// Stage 3 tunables (orders, patience, tips, car timing).
export const TUNING = {
  firstCarDelay: 1,    // s before the first car of a shift
  penalty: 2,          // $ lost when a car leaves angry (total never goes below $0)
  tipMax: 0.5,         // best tip, as a fraction of the order value
  tipFullAt: 0.8,      // patience left (fraction) at or above which the full tip is paid
  patGreen: 0.6,       // bar is green above this fraction of patience left
  patRed: 0.3,         // bar is red below this; no tip at or below it
  carArrive: 1.1,      // s to drive in
  carLeave: 2.6,       // s to drive off happily
  carLeaveAngry: 0.6   // s to drive off angry
};

// Stage 2 tunables. Station make times in seconds (scaled per level later); burns: can burn at Level 8+ (see LEVELS.burn); worker speed in units/s.
export const STATIONS = {
  soda:   { time: 3.5 },
  burger: { time: 6.5, burns: true },
  fries:  { time: 6.5, burns: true },
  // Extra machines (levels with `extra`): same item as `type`, own station.
  burger2: { time: 6.5, burns: true, type: 'burger' },
  fries2:  { time: 6.5, burns: true, type: 'fries' },
  // Burger Joint levels 16+: the shake needs milk from the fridge and the worker standing at the mixer; it never burns.
  shake:   { time: 5, needs: 'milk', stand: true },
  // Coffee Shop levels 16+: the donut needs a plain one from the table and the worker standing at the microwave; it never burns.
  donut:   { time: 5, needs: 'rawdonut', stand: true },
  // Pizza Place levels 16+: the cutting table turns a baked cheese pizza into a slice while the worker stands at it.
  slice:   { time: 3, needs: 'pizza:sauce+cheese', stand: true }
};
export const WORKER = { speed: 6, maxHeld: 1, bobRate: 14, trayCap: 4 };

// Endless mode (MDD "Endless Mode"). Always available; ramps by customers served, 1 wave = `perWave` customers.
// rows: [fromWave, maxItems, patience s, gapMin s, gapMax s]. A row applies until the next row's wave.
// Past the last row, patience and the gaps keep shrinking per wave down to their floors.
// Orders never exceed 4 items (the tray holds 4) and never repeat an item more than twice (doubles), so they stay doable.
export const ENDLESS = {
  perWave: 1,        // each order is its own "wave" (difficulty step)
  early: [],
  lives: 3, firstCarDelay: 1, trays: 3,
  friesWave: 3,   // fryer appears (items become ALL)
  doublesWave: 5, // orders may repeat an item
  queue: [[4, 1], [8, 2]], // [fromOrder, cars waiting behind the window car]; orders of waiting cars are visible
  extraWave: 6,   // second grill and fryer
  burnWave: 5, burn: 12, // food burns after `burn` s
  helper2Gap: 4,  // orders after the first helper that a second joins
  helperWave: 7,  // the obstructing helper joins once everything above is in (a shop can override with `helperWave`)
  rows: [
    [1, 1, 38, 1, 2],
    [2, 2, 36, 1, 2],
    [3, 2, 34, 1.2, 2.4],
    [4, 3, 32, 2, 3.4],
    [5, 3, 30, 1.8, 3.2],
    [6, 3, 28, 1.6, 3],
    [8, 4, 26, 1.5, 2.8],
    [10, 4, 24, 1.4, 2.6],
    [12, 4, 22, 1.3, 2.4]
  ],
  patDecay: 1, minPatience: 14,   // per order past the last row
  gapDecay: [.05, .08], minGap: [.8, 1.6],
  music: [[8, 1.06], [12, 1.12]]   // [fromOrder, music playback rate]
};

// Patience (s) at a wave start; `frac` (0-1) eases toward the next wave so it tightens with every order.
export function endlessPatience(wave, over = {}, frac = 0) {
  const E = ENDLESS, last = E.rows[E.rows.length - 1];
  const at = w => Math.max(E.minPatience, (E.rows.filter(r => r[0] <= w).pop() || E.rows[0])[2] - Math.max(0, w - last[0]) * E.patDecay);
  return Math.round((at(wave) + (at(wave + 1) - at(wave)) * frac) * (over.patMult || 1));
}

// Level-style config for an endless wave. over: per-shop overrides ({ patMult }).
export function endlessCfg(wave, over = {}) {
  const E = ENDLESS, last = E.rows[E.rows.length - 1];
  const row = E.rows.filter(r => r[0] <= wave).pop() || E.rows[0];
  const extra = Math.max(0, wave - last[0]);
  const gapLo = Math.max(E.minGap[0], row[3] - extra * E.gapDecay[0]);
  const gapHi = Math.max(E.minGap[1], row[4] - extra * E.gapDecay[1]);
  const hw = over.helperWave || E.helperWave;
  const cfg = {
    endless: true, wave, trays: E.trays, time: 0,
    queue: (E.queue.filter(r => r[0] <= wave).pop() || [0, 0])[1],
    items: wave >= E.friesWave ? ALL : SB,
    maxItems: row[1], doubles: wave >= E.doublesWave, extra: wave >= E.extraWave,
    burn: wave >= E.burnWave ? E.burn : 0, helper: wave < hw ? 0 : wave < hw + E.helper2Gap ? 1 : 2,
    patience: endlessPatience(wave, over),
    gapRange: [gapLo, gapHi], gap: gapHi
  };
  // Per-shop overrides. Row lists are [fromWave, value] pairs.
  const at = rows => rows.filter(r => r[0] <= wave).pop()[1], g = over.gapMult || 1;
  if (g !== 1) Object.assign(cfg, { gapRange: [gapLo * g, gapHi * g], gap: gapHi * g });
  if (over.items) cfg.items = over.items;
  if (over.extraWave) cfg.extra = wave >= over.extraWave;
  if (over.maxItemsCap) cfg.maxItems = Math.min(cfg.maxItems, over.maxItemsCap);
  if (over.toppings) Object.assign(cfg, { toppings: at(over.toppings), maxToppings: at(over.maxToppings) }); // pizza
  if (over.hospital) { // patients: tasks (kinds) and line length ramp instead of items; no trays, food or burning
    Object.assign(cfg, {
      trays: 0, items: [], extra: wave >= over.registerWave, burn: 0, jam: wave >= over.registerWave ? over.jam : 0, maxItems: 1, doubles: false,
      kinds: at(over.kinds), queue: at(over.queue)
    });
  }
  return cfg;
}
export const endlessMusicRate = wave => (ENDLESS.music.filter(r => r[0] <= wave).pop() || [0, 1])[1];

// Wave math: `early` lists the sizes of the first waves, every later wave takes `perWave` customers.
export const servedFor = wave => { // customers served when `wave` begins
  const e = ENDLESS.early;
  return wave <= e.length + 1 ? e.slice(0, wave - 1).reduce((a, b) => a + b, 0) : e.reduce((a, b) => a + b, 0) + (wave - 1 - e.length) * ENDLESS.perWave;
};
export const waveFor = served => {
  let w = 1;
  while (served >= servedFor(w + 1)) w++;
  return w;
};
