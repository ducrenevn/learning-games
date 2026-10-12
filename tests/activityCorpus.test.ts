import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateImported, serializeActivity } from '../src/shared/activities/portable';
import { parsePairs, validateForRoom } from '../src/games/memory/engine/pairs';
import type { ActivityType } from '../src/shared/activities/contract';

const root = fileURLToPath(new URL('./fixtures/wave-f/corpus/', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')) as {
  corpusVersion: number;
  files: { file: string; kind: ActivityType; expected: 'valid' | 'invalid'; errorCode?: string }[];
};
const kinds: ActivityType[] = ['sort', 'sequence', 'language-detective', 'memory'];
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

// Maintains an executable, teacher-usable corpus against the actual validators, not a parallel handcrafted schema.
describe('Wave F activity import corpus v1', () => {
  it('contains positive and negative fixtures for each supported game', () => {
    expect(manifest.corpusVersion).toBe(1);
    expect(new Set(manifest.files.map(f => f.file)).size).toBe(manifest.files.length);
    for (const kind of kinds) {
      expect(manifest.files.filter(f => f.kind === kind && f.expected === 'valid').length).toBeGreaterThanOrEqual(5);
      expect(manifest.files.filter(f => f.kind === kind && f.expected === 'invalid').length).toBeGreaterThanOrEqual(5);
    }
  });
  for (const fixture of manifest.files) {
    it(`${fixture.expected.toUpperCase()} ${fixture.file}`, () => {
      const original = read(fixture.file);
      const result = validateImported(original, fixture.kind);
      if (fixture.expected === 'invalid') {
        expect(result.value).toBeUndefined();
        expect(result.issues.map(issue => issue.code)).toContain(fixture.errorCode);
        return;
      }
      expect(result.issues).toEqual([]);
      expect(result.value).toBeDefined();
      const exported = serializeActivity(result.value, value => validateImported(JSON.stringify(value), fixture.kind));
      expect(exported.issues).toEqual([]);
      expect(exported.value).toBeDefined();
      const reopened = validateImported(exported.value!, fixture.kind);
      expect(reopened.issues).toEqual([]);
      expect(reopened.value).toEqual(result.value);
      expect((reopened.value as Record<string, unknown>).activityType).toBe(fixture.kind);
    });
  }
  it('rejects every valid file when opened as the wrong game', () => {
    for (const fixture of manifest.files.filter(f => f.expected === 'valid')) {
      for (const kind of kinds.filter(k => k !== fixture.kind)) {
        const result = validateImported(read(fixture.file), kind);
        expect(result.value).toBeUndefined();
        expect(result.issues.map(issue => issue.code)).toContain('kind');
      }
    }
  });
  it('rejects malformed JSON and an oversized file across all game types', () => {
    for (const kind of kinds) {
      expect(validateImported('{not json', kind).issues[0].code).toBe('json');
      expect(validateImported('x'.repeat(128 * 1024 + 1), kind).issues[0].code).toBe('size');
    }
  });
  it('retains the legacy Memory text-pair parser alongside JSON support', () => {
    const pairs = parsePairs(read('memory-legacy/01-german-vocabulary.txt'));
    expect(pairs.errors).toEqual([]);
    expect(pairs.pairs).toHaveLength(6);
    expect(validateForRoom(pairs)).toBeNull();
  });
});
