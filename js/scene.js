import * as THREE from '../lib/three.module.min.js';
import { WORKER } from './levels.js';

// World layout. x: right, y: up, z: toward the camera (bottom of screen).
// Room x -3..3, z -3.5..3.5, open toward the camera. Back wall (top of screen) has the window; the lane runs along x beyond it.
const SPOTS = {
  soda:   { x: -1.9, z: -1.2, face: -Math.PI / 2 },
  burger: { x: 1.9,  z: -1.2, face: Math.PI / 2 },
  fries:  { x: -1.9, z: 1.6,  face: -Math.PI / 2 },
  trash:  { x: 1.9,  z: 1.6,  face: Math.PI / 2 },
  car:    { x: 0,    z: -2.1, face: Math.PI }
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

const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: .6, depthTest: false });

function makeStationViz(type, x, z, billboards) {
  const root = new THREE.Group();
  root.position.set(x, 2.35, z);
  const bar = makeBar();
  const ready = new THREE.Group();
  ready.position.y = .75;
  const glow = new THREE.Mesh(G('Circle', .55, 16), glowMat);
  glow.renderOrder = 9;
  const item = makeItem(type);
  item.scale.setScalar(1.4);
  item.position.y = -.3;
  ready.add(glow, item);
  root.add(bar, ready);
  billboards.push(bar, glow);
  bar.visible = ready.visible = false;
  return {
    set(state, p) {
      bar.visible = state === 'making';
      ready.visible = state === 'ready';
      if (bar.visible) bar.userData.fill.scale.x = Math.max(.001, p);
    },
    update(t) {
      if (!ready.visible) return;
      item.position.y = -.3 + Math.sin(t * 5) * .06;
      glow.scale.setScalar(1 + Math.sin(t * 6) * .12);
    }
  };
}

function buildKitchen(scene, billboards) {
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

  const viz = {};
  for (const k in VIZ_POS) viz[k] = makeStationViz(k, VIZ_POS[k][0], VIZ_POS[k][1], billboards);
  return { viz, lid };
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
    setHeld(types) {
      w.held = types.slice();
      for (let i = body.children.length - 1; i >= 0; i--) if (body.children[i].userData.item) body.remove(body.children[i]);
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
const NX = .94, Y_LO = -.62, Y_HI = .86;
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
  const { viz, lid } = buildKitchen(scene, billboards);
  const worker = makeWorker();
  scene.add(worker.group);

  const ledge = new THREE.Group();
  ledge.position.set(0, 1.05, -3.0);
  scene.add(ledge);

  let binT = 0;
  return {
    scene, camera, worker, viz, billboards,
    showLedge(types) {
      ledge.clear();
      types.forEach((t, i) => {
        const it = makeItem(t);
        it.scale.setScalar(1.1);
        it.position.x = (i - (types.length - 1) / 2) * .6;
        ledge.add(it);
      });
    },
    clearLedge() { ledge.clear(); },
    binPop() { binT = .3; },
    update(dt, t) {
      worker.update(dt);
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
  world.resize = () => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    fitCamera(world.camera, w / h);
    world.billboards.forEach(b => b.quaternion.copy(world.camera.quaternion));
  };
  world.render = () => renderer.render(world.scene, world.camera);
  world.dispose = () => { renderer.dispose(); renderer.forceContextLoss(); };
  world.resize();
  return world;
}
