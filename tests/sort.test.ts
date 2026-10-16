import { describe, expect, it } from 'vitest';
import { makeBlankSort, validateSort } from '../src/games/sort/model';
import { placementOf, placeSort, scoreSort, shuffledIds } from '../src/games/sort/engine';
import { serializeActivity, validateImported } from '../src/shared/activities/portable';
import { sortFixture } from './helpers/fixtures';

const good = () => {
  const a = makeBlankSort();
  a.content.categories[0].label = 'Obst';
  a.content.categories[1].label = 'Gemüse';
  a.content.items.forEach((item, i) => { item.text = ['Apfel', 'Birne', 'Karotte', 'Gurke'][i]; item.categoryId = i < 2 ? 'category-1' : 'category-2'; });
  return a;
};
describe('Sort validation and portable JSON', () => {
  it('round trips authored content without student state', () => {
    const a = good();
    a.content.items[0].explanation = 'Ein Apfel ist Obst.';
    const serialized = serializeActivity(a, validateSort);
    expect(serialized.issues).toEqual([]);
    const parsed = validateImported(serialized.value!, 'sort');
    expect(parsed.issues).toEqual([]);
    expect(parsed.value).toEqual(a);
  });
  it('rejects missing, unknown, duplicate, invalid and unsafe fields', () => {
    const cases = [
      { ...good(), unexpected: true },
      { ...good(), schemaVersion: 2 },
      { ...good(), content: { ...good().content, categories: [good().content.categories[0]] } },
      { ...good(), content: { ...good().content, items: good().content.items.map(i => ({ ...i, categoryId: 'missing' })) } },
      { ...good(), content: { ...good().content, items: good().content.items.map(i => ({ ...i, text: 'same' })) } },
      { ...good(), title: '<img src=x onerror=alert(1)>' },
      { ...good(), id: '__proto__' },
    ];
    cases.forEach(c => expect(validateSort(c).issues.length).toBeGreaterThan(0));
  });
  it('rejects oversized and malformed JSON', () => {
    expect(validateImported('X'.repeat(131073), 'sort').issues[0].code).toBe('size');
    expect(validateImported('{broken', 'sort').issues[0].code).toBe('json');
  });
});
describe('Sort pure gameplay', () => {
  it('scores individual placements without editing source, and resets by clearing state', () => {
    const a = good(), before = structuredClone(a);
    const ids = a.content.items.map(i => i.id);
    const categories = a.content.categories.map(c => c.id);
    let placements = placeSort(a.content.items, categories, {}, ids[0], 'category-1');
    expect(scoreSort(a, placements)).toMatchObject({ complete: false, correct: 1 });
    placements = placeSort(a.content.items, categories, placements, ids[1], 'category-2');
    placements = placeSort(a.content.items, categories, placements, ids[2], 'category-2');
    placements = placeSort(a.content.items, categories, placements, ids[3], 'category-2');
    expect(scoreSort(a, placements)).toMatchObject({ complete: true, correct: 3, total: 4 });
    expect(scoreSort(a, {}).correct).toBe(0);
    expect(a).toEqual(before);
  });
});

describe('Sort engine edge cases', () => {
  const items = () => sortFixture().content.items;
  it('shuffledIds is a permutation, deterministic for a fixed random source and never mutates its input', () => {
    const source = items(), before = structuredClone(source);
    const ids = shuffledIds(source);
    expect([...ids].sort()).toEqual(source.map(i => i.id).sort());
    expect(source).toEqual(before);
    expect(shuffledIds(source, () => 0)).toEqual(shuffledIds(source, () => 0));
    expect(shuffledIds(source, () => 0.9999999)).toHaveLength(source.length);
    // a random() that returns exactly 1 (or a bad value) must not produce undefined/duplicate ids
    for (const bad of [1, 1.5, -1]) expect([...shuffledIds(source, () => bad)].sort()).toEqual(source.map(i => i.id).sort());
  });
  it('placeSort leaves state untouched for unknown cards or categories and can clear a placement', () => {
    const a = items(), cats = ['der', 'die', 'das'];
    const start = placeSort(a, cats, {}, 'tisch', 'der');
    expect(placeSort(a, cats, start, 'nope', 'der')).toBe(start);
    expect(placeSort(a, cats, start, 'tisch', 'nope')).toBe(start);
    expect(placeSort(a, cats, start, 'tisch', null)).toEqual({});
    expect(start).toEqual({ tisch: 'der' }); // previous state object is never mutated
  });
  it('looks placements up by own property only', () => {
    expect(placementOf({}, 'constructor')).toBeUndefined();
    expect(placementOf({}, 'toString')).toBeUndefined();
    expect(placementOf({ constructor: 'der' }, 'constructor')).toBe('der');
  });
  it('scores only teacher-authored cards and treats stray placement keys as noise', () => {
    const a = sortFixture();
    const full = { tisch: 'der', lampe: 'die', buch: 'das', stuhl: 'der' };
    expect(scoreSort(a, { ...full, ghost: 'der' })).toMatchObject({ complete: true, correct: 4, total: 4 });
    expect(scoreSort(a, { ...full, buch: 'die' })).toMatchObject({ complete: true, correct: 3 });
    const noOwn = scoreSort(sortFixture(), Object.create({ tisch: 'der' }));
    expect(noOwn).toMatchObject({ complete: false, correct: 0 });
  });
});
