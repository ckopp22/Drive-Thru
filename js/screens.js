import * as save from './save.js';
import * as audio from './audio.js';
import { starsFor } from './levels.js';
import { SHOPS, shopById, useShop } from './shops.js';
import { startGame } from './game.js';
import { createMenuScene } from './scene.js';

const app = document.getElementById('app');
const curShop = () => shopById(save.get().shop);
// A shop is open once every level of the one before it has been passed.
const shopUnlocked = i => {
  if (i === 0) return true;
  const prev = SHOPS[i - 1];
  return !!prev.levels && save.shop(prev.id).stars[prev.levels.length] > 0;
};

const HOW_TO = [
  { icons: '🚗💬', title: 'Customers arrive', text: 'A car pulls up and shows its order above it.' },
  { icons: '🥤🍔🍟', title: 'Make items', text: 'Tap a machine (soda machine, grill, fryer) to start making. Wait for the progress bar, then tap it again to pick up.' },
  { icons: '1️⃣2️⃣3️⃣', title: 'Fill a tray', text: 'Tap a numbered tray on the window to set down what you carry. When it matches the order exactly, press that number at the bottom to send it.' },
  { icons: '🗑️😡', title: 'Mistakes', text: 'Wrong item? Tap the 🗑️ bin. Tap a tray with empty hands to pick its items back up. Don\'t keep customers waiting or they drive off angry.' }
];

const screens = { menu, levels, gameplay, results, endlessOver };
let teardown = null;

export function go(name, arg) {
  if (teardown) { teardown(); teardown = null; }
  app.innerHTML = '';
  audio.duckMusic(name === 'results' || name === 'endlessOver');
  screens[name](arg);
}

function el(html, cls = 'screen') {
  const d = document.createElement('div');
  d.className = cls;
  d.innerHTML = html;
  app.appendChild(d);
  return d;
}

const on = (root, sel, fn) => root.querySelector(sel).addEventListener('click', fn);

function menu() {
  const s = el(`
    <canvas class="menu-bg"></canvas>
    <h1 class="title">DRIVE<br>THRU</h1>
    <div class="shop-pick">
      <button class="round-btn" id="prevShop" aria-label="Previous restaurant">‹</button>
      <div class="shop-card"></div>
      <button class="round-btn" id="nextShop" aria-label="Next restaurant">›</button>
    </div>
    <button class="btn yellow big" id="play">PLAY</button>
    <button class="btn wide" id="how">HOW TO PLAY</button>`, 'screen menu');
  const card = s.querySelector('.shop-card'), play = s.querySelector('#play');
  const prevB = s.querySelector('#prevShop'), nextB = s.querySelector('#nextShop');
  let bg = s.querySelector('.menu-bg'), bgTimer = 0, menuScene = null;
  // Leaving the menu must stop the live backdrop (and any pending start) so nothing keeps rendering during play.
  teardown = () => { clearTimeout(bgTimer); if (menuScene) menuScene.stop(); menuScene = null; };
  let idx = Math.max(0, SHOPS.indexOf(curShop()));
  if (!shopUnlocked(idx)) idx = 0;
  const render = () => {
    const sh = SHOPS[idx], open = shopUnlocked(idx);
    card.innerHTML = `<span class="shop-icon">${open ? sh.icon : '🔒'}</span><b>${sh.name}</b><span class="sub">${
      !open ? `Beat ${SHOPS[idx - 1].name} to unlock` : sh.levels ? '' : 'Coming soon'}</span>`;
    play.disabled = !open || !sh.levels;
    prevB.disabled = idx === 0;
    nextB.disabled = idx === SHOPS.length - 1;
    if (open) save.set({ shop: sh.id });
    // Live, blurred 3D room of the selected shop behind the menu (a lost WebGL canvas can't be reused, so each shop gets a fresh one).
    bg.classList.toggle('locked', !open);
    clearTimeout(bgTimer);
    bgTimer = setTimeout(() => {
      if (menuScene) menuScene.stop();
      menuScene = null;
      const fresh = document.createElement('canvas');
      fresh.className = bg.className;
      bg.replaceWith(fresh);
      bg = fresh;
      try { menuScene = createMenuScene(bg, sh); } catch (e) {}
    }, 150);
  };
  // Hidden dev unlock: tap the title 5 times to open every shop and level.
  let titleTaps = 0;
  s.querySelector('.title').addEventListener('click', () => {
    if (++titleTaps < 5) return;
    titleTaps = 0;
    for (const sh of SHOPS) if (sh.levels) {
      const p = save.shop(sh.id), n = sh.levels.length;
      p.highestUnlocked = n;
      p.stars[n] = p.stars[n] || 1;
    }
    save.set({});
    render();
  });
  prevB.addEventListener('click', () => { idx--; render(); });
  nextB.addEventListener('click', () => { idx++; render(); });
  render();
  on(s, '#play', () => go('levels'));
  on(s, '#how', howTo);
}

function howTo() {
  let page = 0;
  const m = el(`
    <div class="card">
      <button class="close" aria-label="Close">✕</button>
      <div class="icons"></div>
      <h3></h3>
      <p></p>
      <div class="endless-hint">∞ Endless mode: serve customers until you miss 3.</div>
      <div class="dots"></div>
      <div class="nav">
        <button class="btn" id="back">Back</button>
        <button class="btn yellow" id="next">Next</button>
      </div>
    </div>`, 'modal');
  const back = m.querySelector('#back');
  const next = m.querySelector('#next');
  const close = () => m.remove();
  const render = () => {
    const p = HOW_TO[page];
    m.querySelector('.icons').textContent = p.icons;
    m.querySelector('h3').textContent = p.title;
    m.querySelector('p').textContent = p.text;
    m.querySelector('.dots').textContent = HOW_TO.map((_, i) => (i === page ? '●' : '○')).join(' ');
    back.disabled = page === 0;
    next.textContent = page === HOW_TO.length - 1 ? 'Done' : 'Next';
  };
  back.addEventListener('click', () => { page--; render(); });
  next.addEventListener('click', () => (page === HOW_TO.length - 1 ? close() : (page++, render())));
  on(m, '.close', close);
  render();
}

