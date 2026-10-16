import { getSupabase } from '../../../shared/lib/supabase';
import type { SortActivity } from '../model';
import { parseSortState } from './parseSortState';
import type { SortCommandReceipt, SortCreateReceipt, SortJoinReceipt, SortRoomIdentity, SortRoomState } from './types';

export function freshCapability(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
export function normalizeSortRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
export function isSortRoomCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) {
    // Keep only backend error identifiers; never include capabilities, raw SQL messages or request bodies.
    const match = /^[A-Z][A-Z_]+$/.exec(error.message);
    throw new Error(match ? match[0] : 'SORT_SERVER_ERROR');
  }
  if (data === null || data === undefined) throw new Error('SORT_NO_RESPONSE');
  return data as T;
}

/** Retry with exactly the same capability after an ambiguous network failure. */
export function createSortRoom(activity: SortActivity, language: 'de' | 'en' | 'vi', allowStudentLanguageChoice: boolean, hostToken: string) {
  return rpc<SortCreateReceipt>('lg_v1_create', {
    p_game: 'sort', p_mode: 'individual', p_activity: activity,
    p_room_language: language, p_allow_student_language_choice: allowStudentLanguageChoice,
    p_host_token: hostToken,
  });
}
export function joinSortRoom(roomCode: string, displayName: string, playerToken: string) {
  return rpc<SortJoinReceipt>('lg_v1_join', {
    p_room_code: normalizeSortRoomCode(roomCode),
    p_display_name: displayName,
    p_player_token: playerToken,
  });
}
export async function fetchSortRoom(identity: SortRoomIdentity, previous: SortRoomState | null) {
  const result = await rpc<unknown>('lg_v1_state', {
    p_room_code: identity.roomCode, p_token: identity.token,
    p_room_rev: previous?.roomRevision ?? null,
    p_attempt_rev: previous?.role === 'student' ? previous.attemptRevision : null,
  });
  return parseSortState(result, identity.role, previous);
}
export function commandSortRoom(identity: SortRoomIdentity, kind: string, payload: Record<string, unknown>,
  roomRevision: number | null, attemptRevision: number | null = null) {
  return rpc<SortCommandReceipt>('lg_v1_command', {
    p_room_code: identity.roomCode, p_token: identity.token,
    p_kind: kind, p_payload: payload, p_expected_room_rev: roomRevision,
    p_expected_attempt_rev: attemptRevision,
  });
}
