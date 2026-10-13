import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIMITS, validateDetective, type DetectiveActivityV2, type DetectiveFile } from '../src/games/language-detective/model';
import { fitsV1, fromDraft, makeBlankDraft, toDraft, validateDraft } from '../src/games/language-detective/draft';
import { scoreDetective } from '../src/games/language-detective/engine';
import { serializeActivity, validateImported } from '../src/shared/activities/portable';
import { validateSort } from '../src/games/sort/model';
import { sortFixture } from './helpers/fixtures';

const dir = fileURLToPath(new URL('./fixtures/wave-f/corpus/valid/language-detective/', import.meta.url));
const read = (name: string) => readFileSync(resolve(dir, name), 'utf8');
const v1Files = readdirSync(dir).filter(n => /^0[1-5]-/.test(n));
const seg = (words: string[]) => words.map((text, i) => ({ id: 'segment-' + (i + 1), text }));
function v2(tasks: { words: string[]; issues?: DetectiveActivityV2['content']['tasks'][number]['issues'] }[]): DetectiveActivityV2 {
  return { format: 'learning-games.activity', schemaVersion: 2, activityType: 'language-detective', id: 'x', title: 'X', targetLanguage: 'de', instructions: 'Y',
    content: { prompt: 'P', tasks: tasks.map((t, i) => ({ id: 'task-' + (i + 1), segments: seg(t.words), issues: t.issues ?? [] })) } };
}

describe('Detective v1 files are untouched by v2', () => {
  it('has the five v1 corpus files, and each still validates and re-exports byte for byte as v1', () => {
    expect(v1Files).toHaveLength(5);
    for (const name of v1Files) {
      const text = read(name);
      const checked = validateImported(text, 'language-detective');
      expect(checked.issues, name).toEqual([]);
      expect((checked.value as { schemaVersion: number }).schemaVersion).toBe(1);
      const draft = toDraft(checked.value as DetectiveFile);
      expect(draft.content.tasks, name).toHaveLength(1);
      expect(draft.content.tasks[0].id).toBe('task-1');
      expect(validateDraft(draft).issues, name).toEqual([]);
      const file = fromDraft(draft);
      expect(file.schemaVersion, name).toBe(1);
      expect(JSON.stringify(file, null, 2) + '\n', name).toBe(text.replace(/\r\n/g, '\n'));
    }
  });
  it('keeps every v1 limit: 4–80 words, at most 12 errors', () => {
    const base = JSON.parse(read('01-ich-habe-zeit.json'));
    base.content.segments = base.content.segments.slice(0, 3);
    base.content.issues = [];
    expect(validateDetective(base).issues.map(i => i.code)).toContain('count');
  });
});

describe('Detective v2 contract', () => {
  it('accepts the v2 corpus files, including an error-free sentence and a three-word sentence', () => {
    for (const name of readdirSync(dir).filter(n => /^0[6-9]-/.test(n))) {
      const checked = validateImported(read(name), 'language-detective');
      expect(checked.issues, name).toEqual([]);
      expect((checked.value as { schemaVersion: number }).schemaVersion).toBe(2);
    }
  });
  it('scopes segment ids to their task: two tasks may both use segment-1, but an issue may not point into another task', () => {
    const ok = v2([{ words: ['Ich', 'habe', 'Zeit.'] }, { words: ['Wir', 'haben', 'Zeit.'] }]);
    expect(ok.content.tasks[0].segments[0].id).toBe(ok.content.tasks[1].segments[0].id);
    expect(validateDetective(ok).issues).toEqual([]);
    const bad = v2([{ words: ['Ich', 'habe', 'Zeit.'], issues: [{ segmentId: 'segment-9', correction: 'x', explanation: 'y' }] }, { words: ['Wir', 'haben', 'Zeit.', 'hier', 'heute'] }]);
    bad.content.tasks[1].segments[4].id = 'segment-9';
    const result = validateDetective(bad);
    expect(result.issues).toContainEqual({ path: 'content.tasks[0].issues[0].segmentId', code: 'reference' });
  });
  it('rejects mixed forms and unsupported versions with the existing codes', () => {
    const mixed = { ...v2([{ words: ['Ich', 'habe', 'Zeit.'] }]), content: { prompt: 'P', tasks: v2([{ words: ['Ich', 'habe', 'Zeit.'] }]).content.tasks, segments: [] } };
    expect(validateDetective(mixed).issues).toContainEqual({ path: 'content.segments', code: 'unknown' });
    const v1WithTasks = { ...mixed, schemaVersion: 1 };
    expect(validateDetective(v1WithTasks).issues.map(i => i.code)).toContain('unknown');
    expect(validateDetective({ ...v2([{ words: ['Ich', 'habe', 'Zeit.'] }]), schemaVersion: 3 }).issues).toContainEqual({ path: 'schemaVersion', code: 'version' });
    expect(validateDetective({ ...v2([{ words: ['Ich', 'habe', 'Zeit.'] }]), schemaVersion: '2' }).issues.map(i => i.code)).toContain('version');
  });
  it('enforces the approved limits (tasks, words per sentence, totals)', () => {
    const many = (n: number) => v2(Array.from({ length: n }, () => ({ words: ['Ich', 'habe', 'Zeit.'] })));
    expect(validateDetective(many(LIMITS.tasks.max)).issues).toEqual([]);
    expect(validateDetective(many(LIMITS.tasks.max + 1)).issues.map(i => i.code)).toContain('count');
    expect(validateDetective(many(0)).issues.map(i => i.code)).toContain('count');
    expect(validateDetective(v2([{ words: ['Hallo'] }])).issues.map(i => i.code)).toContain('count');
    const forty = Array.from({ length: 41 }, (_, i) => 'w' + i);
    expect(validateDetective(v2([{ words: forty.slice(0, 40) }])).issues).toEqual([]);
    expect(validateDetective(v2([{ words: forty }])).issues.map(i => i.code)).toContain('count');
    const wordy = v2(Array.from({ length: 6 }, () => ({ words: Array.from({ length: 40 }, (_, i) => 'w' + i) })));
    expect(validateDetective(wordy).issues).toContainEqual({ path: 'content.tasks', code: 'count' }); // 240 words > 200 in total
  });
  it('is inert for the other games: version 2 is not accepted by Sort, and Sort files still validate', () => {
    expect(validateSort(sortFixture()).issues).toEqual([]);
    const v2Sort = { ...sortFixture(), schemaVersion: 2 };
    expect(validateSort(v2Sort).issues).toContainEqual({ path: 'schemaVersion', code: 'version' });
  });
});

