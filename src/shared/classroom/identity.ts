import type { RoomIdentity } from '../../games/memory/types';

const prefix = 'learning-games:memory:';

export function saveRoomIdentity(identity: RoomIdentity): void {
  // POC bearer capability: session scoped, never put in URLs or application logs.
  sessionStorage.setItem(prefix + identity.roomCode, JSON.stringify(identity));
}

export function loadRoomIdentity(roomCode: string): RoomIdentity | null {
  try {
    const raw = sessionStorage.getItem(prefix + roomCode);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as Partial<RoomIdentity>;
    if (value.roomCode !== roomCode || !/^[a-f0-9]{64}$/.test(value.token || '')) return null;
    if (value.role !== 'host' && value.role !== 'student') return null;
    return value as RoomIdentity;
  } catch { return null; }
}

export function clearRoomIdentity(roomCode: string): void {
  sessionStorage.removeItem(prefix + roomCode);
}
