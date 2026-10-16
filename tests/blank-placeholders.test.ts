import { describe, expect, it } from 'vitest';
import { validateSort } from '../src/games/sort/model';
import { validateMemory } from '../src/games/memory/activity';
import { sortFixture } from './helpers/fixtures';

/** Blank placeholders in an editor draft are not duplicates; a file with blank text is still rejected on import. */
describe('blank placeholders', () => {
  it('two blank Sort cards are not reported as duplicates, but the file is still rejected', () => {
    const a = sortFixture();
    a.content.items[0].text = '';
    a.content.items[1].text = '';
    const result = validateSort(a);
    expect(result.issues.map(i => i.code)).not.toContain('duplicate');
    expect(result.value).toBeUndefined();                      // strict file validation is unchanged
  });
  it('two identical non-blank Sort cards are still duplicates', () => {
    const a = sortFixture();
    a.content.items[0].text = 'Tisch';
    a.content.items[1].text = 'tisch ';
    expect(validateSort(a).issues.map(i => i.code)).toContain('duplicate');
  });
  it('two blank Memory pairs are not duplicates; a repeated non-blank pair still is', () => {
    const memory = (pairs: { left: string; right: string }[]) => ({
      format: 'learning-games.activity', schemaVersion: 1, activityType: 'memory', id: 'm', title: 'M', targetLanguage: 'de',
      instructions: 'x', content: { pairs: pairs.map((p, i) => ({ id: 'p' + (i + 1), ...p })) },
    });
    expect(validateMemory(memory([{ left: '', right: '' }, { left: '', right: '' }])).issues.map(i => i.code)).not.toContain('duplicate');
    expect(validateMemory(memory([{ left: 'Haus', right: 'house' }, { left: 'Haus', right: 'house' }])).issues.map(i => i.code)).toContain('duplicate');
  });
});
