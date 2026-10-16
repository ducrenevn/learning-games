import type { SequenceItem } from './model';
export function startSequence(items: readonly SequenceItem[], random: () => number = Math.random): string[] {
  const ids = items.map(item => item.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  if (ids.length > 1 && ids.every((id, i) => id === items[i].id)) {
    ids.push(ids.shift()!);
  }
  return ids;
}
export function moveSequence(ids: readonly string[], index: number, direction: -1 | 1): string[] {
  const other = index + direction;
  if (index < 0 || index >= ids.length || other < 0 || other >= ids.length) return [...ids];
  const copy = [...ids];
  [copy[index], copy[other]] = [copy[other], copy[index]];
  return copy;
}
export function scoreSequence(items: readonly SequenceItem[], ids: readonly string[]) {
  const positions = ids.map((id, index) => ({ id, position: index, correct: items[index]?.id === id }));
  return { correct: positions.filter(p => p.correct).length, total: items.length, solved: items.length === ids.length && positions.every(p => p.correct), positions };
}
