import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { joinMemoryRoom } from './api/memoryRpc';
import { normalizeRoomCode } from './engine/pairs';
import { saveRoomIdentity } from '../../shared/classroom/identity';
import { roomErrorKey } from '../../shared/classroom/gameErrorLocalization';
import { roomText } from '../../shared/classroom/roomCopy';
import { useLocale } from '../../shared/locale/LocaleProvider';
import { memoryText } from './roomCopy';

export function MemoryJoin() {
  const { locale } = useLocale();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('room') || '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const room = normalizeRoomCode(code);
    if (!/^[A-Z0-9]{6}$/.test(room)) {
      setError(memoryText(locale, 'invalidCode'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await joinMemoryRoom(room, name.trim());
      saveRoomIdentity({ roomCode: data.roomCode, token: data.playerToken, role: 'student' });
      navigate('/games/memory/room/' + data.roomCode);
    } catch (e) {
      setError(roomText(locale, roomErrorKey(e, 'joinFailed')));
    } finally {
      setBusy(false);
    }
  }

  return <main className="page narrow">
    <Link className="back-link" to="/games/memory">{memoryText(locale, 'backToGame')}</Link>
    <section className="panel padded">
      <div className="eyebrow">{memoryText(locale, 'eyebrow')}</div>
      <h1>{memoryText(locale, 'joinTitle')}</h1>
      <p className="muted">{memoryText(locale, 'joinIntro')}</p>
      <form onSubmit={event => void submit(event)} className="form">
        <label>{memoryText(locale, 'roomCodeLabel')}
          <input className="field" value={code} maxLength={6} required onChange={event => setCode(event.target.value.toUpperCase())} />
        </label>
        <label>{memoryText(locale, 'nameLabel')}
          <input className="field" value={name} maxLength={40} required onChange={event => setName(event.target.value)} />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button className="button primary" disabled={busy}>{busy ? memoryText(locale, 'joining') : memoryText(locale, 'joinSubmit')}</button>
      </form>
    </section>
  </main>;
}
