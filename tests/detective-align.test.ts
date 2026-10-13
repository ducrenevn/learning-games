import { describe, expect, it } from 'vitest';
import { alignWords, sameWord } from '../src/games/language-detective/align';
import { toDraft, validateDraft } from '../src/games/language-detective/draft';
import { detectiveFixture } from './helpers/fixtures';

const words = (text: string) => text.split(' ');

describe('sameWord: a mark follows only the same word', () => {
  it('ignores punctuation and case', () => {
    expect(sameWord('Haus', 'Haus,')).toBe(true);
    expect(sameWord('haus', 'Haus')).toBe(true);
  });
  it('accepts an edited ending that keeps the stem, so typing inside a word keeps its mark', () => {
    expect(sameWord('Haus', 'Hauses')).toBe(true);
    expect(sameWord('habe', 'habn')).toBe(true);
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

describe('alignWords: carries identical words and same-slot edits, reports the rest', () => {
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
  it('keeps the mark of a word whose ending is edited in place', () => {
    const { carried, unmatched } = alignWords(words('Ich habe Zeit'), words('Ich habt Zeit'));
    expect(carried).toEqual([0, 1, 2]);
    expect(unmatched).toEqual([]);
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
