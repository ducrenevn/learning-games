import { getColumns } from './engine/local';

/** Columns near the engine's preferred count that divide the deck exactly, so no row is left short. */
function evenDivisor(count: number, base: number): number | undefined {
  let best: number | undefined;
  for (let d = Math.max(2, base - 1); d <= base + 3 && d <= count; d++) {
    if (count % d !== 0) continue;
    if (best === undefined || Math.abs(d - base) <= Math.abs(best - base)) best = d;
  }
  return best;
}

/**
 * Presentation only; the engine and the online room contract are unchanged. Desktop keeps the engine's preferred count
 * when it divides the deck, and otherwise uses a nearby count that does. Phones always use 2–4 columns, the largest that
 * divides the deck evenly, so card words stay readable and no row is short.
 */
export function boardColumns(count: number): { desktop: number; phone: number } {
  const base = getColumns(count);
  const desktop = count % base === 0 ? base : (evenDivisor(count, base) ?? base);
  const phone = [4, 3, 2].find(c => count % c === 0) ?? 4;
  return { desktop, phone };
}
