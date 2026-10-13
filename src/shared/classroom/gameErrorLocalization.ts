// Never surface raw PostgREST, capability or German backend messages in an English or Vietnamese room.
// The error is reduced to a stable key; the UI translates that key with the current interface language.
export type RoomErrorKey = 'roomPolicyMissing' | 'roomUnavailable' | 'serverError' | 'noResponse'
  | 'joinFailed' | 'createFailed' | 'actionFailed';
export type RoomErrorFallback = Extract<RoomErrorKey, 'joinFailed' | 'createFailed' | 'actionFailed' | 'serverError'>;

export function roomErrorKey(error: unknown, fallback: RoomErrorFallback = 'actionFailed'): RoomErrorKey {
  const message = error instanceof Error ? error.message : '';
  if (message === 'ROOM_LANGUAGE_POLICY_MISSING') return 'roomPolicyMissing';
  if (/room unavailable|game already started/i.test(message)) return 'roomUnavailable';
  if (/failed to fetch|network|fetch failed|connection|timeout/i.test(message)) return 'serverError';
  if (message === 'NO_GAME_SERVER_RESPONSE') return 'noResponse';
  return fallback;
}
