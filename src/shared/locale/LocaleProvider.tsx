import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '../activities/contract';

/**
 * One interface language for the whole app (DE/EN/VI). It is deliberately not persisted: a shared classroom device must
 * not remember a previous teacher's choice. Without a provider (isolated component tests) the language stays German.
 * When the M3a `LanguageProvider` is merged it can sit behind this same hook.
 */
interface LocaleState {
  locale: Locale;
  /** Programmatic change (for example a room policy). Does not count as a student's explicit choice. */
  setLocale: (next: Locale) => void;
  /** The last language a person picked with the flag toggle in this page session; null until they pick one. */
  chosenLocale: Locale | null;
  /** A person's own flag choice: changes the interface and records the choice. */
  chooseLocale: (next: Locale) => void;
}
const LocaleContext = createContext<LocaleState>({ locale: 'de', setLocale: () => {}, chosenLocale: null, chooseLocale: () => {} });

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('de');
  const [chosenLocale, setChosenLocale] = useState<Locale | null>(null);
  useEffect(() => {
    const before = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = before; };
  }, [locale]);
  const value = useMemo(() => ({
    locale, setLocale, chosenLocale,
    chooseLocale: (next: Locale) => { setChosenLocale(next); setLocale(next); },
  }), [locale, chosenLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export const useLocale = () => useContext(LocaleContext);

export const LOCALE_OPTIONS: readonly { code: Locale; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'vi', label: 'Tiếng Việt' },
];
const GROUP_LABEL: Record<Locale, string> = { de: 'Sprache', en: 'Language', vi: 'Ngôn ngữ' };

// Inline artwork: flag emoji render as two letters on Windows.
function Flag({ code }: { code: Locale }) {
  return <svg viewBox="0 0 60 36" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    {code === 'de' ? <>
      <path fill="#171717" d="M0 0h60v12H0z"/>
      <path fill="#dd1d26" d="M0 12h60v12H0z"/>
      <path fill="#ffce00" d="M0 24h60v12H0z"/>
    </> : code === 'en' ? <>
      <path fill="#012169" d="M0 0h60v36H0z"/>
      <path stroke="#fff" strokeWidth="9" d="M0 0 60 36M60 0 0 36"/>
      <path stroke="#c8102e" strokeWidth="3.5" d="M0 0 60 36M60 0 0 36"/>
      <path fill="#fff" d="M0 12h60v12H0zM24 0h12v36H24z"/>
      <path fill="#c8102e" d="M0 15h60v6H0zM27 0h6v36h-6z"/>
    </> : <>
      <path fill="#da251d" d="M0 0h60v36H0z"/>
      <path fill="#ffea00" d="m30 7 2.7 7.3 7.7.3-6.1 4.8 2.2 7.4-6.5-4.3-6.5 4.3 2.2-7.4-6.1-4.8 7.7-.3z"/>
    </>}
  </svg>;
}

/** Three-position flag toggle: a labelled group of toggle buttons (`aria-pressed`), same look as the M3a prototype. */
export function LanguageFlags() {
  const { locale, chooseLocale } = useLocale();
  return <div className="language-switcher language-switcher--flags" role="group" aria-label={GROUP_LABEL[locale]}>
    {LOCALE_OPTIONS.map(({ code, label }) => <button key={code} className="language-flag-button" type="button"
      aria-label={label} aria-pressed={locale === code} title={label} onClick={() => chooseLocale(code)}>
      <span className="language-flag-icon"><Flag code={code}/></span>
    </button>)}
  </div>;
}
