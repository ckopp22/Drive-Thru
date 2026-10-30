import * as THREE from '../lib/three.module.min.js';
import { WORKER, STATIONS } from './levels.js';
import { activeShop, itemInfo, PIZZA_TOPS, useShop } from './shops.js';

// World layout. x: right, y: up, z: toward the camera (bottom of screen).
// Room x -3..3, z -3.5..3.5, open toward the camera. Back wall (top of screen) has the window; the lane runs along x beyond it.
const SPOTS = {
  soda:   { x: -1.9, z: -1.2, face: -Math.PI / 2 },
  burger: { x: 1.9,  z: -1.2, face: Math.PI / 2 },
  fries:  { x: -1.9, z: 1.6,  face: -Math.PI / 2 },
  burger2: { x: 1.9,  z: .4,  face: Math.PI / 2 },
  fries2:  { x: -1.9, z: .2,  face: -Math.PI / 2 },
  trash:  { x: 1.9,  z: 1.6,  face: Math.PI / 2 },
  tray0:  { x: -1.1, z: -2.1, face: Math.PI },
  tray1:  { x: 0,    z: -2.1, face: Math.PI },
  tray2:  { x: 1.1,  z: -2.1, face: Math.PI },
  tray3:  { x: 1.5,  z: -2.1, face: Math.PI },
  tray4:  { x: 1.5,  z: -2.1, face: Math.PI }
};
export { SPOTS };
const EQUIP_X = 2.55;

export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const FOV = 38;
const FIT_POINTS = [
  [-3.3, 0, -7.2], [3.3, 0, -7.2], [-3.3, 2.4, -3.6], [3.3, 2.4, -3.6],
  [-3.2, 0, 3.5], [3.2, 0, 3.5], [-3.2, 2, 3.5], [3.2, 2, 3.5],
  [-EQUIP_X, 3.6, -1.2], [EQUIP_X, 3.6, -1.2], [-EQUIP_X, 3.6, 1.6]
].map(p => new THREE.Vector3(...p));

const mats = new Map();
const geos = new Map();
const M = c => mats.get(c) || mats.set(c, new THREE.MeshLambertMaterial({ color: c, flatShading: true })).get(c);
const G = (type, ...a) => {
  const k = type + a.join();
  return geos.get(k) || geos.set(k, new THREE[type + 'Geometry'](...a)).get(k);
};