function levels() {
  const shop = curShop(), LEVELS = shop.levels, MAX = LEVELS.length;
  const { highestUnlocked, bestMoney, stars } = save.shop(shop.id);
  const starRow = n => '★'.repeat(stars[n] || 0) + '☆'.repeat(3 - (stars[n] || 0));
  const best = shop.endless ? save.endless(shop.id) : null;
  const s = el(`<h2>${shop.name}</h2><div class="grid${best ? ' has-endless' : ''}"></div><button class="btn" id="back">Back</button>`, 'screen levels');
  const grid = s.querySelector('.grid');
  for (let n = 1; n <= MAX; n++) {
    const done = n < highestUnlocked || (n === MAX && bestMoney[n] > 0);
    const isCurrent = n === highestUnlocked && !done;
    const locked = n > highestUnlocked;
    const b = document.createElement('button');
    b.className = 'tile ' + (locked ? 'locked' : isCurrent ? 'current' : 'done');
    b.disabled = locked;
    b.innerHTML = locked
      ? `<span class="num">🔒</span><span class="sub">Level ${n}</span>`
      : done
        ? `<span class="num">✓ ${n}</span><span class="sub">${starRow(n)}</span>`
        : `<span class="num">${n}</span><span class="sub">Goal $${LEVELS[n - 1].goal}</span>`;
    if (!locked) b.addEventListener('click', () => go('gameplay', n));
    grid.appendChild(b);
  }
  // Endless mode: always open, after the last level.
  if (best) {
    const b = document.createElement('button');
    b.className = 'tile endless';
    b.innerHTML = `<span class="num">∞ ENDLESS</span><span class="sub">${best.bestMoney ? `Best $${best.bestMoney} · Wave ${best.bestWave}` : 'Never locked'}</span>`;
    b.addEventListener('click', () => go('gameplay', 'endless'));
    grid.appendChild(b);
  }
  on(s, '#back', () => go('menu'));
}

function gameplay(level) {
  useShop(curShop());
  const endless = level === 'endless';
  teardown = startGame(app, endless ? 0 : level, curShop().levels, {
    exit: () => go('levels'),
    restart: () => go('gameplay', level),
    finish: r => go(r.endless ? 'endlessOver' : 'results', r)
  }, { endless });
}

function endlessOver({ money, served, wave }) {
  const shop = curShop();
  const old = { ...save.endless(shop.id) };
  const beat = save.recordEndless(shop.id, money, served, wave);
  const row = (label, v, prev, isNew, fmt = x => x) =>
    `<div class="best-row"><span>${label}</span><b>${fmt(v)}</b>${isNew ? '<em class="new-best">New best!</em>' : `<small>Best ${fmt(prev)}</small>`}</div>`;
  const s = el(`
    <h2>Shop Closed!</h2>
    <div class="stats endless-stats">
      ${row('Money', money, old.bestMoney, beat.money, x => '$' + x)}
      ${row('Customers', served, old.bestServed, beat.served)}
      ${row('Wave', wave, old.bestWave, beat.wave)}
    </div>
    <div class="stack">
      <button class="btn yellow wide" id="again">Play Again</button>
      <button class="btn wide" id="levels">Level Select</button>
      <button class="btn wide" id="menu">Main Menu</button>
    </div>`, 'screen center fail');
  on(s, '#again', () => go('gameplay', 'endless'));
  on(s, '#levels', () => go('levels'));
  on(s, '#menu', () => go('menu'));
}

function results({ level, pass, money, served, lost }) {
  const shop = curShop(), LEVELS = shop.levels, MAX = LEVELS.length;
  const goal = LEVELS[level - 1].goal;
  const stars = pass ? starsFor(money, LEVELS[level - 1]) : 0;
  if (pass) save.completeLevel(shop.id, level, money, MAX, stars);
  const unlocked = pass && level === MAX && SHOPS[SHOPS.indexOf(shop) + 1];
  const hasNext = pass && level < MAX;
  const s = el(pass ? `
    <h2>Level Complete!</h2>
    <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    <div class="stats">Earnings: $${money}<br>Goal: $${goal}<br>Orders served: ${served}<br>Orders lost: ${lost}</div>
    ${level === MAX ? `<p>You finished every shift! 🎉${unlocked ? `<br>${unlocked.icon} ${unlocked.name} unlocked!` : ''}</p>` : ''}
    <div class="stack">
      ${hasNext ? '<button class="btn yellow wide" id="next">Next Level</button>' : ''}
      <button class="btn green wide" id="again">Replay</button>
      <button class="btn wide" id="levels">Level Select</button>
    </div>` : `
    <h2>Shift Over</h2>
    <div class="stats">Earnings: $${money}<br>Goal: $${goal}<br>Orders served: ${served}<br>Orders lost: ${lost}</div>
    <div class="stack">
      <button class="btn yellow wide" id="again">Try Again</button>
      <button class="btn wide" id="levels">Level Select</button>
    </div>`, 'screen center' + (pass ? '' : ' fail'));
  if (hasNext) on(s, '#next', () => go('gameplay', level + 1));
  on(s, '#again', () => go('gameplay', level));
  on(s, '#levels', () => go('levels'));
}
