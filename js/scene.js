import * as THREE from '../lib/three.module.min.js';
import { WORKER } from './levels.js';

// World layout. x: right, y: up, z: toward the camera (bottom of screen).
// Room x -3..3, z -3.5..3.5, open toward the camera. Back wall (top of screen) has the window; the lane runs along x beyond it.
const SPOTS = {
  soda:   { x: -1.9, z: -1.2, face: -Math.PI / 2 },
  burger: { x: 1.9,  z: -1.2, face: Math.PI / 2 },
  fries:  { x: -1.9, z: 1.6,  face: -Math.PI / 2 },
  trash:  { x: 1.9,  z: 1.6,  face: Math.PI / 2 },
  tray0:  { x: -1.1, z: -2.1, face: Math.PI },
  tray1:  { x: 0,    z: -2.1, face: Math.PI },
  tray2:  { x: 1.1,  z: -2.1, face: Math.PI }
};
export { SPOTS };
const EQUIP_X = 2.55;
const VIZ_POS = { soda: [-EQUIP_X, -1.2], burger: [EQUIP_X, -1.2], fries: [-EQUIP_X, 1.6] };

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
export function makeItem(type) {
  const g = new THREE.Group();
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
  return g;
}

// Cars face +x and drive along the lane (z = LANE_Z). Origin at the middle of the car, wheels on y = 0.
export const LANE_Z = -6;
export const CAR_VARIANTS = 4;
export const CAR_COLORS = [0x3b82f6, 0x2ecc71, 0xff8c42, 0xb06cff, 0xf2f2f2, 0xffd23f];

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
  [.28, -.28].forEach(z => {
    box(.05, .1, .16, 0xfff0a0, len / 2, .42, z, body);
    box(.05, .1, .16, 0xd62828, -len / 2, .42, z, body);
  });
  const shadow = new THREE.Mesh(G('Circle', 1, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(len * .55, .6, 1);
  shadow.position.y = .03;
  g.add(shadow);
  g.userData.body = body;
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

function makeStationViz(type, x, z, billboards) {
  const root = new THREE.Group();
  root.position.set(x, 2.35, z);
  const bar = makeBar();
  const ready = new THREE.Group();
  ready.position.y = .75;
  const glow = new THREE.Mesh(G('Circle', .46, 20), glowMat);
  // Sits slightly behind the item (away from the camera) so the item draws in front of it.
  // Placed along the camera's view ray from the item's visual center (pitch 1.0), so it looks centered.
  const cy = { soda: .05, burger: -.09, fries: -.05 }[type];
  glow.position.set(0, cy - .378, -.243);
  glow.add(new THREE.Mesh(G('Ring', .46, .52, 24), ringMat));
  const item = makeItem(type);
  item.scale.setScalar(1.4);
  item.position.y = -.3;
  ready.add(glow, item);

  // Burnt food: charred item with smoke puffs rising.
  const burnt = new THREE.Group();
  burnt.position.y = .45;
  const charred = makeItem(type);
  charred.scale.setScalar(1.4);
  charred.traverse(o => { if (o.isMesh) o.material = M(0x26221f); });
  burnt.add(charred);
  const puffs = [0, 1, 2].map(() => {
    const p = new THREE.Mesh(G('Sphere', .16, 6, 5), new THREE.MeshBasicMaterial({ color: 0x777777, transparent: true, depthWrite: false }));
    burnt.add(p);
    return p;
  });

  // The finished item sits on the machine until the worker picks it up.
  const [ox, sy] = { soda: [.45, .56], burger: [0, .9], fries: [0, .85] }[type];
  const onMachine = makeItem(type);
  onMachine.scale.setScalar(1.3);
  onMachine.position.set(ox * Math.sign(-x), sy - 2.35, 0);
  const burntOnMachine = makeItem(type);
  burntOnMachine.traverse(o => { if (o.isMesh) o.material = M(0x26221f); });
  burntOnMachine.scale.copy(onMachine.scale);
  burntOnMachine.position.copy(onMachine.position);
  root.add(onMachine, burntOnMachine);

  const check = makeCheck();
  check.position.y = 1.55;
  check.visible = false;
  root.add(bar, ready, burnt, check);
  billboards.push(bar, glow, check);
  bar.visible = ready.visible = burnt.visible = onMachine.visible = burntOnMachine.visible = false;
  let pinged = false, pingAt = 0;
  return {
    root,
    // Quick green checkmark when an item finishes.
    ping() { pinged = true; },
    set(state, p) {
      bar.visible = state === 'making';
      ready.visible = onMachine.visible = state === 'ready';
      burntOnMachine.visible = state === 'burnt';
      burnt.visible = state === 'burnt';
      if (bar.visible) bar.userData.fill.scale.x = Math.max(.001, p);
    },
    update(t) {
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
const TRAY_X = [-1.1, 0, 1.1];
const TRAY_LAYOUT = { 1: [0], 2: [-.6, .6], 3: [-1.1, 0, 1.1] };

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

  const checker = checkerTexture();
  scene.add(part(G('Plane', 80, 80), 0x7ed957, 0, -.02, 0).rotateX(-Math.PI / 2));

  // floor
  const floor = new THREE.Mesh(G('Box', 6, .2, 7), new THREE.MeshLambertMaterial({ map: checker }));
  floor.position.set(0, -.1, 0);
  scene.add(floor);

  // side walls (cutaway height so equipment stays visible)
  box(.3, 2.0, 7.3, 0xfff1b8, -3.15, 1.0, 0, scene);
  box(.3, 2.0, 7.3, 0xfff1b8, 3.15, 1.0, 0, scene);
  box(.34, .16, 7.3, 0xe63946, -3.15, 2.0, 0, scene);
  box(.34, .16, 7.3, 0xe63946, 3.15, 2.0, 0, scene);

  // back wall with window opening (x -1.6..1.6, y 1.0..1.9)
  const wz = -3.5;
  box(1.7, 2.2, .3, 0xfff1b8, -2.45, 1.1, wz, scene);
  box(1.7, 2.2, .3, 0xfff1b8, 2.45, 1.1, wz, scene);
  box(3.2, 1.0, .3, 0xfff1b8, 0, .5, wz, scene);
  box(3.2, .3, .3, 0xfff1b8, 0, 2.05, wz, scene);
  box(3.4, .12, .4, 0xe63946, 0, 1.0, wz, scene);
  box(3.4, .12, .4, 0xe63946, 0, 1.9, wz, scene);
  box(.12, .9, .4, 0xe63946, -1.6, 1.45, wz, scene);
  box(.12, .9, .4, 0xe63946, 1.6, 1.45, wz, scene);
  for (let i = 0; i < 5; i++) box(.64, .08, .9, i % 2 ? 0xffffff : 0xe63946, -1.28 + i * .64, 2.3, -4.1, scene);

  // counter along the window
  box(4, 1.0, .9, 0xc9863f, 0, .5, -3.0, scene);
  box(4.1, .06, 1.0, 0xf2f2f2, 0, 1.02, -3.0, scene);

  // lane above the room: curb, road, dashes (cars drive along x)
  box(18, .08, .3, 0xd9d9d9, 0, .04, -4.75, scene);
  box(18, .02, 2.4, 0x555a64, 0, .01, -6.0, scene);
  for (let x = -8; x <= 8; x += 2) box(.8, .025, .12, 0xffc828, x, .022, -6.0, scene);

  // soda machine (left wall)
  const soda = new THREE.Group();
  soda.position.set(-EQUIP_X, 0, -1.2);
  soda.rotation.y = Math.PI / 2;
  box(1.1, 1.8, .9, 0xe63946, 0, .9, 0, soda);
  box(1.1, .2, .9, 0xffffff, 0, 1.9, 0, soda);
  box(.9, .9, .05, 0xffffff, 0, 1.15, .47, soda);
  [[-.25, 0xffc828], [0, 0x4cb8ff], [.25, 0x4cb84c]].forEach(([x, c]) => box(.16, .16, .06, c, x, 1.4, .5, soda));
  box(.18, .2, .2, 0x444444, 0, .78, .5, soda);
  box(.6, .06, .35, 0x9a9a9a, 0, .5, .45, soda);
  scene.add(soda);

  // grill (right wall)
  const grill = new THREE.Group();
  grill.position.set(EQUIP_X, 0, -1.2);
  grill.rotation.y = -Math.PI / 2;
  box(1.4, .75, 1.0, 0x8b5a2b, 0, .375, 0, grill);
  box(1.4, .12, 1.0, 0x3a3a3f, 0, .81, 0, grill);
  box(1.2, .02, .8, 0xff7a2f, 0, .88, 0, grill);
  box(1.4, 1.0, .1, 0x9a9a9a, 0, 1.3, -.45, grill);
  scene.add(grill);

  // fryer (left wall, front)
  const fryer = new THREE.Group();
  fryer.position.set(-EQUIP_X, 0, 1.6);
  fryer.rotation.y = Math.PI / 2;
  box(1.2, .8, 1.0, 0xb8bcc4, 0, .4, 0, fryer);
  box(1.0, .04, .8, 0xffc828, 0, .82, 0, fryer);
  box(.08, .08, .6, 0x333333, 0, .95, .5, fryer);
  box(.08, .5, .08, 0x333333, .45, 1.05, .25, fryer);
  scene.add(fryer);

  // trash bin (right wall, front)
  const bin = new THREE.Group();
  bin.position.set(2.6, 0, 1.6);
  part(G('Cylinder', .38, .3, .75, 8), 0x6f7782, 0, .375, 0, bin);
  const lid = part(G('Cylinder', .42, .42, .08, 8), 0x3f454d, 0, .78, 0, bin);
  part(G('Cylinder', .1, .1, .06, 6), 0x3f454d, 0, .88, 0, lid);
  scene.add(bin);

  hit('soda', 1.6, 2.3, 1.8, -EQUIP_X + .1, 1.1, -1.2);
  hit('burger', 1.3, 1.9, 1.6, EQUIP_X, .95, -1.2);
  hit('fries', 1.1, .9, 1.3, -EQUIP_X, .45, 1.6);
  hit('trash', 1.1, 1.1, 1.1, 2.6, .55, 1.6);
  for (const k in VIZ_POS) hit(k, 1.5, 1.3, 1.5, VIZ_POS[k][0], 3.0, VIZ_POS[k][1]).userData.bubble = true;

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
  const machines = { soda, burger: grill, fries: fryer };

  const viz = {};
  for (const k in VIZ_POS) viz[k] = makeStationViz(k, VIZ_POS[k][0], VIZ_POS[k][1], billboards);
  for (const k in viz) scene.add(viz[k].root);
  return { viz, lid, trays, machines, signs, trayHits };
}

function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const x = c.getContext('2d');
  x.fillStyle = '#fff6d6'; x.fillRect(0, 0, 2, 2);
  x.fillStyle = '#f4c542'; x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3.5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildWorker() {
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
  box(.6, .6, .38, 0xe63946, 0, .8, 0, body);
  box(.5, .5, .04, 0xffffff, 0, .75, .21, body);
  part(G('Sphere', .26, 10, 8), 0xffd2a8, 0, 1.38, 0, body);
  part(G('Cylinder', .27, .25, .24, 8), 0xffffff, 0, 1.68, 0, body);
  part(G('Cylinder', .275, .275, .06, 8), 0xe63946, 0, 1.6, 0, body);
  [.06, -.06].forEach(x => part(G('Sphere', .035, 4, 4), 0x222222, x * 2, 1.42, .24, body));
  const arms = [-.4, .4].map(x => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.05, 0);
    box(.14, .5, .14, 0xe63946, 0, -.25, 0, pivot);
    part(G('Sphere', .09, 6, 6), 0xffd2a8, 0, -.52, 0, pivot);
    body.add(pivot);
    return pivot;
  });
  return { group, body, legs, arms };
}

function turn(cur, want, maxStep) {
  const d = ((want - cur + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return cur + Math.max(-maxStep, Math.min(maxStep, d));
}

function makeWorker() {
  const { group, body, legs, arms } = buildWorker();
  group.position.set(0, 0, .5);
  let faceWant = 0, bobT = 0, kick = 0;
  const w = {
    group, target: null, at: null, moving: false, held: [], onArrive: null,
    walkTo(key) { w.target = key; w.at = null; },
    kick() { kick = .3; },
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
        const dx = s.x - group.position.x, dz = s.z - group.position.z;
        const dist = Math.hypot(dx, dz), step = WORKER.speed * dt;
        if (dist <= step + 1e-4) {
          group.position.x = s.x; group.position.z = s.z;
          faceWant = s.face;
          const key = w.target;
          w.target = null; w.at = key;
          if (w.onArrive) w.onArrive(key);
        } else if (step > 0) {
          group.position.x += dx / dist * step;
          group.position.z += dz / dist * step;
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
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8ed1fc);
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-4, 8, 6);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(FOV, .5, 1, 200);
  const billboards = [];
  const hits = [];
  const { viz, lid, trays, machines, signs, trayHits } = buildKitchen(scene, billboards, hits);
  const worker = makeWorker();
  scene.add(worker.group);

  let binT = 0;
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
        trayHits[i].userData.key = on ? 'tray' + i : null;
        if (on) {
          g.position.x = signs[i].position.x = trayHits[i].position.x = SPOTS['tray' + i].x = x;
        }
      });
    },
    // A tray picked up by the worker leaves its slot until it is set down or thrown out.
    setTrayVisible(i, on) { trays[i].visible = on; },
    wobble(key) { wob[key] = .3; },
    addCar(c) { scene.add(c); },
    removeCar(c) { scene.remove(c); },
    binPop() { binT = .3; },
    update(dt, t) {
      for (const k in wob) {
        if (wob[k] > 0) wob[k] = Math.max(0, wob[k] - dt);
        const m = machines[k];
        if (m) m.scale.setScalar(1 + Math.sin(Math.PI * (1 - wob[k] / .3)) * (wob[k] > 0 ? .08 : 0));
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
    // Bubble boxes float above machines and can sit in front of another one, so they only count when no machine body is hit.
    const all = rc.intersectObjects(world.hits, false);
    const h = all.find(i => !i.object.userData.bubble) || all[0];
    return h ? h.object.userData.key : null;
  };
  world.render = () => renderer.render(world.scene, world.camera);
  world.dispose = () => { renderer.dispose(); renderer.forceContextLoss(); };
  world.resize();
  return world;
}