function part(geo, color, x, y, z, parent) {
  const m = new THREE.Mesh(geo, M(color));
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
const box = (w, h, d, color, x, y, z, parent) => part(G('Box', w, h, d), color, x, y, z, parent);

// Item props: origin at the base so they can sit on a surface.
function burgerItem(type, g) {
  if (type === 'soda') {
    part(G('Cylinder', .12, .09, .3, 8), 0xffffff, 0, .15, 0, g);
    part(G('Cylinder', .115, .1, .09, 8), 0xe63946, 0, .15, 0, g);
    part(G('Cylinder', .13, .13, .04, 8), 0xe63946, 0, .32, 0, g);
    box(.03, .16, .03, 0xffc828, .03, .42, 0, g);
  } else if (type === 'burger') {
    part(G('Cylinder', .2, .18, .07, 10), 0xe0a050, 0, .035, 0, g);
    part(G('Cylinder', .21, .21, .06, 10), 0x6b3a1e, 0, .1, 0, g);
    part(G('Cylinder', .22, .22, .025, 10), 0x4cb84c, 0, .14, 0, g);
    box(.38, .02, .38, 0xffc828, 0, .16, 0, g).rotation.y = Math.PI / 4;
    part(G('Sphere', .2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0xe0a050, 0, .17, 0, g).scale.y = .8;
  } else {
    part(G('Cylinder', .15, .11, .2, 4), 0xe63946, 0, .1, 0, g).rotation.y = Math.PI / 4;
    [[-.06, .31], [0, .35], [.06, .29], [-.03, .27], [.04, .33]].forEach(([x, top], i) =>
      box(.035, top - .15, .035, 0xffd54a, x, (top + .15) / 2, (i % 2 ? .02 : -.02), g));
  }
}

function coffeeItem(type, g) {
  if (type === 'cup') { // empty paper cup from the cabinet
    part(G('Cylinder', .12, .09, .26, 8), 0xf5f0e6, 0, .13, 0, g);
    part(G('Cylinder', .125, .125, .03, 8), 0xe8dfcf, 0, .265, 0, g);
  } else if (type === 'soda') { // hot coffee
    part(G('Cylinder', .12, .09, .26, 8), 0xf5f0e6, 0, .13, 0, g);
    part(G('Cylinder', .115, .1, .09, 8), 0x8b5a2b, 0, .13, 0, g);
    part(G('Cylinder', .13, .13, .04, 8), 0x333333, 0, .28, 0, g);
    part(G('Sphere', .035, 4, 4), 0xffffff, -.03, .37, 0, g);
    part(G('Sphere', .03, 4, 4), 0xffffff, .04, .43, 0, g);
  } else if (type === 'burger') { // iced coffee
    part(G('Cylinder', .12, .09, .3, 8), 0xcfe8f5, 0, .15, 0, g);
    part(G('Cylinder', .105, .085, .22, 8), 0x6b4226, 0, .12, 0, g);
    box(.07, .07, .07, 0xf2fbff, -.03, .26, .02, g);
    box(.06, .06, .06, 0xf2fbff, .04, .25, -.03, g);
    box(.025, .22, .025, 0xe63946, .05, .38, 0, g);
  } else { // tea
    part(G('Cylinder', .12, .1, .2, 8), 0x2f7d5b, 0, .1, 0, g);
    part(G('Cylinder', .105, .105, .01, 8), 0xb3541e, 0, .195, 0, g);
    box(.04, .1, .04, 0x2f7d5b, .15, .11, 0, g);
    box(.05, .06, .01, 0xffffff, -.06, .26, 0, g);
  }
}

const TOP_COLOR = { sauce: 0xd62828, cheese: 0xffd23f, pepperoni: 0xb3262b, mushroom: 0xd9c2a0 };
function pizzaItem(type, g) {
  if (type === 'dough') {
    part(G('Sphere', .2, 10, 8), 0xf5e6c8, 0, .14, 0, g).scale.y = .7;
  } else if (TOP_COLOR[type]) { // a bowl of one topping
    part(G('Cylinder', .16, .12, .12, 8), 0x9aa0a6, 0, .06, 0, g);
    part(G('Cylinder', .14, .14, .02, 8), TOP_COLOR[type], 0, .125, 0, g);
  } else { // 'plate:...' = raw pizza on a plate, 'pizza:...' = baked
    const cooked = type.startsWith('pizza:'), tops = type.slice(type.indexOf(':') + 1).split('+').filter(Boolean);
    part(G('Cylinder', .3, .3, .03, 12), 0xffffff, 0, .015, 0, g);
    part(G('Cylinder', .26, .26, .05, 12), cooked ? 0xd9a04a : 0xf2dcae, 0, .055, 0, g);
    if (tops.includes('sauce')) part(G('Cylinder', .22, .22, .012, 12), TOP_COLOR.sauce, 0, .086, 0, g);
    if (tops.includes('cheese')) part(G('Cylinder', .2, .2, .012, 12), TOP_COLOR.cheese, 0, .098, 0, g);
    if (tops.includes('pepperoni')) [[.1, .06], [-.1, .08], [.02, -.12], [-.12, -.07]].forEach(([x, z]) => part(G('Cylinder', .05, .05, .015, 8), TOP_COLOR.pepperoni, x, .112, z, g));
    if (tops.includes('mushroom')) [[0, 0], [.14, -.05], [-.06, .14]].forEach(([x, z]) => part(G('Sphere', .045, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), TOP_COLOR.mushroom, x, .108, z, g));
  }
}

// Hospital: a bill paper (unstamped / stamped), a medicine bottle and a bandage roll.
function hospitalItem(type, g) {
  if (type === 'bill' || type === 'billok') {
    box(.3, .02, .38, 0xffffff, 0, .02, 0, g);
    [-.1, 0, .1].forEach(z => box(.2, .005, .02, 0x9aa0a6, 0, .035, z, g));
    if (type === 'billok') box(.12, .01, .12, 0x2ecc59, .06, .04, .1, g);
  } else if (type === 'medicine') {
    part(G('Cylinder', .1, .1, .22, 8), 0xffffff, 0, .11, 0, g);
    part(G('Cylinder', .105, .105, .06, 8), 0x2c8fd6, 0, .25, 0, g);
    box(.12, .08, .01, 0xe63946, 0, .12, .1, g);
  } else { // bandage roll
    part(G('Cylinder', .14, .14, .1, 10), 0xf5e6c8, 0, .05, 0, g);
    part(G('Cylinder', .06, .06, .11, 8), 0xffffff, 0, .05, 0, g);
    box(.1, .02, .02, 0xe63946, 0, .11, .14, g);
  }
}

export function makeItem(type) {
  const g = new THREE.Group();
  if (type === 'burnt') { // a charred lump, carried to the bin
    part(G('Icosahedron', .2, 0), 0x26221f, 0, .2, 0, g).scale.set(1.2, .8, 1);
    part(G('Icosahedron', .11, 0), 0x4a423d, .1, .3, .05, g);
    return g;
  }
  const id = activeShop().id;
  (id === 'pizza' ? pizzaItem : id === 'hospital' ? hospitalItem : id === 'coffee' ? coffeeItem : burgerItem)(type, g);
  return g;
}

// Cars face +x and drive along the lane (z = LANE_Z). Origin at the middle of the car, wheels on y = 0.
export const LANE_Z = -6;
export const CAR_VARIANTS = 4;
export const CAR_COLORS = [0x3b82f6, 0x2ecc71, 0xff8c42, 0xb06cff, 0xf2f2f2, 0xffd23f];

// Brake lights: brighter and a little bigger while braking.
export function setBrake(g, on) {
  if (g.userData.brake === on) return;
  g.userData.brake = on;
  g.userData.tails.forEach(m => { m.material = M(on ? 0xff3030 : 0xd62828); m.scale.set(1, on ? 1.5 : 1, on ? 1.4 : 1); });
}

export function makeCar(variant, color) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const glass = 0x9fd8f5, dark = 0x2a2f3a;
  const len = [1.9, 1.6, 2.1, 1.9][variant];
  if (variant === 0) { // sedan
    box(1.9, .4, .9, color, 0, .4, 0, body);
    box(1.0, .26, .84, glass, -.1, .73, 0, body);
    box(.96, .06, .8, color, -.1, .89, 0, body);
  } else if (variant === 1) { // hatchback
    box(1.6, .42, .9, color, 0, .41, 0, body);
    box(1.1, .34, .84, glass, -.1, .77, 0, body);
    box(1.06, .06, .8, color, -.1, .97, 0, body);
  } else if (variant === 2) { // pickup
    box(2.1, .4, .92, color, 0, .4, 0, body);
    box(.7, .3, .86, glass, .3, .75, 0, body);
    box(.66, .06, .8, color, .3, .9, 0, body);
    box(.8, .12, .92, color, -.6, .66, 0, body);
    box(.7, .1, .7, dark, -.6, .68, 0, body);
  } else { // van
    box(1.9, .75, .92, color, 0, .575, 0, body);
    box(.7, .25, .94, glass, .3, .78, 0, body);
    box(.05, .3, .8, glass, .96, .78, 0, body);
    box(1.9, .06, .86, 0xf2f2f2, 0, .97, 0, body);
  }
  [.46, -.46].forEach(z => [len * .32, -len * .32].forEach(x => {
    part(G('Cylinder', .2, .2, .16, 8), 0x2a2a2a, x, .2, z, g).rotation.x = Math.PI / 2;
  }));
  const tails = [];
  [.28, -.28].forEach(z => {
    box(.05, .1, .16, 0xfff0a0, len / 2, .42, z, body);
    tails.push(box(.05, .1, .16, 0xd62828, -len / 2, .42, z, body));
  });
  const shadow = new THREE.Mesh(G('Circle', 1, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(len * .55, .6, 1);
  shadow.position.y = .03;
  g.add(shadow);
  g.userData.body = body;
  g.userData.len = len;
  g.userData.tails = tails;
  return g;
}

// Serving tray: red base with a pale mat. Items are laid out 2x2 on top (children from index 2).
function makeTrayBase(g) {
  box(.95, .06, .72, 0xe63946, 0, .03, 0, g);
  box(.85, .04, .62, 0xffe08a, 0, .07, 0, g);
}
// Items sit centred when alone and shrink to fit as more are added (up to 4).
const TRAY_LAYOUT_ITEMS = [
  { s: 1,   p: [[0, 0]] },
  { s: .85, p: [[-.22, 0], [.22, 0]] },
  { s: .7,  p: [[-.24, -.14], [.24, -.14], [0, .14]] },
  { s: .55, p: [[-.22, -.16], [.22, -.16], [-.22, .14], [.22, .14]] }
];
function layItems(g, types) {
  for (let j = g.children.length - 1; j >= 2; j--) g.remove(g.children[j]);
  const lay = TRAY_LAYOUT_ITEMS[types.length - 1];
  types.forEach((t, j) => {
    const it = makeItem(t);
    it.scale.setScalar(lay.s);
    it.position.set(lay.p[j][0], .09, lay.p[j][1]);
    g.add(it);
  });
}

function makeBar() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(G('Plane', 1.3, .28), new THREE.MeshBasicMaterial({ color: 0x222222, depthTest: false }));
  const fillGeo = new THREE.PlaneGeometry(1.2, .18).translate(.6, 0, 0);
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({ color: 0x4cd964, depthTest: false }));
  fill.position.set(-.6, 0, .01);
  bg.renderOrder = 10;
  fill.renderOrder = 11;
  g.add(bg, fill);
  g.userData.fill = fill;
  return g;
}

const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const ringMat = new THREE.MeshBasicMaterial({ color: 0x3a1015 });

let checkMat = null;
function makeCheck() {
  if (!checkMat) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#2ecc59'; x.beginPath(); x.arc(32, 32, 29, 0, Math.PI * 2); x.fill();
    x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke();
    x.lineWidth = 8; x.lineCap = x.lineJoin = 'round'; x.beginPath();
    x.moveTo(18, 33); x.lineTo(28, 43); x.lineTo(46, 21); x.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    checkMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false });
  }
  const m = new THREE.Mesh(G('Plane', .55, .55), checkMat);
  m.renderOrder = 12;
  return m;
}

let warnMat = null;
function makeWarn() {
  if (!warnMat) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    // Just a red "!" with a white outline (no circle behind it).
    x.font = 'bold 60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.lineWidth = 9; x.strokeStyle = '#fff'; x.strokeText('!', 32, 35);
    x.fillStyle = '#ff3b30'; x.fillText('!', 32, 35);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    warnMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthTest: false });
  }
  const m = new THREE.Mesh(G('Plane', .5, .5), warnMat);
  m.renderOrder = 12;
  return m;
}

