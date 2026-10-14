import type { SortRoomIdentity } from './types';
import { isSortRoomCode } from './sortRpc';

const PREFIX = 'learning-games:sort:';
const TOKEN = /^[a-f0-9]{64}$/;

export function saveSortRoomIdentity(identity: SortRoomIdentity): void {
  if (!isSortRoomCode(identity.roomCode) || !TOKEN.test(identity.token) ||
      (identity.role !== 'host' && identity.role !== 'student')) throw new Error('INVALID_SORT_IDENTITY');
  sessionStorage.setItem(PREFIX + identity.roomCode, JSON.stringify(identity));
}
export function loadSortRoomIdentity(roomCode: string): SortRoomIdentity | null {
  if (!isSortRoomCode(roomCode)) return null;
  try {
    const raw = sessionStorage.getItem(PREFIX + roomCode);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Partial<SortRoomIdentity>;
    return candidate.roomCode === roomCode && typeof candidate.token === 'string' &&
      TOKEN.test(candidate.token) && (candidate.role === 'host' || candidate.role === 'student')
      ? candidate as SortRoomIdentity : null;
  } catch { return null; }
}
export function clearSortRoomIdentity(roomCode: string) {
  sessionStorage.removeItem(PREFIX + roomCode);
}
