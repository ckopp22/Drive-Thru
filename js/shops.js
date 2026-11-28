import { LEVELS, SHAKE_LEVELS, DONUT_LEVELS } from './levels.js';

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
      ...l, items: [...l.items.filter(t => t !== 'shake'), 'choco'],
      patience: l.items.includes('fries') ? Math.round(l.patience * 1.3) : l.patience,
      ...(i === 2 ? { intro: '🍩 New: Donuts! Grab dough from the fridge, run the mixer, then fill the donut maker' } : {})
    })),
    endless: { patMult: 1.3, itemRows: [[1, ['soda', 'burger', 'choco']], [2, ['soda', 'burger', 'fries', 'choco']]] },
    ext: 1, // the room runs this much further toward the player
    needs: { fries: 'mix' }, // the donut maker needs mixed dough
    foods: {
      soda:   { icon: '🥛', machine: 'milk machine', price: 2, cy: .05,  surf: [.45, .56] },
      burger: { icon: '🍰', machine: 'cake oven',    price: 4, cy: -.06, surf: [0, .9] },
      fries:  { icon: '🍩', machine: 'donut maker',  price: 5, cy: -.12, surf: [0, .85] },
      choco:  { icon: '🍫', machine: 'chocolate milk machine', price: 3, cy: .05, surf: [0, .9] },
      mix:    { icon: '🥣', machine: 'mixer',        price: 0, cy: -.1,  surf: [0, .95] }
    },
    layout: {
      mix: { x: 2.55, z: 3.9 }, doughfridge: { x: -2.55, z: 3.2 },
      soda: { x: -2.55, z: -1.2 }, choco: { x: 2.55, z: -1.9 }, burger: { x: 2.55, z: -.3 }, fries: { x: -2.55, z: 1.6 },
      burger2: { x: 2.55, z: 1.3 }, fries2: { x: -2.55, z: .2 }, bin: { x: 2.6, z: 2.7 }
    },
    colors: { wall: 0xffe3ec, trim: 0xc2577a, tileA: '#fff4f0', tileB: '#f2b5c4' }
  },
  {
    id: 'hospital', name: 'Hospital', icon: '🏥', menuItem: 'burger',
    // Burger Joint layout. Item slots: burger = pills, fries = bandage, soda = liquid medicine (made on the medicine machine from a mix).
    // Everything burns on every level. Liquid levels get more patience for the extra step. 16-20 use the shake levels' timing.
    levels: [...LEVELS, ...SHAKE_LEVELS].map(({ intro, puddles, ...l }, i) => ({
      ...l, items: i < 2 ? ['burger', 'fries', 'fax'] : ['burger', 'fries', 'soda', 'fax'], burn: 12,
      patience: i < 2 ? l.patience : Math.round(l.patience * 1.3),
      ...(i === 2 ? { intro: '🧪 New: Liquid medicine! Run the mixer, then take the mix to the medicine machine' } : {})
    })),
    endless: { patMult: 1.3, burn: 12, itemRows: [[1, ['burger', 'fries', 'fax']], [3, ['burger', 'fries', 'soda', 'fax']]] },
    alt: { burger: { needs: 'blend', item: 'soda' } }, // holding a mix, the medicine machine makes the liquid instead
    foods: {
      burger: { icon: '💊', machine: 'medicine machine', price: 4, cy: -.2,  surf: [0, .9] },
      fries:  { icon: '🩹', machine: 'bandage machine',  price: 3, cy: -.15, surf: [0, .85] },
      soda:   { icon: '🧴', machine: 'medicine machine', price: 6, cy: -.06, surf: [0, .9] },
      fax:    { icon: '📄', machine: 'fax machine',      price: 3, cy: 0,    surf: [0, .95] },
      blend:  { icon: '🧪', machine: 'mixing machine',   price: 0, cy: -.08, surf: [0, .95] }
    },
    layout: {
      blend: { x: -2.55, z: -1.2 }, burger: { x: 2.55, z: -1.2 }, fries: { x: -2.55, z: 1.6 },
      burger2: { x: 2.55, z: .4 }, fries2: { x: -2.55, z: .2 }, bin: { x: 2.6, z: 1.6 },
      blend2: { x: 2.55, z: 3 }, fax: { x: -2.55, z: 3 }
    },
    colors: { wall: 0xeef6fa, trim: 0x2c8fd6, tileA: '#ffffff', tileB: '#cfe8f3' }
  }
];

export const shopById = id => SHOPS.find(s => s.id === id) || SHOPS[0];

// The shop being played; set before the world is built.
let active = SHOPS[0];
export const useShop = s => { active = s; };
export const activeShop = () => active;

// Display info for an item type (shops list theirs in `foods`).
export const itemInfo = type => {
  if (active.foods[type]) return active.foods[type];
  return { icon: '?', machine: '', price: 0, cy: 0, surf: [0, .9] };
};