function makeStationViz(type, x, z, billboards) {
  const root = new THREE.Group();
  root.position.set(x, 2.35, z);
  const bar = makeBar();
  const ready = new THREE.Group();
  ready.position.y = .75;
  ready.scale.setScalar(.7);
  const glow = new THREE.Mesh(G('Circle', .46, 20), glowMat.clone()); // own material: it blinks red when food is about to burn
  // Sits slightly behind the item (away from the camera) so the item draws in front of it.
  // Placed along the camera's view ray from the item's visual center (pitch 1.0), so it looks centered.
  const cy = itemInfo(type).cy;
  glow.position.set(0, cy - .378, -.243);
  glow.add(new THREE.Mesh(G('Ring', .46, .52, 24), ringMat));
  let item = makeItem(type);
  item.scale.setScalar(1.4);
  item.position.y = -.3;
  ready.add(glow, item);

  // Burnt food: charred item with smoke puffs rising.
  const burnt = new THREE.Group();
  burnt.position.y = .45;
  let charred = makeItem(type);
  charred.scale.setScalar(1.4);
  charred.traverse(o => { if (o.isMesh) o.material = M(0x26221f); });
  burnt.add(charred);
  const puffs = [0, 1, 2].map(() => {
    const p = new THREE.Mesh(G('Sphere', .16, 6, 5), new THREE.MeshBasicMaterial({ color: 0x777777, transparent: true, depthWrite: false }));
    burnt.add(p);
    return p;
  });

  // The finished item sits on the machine until the worker picks it up.
  const [ox, sy] = itemInfo(type).surf;
  let onMachine = makeItem(type);
  onMachine.scale.setScalar(1.3);
  onMachine.position.set(ox * Math.sign(-x), sy - 2.35, 0);
  let burntOnMachine = makeItem(type);
  burntOnMachine.traverse(o => { if (o.isMesh) o.material = M(0x26221f); });
  burntOnMachine.scale.copy(onMachine.scale);
  burntOnMachine.position.copy(onMachine.position);
  root.add(onMachine, burntOnMachine);

  const check = makeCheck();
  check.position.y = 1.55;
  check.visible = false;
  const warn = makeWarn();
  // Right over the food icon: same spot as the circle behind it (see the glow placement above).
  const warnPos = cy => warn.position.set(0, .75 + (cy - .378) * .7, -.243 * .7);
  warnPos(cy);
  warn.scale.setScalar(1.2);
  warn.visible = false;
  let burnFrac = 0, blink = 0, lastT = 0, making = false, isReady = false;
  // Steam / smoke puffs (food) or bubbles (drinks) while making; a pulsing ring on the machine when ready.
  const reduced = reducedMotion();
  const fx = [];
  if (!reduced) {
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(G('Sphere', type === 'soda' ? .05 : .09, 5, 4), new THREE.MeshBasicMaterial({ color: type === 'soda' ? 0xbfe9ff : 0xffffff, transparent: true, depthWrite: false }));
      m.visible = false;
      root.add(m);
      fx.push(m);
    }
  }
  const surf = itemInfo(type).surf, fxX = surf[0] * Math.sign(-x), fxY = surf[1] - 2.35;
  const halo = new THREE.Mesh(G('Ring', .3, .4, 20), new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.set(fxX, fxY + .03, 0);
  halo.visible = false;
  root.add(halo);
  root.add(bar, ready, burnt, check, warn);
  billboards.push(bar, glow, check, warn);
  bar.visible = ready.visible = burnt.visible = onMachine.visible = burntOnMachine.visible = false;
  let pinged = false, pingAt = 0;
  return {
    root,
    // Show a different item on this machine (the oven bakes whatever pizza was put in).
    setType(t) {
      const dark = m => { m.traverse(o => { if (o.isMesh) o.material = M(0x26221f); }); return m; };
      const info = itemInfo(t);
      glow.position.y = info.cy - .378;
      warnPos(info.cy);
      ready.remove(item); item = makeItem(t); item.scale.setScalar(1.4); item.position.y = -.3; ready.add(item);
      burnt.remove(charred); charred = dark(makeItem(t)); charred.scale.setScalar(1.4); burnt.add(charred);
      const [vx, vy] = info.surf, v1 = onMachine.visible, v2 = burntOnMachine.visible;
      root.remove(onMachine, burntOnMachine);
      onMachine = makeItem(t); onMachine.scale.setScalar(1.3); onMachine.position.set(vx * Math.sign(-x), vy - 2.35, 0); onMachine.visible = v1;
      burntOnMachine = dark(makeItem(t)); burntOnMachine.scale.copy(onMachine.scale); burntOnMachine.position.copy(onMachine.position); burntOnMachine.visible = v2;
      root.add(onMachine, burntOnMachine);
    },
    // Quick green checkmark when an item finishes.
    ping() { pinged = true; },
    // burn: 0..1 of the way to burning (ready items only); the ! flashes faster as it grows.
    set(state, p, burn = 0) {
      burnFrac = state === 'ready' ? burn : 0;
      making = state === 'making';
      isReady = state === 'ready';
      bar.visible = state === 'making';
      ready.visible = onMachine.visible = state === 'ready';
      burntOnMachine.visible = state === 'burnt';
      burnt.visible = state === 'burnt';
      if (bar.visible) bar.userData.fill.scale.x = Math.max(.001, p);
    },
    update(t) {
      const dt = Math.min(.1, Math.max(0, t - lastT));
      lastT = t;
      fx.forEach((m, i) => {
        m.visible = making;
        if (!making) return;
        const ph = (t * (type === 'soda' ? 1.4 : .8) + i / 5) % 1, h = type === 'soda' ? .5 : .9;
        m.position.set(fxX + Math.sin(t * 3 + i * 2) * .1, fxY + .15 + ph * h, Math.cos(t * 2 + i) * .08);
        m.scale.setScalar(type === 'soda' ? 1 : .6 + ph * 1.1);
        m.material.opacity = (type === 'soda' ? .8 : .55) * (1 - ph);
      });
      halo.visible = isReady;
      if (isReady) {
        const pulse = 1 + (reduced ? 0 : Math.sin(t * 5) * .12);
        halo.scale.setScalar(pulse);
        halo.material.opacity = .55 + (reduced ? .2 : Math.sin(t * 5) * .25);
        if (!reduced) ready.scale.setScalar(.7 * (1 + Math.sin(t * 5) * .04));
      }
      if (burnFrac > .35) {
        blink += dt * (3 + 14 * ((burnFrac - .35) / .65) ** 2) * Math.PI * 2;
        warn.visible = Math.sin(blink) > -.2;
      } else warn.visible = false;
      glow.material.color.setHex(warn.visible ? 0xff3b30 : 0xffffff);
      if (pinged) { pinged = false; pingAt = t; check.visible = true; }
      if (check.visible) {
        const age = t - pingAt;
        if (age > .9) check.visible = false;
        else check.scale.setScalar(Math.min(1, age / .15) * (1 + Math.sin(Math.min(1, age / .3) * Math.PI) * .25));
      }
      if (burnt.visible) {
        puffs.forEach((p, i) => {
          const ph = (t * .7 + i / 3) % 1;
          p.position.set(Math.sin(t * 3 + i * 2) * .14, .1 + ph * 1.1, 0);
          p.scale.setScalar(.6 + ph * 1.2);
          p.material.opacity = .65 * (1 - ph);
        });
      }
    }
  };
}

const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
const TRAY_X = [-1.1, 0, 1.1, 1.5, 1.5];
const TRAY_LAYOUT = { 1: [0], 2: [-.6, .6], 3: [-1.1, 0, 1.1], 4: [-1.2, -.4, .4, 1.2], 5: [-1.5, -.75, 0, .75, 1.5] };

