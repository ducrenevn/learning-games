import { describe, expect, it } from 'vitest';
import { makeBlankSequence, validateSequence } from '../src/games/sequence/model';
import { moveSequence, scoreSequence, startSequence } from '../src/games/sequence/engine';
import { serializeActivity, validateImported } from '../src/shared/activities/portable';

function good() {
  const a = makeBlankSequence();
  a.content.prompt = 'Ordnen Sie.';
  a.content.items.forEach((item, i) => { item.text = ['Begrüßung', 'Frage', 'Abschied'][i]; });
  return a;
}
describe('Sequence content', () => {
  it('round trips canonical answer order and Unicode exactly', () => {
    const a = good();
    a.content.explanation = 'Zuerst grüßen.';
    const out = serializeActivity(a, validateSequence);
    expect(out.issues).toEqual([]);
    expect(validateImported(out.value!, 'sequence')).toEqual({ value: a, issues: [] });
  });
  it('rejects invalid content and content type mismatches', () => {
    const a = good();
    expect(validateSequence({ ...a, content: { ...a.content, extra: 1 } }).issues[0].code).toBe('unknown');
    expect(validateSequence({ ...a, content: { ...a.content, items: [a.content.items[0]] } }).issues.length).toBeGreaterThan(0);
    expect(validateSequence({ ...a, content: { ...a.content, items: a.content.items.map(v => ({ ...v, text: 'same' })) } }).issues.length).toBeGreaterThan(0);
    expect(validateImported(JSON.stringify(a), 'sort').issues.length).toBeGreaterThan(0);
  });
});
describe('Sequence rules', () => {
  it('always avoids solved initial order and retains original', () => {
    const a = good();
    const source = structuredClone(a.content.items);
    const ids = startSequence(a.content.items, () => 0.99);
    expect(ids).not.toEqual(a.content.items.map(i => i.id));
    expect(a.content.items).toEqual(source);
    expect(scoreSequence(a.content.items, ids).solved).toBe(false);
  });
  it('moves adjacent items; bounds, scores and retry are deterministic', () => {
    const a = good();
    const ids = a.content.items.map(v => v.id);
    expect(moveSequence(ids, 0, -1)).toEqual(ids);
    const swapped = moveSequence(ids, 1, -1);
    expect(swapped).toEqual([ids[1], ids[0], ids[2]]);
    expect(scoreSequence(a.content.items, swapped)).toMatchObject({ solved: false, correct: 1, total: 3 });
    expect(scoreSequence(a.content.items, ids).solved).toBe(true);
  });
});
