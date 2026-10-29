/**
 * Random selection lives at module level, outside any component, so components stay pure:
 * randomness only happens when an event handler calls these functions.
 */
export function pickRandom(items, excludeId = null) {
  if (items.length === 0) return null;
  const choices = items.length > 1 && excludeId !== null ? items.filter((item) => item.id !== excludeId) : items;
  return choices[Math.floor(Math.random() * choices.length)];
}
