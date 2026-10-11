import type { Language } from '../i18n';

// The server's room policy, not client preference, is authoritative.
// Guest interface preferences are deliberately memory-only.
export interface RoomLanguagePolicy {
  roomLanguage: Language;
  allowStudentLanguageChoice: boolean;
}

export function isRoomLanguage(value: unknown): value is Language {
  return value === 'de' || value === 'en' || value === 'vi';
}

export function assertRoomLanguagePolicy(value: unknown): asserts value is RoomLanguagePolicy {
  if (!value || typeof value !== 'object') throw new Error('ROOM_LANGUAGE_POLICY_MISSING');
  const policy = value as Partial<RoomLanguagePolicy>;
  if (!isRoomLanguage(policy.roomLanguage) ||
      typeof policy.allowStudentLanguageChoice !== 'boolean') {
    // Never silently fall back to a browser-only language setting.
    throw new Error('ROOM_LANGUAGE_POLICY_MISSING');
  }
}

export function resolveRoomLanguage(policy: RoomLanguagePolicy, choice: Language): Language {
  return policy.allowStudentLanguageChoice ? choice : policy.roomLanguage;
}
