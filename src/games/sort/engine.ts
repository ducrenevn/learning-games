import type { SortActivity, SortItem } from './model';
export type Placements = Readonly<Record<string, string>>;
export function shuffledIds<T extends { id: string }>(items: readonly T[], random: () => number = Math.random) {
  const ids = items.map(i => i.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}
/** Own-property lookup: an item id such as "constructor" must never resolve to something inherited from Object.prototype. */
export function placementOf(placements: Placements, itemId: string): string | undefined {
  return Object.hasOwn(placements, itemId) ? placements[itemId] : undefined;
}
export function placeSort(items: readonly SortItem[], categoryIds: readonly string[], current: Placements, itemId: string, categoryId: string | null): Placements {
  if (!items.some(i => i.id === itemId) || (categoryId !== null && !categoryIds.includes(categoryId))) return current;
  const copy: Record<string, string> = { ...current };
  if (categoryId === null) delete copy[itemId]; else copy[itemId] = categoryId;
  return copy;
}
export function scoreSort(activity: SortActivity, assignments: Placements) {
  const perItem = activity.content.items.map(item => ({ id: item.id, correct: placementOf(assignments, item.id) === item.categoryId }));
  return { complete: activity.content.items.every(i => placementOf(assignments, i.id) !== undefined),
    correct: perItem.filter(i => i.correct).length, total: perItem.length, perItem };
}
