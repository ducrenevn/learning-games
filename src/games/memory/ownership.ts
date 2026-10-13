/**
 * Local Memory: which player found which pair. Colour is never the only signal — every player also has a shape and
 * the first letter of their name — because several colours collapse for people with colour-vision differences.
 * Contrast of each colour against the matched-card background (#fff4ea) is at least 4.3:1 (WCAG non-text needs 3:1).
 */
export interface OwnerMark { color: string; symbol: string; initial: string; name: string }
const STYLES = [
  { color: '#1F6F8B', symbol: '●' }, // teal
  { color: '#B35A3F', symbol: '▲' }, // copper
  { color: '#7B4B94', symbol: '■' }, // plum
  { color: '#8F6A00', symbol: '◆' }, // gold
  { color: '#B03A64', symbol: '★' }, // rose
  { color: '#4F5D6B', symbol: '⬢' }, // slate
] as const;
export const MAX_LOCAL_PLAYERS = STYLES.length;
export function ownerMark(index: number, name: string): OwnerMark {
  const style = STYLES[((index % STYLES.length) + STYLES.length) % STYLES.length];
  return { ...style, initial: (Array.from(name.trim())[0] ?? '?').toLocaleUpperCase(), name };
}
/**
 * Marks for every player, in order. Players whose names share a first letter (the default "Spieler 1, Spieler 2") would
 * look alike, so for them the badge shows the player's number instead of the letter.
 */
export function ownerMarks(names: readonly string[]): OwnerMark[] {
  const marks = names.map((name, i) => ownerMark(i, name));
  const count = new Map<string, number>();
  marks.forEach(mark => count.set(mark.initial, (count.get(mark.initial) ?? 0) + 1));
  return marks.map((mark, i) => (count.get(mark.initial) ?? 0) > 1 ? { ...mark, initial: String(i + 1) } : mark);
}
