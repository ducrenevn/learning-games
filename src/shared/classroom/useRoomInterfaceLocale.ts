import { useEffect, useState } from 'react';
import type { Locale } from '../activities/contract';
import { useLocale } from '../locale/LocaleProvider';

/**
 * Applies the server's room language policy to this participant's interface and returns the language to render.
 *
 * - One language for everyone: the room language is rendered and enforced on every render, so no override survives.
 * - Students choose: the starting language is the student's own Join-page choice when they made one, otherwise the
 *   room language. It is applied once per room visit, so polling and room-state updates never overwrite a choice.
 *
 * The returned value is the one to render. It is correct on the very first render, before the effect runs, so no
 * frame shows the previous page's language.
 */
export function useRoomInterfaceLocale(
  roomLanguage: Locale | null,
  allowStudentLanguageChoice: boolean | null,
  studentLocale: Locale | null = null,
): Locale {
  const { locale, setLocale } = useLocale();
  const [started, setStarted] = useState(false);
  const ready = roomLanguage !== null && allowStudentLanguageChoice !== null;
  const startLocale = studentLocale ?? roomLanguage ?? locale;

  let displayed = locale;
  if (ready) displayed = allowStudentLanguageChoice ? (started ? locale : startLocale) : roomLanguage;

  useEffect(() => {
    if (roomLanguage === null || allowStudentLanguageChoice === null) return;
    if (allowStudentLanguageChoice) {
      if (started) return;
      setLocale(startLocale);
      setStarted(true);
      return;
    }
    if (locale !== roomLanguage) setLocale(roomLanguage);
  }, [roomLanguage, allowStudentLanguageChoice, startLocale, started, locale, setLocale]);

  return displayed;
}
