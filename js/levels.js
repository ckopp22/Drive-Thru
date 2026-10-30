// Level config table (MDD section 6). time/patience/gap/burn in seconds.
// items: which item buttons exist; maxItems: max items per order; doubles: orders may repeat an item (2 burgers);
// trays: how many serving trays (and bottom buttons) the level has; burn: seconds a finished food item may sit at its station before it burns (0 = never); notes: design hints.
const SB = ['soda', 'burger'];
const ALL = ['soda', 'burger', 'fries'];

export const LEVELS = [
  { time: 120, goal: 14, trays: 1,  items: SB,  patience: 35, gap: 5,   maxItems: 1, doubles: false, burn: 0, notes: 'Tutorial hints on screen' },
  { time: 120, goal: 20, trays: 2,  items: SB,  patience: 32, gap: 4,   maxItems: 2, doubles: false, burn: 0, notes: 'Orders of 1 or 2 items' },
  { time: 130, goal: 27, trays: 3,  items: ALL, patience: 32, gap: 4,   maxItems: 2, doubles: false, burn: 0, notes: 'Fryer and fries button introduced' },
  { time: 140, goal: 36, trays: 3,  items: ALL, patience: 30, gap: 3.5, maxItems: 3, doubles: false, burn: 0, notes: 'Orders up to 3 items' },
  { time: 150, goal: 45, trays: 3, items: ALL, patience: 28, gap: 3,   maxItems: 3, doubles: true,  burn: 0, notes: 'Double-quantity orders (2 burgers)' },
  { time: 150, goal: 54, trays: 3, items: ALL, patience: 26, gap: 3,   maxItems: 3, doubles: true,  burn: 0, notes: 'Faster pace' },
  { time: 160, goal: 65, trays: 3, items: ALL, patience: 24, gap: 2.5, maxItems: 4, doubles: true,  burn: 0, notes: 'Larger orders' },
  { time: 170, goal: 76, trays: 3, items: ALL, patience: 22, gap: 2.5, maxItems: 4, doubles: true,  burn: 8, notes: 'Food burns if left too long' },
  { time: 180, goal: 90, trays: 3, items: ALL, patience: 20, gap: 2,   maxItems: 4, doubles: true,  burn: 8, notes: 'Rush hour' },
  { time: 180, goal: 108, trays: 3, items: ALL, patience: 18, gap: 2,   maxItems: 4, doubles: true,  burn: 8, notes: 'Final shift' }
];

// Stars: 1 star = reach the goal (passes the level), 2 and 3 stars at these multiples of the goal.
export const STAR_MULT = [1, 1.4, 1.8];
export const starsFor = (money, goal) => STAR_MULT.filter(m => money >= goal * m).length;

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
  carLeave: 1.4,       // s to drive off happily
  carLeaveAngry: 0.6   // s to drive off angry
};

// Stage 2 tunables. Station make times in seconds (scaled per level later); burns: can burn at Level 8+ (see LEVELS.burn); worker speed in units/s.
export const STATIONS = {
  soda:   { time: 3.5 },
  burger: { time: 6.5, burns: true },
  fries:  { time: 6.5, burns: true }
};
export const WORKER = { speed: 6, maxHeld: 1, bobRate: 14, trayCap: 4 };
