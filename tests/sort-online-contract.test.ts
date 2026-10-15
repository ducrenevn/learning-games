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
  it('tracks explicit server-authoritative resultsRevealed during review before and after reveal', () => {
    // 1. Close -> Review (not revealed yet). Real SQL already returns answerReference, but resultsRevealed is false.
    const reviewUnrevealed = {
      ...policy,
      roomRevision: 5,
      roomStatus: 'review',
      resultsRevealed: false,
      hostView: {
        status: 'review',
        resultsRevealed: false,
        studentCount: 1,
        participants: [{
          participantId: 'student-1', role: 'student', displayName: 'Mai', status: 'active',
          completionStatus: 'submitted', submission: { [item]: category }, score: { evaluator: 'scoreSort', correct: 1, total: 1, complete: true },
        }],
        answerReference: { [item]: category },
      },
    };
    const parsedReview = parseSortState(reviewUnrevealed, 'host', null);
    expect(parsedReview.role).toBe('host');
    if (parsedReview.role !== 'host') throw new Error('wrong view');
    expect(parsedReview.resultsRevealed).toBe(false);
    expect(parsedReview.hostView.resultsRevealed).toBe(false);
    expect(parsedReview.hostView.answerReference).toEqual({ [item]: category });

    // 2. Teacher refresh/reconnect in review (unrevealed): fresh state with resultsRevealed: false
    const refreshedUnrevealed = parseSortState(reviewUnrevealed, 'host', null);
    expect(refreshedUnrevealed.resultsRevealed).toBe(false);

    // 3. Reveal -> Review (revealed). Real SQL updates revealed_at and increments room revision.
    const reviewRevealed = {
      ...reviewUnrevealed,
      roomRevision: 6,
      resultsRevealed: true,
      hostView: {
        ...reviewUnrevealed.hostView,
        resultsRevealed: true,
      },
    };
    const parsedRevealed = parseSortState(reviewRevealed, 'host', parsedReview);
    expect(parsedRevealed.resultsRevealed).toBe(true);
    if (parsedRevealed.role !== 'host') throw new Error('wrong view');
    expect(parsedRevealed.hostView.resultsRevealed).toBe(true);

    // 4. Teacher refresh/reconnect in review (revealed): fresh state retains resultsRevealed: true
    const refreshedRevealed = parseSortState(reviewRevealed, 'host', null);
    expect(refreshedRevealed.resultsRevealed).toBe(true);

    // 5. Student view: unrevealed has resultsRevealed: false; revealed has resultsRevealed: true
    const studentUnrevealed = parseSortState({
      ...student,
      roomRevision: 5,
      roomStatus: 'review',
      resultsRevealed: false,
      result: null,
    }, 'student', null);
    expect(studentUnrevealed.resultsRevealed).toBe(false);

    const studentRevealed = parseSortState({
      ...student,
      roomRevision: 6,
      roomStatus: 'review',
      resultsRevealed: true,
      result: {
        score: { evaluator: 'scoreSort', correct: 1, total: 1, complete: true },
        answerFeedback: { [item]: category },
      },
    }, 'student', studentUnrevealed);
    expect(studentRevealed.resultsRevealed).toBe(true);
  });
});
