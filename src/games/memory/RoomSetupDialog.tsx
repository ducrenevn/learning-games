import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Locale } from '../../shared/activities/contract';
import { roomErrorKey } from '../../shared/classroom/gameErrorLocalization';
import { roomText } from '../../shared/classroom/roomCopy';
import { LOCALE_OPTIONS } from '../../shared/locale/LocaleProvider';
import { memoryText } from './roomCopy';

interface Props {
  locale: Locale;
  /** Creates the room with the teacher's choice. Rejects on failure, and the dialog stays open to show it. */
  onConfirm: (allowStudentLanguageChoice: boolean) => Promise<void>;
  onCancel: () => void;
}

/** Explicit room configuration before the create RPC. Cancelling creates nothing and leaves the editor draft untouched. */
export function RoomSetupDialog({ locale, onConfirm, onCancel }: Props) {
  const [allowChoice, setAllowChoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const languageName = LOCALE_OPTIONS.find(option => option.code === locale)?.label ?? locale;

  // Focus enters the dialog on open, on the selected option.
  useEffect(() => {
    rootRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.focus();
  }, []);
  // While the request runs every control is disabled, so focus rests on the dialog itself rather than the page behind it.
  useEffect(() => {
    if (busy) rootRef.current?.focus();
  }, [busy]);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(allowChoice);
    } catch (e) {
      setError(roomText(locale, roomErrorKey(e, 'createFailed')));
      setBusy(false);
    }
  }

  /** Enabled buttons and the selected radio, in document order. Unselected radios are skipped, as the browser does. */
  function tabStops(): HTMLElement[] {
    const root = rootRef.current;
    if (!root || busy) return [];
    return Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), input[type="radio"]'))
      .filter(element => element.tagName === 'BUTTON' || (element as HTMLInputElement).checked);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      if (!busy) {
        event.preventDefault();
        onCancel();
      }
      return;
    }
    if (event.key !== 'Tab') return;
    // Focus must not leave the dialog: move it by hand, because the native order would reach the page behind.
    event.preventDefault();
    const stops = tabStops();
    if (stops.length === 0) {
      rootRef.current?.focus();
      return;
    }
    const current = stops.indexOf(document.activeElement as HTMLElement);
    const last = stops.length - 1;
    const next = event.shiftKey
      ? (current <= 0 ? last : current - 1)
      : (current === -1 || current === last ? 0 : current + 1);
    stops[next].focus();
  }

  return <div className="room-setup-backdrop">
    <section ref={rootRef} tabIndex={-1} className="panel padded room-setup" role="dialog" aria-modal="true" aria-labelledby="room-setup-title" onKeyDown={onKeyDown}>
      <h2 id="room-setup-title">{memoryText(locale, 'createTitle')}</h2>
      <p className="muted">{memoryText(locale, 'createLead', { language: languageName })}</p>
      <fieldset className="room-language-options" disabled={busy}>
        <legend>{roomText(locale, 'policyTitle')}</legend>
        <label className="room-language-choice">
          <input type="radio" name="room-language-mode" checked={!allowChoice} onChange={() => setAllowChoice(false)} />
          <span className="room-language-choice-copy">
            <strong>{roomText(locale, 'policySame')}</strong><small>{roomText(locale, 'policySameHelp')}</small>
          </span>
        </label>
        <label className="room-language-choice">
          <input type="radio" name="room-language-mode" checked={allowChoice} onChange={() => setAllowChoice(true)} />
          <span className="room-language-choice-copy">
            <strong>{roomText(locale, 'policyChoice')}</strong><small>{roomText(locale, 'policyChoiceHelp')}</small>
          </span>
        </label>
      </fieldset>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="room-setup-actions">
        <button type="button" className="button secondary" onClick={onCancel} disabled={busy}>{memoryText(locale, 'cancel')}</button>
        <button type="button" className="button primary" onClick={() => void confirm()} disabled={busy}>
          {busy ? memoryText(locale, 'creating') : memoryText(locale, 'createConfirm')}
        </button>
      </div>
    </section>
  </div>;
}
