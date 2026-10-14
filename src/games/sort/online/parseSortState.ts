import { hasRoomLanguagePolicy } from '../../../shared/classroom/roomLanguagePolicy';
import type {
  HostSortState, SortParticipant, SortRoomRole, SortRoomState, SortRoomStatus,
  SortScore, StudentSortState,
} from './types';

type JsonObject = Record<string, unknown>;
const STATUSES: readonly string[] = ['lobby', 'active', 'review', 'finished', 'expired'];
const HANDLE = /^[a-f0-9]{32}$/;

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_SORT_STATE');
  return value as JsonObject;
}
function str(value: unknown): string {
  if (typeof value !== 'string') throw new Error('INVALID_SORT_STATE');
  return value;
}
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('INVALID_SORT_STATE');
  return value;
}
function status(value: unknown): SortRoomStatus {
  if (typeof value !== 'string' || !STATUSES.includes(value)) throw new Error('INVALID_SORT_STATE');
  return value as SortRoomStatus;
}
function handle(value: unknown): string {
  const text = str(value);
  if (!HANDLE.test(text)) throw new Error('INVALID_SORT_STATE');
  return text;
}
function mapping(value: unknown): Record<string, string> {
  const source = object(value);
  const result: Record<string, string> = Object.create(null);
  for (const [key, target] of Object.entries(source)) result[handle(key)] = handle(target);
  return result;
}
function score(value: unknown): SortScore | null {
  if (value === null) return null;
  const data = object(value);
  // Do not forward raw score.perItem to a student's components: SQL currently includes authored IDs in that field.
  // The host may get the private detail, but client-facing student scoring uses only aggregates.
  return {
    evaluator: str(data.evaluator), correct: integer(data.correct),
    total: integer(data.total), complete: data.complete === true,
  };
}
function participants(value: unknown, phase: SortRoomStatus): SortParticipant[] {
  if (!Array.isArray(value)) throw new Error('INVALID_SORT_STATE');
  return value.map(raw => {
    const row = object(raw);
    const role = str(row.role);
    if (role !== 'host' && role !== 'student') throw new Error('INVALID_SORT_STATE');
    const result: SortParticipant = {
      participantId: str(row.participantId), displayName: str(row.displayName),
      role, status: str(row.status), completionStatus: row.completionStatus === null ? null : str(row.completionStatus),
    };
    if (phase === 'review' || phase === 'finished') {
      if (row.submission !== undefined) result.submission = row.submission === null ? null : mapping(row.submission);
      if (row.score !== undefined) result.score = score(row.score);
    } else if (row.submission !== undefined || row.score !== undefined) {
      throw new Error('INVALID_SORT_STATE');
    }
    return result;
  });
}

/** Parse only documented actor-scoped fields. Never turn the private teacher activity into a student DTO. */
export function parseSortState(raw: unknown, role: SortRoomRole, previous: SortRoomState | null): SortRoomState {
  const data = object(raw);
  const roomRevision = integer(data.roomRevision);
  if (data.unchanged === true) {
    if (!previous || previous.role !== role || previous.roomRevision !== roomRevision ||
        (role === 'student' && (previous.role !== 'student' || previous.attemptRevision !== integer(data.attemptRevision)))) {
      throw new Error('INVALID_SORT_STATE');
    }
    return previous;
  }
  if (data.game !== 'sort' || data.mode !== 'individual' || !hasRoomLanguagePolicy(data)) {
    throw new Error('INVALID_SORT_STATE');
  }
  const roomStatus = status(data.roomStatus);
  const common = {
    game: 'sort' as const, mode: 'individual' as const, roomRevision, roomStatus,
    roomLanguage: data.roomLanguage, allowStudentLanguageChoice: data.allowStudentLanguageChoice,
  };
  let next: SortRoomState;
  if (role === 'host') {
    const view = object(data.hostView);
    next = {
      ...common, role: 'host', hostView: {
        status: status(view.status), participants: participants(view.participants, roomStatus),
        studentCount: integer(view.studentCount),
        answerReference: roomStatus === 'review' || roomStatus === 'finished'
          ? (view.answerReference === null ? null : mapping(view.answerReference))
          : null,
      },
    } satisfies HostSortState;
  } else {
    const view = object(data.studentView);
    if (!Array.isArray(view.items) || !Array.isArray(view.categories)) throw new Error('INVALID_SORT_STATE');
    const items = view.items.map(rawItem => {
      const item = object(rawItem);
      return { handle: handle(item.handle), text: str(item.text) };
    });
    const categories = view.categories.map(rawCategory => {
      const category = object(rawCategory);
      return { handle: handle(category.handle), label: str(category.label) };
    });
    const submission = data.submission === null ? null : object(data.submission);
    const result = data.result === null ? null : object(data.result);
    if (result && (roomStatus === 'lobby' || roomStatus === 'active')) throw new Error('INVALID_SORT_STATE');
    next = {
      ...common, role: 'student', attemptRevision: integer(data.attemptRevision),
      studentView: { items, categories }, placements: mapping(data.placements),
      submission: submission ? {
        status: str(submission.status) as 'submitted' | 'closed_unsubmitted',
        submittedAt: submission.submittedAt === null ? null : str(submission.submittedAt),
      } : null,
      result: result ? {
        score: score(result.score), answerFeedback: mapping(result.answerFeedback),
      } : null,
    } satisfies StudentSortState;
    if (next.submission && !['submitted', 'closed_unsubmitted'].includes(next.submission.status)) {
      throw new Error('INVALID_SORT_STATE');
    }
  }
  if (previous?.role === next.role && (
    next.roomRevision < previous.roomRevision ||
    (next.roomRevision === previous.roomRevision && next.role === 'student' &&
      previous.role === 'student' && next.attemptRevision < previous.attemptRevision)
  )) return previous;
  return next;
}
