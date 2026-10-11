import { getSupabase } from '../../../shared/lib/supabase';
import type { MemoryPair, MemoryRoomState } from '../types';
import type { Language } from '../../../shared/i18n';
import { assertRoomLanguagePolicy } from '../../../shared/classroom/roomLanguagePolicy';

async function call<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Keine Antwort vom Spielserver.');
  return data as T;
}

export function createMemoryRoom(pairs: MemoryPair[], language: Language, allowStudentLanguageChoice: boolean, title = 'Memory-Spiel') {
  return call<{ roomCode: string; hostToken: string }>('game_poc_memory_create_v2', {
    p_title: title, p_pairs: pairs.map(({ left, right }) => ({ left, right })),
    p_language: language, p_allow_student_language_choice: allowStudentLanguageChoice,
  });
}
export function joinMemoryRoom(roomCode: string, name: string) {
  return call<{ roomCode: string; playerId: string; playerToken: string }>('game_poc_memory_join', {
    p_room_code: roomCode, p_display_name: name,
  });
}
export async function fetchMemoryRoom(roomCode: string, token: string) {
  const state = await call<MemoryRoomState>('game_poc_memory_state', { p_room_code: roomCode, p_token: token });
  assertRoomLanguagePolicy(state);
  return state;
}
export function startMemoryRoom(roomCode: string, hostToken: string) {
  return call<MemoryRoomState>('game_poc_memory_start', { p_room_code: roomCode, p_host_token: hostToken });
}
export function flipMemoryCard(roomCode: string, token: string, cardId: number, revision: number) {
  return call<MemoryRoomState>('game_poc_memory_flip', {
    p_room_code: roomCode, p_player_token: token, p_card_id: cardId, p_expected_revision: revision,
  });
}
export function advanceMemoryTurn(roomCode: string, token: string, revision: number) {
  return call<MemoryRoomState>('game_poc_memory_next', {
    p_room_code: roomCode, p_token: token, p_expected_revision: revision,
  });
}
export function skipMemoryTurn(roomCode: string, token: string, revision: number) {
  return call<MemoryRoomState>('game_poc_memory_skip', {
    p_room_code: roomCode, p_host_token: token, p_expected_revision: revision,
  });
}
