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

export function checkMatch(cardA: LocalCard, cardB: LocalCard): boolean {
  return cardA.pairId === cardB.pairId;
}

export function revealCard(deck: readonly LocalCard[], cardId: number): LocalCard[] {
  return deck.map(c => c.id === cardId ? { ...c, visible: true } : c);
}

export function hideCards(deck: readonly LocalCard[], cardIds: readonly number[]): LocalCard[] {
  const idSet = new Set(cardIds);
  return deck.map(c => idSet.has(c.id) ? { ...c, visible: false } : c);
}

export function matchCards(deck: readonly LocalCard[], cardIds: readonly number[]): LocalCard[] {
  const idSet = new Set(cardIds);
  return deck.map(c => idSet.has(c.id) ? { ...c, visible: true, matched: true } : c);
}

export function isDeckComplete(deck: readonly LocalCard[]): boolean {
  return deck.length > 0 && deck.every(c => c.matched);
}

export interface WinnerResult {
  winners: string[];
  isTie: boolean;
  bestScore: number;
}

export function calculateWinners(players: readonly { name: string; score: number }[]): WinnerResult {
  if (players.length === 0) return { winners: [], isTie: false, bestScore: 0 };
  const bestScore = Math.max(0, ...players.map(p => p.score));
  const winners = players.filter(p => p.score === bestScore).map(p => p.name);
  return {
    winners,
    isTie: winners.length > 1,
    bestScore,
  };
}
