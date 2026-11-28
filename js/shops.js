import { LEVELS, SHAKE_LEVELS, DONUT_LEVELS, HOSPITAL_LEVELS } from './levels.js';

export const PIZZA_TOPS = ['sauce', 'cheese', 'pepperoni', 'mushroom'];
export const ALL_TOPS = [...PIZZA_TOPS, 'pickles']; // level 17+ adds pickles (order = pizza signature order)

// Hospital: z of each place in a patient line (front first). Every place is tappable: spots patL0..2 / patR0..2.
export const PAT_ZS = [-.5, 1.3, 3.1];

// Restaurants in unlock order. Beating every level of one unlocks the next. `levels: null` = content not built yet.
// Station slots are fixed (soda / burger / fries = drink, cooked item, fried item); each shop re-skins them:
//   foods[slot]: icon, machine name, price, cy (glow offset behind the item), surf [x toward room, y] where the finished item sits on its machine.
//   layout: machine positions ({x, z}; x<0 is the left wall, x>0 the right) for the slots, the extra machines (levels with `extra`) and the bin.
//   colors: walls/trim (hex) and floor tiles (css).
export const SHOPS = [
  {
    id: 'burger', name: 'Burger Joint', icon: '🍔', menuItem: 'burger', levels: [...LEVELS, ...SHAKE_LEVELS],
    endless: {}, // endless mode overrides (see levels.js ENDLESS); shops without this have no endless tile
    puddles: true, // sticky floor puddles (and the mop); only this shop has them
    foods: {
      soda:   { icon: '🥤', machine: 'soda machine', price: 2, cy: .05,  surf: [.45, .56] },
      burger: { icon: '🍔', machine: 'grill',        price: 4, cy: -.09, surf: [0, .9] },
      fries:  { icon: '🍟', machine: 'fryer',        price: 3, cy: -.05, surf: [0, .85] },
      shake:  { icon: '🥛', machine: 'mixer',        price: 5, cy: -.02, surf: [0, .95] }
    },
    layout: {
      shake: { x: 2.55, z: 3 }, fridge: { x: -2.55, z: 2.9 },
      soda: { x: -2.55, z: -1.2 }, burger: { x: 2.55, z: -1.2 }, fries: { x: -2.55, z: 1.6 },
      burger2: { x: 2.55, z: .4 }, fries2: { x: -2.55, z: .2 }, bin: { x: 2.6, z: 1.6 }
    },
    colors: { wall: 0xfff1b8, trim: 0xe63946, tileA: '#fff6d6', tileB: '#f4c542' }
  },
  {
    id: 'coffee', name: 'Coffee Shop', icon: '☕', menuItem: 'soda', levels: [...LEVELS, ...DONUT_LEVELS].map((l, i) => ({ ...l, time: l.time + (i === 19 ? 60 : 30) })),
    endless: { patMult: 1.2 }, // cups add walking, so a little more patience
    cups: true, // every drink needs a cup from the cabinet before a machine will start
    foods: {
      soda:   { icon: '☕', machine: 'espresso machine', price: 2, cy: -.09, surf: [.45, .56] },
      burger: { icon: '🥤', machine: 'cold brew tap',    price: 4, cy: -.03, surf: [0, .9] },
      fries:  { icon: '🍵', machine: 'tea kettle',       price: 3, cy: -.16, surf: [.25, .85] },
      donut:  { icon: '🍩', machine: 'microwave',        price: 5, cy: -.05, surf: [0, .95] }
    },
    layout: {
      soda: { x: 2.55, z: -1.9 }, burger: { x: 2.55, z: -.2 }, fries: { x: 2.55, z: 1.35 },
      burger2: { x: -2.55, z: -.9 }, fries2: { x: -2.55, z: .6 }, bin: { x: -2.6, z: 1.9 }, cabinet: { x: -2.55, z: -2.1 },
      donuts: { x: -2.55, z: 3.1 }, donut: { x: 2.55, z: 3.1 }, mop: { x: 0, z: 3.4 }
    },
    npc: { x: .9, z: -1, r: .6 }, // a second worker standing in the shop: you walk around them
    colors: { wall: 0xf3e5d0, trim: 0x2f7d5b, tileA: '#f3e3cc', tileB: '#c8a27a' }
  },
  {
    id: 'bakery', name: 'Bakery', icon: '🧁', menuItem: 'burger',
    // Burger Joint curve with no puddles; donut levels get more patience for the fridge and mixer walk. 16-20 use the shake levels' timing.
    levels: [...LEVELS, ...SHAKE_LEVELS].map(({ intro, puddles, ...l }, i) => ({
      ...l, items: l.items.filter(t => t !== 'shake'),
      patience: l.items.includes('fries') ? Math.round(l.patience * 1.3) : l.patience,
      ...(i === 2 ? { intro: '🍩 New: Donuts! Grab dough from the fridge, stand at the mixer, then fill the donut maker' } : {})
    })),
    endless: { patMult: 1.3 },
    needs: { fries: 'mix' }, // the donut maker needs mixed dough
    foods: {
      soda:   { icon: '🥛', machine: 'milk machine', price: 2, cy: .05,  surf: [.45, .56] },
      burger: { icon: '🍰', machine: 'cake oven',    price: 4, cy: -.06, surf: [0, .9] },
      fries:  { icon: '🍩', machine: 'donut maker',  price: 5, cy: -.12, surf: [0, .85] },
      mix:    { icon: '🥣', machine: 'mixer',        price: 0, cy: -.1,  surf: [0, .95] }
    },
    layout: {
      mix: { x: 2.55, z: 3 }, doughfridge: { x: -2.55, z: 2.9 },
      soda: { x: -2.55, z: -1.2 }, burger: { x: 2.55, z: -1.2 }, fries: { x: -2.55, z: 1.6 },
      burger2: { x: 2.55, z: .4 }, fries2: { x: -2.55, z: .2 }, bin: { x: 2.6, z: 1.6 }
    },
    colors: { wall: 0xffe3ec, trim: 0xc2577a, tileA: '#fff4f0', tileB: '#f2b5c4' }
  },
  {
    id: 'hospital', name: 'Hospital', icon: '🏥', menuItem: 'medicine',
    hospital: true, // patients line up at two counters; each needs one task
    // Endless mode: same wave/patience ramp as the other shops; tasks and line length grow with the waves ([fromWave, value]).
    endless: {
      hospital: true, patMult: 1.3, gapMult: 1.6,
      kinds: [[1, ['medicine']], [2, ['medicine', 'bill']], [3, ['medicine', 'bill', 'bandage']], [5, ['medicine', 'bill', 'bandage', 'id']]],
      queue: [[1, 1], [2, 2]],
      helperWave: 5, registerWave: 4, jam: 12 // from this wave: a second bill machine, and a stamped bill left 12 s jams its machine
    },
    foods: {}, layout: {},
    // Where the worker stands for each tappable spot.
    spots: {
      ...Object.fromEntries(PAT_ZS.flatMap((z, i) => [['patL' + i, { x: -.85, z, face: -Math.PI / 2 }], ['patR' + i, { x: .85, z, face: Math.PI / 2 }]])),
      medicine: { x: -1.1, z: -2.1, face: Math.PI }, bandage: { x: 0, z: -2.1, face: Math.PI },
      toy: { x: -1.3, z: 3.6, face: 0 }, register: { x: 1.1, z: -2.1, face: Math.PI }, register2: { x: 2.2, z: -2.1, face: Math.PI }, trash: { x: 0, z: 3.6, face: 0 }
    },
    // Same level curve as the burger joint; tasks unlock with the levels, 1-2 patients waiting per side.
    levels: LEVELS.map((l, i) => ({
      ...l, trays: 0, items: [], extra: false, burn: 0, queue: i >= 3 || i === 0 ? 2 : 1,
      patience: Math.round(l.patience * 1.3), gap: i === 0 ? 3.5 : l.gap * 1.6, maxItems: 1, doubles: false,
      ...(i === 0 ? { workerSpeed: 3.5, goal: 40, star2: 52, star3: 64 } : {}),
      kinds: i === 0 ? ['medicine'] : i === 1 ? ['medicine', 'bill'] : i === 2 ? ['medicine', 'bill', 'bandage'] : ['medicine', 'bill', 'bandage', 'id']
    })).concat(HOSPITAL_LEVELS),
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
    if (type === 'slice') return { icon: '🍕', machine: 'cutting table', price: 3, cy: -.1, surf: [0, .95] };
    const n = type.startsWith('pizza:') ? type.slice(6).split('+').filter(Boolean).length : 0;
    return { icon: '🍕', machine: 'oven', price: 3 + 2 * n, cy: -.22, surf: [0, .9] };
  }
  return { icon: '?', machine: '', price: 0, cy: 0, surf: [0, .9] };
};
