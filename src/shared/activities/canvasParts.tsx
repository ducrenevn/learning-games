import { useEffect, useId, useLayoutEffect, useRef, useState, type TextareaHTMLAttributes } from 'react';
import type { Locale } from './contract';
import { u } from './uxCopy';
import type { FieldAttrs } from './issues';

/** A textarea that grows with its text, so titles, instructions and long steps are never truncated or hidden in a scroller. */
export function AutoTextarea({ value, minRows = 1, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    if (el.scrollHeight > 0) el.style.height = el.scrollHeight + (el.offsetHeight - el.clientHeight) + 'px';
  };
  useLayoutEffect(fit, [value]);
  // Width changes (window resize, web fonts arriving) re-wrap the text without changing the value.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => { if (el.clientWidth !== width) { width = el.clientWidth; fit(); } });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <textarea ref={ref} rows={minRows} className={className} value={value} {...rest} />;
}

/** Native names only; BCP-47 codes are an advanced detail behind "Other …". Stored value is still the plain language tag. */
const LANGUAGES: readonly { code: string; label: string }[] = [
  { code: 'de', label: 'Deutsch' }, { code: 'en', label: 'English' }, { code: 'vi', label: 'Tiếng Việt' },
  { code: 'fr', label: 'Français' }, { code: 'es', label: 'Español' }, { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' }, { code: 'tr', label: 'Türkçe' }, { code: 'pl', label: 'Polski' },
];
export function TargetLanguageField({ value, onChange, locale, field }: { value: string; onChange: (next: string) => void; locale: Locale; field: FieldAttrs }) {
  const known = LANGUAGES.some(l => l.code === value);
  const [other, setOther] = useState(!known);
  const custom = other || !known;
  const id = useId();
  return <div className="language-field">
    <label htmlFor={id}>{u(locale, 'language')}</label>
      <select id={id} className="field" value={custom ? 'other' : value} onChange={e => {
        if (e.target.value === 'other') setOther(true);
        else { setOther(false); onChange(e.target.value); }
      }}>
        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        <option value="other">{u(locale, 'langOther')}</option>
      </select>
    {custom && <input className="field" aria-label={u(locale, 'langCode')} placeholder="fr, pt-BR …" value={value} {...field} onChange={e => onChange(e.target.value)} />}
  </div>;
}
