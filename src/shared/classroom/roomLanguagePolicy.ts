import type { Locale } from '../activities/contract';

// The server's room policy, not a browser setting, decides which interface languages a room may use.
// Student choices are memory-only: they are never written to an account or durable preference.
export interface RoomLanguagePolicy {
  roomLanguage: Locale;
  allowStudentLanguageChoice: boolean;
}

export function isRoomLanguage(value: unknown): value is Locale {
  return value === 'de' || value === 'en' || value === 'vi';
}

export function hasRoomLanguagePolicy(value: unknown): value is RoomLanguagePolicy {
  if (!value || typeof value !== 'object') return false;
  const policy = value as Partial<RoomLanguagePolicy>;
  return isRoomLanguage(policy.roomLanguage) && typeof policy.allowStudentLanguageChoice === 'boolean';
}

// Fail closed: a missing or malformed policy is an error, never a silent fallback to browser language.
export function assertRoomLanguagePolicy(value: unknown): asserts value is RoomLanguagePolicy {
  if (!hasRoomLanguagePolicy(value)) throw new Error('ROOM_LANGUAGE_POLICY_MISSING');
}