function numberSign(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#ffc828'; x.beginPath(); x.arc(32, 32, 29, 0, Math.PI * 2); x.fill();
  x.lineWidth = 4; x.strokeStyle = '#e63946'; x.stroke();
  x.fillStyle = '#3a1015'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(String(n), 32, 35);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(G('Plane', .42, .42), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
}

const MACHINE_BUILD = {
  burger: {
    soda(g) {
      box(1.1, 1.8, .9, 0xe63946, 0, .9, 0, g);
      box(1.1, .2, .9, 0xffffff, 0, 1.9, 0, g);
      box(.9, .9, .05, 0xffffff, 0, 1.15, .47, g);
      [[-.25, 0xffc828], [0, 0x4cb8ff], [.25, 0x4cb84c]].forEach(([x, c]) => box(.16, .16, .06, c, x, 1.4, .5, g));
      box(.18, .2, .2, 0x444444, 0, .78, .5, g);
      box(.6, .06, .35, 0x9a9a9a, 0, .5, .45, g);
    },
    burger(g) {
      box(1.4, .75, 1.0, 0x8b5a2b, 0, .375, 0, g);
      box(1.4, .12, 1.0, 0x3a3a3f, 0, .81, 0, g);
      box(1.2, .02, .8, 0xff7a2f, 0, .88, 0, g);
      box(1.4, 1.0, .1, 0x9a9a9a, 0, 1.3, -.45, g);
    },
    fries(g) {
      box(1.2, .8, 1.0, 0xb8bcc4, 0, .4, 0, g);
      box(1.0, .04, .8, 0xffc828, 0, .82, 0, g);
      box(.08, .08, .6, 0x333333, 0, .95, .5, g);
      box(.08, .5, .08, 0x333333, .45, 1.05, .25, g);
    }
  },
  pizza: {
    burger(g) { // brick pizza oven
      box(1.4, .75, 1.0, 0xa8553a, 0, .375, 0, g);
      box(1.4, .12, 1.0, 0x3a3a3f, 0, .81, 0, g);
      box(1.2, .02, .8, 0xff7a2f, 0, .88, 0, g);
      box(1.4, 1.0, .1, 0x7a3b28, 0, 1.3, -.45, g);
      box(.9, .4, .04, 0x1f1f23, 0, .4, .51, g);
      box(.3, .3, .3, 0x7a3b28, .45, 1.5, -.3, g);
    }
  },
  coffee: {
    soda(g) { // espresso machine (hot coffee)
      box(1.1, 1.8, .9, 0x6b4226, 0, .9, 0, g);
      box(1.1, .2, .9, 0xd9b38c, 0, 1.9, 0, g);
      box(.9, .9, .05, 0x2f7d5b, 0, 1.15, .47, g);
      [[-.25, 0xffc828], [0, 0xff7a2f], [.25, 0xf2f2f2]].forEach(([x, c]) => box(.16, .16, .06, c, x, 1.4, .5, g));
      box(.18, .2, .2, 0xb0b0b0, 0, .78, .5, g);
      box(.6, .06, .35, 0x9a9a9a, 0, .5, .45, g);
      box(.04, .3, .04, 0xb0b0b0, .38, 1.0, .5, g);
    },
    burger(g) { // cold brew tap (iced coffee)
      box(1.4, .75, 1.0, 0xdfeff7, 0, .375, 0, g);
      box(1.4, .12, 1.0, 0x3a3a3f, 0, .81, 0, g);
      box(1.2, .02, .8, 0x7fb8d8, 0, .88, 0, g);
      box(1.4, 1.0, .1, 0xb8c7d0, 0, 1.3, -.45, g);
      box(.6, .7, .3, 0x9ecbe0, -.3, 1.25, -.28, g);
      box(.5, .45, .26, 0x6b4226, -.3, 1.12, -.28, g);
      box(.1, .1, .2, 0xb0b0b0, 0, 1.0, -.3, g);
    },
    fries(g) { // tea kettle station
      box(1.2, .8, 1.0, 0x2f7d5b, 0, .4, 0, g);
      box(1.0, .04, .8, 0xfff1b8, 0, .82, 0, g);
      part(G('Cylinder', .22, .26, .2, 8), 0xb0b0b0, 0, .94, -.25, g);
      box(.08, .16, .3, 0xb0b0b0, 0, .96, -.02, g);
      box(.3, .04, .04, 0x333333, 0, 1.05, -.25, g);
    },
    cabinet(g) { // cup cabinet
      box(1.0, 1.7, .6, 0xa9743a, 0, .85, 0, g);
      box(1.1, .08, .7, 0x5c4033, 0, 1.74, 0, g);
      box(.46, 1.4, .04, 0xc89f6a, -.24, .9, .31, g);
      box(.46, 1.4, .04, 0xc89f6a, .24, .9, .31, g);
      box(.05, .2, .05, 0x333333, -.06, .9, .35, g);
      box(.05, .2, .05, 0x333333, .06, .9, .35, g);
      [-.3, 0, .3].forEach(x => part(G('Cylinder', .1, .07, .22, 8), 0xf5f0e6, x, 1.9, 0, g));
    }
  }
};

// Sign with text for a cabinet front.
function labelPlane(text, bg, w = .8) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 64);
  x.fillStyle = '#fff'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t }));
}

// Hospital: a counter down each side (patients line up outside them), cabinets and a register on the back counter.
function buildHospital(scene, hit) {
  const machines = {};
  [-1, 1].forEach(sd => {
    box(.6, 1.0, 3.6, 0xdfe9ef, sd * 1.55, .5, 1.1, scene);
    box(.7, .06, 3.7, 0xffffff, sd * 1.55, 1.03, 1.1, scene);
    box(.62, .1, 3.62, 0x2c8fd6, sd * 1.55, .85, 1.1, scene);
    box(.7, .02, 3.8, 0xcfe8f3, sd * 2.35, .01, 1.2, scene); // where the line stands
  });
  hit('patL', 1.8, 1.8, 1.2, -2.0, .9, -.2);
  hit('patR', 1.8, 1.8, 1.2, 2.0, .9, -.2);
  const cabinet = (key, x, body, label, bg, build) => {
    const g = new THREE.Group();
    g.position.set(x, 1.05, -3.05);
    box(.85, .9, .5, body, 0, .45, 0, g);
    box(.85, .06, .56, 0xffffff, 0, .93, 0, g);
    const l = labelPlane(label, bg);
    l.position.set(0, .72, .26);
    g.add(l);
    build(g);
    scene.add(g);
    machines[key] = g;
    hit(key, 1.0, 1.0, .7, x, 1.55, -3.05);
  };
  cabinet('medicine', -1.1, 0xf2f6f9, 'MEDICINE', '#2c8fd6', g => {
    box(.3, .08, .02, 0xe63946, 0, .4, .26, g);
    box(.08, .3, .02, 0xe63946, 0, .4, .26, g);
  });
  cabinet('bandage', 0, 0xf4efe0, 'BANDAGES', '#e63946', g => {
    [-.2, 0, .2].forEach(x => part(G('Cylinder', .08, .08, .12, 8), 0xf5e6c8, x, .5, .26, g).rotation.x = Math.PI / 2);
  });
  cabinet('register', 1.1, 0x555d66, 'PAY HERE', '#2ecc59', g => {
    box(.5, .3, .05, 0x1f2933, 0, .4, .27, g);
    box(.4, .2, .02, 0x9be7ff, 0, .4, .3, g);
  });
  // trash bin (back right)
  const bin = new THREE.Group();
  bin.position.set(2.5, 0, -2.5);
  part(G('Cylinder', .38, .3, .75, 8), 0x6f7782, 0, .375, 0, bin);
  const lid = part(G('Cylinder', .42, .42, .08, 8), 0x3f454d, 0, .78, 0, bin);
  scene.add(bin);
  hit('trash', 1.1, 1.1, 1.1, 2.5, .55, -2.5);
  return { viz: {}, lid, trays: [], machines, signs: [], trayHits: [], extraHits: [], fixtures: {}, tablePlates: {} };
}