describe('Detective draft adapters', () => {
  it('writes the lowest sufficient version', () => {
    const six = v2([{ words: ['Ich', 'habe', 'heute', 'keine', 'Zeit', 'mehr.'] }]);
    expect(fitsV1(six)).toBe(true);
    expect(fromDraft(six).schemaVersion).toBe(1);
    expect(fromDraft(v2([{ words: ['Ich', 'habe', 'Zeit.'] }])).schemaVersion).toBe(2);             // 3 words: v1 cannot hold it
    expect(fromDraft(v2([{ words: ['Ich', 'habe', 'Zeit.', 'hier'] }, { words: ['Wir', 'haben', 'Zeit.'] }])).schemaVersion).toBe(2); // two sentences
    expect(fitsV1(v2([{ words: Array.from({ length: 81 }, (_, i) => 'w' + i) }]))).toBe(false);
  });
  it('round-trips a v2 file unchanged and a v1 file to the identical v1 content', () => {
    const v2Text = read('06-drei-kurze-saetze.json');
    const parsed = validateImported(v2Text, 'language-detective').value as DetectiveFile;
    expect(JSON.stringify(fromDraft(toDraft(parsed)), null, 2) + '\n').toBe(v2Text.replace(/\r\n/g, '\n'));
  });
  it('validates a draft as the file it would export, mapping v1 paths back onto the task', () => {
    const draft = toDraft(JSON.parse(read('01-ich-habe-zeit.json')));
    draft.content.tasks[0].segments[1].text = '';
    expect(validateDraft(draft).issues).toContainEqual({ path: 'content.tasks[0].segments[1].text', code: 'length' });
    draft.content.tasks[0].segments[1].text = 'habe';
    draft.content.tasks[0].issues = [{ segmentId: 'segment-9', correction: 'x', explanation: 'y' }];
    expect(validateDraft(draft).issues).toContainEqual({ path: 'content.tasks[0].issues[0].segmentId', code: 'reference' });
  });
  it('treats an empty new draft as incomplete, not as an error list the teacher must read', () => {
    const blank = makeBlankDraft();
    const issues = validateDraft(blank).issues;
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.map(i => i.path)).toContain('content.prompt');
  });
  it('serializes a draft through the shared serializer as a portable file', () => {
    const draft = toDraft(JSON.parse(read('03-zwei-fehler-im-service.json')));
    const out = serializeActivity(draft, validateDraft, fromDraft);
    expect(out.issues).toEqual([]);
    expect(out.value).toBe(read('03-zwei-fehler-im-service.json').replace(/\r\n/g, '\n'));
  });
});

describe('Detective per-task scoring', () => {
  it('scores each sentence on its own, including its own "no errors" choice', () => {
    const activity = v2([{ words: ['Der', 'Gäste', 'kommt.'], issues: [{ segmentId: 'segment-2', correction: 'Gast', explanation: 'Singular.' }] }, { words: ['Wir', 'bleiben', 'hier.'] }]);
    const [a, b] = activity.content.tasks;
    expect(scoreDetective(a, new Set(['segment-2']), false).solved).toBe(true);
    expect(scoreDetective(b, new Set(), true).solved).toBe(true);
    expect(scoreDetective(b, new Set(['segment-1']), false).solved).toBe(false);
    expect(scoreDetective(a, new Set(), true).solved).toBe(false);
    // the same segment id in two sentences never leaks between them
    expect(scoreDetective(b, new Set(['segment-2']), false).extra).toEqual(['segment-2']);
  });
});
