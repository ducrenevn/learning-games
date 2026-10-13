import { useEffect, useRef } from 'react';
import type { Locale } from '../activities/contract';
import { useLocale } from '../locale/LocaleProvider';

/**
 * Applies the server's room language policy to this participant's interface.
 *
 * - One language for everyone: the room language is enforced on every render, so no override survives.
 * - Students choose: the room language is only the starting point. It is applied once per room visit, so
 *   polling and room-state updates never overwrite a participant's own selection.
 */
export function useRoomInterfaceLocale(roomLanguage: Locale | null, allowStudentLanguageChoice: boolean | null) {
  const { locale, setLocale } = useLocale();
  const startedRef = useRef(false);
  useEffect(() => {
    if (roomLanguage === null || allowStudentLanguageChoice === null) return;
    if (allowStudentLanguageChoice) {
      if (startedRef.current) return;
      startedRef.current = true;
      setLocale(roomLanguage);
      return;
    }
    if (locale !== roomLanguage) setLocale(roomLanguage);
  }, [roomLanguage, allowStudentLanguageChoice, locale, setLocale]);
}