const tub = (g, color) => {
  box(1.0, .8, 1.0, 0x8b5a2b, 0, .4, 0, g);
  box(1.05, .06, 1.05, 0xf2f2f2, 0, .83, 0, g);
  part(G('Cylinder', .38, .32, .26, 10), 0x9aa0a6, 0, .99, 0, g);
  part(G('Cylinder', .34, .34, .02, 10), color, 0, 1.12, 0, g);
};
// Walk-up fixtures of the pizza shop (local +z faces the room).
const FIXTURE_BUILD = {
  dough(g) {
    box(1.0, .8, 1.0, 0x8b5a2b, 0, .4, 0, g);
    box(1.05, .06, 1.05, 0xf2f2f2, 0, .83, 0, g);
    part(G('Sphere', .3, 10, 8), 0xf5e6c8, -.1, 1.05, .1, g).scale.y = .7;
    box(.3, .45, .25, 0xffffff, .3, 1.1, -.25, g);
  },
  sauce(g) { tub(g, TOP_COLOR.sauce); },
  cheese(g) { tub(g, TOP_COLOR.cheese); },
  pepperoni(g) { tub(g, TOP_COLOR.pepperoni); [[.1, .1], [-.12, -.08], [.12, -.12]].forEach(([x, z]) => part(G('Cylinder', .08, .08, .02, 8), 0x7a1a1a, x, 1.14, z, g)); },
  mushroom(g) { tub(g, TOP_COLOR.mushroom); [[.1, .1], [-.12, -.08]].forEach(([x, z]) => part(G('Sphere', .09, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0xf2e6cf, x, 1.13, z, g)); },
  table(g) {
    box(1.0, .08, .8, 0xc9863f, 0, .72, 0, g);
    [[-.42, -.32], [.42, -.32], [-.42, .32], [.42, .32]].forEach(([x, z]) => box(.08, .7, .08, 0x8b5a2b, x, .35, z, g));
  }
};

function buildKitchen(scene, billboards, hits) {
  // Invisible tap targets: a key, size and centre.
  const hit = (key, w, h, d, x, y, z) => {
    const m = new THREE.Mesh(G('Box', w, h, d), hitMat);
    m.position.set(x, y, z);
    m.userData.key = key;
    scene.add(m);
    hits.push(m);
    return m;
  };

  const checker = checkerTexture(activeShop().colors.tileA, activeShop().colors.tileB);
  scene.add(part(G('Plane', 80, 80), 0x7ed957, 0, -.02, 0).rotateX(-Math.PI / 2));

  // floor
  const floor = new THREE.Mesh(G('Box', 6, .2, 7), new THREE.MeshLambertMaterial({ map: checker }));
  floor.position.set(0, -.1, 0);
  scene.add(floor);

  const { wall: wallC, trim: trimC } = activeShop().colors;
  // side walls (cutaway height so equipment stays visible)
  box(.3, 2.0, 7.3, wallC, -3.15, 1.0, 0, scene);
  box(.3, 2.0, 7.3, wallC, 3.15, 1.0, 0, scene);
  box(.34, .16, 7.3, trimC, -3.15, 2.0, 0, scene);
  box(.34, .16, 7.3, trimC, 3.15, 2.0, 0, scene);

  // back wall with window opening (x -1.6..1.6, y 1.0..1.9)
  const wz = -3.5;
  box(1.7, 2.2, .3, wallC, -2.45, 1.1, wz, scene);
  box(1.7, 2.2, .3, wallC, 2.45, 1.1, wz, scene);
  box(3.2, 1.0, .3, wallC, 0, .5, wz, scene);
  box(3.2, .3, .3, wallC, 0, 2.05, wz, scene);
  box(3.4, .12, .4, trimC, 0, 1.0, wz, scene);
  box(3.4, .12, .4, trimC, 0, 1.9, wz, scene);
  box(.12, .9, .4, trimC, -1.6, 1.45, wz, scene);
  box(.12, .9, .4, trimC, 1.6, 1.45, wz, scene);
  for (let i = 0; i < 5; i++) box(.64, .08, .9, i % 2 ? 0xffffff : trimC, -1.28 + i * .64, 2.3, -4.1, scene);

  // counter along the window
  box(4, 1.0, .9, 0xc9863f, 0, .5, -3.0, scene);
  box(4.1, .06, 1.0, 0xf2f2f2, 0, 1.02, -3.0, scene);

  // lane above the room: curb, road, dashes (cars drive along x)
  box(18, .08, .3, 0xd9d9d9, 0, .04, -4.75, scene);
  box(18, .02, 2.4, 0x555a64, 0, .01, -6.0, scene);
  for (let x = -8; x <= 8; x += 2) box(.8, .025, .12, 0xffc828, x, .022, -6.0, scene);

  if (activeShop().hospital) return buildHospital(scene, hit);

  // Machines sit on the left or right wall by the sign of their layout x; they face the room.
  const L = activeShop().layout, MB = MACHINE_BUILD[activeShop().id];
  const side = k => (L[k].x < 0 ? -1 : 1);
  const mk = (k, build) => {
    const g = new THREE.Group();
    g.position.set(L[k].x, 0, L[k].z);
    g.rotation.y = -side(k) * Math.PI / 2;
    build(g);
    scene.add(g);
    return g;
  };
  const soda = L.soda && mk('soda', MB.soda), grill = mk('burger', MB.burger), fryer = L.fries && mk('fries', MB.fries);

  // trash bin (right wall, front)
  const bin = new THREE.Group();
  bin.position.set(L.bin.x, 0, L.bin.z);
  part(G('Cylinder', .38, .3, .75, 8), 0x6f7782, 0, .375, 0, bin);
  const lid = part(G('Cylinder', .42, .42, .08, 8), 0x3f454d, 0, .78, 0, bin);
  part(G('Cylinder', .1, .1, .06, 6), 0x3f454d, 0, .88, 0, lid);
  scene.add(bin);

  if (L.soda) hit('soda', 1.6, 2.3, 1.8, L.soda.x - side('soda') * .1, 1.1, L.soda.z);
  hit('burger', 1.3, 1.9, 1.6, L.burger.x, .95, L.burger.z);
  if (L.fries) hit('fries', 1.1, .9, 1.3, L.fries.x, .45, L.fries.z);
  hit('trash', 1.1, 1.1, 1.1, L.bin.x, .55, L.bin.z);

  // three trays on the counter, numbered 1-3
  const signs = [], trayHits = [];
  const trays = TRAY_X.map((x, i) => {
    const g = new THREE.Group();
    g.position.set(x, 1.05, -3.0);
    makeTrayBase(g);
    scene.add(g);
    trayHits.push(hit('tray' + i, 1.0, .9, .85, x, 1.4, -3.0));
    const sign = numberSign(i + 1);
    sign.position.set(x, 1.62, -3.3);
    scene.add(sign);
    billboards.push(sign);
    signs.push(sign);
    return g;
  });
  // Extra grill and fryer (levels with `extra`), toggled by world.setExtra.
  const grill2 = mk('burger2', MB.burger), fryer2 = L.fries2 && mk('fries2', MB.fries);
  const extraHits = [
    hit('burger2', 1.3, 1.0, 1.4, L.burger2.x, .5, L.burger2.z),
    hit('burger2', .3, 1.0, 1.4, L.burger2.x + side('burger2') * .45, 1.3, L.burger2.z),
  ];
  if (L.fries2) extraHits.push(hit('fries2', 1.1, .9, 1.3, L.fries2.x, .45, L.fries2.z));
  const machines = { burger: grill, burger2: grill2 };
  if (soda) machines.soda = soda;
  if (fryer) machines.fries = fryer;
  if (fryer2) machines.fries2 = fryer2;
  // Pizza shop fixtures: ingredient stations (on a wall) and tables (in the room).
  const fixtures = {}, tablePlates = {};
  for (const f of activeShop().fixtures || []) {
    const g = new THREE.Group();
    g.position.set(f.x, 0, f.z);
    if (f.kind !== 'table') g.rotation.y = f.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    FIXTURE_BUILD[f.kind](g);
    scene.add(g);
    machines[f.key] = g;
    const hs = f.kind === 'table' ? hit(f.key, 1.1, .85, .9, f.x, .45, f.z) : hit(f.key, 1.1, 1.3, 1.1, f.x, .65, f.z);
    fixtures[f.key] = { g, hit: hs };
    if (f.kind === 'table') {
      const pl = new THREE.Group();
      pl.position.set(f.x, .76, f.z);
      pl.scale.setScalar(1.3);
      scene.add(pl);
      tablePlates[f.key] = pl;
    }
  }
  if (L.cabinet) {
    machines.cabinet = mk('cabinet', MB.cabinet);
    hit('cabinet', 1.0, 1.9, 1.3, L.cabinet.x, .95, L.cabinet.z);
  }

  const viz = {};
  for (const k of ['soda', 'burger', 'fries', 'burger2', 'fries2']) if (L[k]) viz[k] = makeStationViz(STATIONS[k].type || k, L[k].x, L[k].z, billboards);
  for (const k in viz) scene.add(viz[k].root);
  return { viz, lid, trays, machines, signs, trayHits, extraHits, fixtures, tablePlates };
}

function checkerTexture(a, b) {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const x = c.getContext('2d');
  x.fillStyle = a; x.fillRect(0, 0, 2, 2);
  x.fillStyle = b; x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3.5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildWorker(shirt = 0xe63946) {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const shadow = new THREE.Mesh(G('Circle', .5, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = .01;
  group.add(shadow);

  const legs = [-.14, .14].map(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, .5, 0);
    box(.2, .5, .22, 0x2b3a67, 0, -.25, 0, pivot);
    body.add(pivot);
    return pivot;
  });
  box(.6, .6, .38, shirt, 0, .8, 0, body);
  box(.5, .5, .04, 0xffffff, 0, .75, .21, body);
  part(G('Sphere', .26, 10, 8), 0xffd2a8, 0, 1.38, 0, body);
  part(G('Cylinder', .27, .25, .24, 8), 0xffffff, 0, 1.68, 0, body);
  part(G('Cylinder', .275, .275, .06, 8), shirt, 0, 1.6, 0, body);
  [.06, -.06].forEach(x => part(G('Sphere', .035, 4, 4), 0x222222, x * 2, 1.42, .24, body));
  const arms = [-.4, .4].map(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.05, 0);
    box(.14, .5, .14, shirt, 0, -.25, 0, pivot);
    part(G('Sphere', .09, 6, 6), 0xffd2a8, 0, -.52, 0, pivot);
    body.add(pivot);
    return pivot;
  });
  return { group, body, legs, arms };
}

