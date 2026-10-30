const KEY = 'drive-thru-save';
const freshShop = () => ({ highestUnlocked: 1, bestMoney: { 1: 0 }, stars: {} });
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
    stars: num(p.stars, 3)
  };
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
