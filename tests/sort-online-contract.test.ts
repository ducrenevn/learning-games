import { describe, expect, it } from 'vitest';
import { parseSortState } from '../src/games/sort/online/parseSortState';

const item = 'a'.repeat(32);
const category = 'b'.repeat(32);
const policy = { roomRevision: 4, roomStatus: 'active', game: 'sort', mode: 'individual',
  roomLanguage: 'de', allowStudentLanguageChoice: false };
const student = {
  ...policy, attemptRevision: 1,
  studentView: { items: [{ handle: item, text: 'Apfel' }], categories: [{ handle: category, label: 'Obst' }] },
  placements: { [item]: category }, submission: null, result: null,
};
describe('Sort MP1 safe projection', () => {
  it('accepts student cards by opaque handles and room policy', () => {
    const parsed = parseSortState(student, 'student', null);
    expect(parsed.role).toBe('student');
    if (parsed.role !== 'student') throw new Error('wrong view');
    expect(parsed.studentView.items).toEqual([{ handle: item, text: 'Apfel' }]);
    expect(parsed.placements[item]).toBe(category);
  });
  it('rejects an authored item identifier, missing room policy or host view in student response', () => {
    expect(() => parseSortState({ ...student,
      studentView: { ...student.studentView, items: [{ handle: 'card-1', text: 'Apfel' }] } }, 'student', null)).toThrow();
    expect(() => parseSortState({ ...student, roomLanguage: undefined }, 'student', null)).toThrow();
    expect(() => parseSortState({ ...policy, hostView: {} }, 'student', null)).toThrow();
  });
  it('does not expose authored score item identifiers to student components', () => {
    const parsed = parseSortState({ ...student, roomStatus: 'review',
      result: { score: { evaluator: 'scoreSort', total: 1, correct: 1, complete: true,
        perItem: [{ itemId: 'card-1', correct: true, placed: true }] },
        answerFeedback: { [item]: category } } }, 'student', null);
    expect(parsed.role).toBe('student');
    if (parsed.role !== 'student') throw new Error('wrong view');
    expect(JSON.stringify(parsed.result)).not.toContain('card-1');
    expect(parsed.result?.answerFeedback[item]).toBe(category);
  });
  it('accepts unchanged polling responses only when a matching prior state exists', () => {
    const previous = parseSortState(student, 'student', null);
    expect(parseSortState({ roomRevision: 4, attemptRevision: 1, unchanged: true }, 'student', previous)).toBe(previous);
    expect(() => parseSortState({ roomRevision: 4, attemptRevision: 2, unchanged: true }, 'student', previous)).toThrow();
    expect(() => parseSortState({ roomRevision: 4, unchanged: true }, 'host', null)).toThrow();
  });
  it('ignores stale attempt revisions without rolling the UI backwards', () => {
    const newer = parseSortState({ ...student, attemptRevision: 3 }, 'student', null);
    expect(parseSortState(student, 'student', newer)).toBe(newer);
  });
  it('host receives roster and review answer reference, not before close', () => {
    const base = { ...policy, hostView: { status: 'active', studentCount: 1,
      participants: [{ participantId: 'student', role: 'student', displayName: 'Mai', status: 'active',
        completionStatus: 'in_progress' }], answerReference: null } };
    const result = parseSortState(base, 'host', null);
    expect(result.role).toBe('host');
    expect(() => parseSortState({ ...base, hostView: { ...base.hostView,
      participants: [{ ...base.hostView.participants[0], score: { correct: 1 } }] } }, 'host', null)).toThrow();
  });
});
