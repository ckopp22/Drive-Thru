const KEY = 'drive-thru-save';
const freshShop = () => ({ highestUnlocked: 1, bestMoney: { 1: 0 }, stars: {} });
const defaults = () => ({ version: 1, shop: 'burger', shops: { burger: freshShop() }, sound: true, music: true });

let data = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.version === 1) {
      const d = { ...defaults(), ...raw };
      // Saves from before shops existed kept Burger Joint progress at the top level.
      if (!raw.shops) {
        d.shops = { burger: { ...freshShop(), highestUnlocked: raw.highestUnlocked || 1, bestMoney: raw.bestMoney || { 1: 0 }, stars: raw.stars || {} } };
      }
      return d;
    }
  } catch (e) {}
  return defaults();
}

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
