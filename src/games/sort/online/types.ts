import type { Locale } from '../../../shared/activities/contract';

export type SortRoomStatus = 'lobby' | 'active' | 'review' | 'finished' | 'expired';
export type SortRoomRole = 'host' | 'student';

export interface SortRoomIdentity {
  roomCode: string;
  token: string;
  role: SortRoomRole;
}

export interface SortCategoryCard { handle: string; label: string }
export interface SortItemCard { handle: string; text: string }
export interface StudentSortView {
  categories: SortCategoryCard[];
  items: SortItemCard[];
}
export interface SortScore {
  evaluator: string;
  correct: number;
  total: number;
  complete: boolean;
  perItem?: Array<{ itemId: string; correct: boolean; placed: boolean }>;
}
export interface SortSubmission {
  status: 'submitted' | 'closed_unsubmitted';
  submittedAt: string | null;
}
export interface SortStudentResult {
  score: SortScore | null;
  /** Room-scoped opaque item handle -> correct opaque category handle. */
  answerFeedback: Record<string, string>;
}
export interface SortParticipant {
  participantId: string;
  role: SortRoomRole;
  displayName: string;
  status: string;
  completionStatus: string | null;
  /** Available to the host during review/finished only. */
  submission?: Record<string, string> | null;
  score?: SortScore | null;
}
export interface HostSortView {
  status: SortRoomStatus;
  participants: SortParticipant[];
  studentCount: number;
  /** Available to host during review/finished only. */
  answerReference: Record<string, string> | null;
}

interface BaseSortState {
  roomRevision: number;
  roomStatus: SortRoomStatus;
  game: 'sort';
  mode: 'individual';
  roomLanguage: Locale;
  allowStudentLanguageChoice: boolean;
}
export interface HostSortState extends BaseSortState {
  role: 'host';
  hostView: HostSortView;
}
export interface StudentSortState extends BaseSortState {
  role: 'student';
  attemptRevision: number;
  studentView: StudentSortView;
  placements: Record<string, string>;
  submission: SortSubmission | null;
  result: SortStudentResult | null;
}
export type SortRoomState = HostSortState | StudentSortState;

/** Mutating RPCs return receipts, not the entire room state. */
export interface SortCommandReceipt {
  roomRevision: number;
  attemptRevision?: number;
  roomStatus?: SortRoomStatus;
  status: string;
}
export interface SortCreateReceipt {
  roomCode: string;
  roomRevision: number;
  roomLanguage: Locale;
  allowStudentLanguageChoice: boolean;
  roomStatus: SortRoomStatus;
}
export interface SortJoinReceipt {
  roomCode: string;
  participantId: string;
  roomRevision: number;
  attemptRevision?: number;
  roomStatus: SortRoomStatus;
}
