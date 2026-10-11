import { describe, expect, it } from 'vitest';
import { assertRoomLanguagePolicy, resolveRoomLanguage } from './roomLanguagePolicy';

describe('authoritative Memory room interface policy', () => {
  it('enforces the teacher language when student selection is locked', () => {
    const state = { roomLanguage: 'vi' as const, allowStudentLanguageChoice: false };
    assertRoomLanguagePolicy(state);
    expect(resolveRoomLanguage(state, 'de')).toBe('vi');
    expect(resolveRoomLanguage(state, 'en')).toBe('vi');
  });
  it('lets students choose when explicitly enabled by the teacher', () => {
    const state = { roomLanguage: 'de' as const, allowStudentLanguageChoice: true };
    expect(resolveRoomLanguage(state, 'en')).toBe('en');
    expect(resolveRoomLanguage(state, 'vi')).toBe('vi');
  });
  it.each([
    null, undefined, {}, { roomLanguage: 'en' },
    { roomLanguage: 'xx', allowStudentLanguageChoice: false },
    { roomLanguage: 'de', allowStudentLanguageChoice: 'true' },
  ])('fails closed if the backend policy is absent or invalid: %s', value => {
    expect(() => assertRoomLanguagePolicy(value)).toThrow('ROOM_LANGUAGE_POLICY_MISSING');
  });
});
