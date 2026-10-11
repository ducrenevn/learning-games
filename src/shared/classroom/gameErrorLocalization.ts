import type { useLanguage } from '../i18n';

type Translate = ReturnType<typeof useLanguage>['t'];
type Fallback = 'joinFailed' | 'createFailed' | 'actionFailed' | 'serverError';

// Do not surface raw PostgREST or capability-sensitive backend errors.
export function localizeGameError(error: unknown, t: Translate, fallback: Fallback = 'actionFailed'): string {
  const message = error instanceof Error ? error.message : '';
  if (message === 'ROOM_LANGUAGE_POLICY_MISSING') return t('roomPolicyMissing');
  if (/room unavailable|game already started/i.test(message)) return t('roomUnavailable');
  if (/failed to fetch|network|fetch failed|connection|timeout/i.test(message)) return t('serverError');
  if (/NO_GAME_SERVER_RESPONSE|no response|keine antwort/i.test(message)) return t('noResponse');
  return t(fallback);
}
