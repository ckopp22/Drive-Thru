const KEY = 'drive-thru-save';
const freshEndless = () => ({ bestMoney: 0, bestServed: 0, bestWave: 0 });
const freshShop = () => ({ highestUnlocked: 1, bestMoney: { 1: 0 }, stars: {}, endless: freshEndless() });
const defaults = () => ({ version: 1, shop: 'burger', shops: { burger: freshShop() }, sound: true, music: true });

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

// One shop's progress with every field forced to the right type (corrupt values fall back to fresh ones).
function cleanShop(p) {
  const f = freshShop();
  if (!isObj(p)) return f;
  const num = (m, cap) => Object.fromEntries(Object.entries(isObj(m) ? m : {}).filter(([k, v]) => Number.isFinite(+k) && Number.isFinite(v)).map(([k, v]) => [k, Math.max(0, Math.min(cap, v))]));
  return {
    highestUnlocked: Number.isInteger(p.highestUnlocked) ? Math.max(1, Math.min(99, p.highestUnlocked)) : 1,
    bestMoney: { ...f.bestMoney, ...num(p.bestMoney, 1e6) },
    stars: num(p.stars, 3),
    endless: cleanEndless(p.endless)
  };
}

// Endless high scores; missing or corrupt fields fall back to 0 (old saves have none).
function cleanEndless(e) {
  const f = freshEndless();
  if (!isObj(e)) return f;
  for (const k in f) if (Number.isFinite(e[k])) f[k] = Math.max(0, Math.min(1e6, Math.floor(e[k])));
  return f;
}

function load() {
  const d = defaults();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (isObj(raw) && raw.version === 1) {
      if (typeof raw.sound === 'boolean') d.sound = raw.sound;
      if (typeof raw.music === 'boolean') d.music = raw.music;
      if (typeof raw.shop === 'string') d.shop = raw.shop;
      // Saves from before shops existed kept Burger Joint progress at the top level.
      const shops = isObj(raw.shops) ? raw.shops : { burger: { highestUnlocked: raw.highestUnlocked, bestMoney: raw.bestMoney, stars: raw.stars } };
      d.shops = Object.fromEntries(Object.entries(shops).map(([id, p]) => [id, cleanShop(p)]));
      if (!d.shops.burger) d.shops.burger = freshShop();
    }
  } catch (e) {}
  return d;
}

let data = load();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

export const get = () => data;

export function set(patch) {
  Object.assign(data, patch);
  persist();
}

// Progress of one shop: { highestUnlocked, bestMoney, stars }.
export function shop(id) {
  return data.shops[id] || (data.shops[id] = freshShop());
}

// Records a pass; unlocks the next level only when the passed level is the shop's current one.
export function completeLevel(shopId, level, money, maxLevel, stars = 1) {
  const p = shop(shopId);
  p.bestMoney[level] = Math.max(p.bestMoney[level] || 0, money);
  p.stars[level] = Math.max(p.stars[level] || 0, stars);
  if (level === p.highestUnlocked && level < maxLevel) p.highestUnlocked = level + 1;
  persist();
}

// Endless bests of one shop: { bestMoney, bestServed, bestWave }.
export const endless = id => { const p = shop(id); return p.endless || (p.endless = freshEndless()); };

// Saves an endless run and returns which bests it beat: { money, served, wave }.
export function recordEndless(shopId, money, served, wave) {
  const e = endless(shopId);
  const beat = { money: money > e.bestMoney, served: served > e.bestServed, wave: wave > e.bestWave };
  e.bestMoney = Math.max(e.bestMoney, money);
  e.bestServed = Math.max(e.bestServed, served);
  e.bestWave = Math.max(e.bestWave, wave);
  persist();
  return beat;
}