// Standing obstacles ({x, z, r}) the worker walks around; set per shop in buildWorld.
let OBSTACLES = [];

// Aim point for walking from (px, pz) to (tx, tz): a waypoint beside the first obstacle on the straight path, else the target.
function steer(px, pz, tx, tz) {
  for (const o of OBSTACLES) {
    const dx = tx - px, dz = tz - pz, len = Math.hypot(dx, dz);
    if (len < 1e-4) continue;
    const ux = dx / len, uz = dz / len;
    const ox = o.x - px, oz = o.z - pz;
    const t = ox * ux + oz * uz, cross = ux * oz - uz * ox;
    if (t <= 0 || t >= len || Math.abs(cross) >= o.r) continue;
    const k = (cross >= 0 ? -1 : 1) * (o.r + .2);
    return [o.x - uz * k, o.z + ux * k];
  }
  return [tx, tz];
}

// A person for the hospital lines: the worker model in a coloured top. { group, body, legs, arms }
export function makePatient(shirt) {
  return buildWorker(shirt);
}

function turn(cur, want, maxStep) {
  const d = ((want - cur + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return cur + Math.max(-maxStep, Math.min(maxStep, d));
}

function makeWorker() {
  const { group, body, legs, arms } = buildWorker();
  group.position.set(0, 0, .5);
  let faceWant = 0, bobT = 0, kick = 0, hopT = 0, hopN = 1;
  const w = {
    group, target: null, at: null, moving: false, held: [], onArrive: null,
    walkTo(key) { w.target = key; w.at = null; },
    kick() { kick = .3; },
    hop() { hopT = .35; hopN = 1; },
    bounce() { hopT = .6; hopN = 2; },
    setHeld(types, asTray) {
      w.held = asTray ? ['tray'] : types.slice();
      for (let i = body.children.length - 1; i >= 0; i--) if (body.children[i].userData.item) body.remove(body.children[i]);
      if (asTray) {
        const tray = new THREE.Group();
        makeTrayBase(tray);
        layItems(tray, types);
        tray.userData.item = true;
        tray.scale.setScalar(.6);
        tray.position.set(0, .5, .6);
        body.add(tray);
        return;
      }
      types.forEach((t, i) => {
        const it = makeItem(t);
        it.userData.item = true;
        it.scale.setScalar(.8);
        it.position.set(types.length === 1 ? 0 : (i ? .24 : -.24), .55, .55);
        body.add(it);
      });
    },
    update(dt) {
      w.moving = false;
      if (w.target) {
        const s = SPOTS[w.target];
        const tx = s.x - group.position.x, tz = s.z - group.position.z;
        const dist = Math.hypot(tx, tz), step = (w.speed || WORKER.speed) * dt;
        const [ax, az] = steer(group.position.x, group.position.z, s.x, s.z);
        const dx = ax - group.position.x, dz = az - group.position.z, ad = Math.hypot(dx, dz) || 1;
        if (dist <= step + 1e-4) {
          group.position.x = s.x; group.position.z = s.z;
          faceWant = s.face;
          const key = w.target;
          w.target = null; w.at = key;
          if (w.onArrive) w.onArrive(key);
        } else if (step > 0) {
          group.position.x += dx / ad * step;
          group.position.z += dz / ad * step;
          for (const o of OBSTACLES) {
            const ex = group.position.x - o.x, ez = group.position.z - o.z, ed = Math.hypot(ex, ez);
            if (ed < o.r * .8 && ed > 1e-4) { group.position.x = o.x + ex / ed * o.r * .8; group.position.z = o.z + ez / ed * o.r * .8; }
          }
          faceWant = Math.atan2(dx, dz);
          w.moving = true;
        } else {
          w.moving = true;
        }
      }
      group.rotation.y = turn(group.rotation.y, faceWant, 20 * dt);
      if (w.moving && dt > 0) bobT += dt * WORKER.bobRate;
      const sw = w.moving ? Math.sin(bobT) : 0;
      body.position.y = w.moving ? Math.abs(sw) * .08 : body.position.y * .8;
      // A hop (handing over) or two happy bounces (order sent).
      if (hopT > 0) {
        const len = hopN === 2 ? .6 : .35;
        hopT = Math.max(0, hopT - dt);
        group.position.y = Math.abs(Math.sin(Math.PI * hopN * (1 - hopT / len))) * (hopN === 2 ? .22 : .3);
      } else group.position.y = 0;
      legs[0].rotation.x = sw * .7;
      legs[1].rotation.x = -sw * .7;
      if (kick > 0) kick = Math.max(0, kick - dt);
      const raise = -Math.sin(Math.PI * (1 - kick / .3)) * (kick > 0 ? .9 : 0);
      const base = w.held.length ? -1.1 : 0;
      arms[0].rotation.x = base + (w.held.length ? 0 : sw * .6) + raise;
      arms[1].rotation.x = base + (w.held.length ? 0 : -sw * .6) + raise;
    },
    stateText() {
      return w.target ? `walking -> ${w.target}` : `idle @ ${w.at || 'start'}`;
    }
  };
  return w;
}

// Camera framing: smallest distance that fits FIT_POINTS, centred between the HUD (top) and button bar (bottom).
const NX = .94, Y_LO = -.62, Y_HI = .58;
export function fitCamera(camera, aspect) {
  camera.aspect = aspect;
  camera.fov = FOV;
  camera.near = 1;
  camera.far = 200;
  const yaw = 0, pitch = 1.0;
  const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const tanH = Math.tan(FOV * Math.PI / 360);
  const target = new THREE.Vector3();
  const v = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();

  function measure(d) {
    target.set(0, .3, -1.5);
    let r;
    for (let i = 0; i < 4; i++) {
      camera.position.copy(target).addScaledVector(dir, d);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of FIT_POINTS) {
        v.copy(p).project(camera);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x);
        y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      r = { sx: x1 - x0, sy: y1 - y0 };
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, (x0 + x1) / 2 * d * tanH * aspect);
      target.addScaledVector(up, ((y0 + y1) / 2 - (Y_LO + Y_HI) / 2) * d * tanH);
    }
    return r;
  }

  let lo = 6, hi = 120;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2, r = measure(mid);
    if (r.sx <= NX * 2 && r.sy <= Y_HI - Y_LO) hi = mid; else lo = mid;
  }
  measure(hi);
  return hi;
}

