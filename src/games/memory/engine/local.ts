import type { MemoryPair } from '../types';

export interface LocalCard { id: number; pairId: number; value: string; visible: boolean; matched: boolean }

export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makeLocalDeck(pairs: readonly MemoryPair[], random: () => number = Math.random): LocalCard[] {
  return shuffled(pairs.flatMap((pair, pairId) => [
    { id: pairId * 2 + 1, pairId, value: pair.left, visible: false, matched: false },
    { id: pairId * 2 + 2, pairId, value: pair.right, visible: false, matched: false },
  ]), random);
}

export function getColumns(count: number): number {
  return count === 20 ? 5 : count === 32 ? 8 : Math.max(2, Math.ceil(Math.sqrt(count)));
}
