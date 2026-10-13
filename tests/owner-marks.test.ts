import { describe, expect, it } from 'vitest';
import { ownerMarks } from '../src/games/memory/ownership';

describe('ownerMarks: the badge letter must tell players apart', () => {
  it('uses the first letter when names differ', () => {
    expect(ownerMarks(['Ann', 'Ben']).map(m => m.initial)).toEqual(['A', 'B']);
  });
  it('uses the player number when default names share a first letter', () => {
    expect(ownerMarks(['Spieler 1', 'Spieler 2']).map(m => m.initial)).toEqual(['1', '2']);
    expect(ownerMarks(['Ann', 'Anna', 'Ben']).map(m => m.initial)).toEqual(['1', '2', 'B']);
  });
});
