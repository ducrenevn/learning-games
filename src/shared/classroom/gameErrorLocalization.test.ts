import { describe, expect, it } from 'vitest';
import { localizeGameError } from './gameErrorLocalization';
import { useLanguage } from '../i18n';

type Translator = ReturnType<typeof useLanguage>['t'];
const t = ((key: string) => key) as Translator;

describe('safe multilingual room-error presentation', () => {
  it('recognizes expected room and policy conditions', () => {
    expect(localizeGameError(new Error('ROOM_LANGUAGE_POLICY_MISSING'), t)).toBe('roomPolicyMissing');
    expect(localizeGameError(new Error('Room unavailable or game already started.'), t, 'joinFailed')).toBe('roomUnavailable');
    expect(localizeGameError(new Error('NO_GAME_SERVER_RESPONSE'), t)).toBe('noResponse');
  });
  it('does not expose unknown backend messages or credentials', () => {
    expect(localizeGameError(new Error('credential=secret; PostgREST detail'), t, 'joinFailed')).toBe('joinFailed');
    expect(localizeGameError(null,t)).toBe('actionFailed');
  });
});
