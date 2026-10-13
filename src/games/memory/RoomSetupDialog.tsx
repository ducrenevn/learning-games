import { useState, type KeyboardEvent } from 'react';
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
  const languageName = LOCALE_OPTIONS.find(option => option.code === locale)?.label ?? locale;

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

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && !busy) onCancel();
  }

  return <div className="room-setup-backdrop">
    <section className="panel padded room-setup" role="dialog" aria-modal="true" aria-labelledby="room-setup-title" onKeyDown={onKeyDown}>
      <h2 id="room-setup-title">{memoryText(locale, 'createTitle')}</h2>
      <p className="muted">{memoryText(locale, 'createLead', { language: languageName })}</p>
      <fieldset className="room-language-options" disabled={busy}>
        <legend>{roomText(locale, 'policyTitle')}</legend>
        <label className="room-language-choice">
          <input type="radio" name="room-language-mode" checked={!allowChoice} onChange={() => setAllowChoice(false)} autoFocus />
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
