import { describe, expect, it } from 'vitest';
import { boardColumns } from '../src/games/memory/boardLayout';

describe('Memory board layout (presentation only)', () => {
  it('uses at most four columns on phones, and always a count that divides the deck', () => {
    for (let pairs = 1; pairs <= 16; pairs++) {
      const cards = pairs * 2;
      const { phone } = boardColumns(cards);
      expect(phone).toBeLessThanOrEqual(4);
      expect(cards % phone).toBe(0);
    }
  });
  it('gives 16 pairs (32 cards) four phone columns, eight rows', () => {
    expect(boardColumns(32)).toEqual({ desktop: 8, phone: 4 });
  });
  it('keeps the engine desktop counts that already divide evenly', () => {
    expect(boardColumns(4).desktop).toBe(2);
    expect(boardColumns(12).desktop).toBe(4);
    expect(boardColumns(20).desktop).toBe(5);
  });
  it('avoids a short last row on desktop when a nearby count divides the deck', () => {
    expect(boardColumns(18).desktop).toBe(6);   // engine says 5, leaving 5-5-5-3
    expect(boardColumns(10).desktop).toBe(5);   // engine says 4, leaving 4-4-2
    expect(boardColumns(14).desktop).toBe(7);   // engine says 4, leaving 4-4-4-2
  });
});
