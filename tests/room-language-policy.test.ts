import { describe, expect, it } from 'vitest';
import { assertRoomLanguagePolicy, hasRoomLanguagePolicy } from '../src/shared/classroom/roomLanguagePolicy';
import { roomErrorKey } from '../src/shared/classroom/gameErrorLocalization';
import { roomCopy } from '../src/shared/classroom/roomCopy';
import { memoryRoomCopy } from '../src/games/memory/roomCopy';

describe('authoritative room language policy', () => {
  it('accepts a complete server policy in any supported language', () => {
    for (const roomLanguage of ['de', 'en', 'vi'] as const) {
      for (const allowStudentLanguageChoice of [true, false]) {
        const policy = { roomLanguage, allowStudentLanguageChoice };
        expect(hasRoomLanguagePolicy(policy)).toBe(true);
        expect(() => assertRoomLanguagePolicy(policy)).not.toThrow();
      }
    }
  });

  it.each([
    null, undefined, {}, { roomLanguage: 'en' },
    { roomLanguage: 'xx', allowStudentLanguageChoice: false },
    { roomLanguage: 'de', allowStudentLanguageChoice: 'true' },
  ])('fails closed when the server policy is absent or malformed: %s', value => {
    expect(hasRoomLanguagePolicy(value)).toBe(false);
    expect(() => assertRoomLanguagePolicy(value)).toThrow('ROOM_LANGUAGE_POLICY_MISSING');
  });
});

describe('safe room error keys', () => {
  it('recognises expected room, policy and transport conditions', () => {
    expect(roomErrorKey(new Error('ROOM_LANGUAGE_POLICY_MISSING'))).toBe('roomPolicyMissing');
    expect(roomErrorKey(new Error('Room unavailable or game already started.'), 'joinFailed')).toBe('roomUnavailable');
    expect(roomErrorKey(new Error('Failed to fetch'))).toBe('serverError');
    expect(roomErrorKey(new Error('NO_GAME_SERVER_RESPONSE'))).toBe('noResponse');
  });

  it('never exposes unknown backend text and uses the caller fallback instead', () => {
    expect(roomErrorKey(new Error('credential=secret; PostgREST detail'), 'joinFailed')).toBe('joinFailed');
    expect(roomErrorKey(null, 'createFailed')).toBe('createFailed');
    expect(roomErrorKey(null)).toBe('actionFailed');
  });
});

describe('room copy completeness', () => {
  it.each([
    ['shared room copy', roomCopy],
    ['Memory room copy', memoryRoomCopy],
  ])('%s has the same keys and non-empty text in DE, EN and VI', (_label, table) => {
    const keys = Object.keys(table.en).sort();
    expect(Object.keys(table.de).sort()).toEqual(keys);
    expect(Object.keys(table.vi).sort()).toEqual(keys);
    for (const locale of ['de', 'en', 'vi'] as const) {
      for (const key of keys) expect(String(table[locale][key as keyof typeof table.en]).trim()).not.toBe('');
    }
  });
});
