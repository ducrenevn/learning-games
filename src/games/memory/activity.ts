import { arrayField, distinct, envelope, optionalText, record, slugField, textField, type ActivityBase, type Issue, type Result } from '../../shared/activities/contract';
import { parsePairs, type ParseResult } from './engine/pairs';
import type { MemoryPair } from './types';

/** Teacher-authored content only. Never export room identity, tokens, players, or attempts. */
export interface MemoryActivityPair { id: string; left: string; right: string; category?: string }
export type MemoryActivity = ActivityBase<'memory', { pairs: MemoryActivityPair[] }>;
export function makeBlankMemory(): MemoryActivity {
  return { format: 'learning-games.activity', schemaVersion: 1, activityType: 'memory',
    id: 'new-memory-activity', title: 'Memory', targetLanguage: 'de', instructions: 'Finde die passenden Paare.',
    content: { pairs: [{ id: 'pair-1', left: '', right: '' }, { id: 'pair-2', left: '', right: '' }] } };
}
export function validateMemory(raw: unknown): Result<MemoryActivity> {
  const issues: Issue[] = [];
  if (!envelope(raw, 'memory', issues)) return { issues };
  if (!record(raw.content, 'content', ['pairs'], issues)) return { issues };
  const pairs = arrayField(raw.content, 'pairs', 'content', 1, 16, issues);
  pairs.forEach((pair, i) => {
    const path = `content.pairs[${i}]`;
    if (!record(pair, path, ['id', 'left', 'right', 'category'], issues)) return;
    slugField(pair, 'id', path, issues);
    textField(pair, 'left', path, 1, 80, issues);
    textField(pair, 'right', path, 1, 80, issues);
    optionalText(pair, 'category', path, 80, issues);
  });
  distinct(pairs, 'id', 'content.pairs', issues);
  // Two indistinguishable pairs make matching impossible to explain; individual repeated sides remain valid.
  const seen = new Set<string>();
  pairs.forEach((pair, i) => {
    if (!pair || typeof pair !== 'object' || Array.isArray(pair)) return;
    const p = pair as Partial<MemoryActivityPair>;
    if (typeof p.left !== 'string' || typeof p.right !== 'string') return;
    const key = JSON.stringify([p.left.trim().normalize('NFC').toLocaleLowerCase(), p.right.trim().normalize('NFC').toLocaleLowerCase()]);
    if (seen.has(key)) issues.push({ path: `content.pairs[${i}]`, code: 'duplicate' });
    seen.add(key);
  });
  return issues.length ? { issues } : { issues, value: raw as unknown as MemoryActivity };
}
export function toMemoryPairs(activity: MemoryActivity): MemoryPair[] {
  return activity.content.pairs.map(({ left, right, category }) => ({ left, right, ...(category ? { category } : {}) }));
}
export function fromMemoryPairs(pairs: readonly MemoryPair[], title = 'Memory'): MemoryActivity {
  return {
    ...makeBlankMemory(), title,
    content: { pairs: pairs.map((pair, i) => ({ id: `pair-${i + 1}`, left: pair.left, right: pair.right,
      ...(pair.category ? { category: pair.category } : {}) })) },
  };
}
/** Keeps the old pipe-delimited teacher workflow available as a bulk entry helper. */
export function legacyPairsToActivity(text: string, title = 'Memory'): Result<MemoryActivity> {
  const parsed: ParseResult = parsePairs(text);
  if (parsed.errors.length) return { issues: parsed.errors.map((_, i) => ({ path: `legacy.lines[${i + 1}]`, code: 'format' })) };
  return validateMemory(fromMemoryPairs(parsed.pairs, title));
}
export function memoryRoomIssue(activity: MemoryActivity): 'count' | null {
  return activity.content.pairs.length < 2 || activity.content.pairs.length > 16 ? 'count' : null;
}
