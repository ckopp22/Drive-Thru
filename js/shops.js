import { LEVELS } from './levels.js';

export const PIZZA_TOPS = ['sauce', 'cheese', 'pepperoni', 'mushroom'];

// Hospital: z of each place in a patient line (front first). Every place is tappable: spots patL0..2 / patR0..2.
export const PAT_ZS = [-.2, 1.3, 2.8];

// Restaurants in unlock order. Beating every level of one unlocks the next. `levels: null` = content not built yet.
// Station slots are fixed (soda / burger / fries = drink, cooked item, fried item); each shop re-skins them:
//   foods[slot]: icon, machine name, price, cy (glow offset behind the item), surf [x toward room, y] where the finished item sits on its machine.
//   layout: machine positions ({x, z}; x<0 is the left wall, x>0 the right) for the slots, the extra machines (levels with `extra`) and the bin.
//   colors: walls/trim (hex) and floor tiles (css).
export const SHOPS = [
  {
    id: 'burger', name: 'Burger Joint', icon: '🍔', levels: LEVELS,
    endless: {}, // endless mode overrides (see levels.js ENDLESS); shops without this have no endless tile
    foods: {
      soda:   { icon: '🥤', machine: 'soda machine', price: 2, cy: .05,  surf: [.45, .56] },
      burger: { icon: '🍔', machine: 'grill',        price: 4, cy: -.09, surf: [0, .9] },
      fries:  { icon: '🍟', machine: 'fryer',        price: 3, cy: -.05, surf: [0, .85] }
    },
    layout: {
      soda: { x: -2.55, z: -1.2 }, burger: { x: 2.55, z: -1.2 }, fries: { x: -2.55, z: 1.6 },
      burger2: { x: 2.55, z: .4 }, fries2: { x: -2.55, z: .2 }, bin: { x: 2.6, z: 1.6 }
    },
    colors: { wall: 0xfff1b8, trim: 0xe63946, tileA: '#fff6d6', tileB: '#f4c542' }
  },
  {
    id: 'coffee', name: 'Coffee Shop', icon: '☕', levels: LEVELS.map(l => ({ ...l })),
    endless: { patMult: 1.2 }, // cups add walking, so a little more patience
    cups: true, // every drink needs a cup from the cabinet before a machine will start
    foods: {
      soda:   { icon: '☕', machine: 'espresso machine', price: 2, cy: -.09, surf: [.45, .56] },
      burger: { icon: '🥤', machine: 'cold brew tap',    price: 4, cy: -.03, surf: [0, .9] },
      fries:  { icon: '🍵', machine: 'tea kettle',       price: 3, cy: -.16, surf: [.25, .85] }
    },
    layout: {
      soda: { x: 2.55, z: -1.9 }, burger: { x: 2.55, z: -.2 }, fries: { x: 2.55, z: 1.35 },
      burger2: { x: -2.55, z: -.9 }, fries2: { x: -2.55, z: .6 }, bin: { x: -2.6, z: 1.9 }, cabinet: { x: -2.55, z: -2.1 }
    },
    npc: { x: .9, z: -1, r: .6 }, // a second worker standing in the shop: you walk around them
    colors: { wall: 0xf3e5d0, trim: 0x2f7d5b, tileA: '#f3e3cc', tileB: '#c8a27a' }
  },
  {
    id: 'pizza', name: 'Pizza Place', icon: '🍕',
    pizza: true, // dough -> table plate -> toppings -> oven -> tray
    // Same level curve as the burger joint, re-skinned: 1-3 trays like the burger joint, toppings unlock with the levels, second oven from level 4.
    levels: LEVELS.map((l, i) => ({
      ...l, items: ['burger'], extra: i >= 3, queue: i >= 7 ? 2 : 1, patience: Math.round(l.patience * 1.5),
      toppings: i < 2 ? ['sauce', 'cheese'] : i < 4 ? ['sauce', 'cheese', 'pepperoni'] : PIZZA_TOPS,
      maxToppings: [2, 2, 3, 3, 3, 4, 4, 4, 4, 4][i],
      maxItems: [1, 1, 2, 2, 2, 3, 3, 3, 3, 3][i],
      doubles: false
    })),
    foods: {},
    layout: { burger: { x: 2.55, z: -1.6 }, burger2: { x: 2.55, z: -.1 }, bin: { x: 2.6, z: 2.7 } },
    // Walk-up fixtures: key, kind (model), position; tables stand in the room and give their own walk spot.
    fixtures: [
      { key: 'dough', kind: 'dough', x: -2.55, z: -1.5 },
      { key: 'sauce', kind: 'sauce', x: -2.55, z: -.2 },
      { key: 'cheese', kind: 'cheese', x: -2.55, z: 1.1 },
      { key: 'pepperoni', kind: 'pepperoni', x: -2.55, z: 2.4 },
      { key: 'mushroom', kind: 'mushroom', x: 2.55, z: 1.4 },
      { key: 'table0', kind: 'table', x: -.8, z: .9, spot: { x: -.8, z: 1.75, face: Math.PI } },
      { key: 'table1', kind: 'table', x: .8, z: .9, spot: { x: .8, z: 1.75, face: Math.PI } }
    ],
    colors: { wall: 0xf6d9b0, trim: 0xd62828, tileA: '#ffffff', tileB: '#e0524a' }
  },
  {
    id: 'hospital', name: 'Hospital', icon: '🏥',
    hospital: true, // patients line up at two counters; each needs one task
    foods: {}, layout: {},
    // Where the worker stands for each tappable spot.
    spots: {
      ...Object.fromEntries(PAT_ZS.flatMap((z, i) => [['patL' + i, { x: -.85, z, face: -Math.PI / 2 }], ['patR' + i, { x: .85, z, face: Math.PI / 2 }]])),
      medicine: { x: -1.1, z: -2.1, face: Math.PI }, bandage: { x: 0, z: -2.1, face: Math.PI },
      register: { x: 1.1, z: -2.1, face: Math.PI }, trash: { x: 1.9, z: -2.5, face: Math.PI / 2 }
    },
    // Same level curve as the burger joint; tasks unlock with the levels, 1-2 patients waiting per side.
    levels: LEVELS.map((l, i) => ({
      ...l, trays: 0, items: [], extra: false, burn: 0, queue: i >= 3 || i === 0 ? 2 : 1,
      patience: Math.round(l.patience * 1.3), gap: i === 0 ? 3.5 : l.gap * 1.6, maxItems: 1, doubles: false,
      ...(i === 0 ? { workerSpeed: 3.5, goal: 40, star2: 52, star3: 64 } : {}),
      kinds: i === 0 ? ['medicine'] : i === 1 ? ['medicine', 'bill'] : i === 2 ? ['medicine', 'bill', 'bandage'] : ['medicine', 'bill', 'bandage', 'id']
    })),
    colors: { wall: 0xeef6fa, trim: 0x2c8fd6, tileA: '#ffffff', tileB: '#cfe8f3' }
  }
];

export const shopById = id => SHOPS.find(s => s.id === id) || SHOPS[0];

// The shop being played; set before the world is built.
let active = SHOPS[0];
export const useShop = s => { active = s; };
export const activeShop = () => active;

// Display info for an item type: shops list theirs in `foods`; pizza shop types are 'pizza:sauce+cheese' style signatures.
export const itemInfo = type => {
  if (active.foods[type]) return active.foods[type];
  if (active.pizza) {
    const n = type.startsWith('pizza:') ? type.slice(6).split('+').filter(Boolean).length : 0;
    return { icon: '🍕', machine: 'oven', price: 3 + 2 * n, cy: -.22, surf: [0, .9] };
  }
  return { icon: '?', machine: '', price: 0, cy: 0, surf: [0, .9] };
};
