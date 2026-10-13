import { describe, expect, it } from 'vitest';
import { alignWords, sameWord } from '../src/games/language-detective/align';
import { toDraft, validateDraft } from '../src/games/language-detective/draft';
import { detectiveFixture } from './helpers/fixtures';

const words = (text: string) => text.split(' ');

describe('sameWord: a mark follows only the same word', () => {
  it('ignores surrounding punctuation', () => {
    expect(sameWord('Haus', 'Haus,')).toBe(true);
    expect(sameWord('(Haus)', 'Haus.')).toBe(true);
  });
  it('keeps case significant, because German nouns and verbs differ by it', () => {
    expect(sameWord('haus', 'Haus')).toBe(false);
    expect(sameWord('machen', 'Machen')).toBe(false);
  });
  it('does not accept an edited ending or a longer word that shares a stem', () => {
    expect(sameWord('Haus', 'Hauses')).toBe(false);
    expect(sameWord('Haus', 'Haustür')).toBe(false);
    expect(sameWord('habe', 'habn')).toBe(false);
    expect(sameWord('machen', 'Macht')).toBe(false);
  });
  it('rejects a different word, even at the same position', () => {
    expect(sameWord('Haus', 'Hund')).toBe(false);
    expect(sameWord('haben', 'sind')).toBe(false);
  });
  it('compares punctuation-only tokens exactly', () => {
    expect(sameWord('–', '–')).toBe(true);
    expect(sameWord('–', '-')).toBe(false);
  });
});

describe('alignWords: carries identical words, reports everything uncertain', () => {
  it('keeps every word when nothing changed', () => {
    const { carried, unmatched } = alignWords(words('Ich habe Zeit'), words('Ich habe Zeit'));
    expect(carried).toEqual([0, 1, 2]);
    expect(unmatched).toEqual([]);
  });
  it('keeps marks when a word is inserted before them', () => {
    const { carried, unmatched } = alignWords(words('habe Zeit'), words('Ich habe Zeit'));
    expect(carried).toEqual([null, 0, 1]);
    expect(unmatched).toEqual([]);
  });
  it('keeps marks when a word is deleted elsewhere', () => {
    const { carried, unmatched } = alignWords(words('Ich habe heute Zeit'), words('Ich habe Zeit'));
    expect(carried).toEqual([0, 1, 3]);
    expect(unmatched).toEqual([2]);
  });
  it('keeps the mark when only surrounding punctuation changes', () => {
    expect(alignWords(words('Ich sehe Haus.'), words('Ich sehe Haus,')).carried).toEqual([0, 1, 2]);
    expect(alignWords(words('Ich sehe Haus,'), words('Ich sehe Haus')).unmatched).toEqual([]);
  });
  it('sends a word with an edited ending to review instead of carrying it', () => {
    expect(alignWords(words('Ich habe Zeit'), words('Ich habt Zeit'))).toEqual({ carried: [0, null, 2], unmatched: [1] });
    expect(alignWords(words('Das Haus'), words('Das Hauses')).unmatched).toEqual([1]);
    expect(alignWords(words('Das Haus ist alt'), words('Das Haustür ist alt')).unmatched).toEqual([1]);
    expect(alignWords(words('Wir machen das'), words('Wir Macht das')).unmatched).toEqual([1]);
  });
  it('sends a case change to review, because the word may be a different part of speech', () => {
    expect(alignWords(words('Wir machen das'), words('Wir Machen das')).unmatched).toEqual([1]);
  });
  it('reports a word replaced by a different word, and a deleted word, as unmatched', () => {
    expect(alignWords(words('Ich habe Zeit'), words('Ich sind Zeit')).unmatched).toEqual([1]);
    expect(alignWords(words('Ich habe Zeit'), words('Ich Zeit')).unmatched).toEqual([1]);
  });
  it('does not attach a mark when one word is split into two', () => {
    const { carried, unmatched } = alignWords(words('habe'), words('ha be'));
    expect(carried).toEqual([null, null]);
    expect(unmatched).toEqual([0]);
  });
});

describe('alignWords: repeated words never move onto another occurrence', () => {
  it('keeps every repeated mark when the sentence is unchanged', () => {
    const { carried, unmatched } = alignWords(words('es sehe es'), words('es sehe es'));
    expect(carried).toEqual([0, 1, 2]);
    expect(unmatched).toEqual([]);
  });
  it('keeps the first mark and holds the deleted second occurrence', () => {
    expect(alignWords(words('es Haus es'), words('es Haus'))).toEqual({ carried: [0, 1], unmatched: [2] });
  });
  it('keeps repeated marks when a word is inserted before an identical tail', () => {
    expect(alignWords(words('es Haus es'), words('Ich es Haus es'))).toEqual({ carried: [null, 0, 1, 2], unmatched: [] });
  });
  it('holds a repeated word whose occurrence is in the middle of a changed sentence', () => {
    // "a" appears twice on each side and the middle changed: neither "a" can be proven to be the same occurrence.
    const { carried, unmatched } = alignWords(words('a x a y a'), words('a z a q a'));
    expect(carried).toEqual([0, null, null, null, 4]);
    expect(unmatched).toEqual([1, 2, 3]);
  });
  it('holds a repeated word when a sentence swaps occurrences, instead of guessing', () => {
    expect(alignWords(words('a b a c'), words('b a a c')).unmatched).toEqual([0, 2]);
  });
  it('still carries a unique word in a sentence with repeated words', () => {
    expect(alignWords(words('es Haus es sehe'), words('es Haus es sehen')).carried).toEqual([0, 1, 2, null]);
    expect(alignWords(words('es Haus es'), words('Ich es Haus es')).carried).toEqual([null, 0, 1, 2]);
  });
});

describe('a held mark blocks export until it is decided', () => {
  it('reports each review item as a review problem on its sentence', () => {
    const draft = toDraft(detectiveFixture() as never);
    const task = draft.content.tasks[0];
    const result = validateDraft({ ...draft, review: [{ key: 'r1', taskId: task.id, text: 'habe', correction: 'habe', explanation: 'Verb' }] });
    expect(result.value).toBeUndefined();
    expect(result.issues).toEqual([{ path: 'content.tasks[0].issues', code: 'review' }]);
  });
  it('lets the draft through once the review list is empty', () => {
    const draft = toDraft(detectiveFixture() as never);
    expect(validateDraft({ ...draft, review: [] }).issues).toEqual([]);
  });
});
