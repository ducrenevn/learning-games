import { describe, expect, it } from 'vitest';
import { count } from '../src/shared/activities/uxCopy';

/** Counts read naturally in each language: singular for exactly one item, plural otherwise. */
describe('count copy', () => {
  it('German uses the singular for one and the plural otherwise', () => {
    expect(count('de', 'nCard1', 'nCards', 1)).toBe('1 Karte');
    expect(count('de', 'nCard1', 'nCards', 2)).toBe('2 Karten');
    expect(count('de', 'nPair1', 'nPairs', 1)).toBe('1 Paar');
    expect(count('de', 'nSentence1', 'nSentences', 1)).toBe('1 Satz');
    expect(count('de', 'nStep1', 'nSteps', 3)).toBe('3 Schritte');
    expect(count('de', 'needsChip1', 'needsChip', 1)).toBe('Noch 1 Angabe fehlt');
    expect(count('de', 'needsChip1', 'needsChip', 2)).toBe('Noch 2 Angaben fehlen');
  });
  it('English follows the same rule', () => {
    expect(count('en', 'nPair1', 'nPairs', 1)).toBe('1 pair');
    expect(count('en', 'nPair1', 'nPairs', 4)).toBe('4 pairs');
  });
});
