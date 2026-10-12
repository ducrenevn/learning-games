import { describe, expect, it } from 'vitest';
import { makeBlankDetective, validateDetective } from '../src/games/language-detective/model';
import { scoreDetective } from '../src/games/language-detective/engine';
import { serializeActivity, validateImported } from '../src/shared/activities/portable';
function good() {
  const a = makeBlankDetective();
  a.content.prompt = 'Finde die Fehler.';
  a.content.segments.forEach((s, i) => { s.text = ['Ich', 'haben', 'heute', 'Zeit.'][i]; });
  return a;
}
describe('Language Detective content', () => {
  it('accepts zero issues, round trips and rejects unknown fields or invalid references', () => {
    const a = good();
    expect(validateDetective(a).issues).toEqual([]);
    a.content.issues = [{ segmentId: 'segment-2', correction: 'habe', explanation: 'Verb agreement' }];
    a.content.summary = 'Achte auf ich.';
    const out = serializeActivity(a, validateDetective);
    expect(validateImported(out.value!, 'language-detective')).toEqual({ value: a, issues: [] });
    expect(validateDetective({ ...a, content: { ...a.content, other: true } }).issues.length).toBeGreaterThan(0);
    expect(validateDetective({ ...a, content: { ...a.content, issues: [{ segmentId: 'unknown', correction: 'x', explanation: 'y' }] } }).issues.length).toBeGreaterThan(0);
    expect(validateDetective({ ...a, content: { ...a.content, issues: [a.content.issues[0], a.content.issues[0]] } }).issues.length).toBeGreaterThan(0);
  });
});
describe('Language Detective independent scoring', () => {
  it('requires explicit no-errors for a clean passage', () => {
    const a = good();
    expect(scoreDetective(a, new Set(), false).solved).toBe(false);
    expect(scoreDetective(a, new Set(), true).solved).toBe(true);
    expect(scoreDetective(a, new Set(['segment-1']), false).solved).toBe(false);
  });
  it('scores only teacher-defined segment flags, not typed correction text', () => {
    const a = good();
    a.content.issues = [{ segmentId: 'segment-2', correction: 'habe', explanation: 'agreement' }];
    expect(scoreDetective(a, new Set(['segment-2']), false).solved).toBe(true);
    expect(scoreDetective(a, new Set(['segment-2', 'segment-1']), false).extra).toEqual(['segment-1']);
    expect(scoreDetective(a, new Set(), true).solved).toBe(false);
  });
});
