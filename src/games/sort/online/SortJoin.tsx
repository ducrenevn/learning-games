import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { freshCapability, isSortRoomCode, joinSortRoom, normalizeSortRoomCode } from './sortRpc';
import { saveSortRoomIdentity } from './identity';
import { sortRoomError, sortRoomText } from './sortRoomCopy';
import { useLocale } from '../../../shared/locale/LocaleProvider';

export function SortJoin() {
  const { locale, chosenLocale } = useLocale();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('room') || '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const studentTokenRef = useRef<string | null>(null);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const room = normalizeSortRoomCode(code);
    if (!isSortRoomCode(room)) {
      setError(sortRoomText(locale, 'invalidCode'));
      return;
    }
    setBusy(true);
    setError('');
    if (!studentTokenRef.current) {
      studentTokenRef.current = freshCapability();
    }
    const token = studentTokenRef.current;
    try {
      const data = await joinSortRoom(room, name.trim(), token);
      saveSortRoomIdentity({ roomCode: data.roomCode, token, role: 'student' });
      // Only an explicit flag choice is carried into the room. Router state is not stored or sent anywhere.
      navigate('/games/sort/room/' + data.roomCode, chosenLocale ? { state: { studentLocale: chosenLocale } } : undefined);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'SORT_SERVER_ERROR';
      setError(sortRoomError(locale, message));
    } finally {
      setBusy(false);
    }
  }

  return <main className="page narrow">
    <Link className="back-link" to="/games/sort">{sortRoomText(locale, 'backToGame')}</Link>
    <section className="panel padded">
      <div className="eyebrow">{sortRoomText(locale, 'eyebrow')}</div>
      <h1>{sortRoomText(locale, 'joinTitle')}</h1>
      <p className="muted">{sortRoomText(locale, 'joinIntro')}</p>
      <form onSubmit={event => void submit(event)} className="form">
        <label>{sortRoomText(locale, 'roomCodeLabel')}
          <input
            className="field"
            value={code}
            maxLength={8}
            required
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            onChange={event => setCode(event.target.value.toUpperCase())}
          />
        </label>
        <label>{sortRoomText(locale, 'nameLabel')}
          <input
            className="field"
            value={name}
            maxLength={40}
            required
            onChange={event => setName(event.target.value)}
          />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? sortRoomText(locale, 'joining') : sortRoomText(locale, 'joinSubmit')}
        </button>
      </form>
    </section>
  </main>;
}

