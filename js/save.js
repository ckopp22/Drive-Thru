const KEY = 'drive-thru-save';
const defaults = () => ({ version: 1, highestUnlocked: 1, bestMoney: { 1: 0 }, stars: {}, sound: true, music: true });

let data = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.version === 1) return { ...defaults(), ...raw };
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

// Records a pass; unlocks the next level only when the passed level is the current one.
export function completeLevel(level, money, maxLevel, stars = 1) {
  data.stars = { ...data.stars, [level]: Math.max(data.stars[level] || 0, stars) };
  data.bestMoney[level] = Math.max(data.bestMoney[level] || 0, money);
  if (level === data.highestUnlocked && level < maxLevel) data.highestUnlocked = level + 1;
  persist();
}
