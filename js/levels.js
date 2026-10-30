// Level config table (MDD section 6). time/patience/gap in seconds.
// items: which item buttons exist; maxItems: max items per order; notes: design hints.
const SB = ['soda', 'burger'];
const ALL = ['soda', 'burger', 'fries'];

export const LEVELS = [
  { time: 120, goal: 30,  items: SB,  patience: 35, gap: 5,   notes: 'Tutorial hints on screen' },
  { time: 120, goal: 45,  items: SB,  patience: 32, gap: 4,   notes: 'Orders of 1 or 2 items' },
  { time: 130, goal: 60,  items: ALL, patience: 32, gap: 4,   notes: 'Fryer and fries button introduced' },
  { time: 140, goal: 80,  items: ALL, patience: 30, gap: 3.5, notes: 'Orders up to 3 items' },
  { time: 150, goal: 100, items: ALL, patience: 28, gap: 3,   notes: 'Double-quantity orders (2 burgers)' },
  { time: 150, goal: 120, items: ALL, patience: 26, gap: 3,   notes: 'Faster pace' },
  { time: 160, goal: 145, items: ALL, patience: 24, gap: 2.5, notes: 'Larger orders' },
  { time: 170, goal: 170, items: ALL, patience: 22, gap: 2.5, notes: 'Food burns if left too long' },
  { time: 180, goal: 200, items: ALL, patience: 20, gap: 2,   notes: 'Rush hour' },
  { time: 180, goal: 240, items: ALL, patience: 18, gap: 2,   notes: 'Final shift' }
];
