import * as save from './save.js';
import { LEVELS, starsFor } from './levels.js';
import { startGame } from './game.js';

const app = document.getElementById('app');
const MAX = LEVELS.length;

const HOW_TO = [
  { icons: '🚗💬', title: 'Customers arrive', text: 'A car pulls up and shows its order above it.' },
  { icons: '🥤🍔🍟', title: 'Make items', text: 'Tap a machine (soda machine, grill, fryer) to start making. Wait for the progress bar, then tap it again to pick up.' },
  { icons: '1️⃣2️⃣3️⃣', title: 'Fill a tray', text: 'Tap a numbered tray on the window to set down what you carry. When it matches the order exactly, press that number at the bottom to send it.' },
  { icons: '🗑️😡', title: 'Mistakes', text: 'Wrong item? Tap the 🗑️ bin. Tap a tray with empty hands to pick its items back up. Don\'t keep customers waiting or they drive off angry.' }
];

const screens = { menu, levels, gameplay, results };
let teardown = null;

export function go(name, arg) {
  if (teardown) { teardown(); teardown = null; }
  app.innerHTML = '';
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
    <h1 class="title">DRIVE<br>THRU</h1>
    <button class="btn yellow big" id="play">PLAY</button>
    <button class="btn wide" id="how">HOW TO PLAY</button>`, 'screen menu');
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
  const { highestUnlocked, bestMoney, stars } = save.get();
  const starRow = n => '★'.repeat(stars[n] || 0) + '☆'.repeat(3 - (stars[n] || 0));
  const s = el(`<h2>Select Level</h2><div class="grid"></div><button class="btn" id="back">Back</button>`, 'screen levels');
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
  on(s, '#back', () => go('menu'));
}

function gameplay(level) {
  teardown = startGame(app, level, {
    exit: () => go('levels'),
    restart: () => go('gameplay', level),
    finish: r => go('results', r)
  });
}

function results({ level, pass, money, served, lost }) {
  const goal = LEVELS[level - 1].goal;
  const stars = pass ? starsFor(money, goal) : 0;
  if (pass) save.completeLevel(level, money, MAX, stars);
  const hasNext = pass && level < MAX;
  const s = el(pass ? `
    <h2>Level Complete!</h2>
    <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
    <div class="stats">Earnings: $${money}<br>Goal: $${goal}<br>Orders served: ${served}<br>Orders lost: ${lost}</div>
    ${level === MAX ? '<p>You finished every shift! 🎉</p>' : ''}
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