export function buildWorld() {
  const L = activeShop().layout;
  Object.assign(SPOTS, activeShop().spots || {});
  for (const f of activeShop().fixtures || []) {
    const sd = f.x < 0 ? -1 : 1;
    SPOTS[f.key] = f.spot || { x: sd * 1.9, z: f.z, face: sd * Math.PI / 2 };
  }
  for (const k of ['soda', 'burger', 'fries', 'burger2', 'fries2', 'bin', 'cabinet']) {
    if (!L[k]) continue;
    const sd = L[k].x < 0 ? -1 : 1;
    SPOTS[k === 'bin' ? 'trash' : k] = { x: sd * 1.9, z: L[k].z, face: sd * Math.PI / 2 };
  }
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ed1fc);
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-4, 8, 6);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(FOV, .5, 1, 200);
  const billboards = [];
  const hits = [];
  const { viz, lid, trays, machines, signs, trayHits, extraHits, fixtures, tablePlates } = buildKitchen(scene, billboards, hits);
  const worker = makeWorker();
  scene.add(worker.group);
  const npcCfg = activeShop().npc;
  const npcObs = npcCfg && { x: npcCfg.x, z: npcCfg.z, r: npcCfg.r };
  OBSTACLES = npcObs ? [npcObs] : [];
  const nv = { tx: null, tz: null, wait: 1 }; // the other worker's wander state
  let npc = null;
  if (npcCfg) {
    npc = buildWorker(activeShop().colors.trim);
    npc.group.position.set(npcCfg.x, 0, npcCfg.z);
    npc.group.rotation.y = Math.PI;
    scene.add(npc.group);
  }

  let binT = 0, friesPop = 0, friesHit = null;
  const wob = {};
  return {
    scene, camera, worker, viz, billboards, hits,
    // Show the items sitting on tray i (2x2 grid).
    setTray(i, types) {
      layItems(trays[i], types);
    },
    // Level setup: show only n trays (1-3), spread along the window.
    setTrayCount(n) {
      trays.forEach((g, i) => {
        const on = i < n, x = TRAY_LAYOUT[n][i];
        g.visible = signs[i].visible = on;
        g.scale.setScalar(n >= 5 ? .75 : 1);
        trayHits[i].scale.x = n >= 5 ? .75 : 1;
        trayHits[i].userData.key = on ? 'tray' + i : null;
        if (on) {
          g.position.x = signs[i].position.x = trayHits[i].position.x = SPOTS['tray' + i].x = x;
        }
      });
    },
    // Level setup: show the extra grill and fryer and make them tappable (or hide them).
    setExtra(on) {
      for (const k of ['burger2', 'fries2']) if (machines[k]) machines[k].visible = viz[k].root.visible = on;
      extraHits.forEach(h => {
        const i = hits.indexOf(h);
        if (on && i < 0) hits.push(h);
        else if (!on && i >= 0) hits.splice(i, 1);
      });
    },
    // Endless mode: the fryer (fries/tea kettle) appears at a later wave, popping in when `pop` is set.
    setFries(on, pop) {
      if (!machines.fries) return;
      machines.fries.visible = on;
      if (viz.fries) viz.fries.root.visible = on;
      if (!friesHit) friesHit = hits.find(x => x.userData.key === 'fries');
      if (friesHit) {
        const j = hits.indexOf(friesHit);
        if (on && j < 0) hits.push(friesHit);
        else if (!on && j >= 0) hits.splice(j, 1);
      }
      friesPop = on && pop && !reducedMotion() ? .45 : 0;
      machines.fries.scale.setScalar(on ? (friesPop ? .01 : 1) : 1);
    },
    // Pizza shop: show only the ingredient stations this level uses (tables always stay).
    setFixtures(keys) {
      for (const k in fixtures) {
        const on = k.startsWith('table') || keys.includes(k), i = hits.indexOf(fixtures[k].hit);
        fixtures[k].g.visible = on;
        if (on && i < 0) hits.push(fixtures[k].hit);
        else if (!on && i >= 0) hits.splice(i, 1);
      }
    },
    // The plate on table k: dough plus the toppings added so far (or nothing).
    setTable(k, t) {
      const pl = tablePlates[k];
      for (let j = pl.children.length - 1; j >= 0; j--) pl.remove(pl.children[j]);
      if (t.dough) pl.add(makeItem('plate:' + t.tops.join('+')));
    },
    // A tray picked up by the worker leaves its slot until it is set down or thrown out.
    setTrayVisible(i, on) { trays[i].visible = on; },
    wobble(key) { wob[key] = .3; },
    addCar(c) { scene.add(c); },
    removeCar(c) { scene.remove(c); },
    binPop() { binT = .3; },
    update(dt, t) {
      if (friesPop > 0) { // pop-in with a little overshoot
        friesPop = Math.max(0, friesPop - dt);
        const u = 1 - friesPop / .45, c = 1.70158;
        machines.fries.scale.setScalar(1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2);
      }
      for (const k in wob) {
        if (wob[k] > 0) wob[k] = Math.max(0, wob[k] - dt);
        const m = machines[k];
        if (m) m.scale.setScalar(1 + Math.sin(Math.PI * (1 - wob[k] / .3)) * (wob[k] > 0 ? .08 : 0));
      }
      if (npc) {
        // The other worker wanders: half the time to a random spot, half into the player's way.
        const p = npc.group.position, wp = worker.group.position;
        let moving = false, dx = 0, dz = 0;
        if (nv.tx === null) {
          nv.wait -= dt;
          if (nv.wait <= 0) {
            let x, z;
            if (Math.random() < .5) {
              const sp = worker.target && SPOTS[worker.target];
              x = sp ? (wp.x + sp.x) / 2 : wp.x;
              z = sp ? (wp.z + sp.z) / 2 : wp.z;
            } else {
              x = (Math.random() * 2 - 1) * 1.1;
              z = -1.3 + Math.random() * 3.6;
            }
            nv.tx = Math.max(-1.1, Math.min(1.1, x));
            nv.tz = Math.max(-1.3, Math.min(2.3, z));
          }
        } else {
          dx = nv.tx - p.x; dz = nv.tz - p.z;
          const d = Math.hypot(dx, dz), step = 1.6 * dt;
          if (d <= step) {
            p.x = nv.tx; p.z = nv.tz;
            nv.tx = null; nv.wait = .4 + Math.random() * 1.4;
          } else {
            const nx = p.x + dx / d * step, nz = p.z + dz / d * step;
            if (Math.hypot(nx - wp.x, nz - wp.z) < .95) { nv.tx = null; nv.wait = .3; } // don't walk into the player
            else { p.x = nx; p.z = nz; moving = true; }
          }
        }
        npcObs.x = p.x; npcObs.z = p.z;
        if (moving) npc.group.rotation.y = turn(npc.group.rotation.y, Math.atan2(dx, dz), 8 * dt);
        const sw = moving ? Math.sin(t * 10) : 0;
        npc.legs[0].rotation.x = sw * .7;
        npc.legs[1].rotation.x = -sw * .7;
        npc.arms[0].rotation.x = moving ? sw * .6 : -.9 + Math.sin(t * 4) * .2;
        npc.arms[1].rotation.x = moving ? -sw * .6 : -.9 - Math.sin(t * 4) * .2;
        npc.body.position.y = moving ? Math.abs(sw) * .08 : Math.abs(Math.sin(t * 2)) * .02;
      }
      Object.values(viz).forEach(v => v.update(t));
      if (binT > 0) binT = Math.max(0, binT - dt);
      lid.position.y = .78 + Math.sin(Math.PI * (1 - binT / .3)) * (binT > 0 ? .15 : 0);
    }
  };
}

