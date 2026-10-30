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
  { time: 120, goal: 30, star2: 78, star3: 150, trays: 3, items: ALL, patience: 40, gap: 2,   maxItems: 4, doubles: true,  queue: 2, extra: true, burn: 12, notes: 'Final shift' }
];

// Stars: 1 star = reach the goal (passes the level), 2 and 3 stars at these multiples of the goal.
export const STAR_MULT = [1, 1.4, 1.8];
// Tuned with tools/sim.mjs: 1 star (the goal) is easy for a slow/young player, 2 stars needs a decent player, 3 stars a near-expert one.
// A level can set `star2` / `star3` ($) to override its 2- and 3-star amounts.
export const starsFor = (money, cfg) => [cfg.goal, cfg.star2 || cfg.goal * STAR_MULT[1], cfg.star3 || cfg.goal * STAR_MULT[2]].filter(v => money >= v).length;

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
  fries2:  { time: 6.5, burns: true, type: 'fries' }
};
export const WORKER = { speed: 6, maxHeld: 1, bobRate: 14, trayCap: 4 };

// Endless mode (MDD "Endless Mode"). Always available; ramps by customers served, 1 wave = `perWave` customers.
// rows: [fromWave, maxItems, patience s, gapMin s, gapMax s]. A row applies until the next row's wave.
// Past the last row, patience and the gaps keep shrinking per wave down to their floors.
// Orders never exceed 4 items (the tray holds 4) and never repeat an item more than twice (doubles), so they stay doable.
export const ENDLESS = {
  perWave: 5, lives: 3, firstCarDelay: 1, trays: 3,
  friesWave: 3,   // fryer appears (items become ALL)
  doublesWave: 6, // orders may repeat an item
  extraWave: 8,   // second grill and fryer
  burnWave: 8, burn: 12, // food burns after `burn` s
  rows: [
    [1, 1, 38, 2.5, 4.5],
    [2, 2, 36, 2.2, 4],
    [3, 2, 38, 2, 3.8],
    [4, 3, 38, 2, 3.6],
    [5, 3, 36, 1.8, 3.4],
    [6, 3, 35, 1.7, 3.2],
    [7, 3, 34, 1.6, 3],
    [8, 4, 34, 1.5, 2.8],
    [9, 4, 33, 1.4, 2.6],
    [10, 4, 32, 1.3, 2.4]
  ],
  patDecay: 1.2, minPatience: 18,   // per wave past the last row
  gapDecay: [.05, .08], minGap: [.8, 1.6],
  music: [[10, 1.06], [15, 1.12]]   // [fromWave, music playback rate]
};

// Level-style config for an endless wave. over: per-shop overrides ({ patMult }).
export function endlessCfg(wave, over = {}) {
  const E = ENDLESS, last = E.rows[E.rows.length - 1];
  const row = E.rows.filter(r => r[0] <= wave).pop() || E.rows[0];
  const extra = Math.max(0, wave - last[0]);
  const m = over.patMult || 1;
  const gapLo = Math.max(E.minGap[0], row[3] - extra * E.gapDecay[0]);
  const gapHi = Math.max(E.minGap[1], row[4] - extra * E.gapDecay[1]);
  return {
    endless: true, wave, trays: E.trays, queue: 0, time: 0,
    items: wave >= E.friesWave ? ALL : SB,
    maxItems: row[1], doubles: wave >= E.doublesWave, extra: wave >= E.extraWave,
    burn: wave >= E.burnWave ? E.burn : 0,
    patience: Math.round(Math.max(E.minPatience, row[2] - extra * E.patDecay) * m),
    gapRange: [gapLo, gapHi], gap: gapHi
  };
}
export const endlessMusicRate = wave => (ENDLESS.music.filter(r => r[0] <= wave).pop() || [0, 1])[1];