export function createWorld(canvas) {
  const world = buildWorld();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  world.renderer = renderer;
  // Renders a scene to a transparent N x N picture (data URL).
  const snap = (sc, cam, N) => {
    const rt = new THREE.WebGLRenderTarget(N, N);
    const prevClear = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(sc, cam);
    const px = new Uint8Array(N * N * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, N, N, px);
    renderer.setRenderTarget(null);
    renderer.setClearColor(prevClear, prevAlpha);
    rt.dispose();
    const c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d'), img = x.createImageData(N, N);
    const enc = v => Math.round(255 * (v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055));
    for (let y = 0; y < N; y++) for (let i = 0; i < N * 4; i += 4) {
      const s = (N - 1 - y) * N * 4 + i, d = y * N * 4 + i;
      img.data[d] = enc(px[s] / 255); img.data[d + 1] = enc(px[s + 1] / 255); img.data[d + 2] = enc(px[s + 2] / 255); img.data[d + 3] = px[s + 3];
    }
    x.putImageData(img, 0, 0);
    return c.toDataURL();
  };
  // Low-poly customer face ('happy' or 'angry') as a picture, same style as the item icons.
  world.faceIcon = kind => {
    if (icons['face:' + kind]) return icons['face:' + kind];
    const angry = kind === 'angry', sc = new THREE.Scene();
    sc.add(new THREE.AmbientLight(0xffffff, 1.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(-3, 4, 8);
    sc.add(sun);
    const g = new THREE.Group();
    sc.add(g);
    part(G('Icosahedron', .4, 1), angry ? 0xe8452c : 0xffd23f, 0, 0, 0, g);
    const dark = 0x2b1a14;
    for (const sx of [-1, 1]) {
      box(.08, angry ? .1 : .14, .1, dark, sx * .14, .07, .36, g);
      if (angry) box(.22, .05, .1, dark, sx * .13, .17, .36, g).rotation.z = -sx * .5; // brows slant down toward the nose
      else box(.07, .05, .08, 0xff8a7a, sx * .25, -.07, .33, g); // cheeks
    }
    const mouth = part(G('Torus', .15, .035, 4, 6, Math.PI), dark, 0, angry ? -.2 : -.02, .36, g);
    mouth.rotation.z = angry ? 0 : Math.PI; // arc up = frown, arc down = smile
    const cam = new THREE.OrthographicCamera(-.5, .5, .5, -.5, .1, 20);
    cam.position.set(0, 0, 8);
    cam.lookAt(0, 0, 0);
    cam.updateMatrixWorld(true);
    return (icons['face:' + kind] = snap(sc, cam, 160));
  };
  // Picture of a food (3D item on a transparent background, seen from the game camera angle), as a data URL.
  const icons = {};
  world.itemIcon = type => {
    if (icons[type]) return icons[type];
    const N = 160, sc = new THREE.Scene();
    sc.add(new THREE.AmbientLight(0xffffff, 1.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(-4, 8, 6);
    sc.add(sun);
    const pitch = 1.0, cy = itemInfo(type).cy;
    const cam = new THREE.OrthographicCamera(-.5, .5, .5, -.5, .1, 20);
    cam.position.set(0, cy + Math.sin(pitch) * 8, Math.cos(pitch) * 8);
    cam.lookAt(0, cy, 0);
    cam.updateMatrixWorld(true);
    const item = makeItem(type);
    item.scale.setScalar(1.4);
    item.position.y = -.3;
    sc.add(item);
    return (icons[type] = snap(sc, cam, N));
  };

  const v = new THREE.Vector3();
  let W = 1, H = 1;
  // World point -> pixel position on the canvas (same box as the HTML overlay).
  world.project = (x, y, z) => {
    v.set(x, y, z).project(world.camera);
    return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H };
  };
  world.resize = () => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    W = w; H = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    fitCamera(world.camera, w / h);
    world.billboards.forEach(b => b.quaternion.copy(world.camera.quaternion));
  };
  const rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
  // Screen position -> key of the tapped machine/tray/bin, or null.
  world.pick = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(ndc, world.camera);
    const h = rc.intersectObjects(world.hits, false)[0];
    return h ? h.object.userData.key : null;
  };
  world.render = () => renderer.render(world.scene, world.camera);
  world.dispose = () => { renderer.dispose(); renderer.forceContextLoss(); };
  world.resize();
  return world;
}

// Live backdrop for the main menu: the shop's room with the worker pacing and cars looping past the window. Returns { stop() }.
export function createMenuScene(canvas, shop) {
  const prev = activeShop();
  let world;
  try {
    useShop(shop);
    world = createWorld(canvas);
  } finally {
    useShop(prev);
  }
  world.renderer.setPixelRatio(1);
  world.resize();
  world.setTrayCount(shop.levels && shop.levels[0].trays ? Math.min(3, shop.levels[0].trays) : 1);
  world.setExtra(false);
  if (shop.pizza) world.setFixtures(['dough', ...PIZZA_TOPS]);
  const cars = [];
  let raf = 0, last = performance.now(), acc = 0, t = 0, carT = 0, walkT = 0, side = 0;
  const reduced = reducedMotion();
  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .1);
    last = now;
    acc += dt;
    if (acc < 1 / 30) return; // 30 fps is plenty behind a blur
    const step = acc;
    acc = 0;
    t += step;
    walkT -= step;
    if (walkT <= 0) { world.worker.walkTo(side++ % 2 ? 'trash' : 'tray0'); walkT = 3.5; }
    world.worker.update(step);
    world.update(step, t);
    carT -= step;
    if (carT <= 0 && !reduced) {
      const g = makeCar(Math.floor(Math.random() * CAR_VARIANTS), CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
      g.position.set(-9, 0, LANE_Z);
      world.addCar(g);
      cars.push(g);
      carT = 4.5;
    }
    for (let i = cars.length - 1; i >= 0; i--) {
      const c = cars[i];
      c.position.x += 2.6 * step;
      c.position.y = Math.abs(Math.sin(t * 20 + i)) * .02;
      if (c.position.x > 9) { world.removeCar(c); cars.splice(i, 1); }
    }
    world.render();
  };
  raf = requestAnimationFrame(frame);
  return {
    stop() {
      cancelAnimationFrame(raf);
      cars.forEach(c => world.removeCar(c));
      world.dispose();
    }
  };
}
