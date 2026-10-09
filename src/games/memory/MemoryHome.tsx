import { useState } from 'react';
import { useLanguage } from '../../shared/i18n';
import { Link, useNavigate } from 'react-router-dom';
import { parsePairs, examplePairs, validateForRoom } from './engine/pairs';
import { createMemoryRoom } from './api/memoryRpc';
import { saveRoomIdentity } from '../../shared/classroom/identity';
import { LocalMemory } from './LocalMemory';

type Mode = 'choose' | 'create' | 'local';

export function MemoryHome() {
  const {t,language}=useLanguage();
  const [allowStudentLanguageChoice,setAllowStudentLanguageChoice]=useState(false);
  const [mode, setMode] = useState<Mode>('choose');
  const [isLocalPlaying, setIsLocalPlaying] = useState(false);
  const [text, setText] = useState(examplePairs);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const result = parsePairs(text);

  async function create() {
    const issue = validateForRoom(result);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await createMemoryRoom(result.pairs,language,allowStudentLanguageChoice);
      saveRoomIdentity({ roomCode: data.roomCode, token: data.hostToken, role: 'host' });
      navigate('/games/memory/room/' + data.roomCode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Raum konnte nicht erstellt werden.');
    } finally {
      setBusy(false);
    }
  }

  function handleModeChange(newMode: Mode) {
    setIsLocalPlaying(false);
    setMode(newMode);
  }

  return (
    <main className={isLocalPlaying ? 'page page-wide' : 'page'}>
      {!isLocalPlaying && (
        <>
          <Link className="back-link" to="/">← {t('allGames')}</Link>
          <div className="intro">
            <div className="eyebrow">{t('learnTogether')}</div>
            <h1>{t('memoryTitle')}</h1>
            <p className="lead">{t('findPairs')}</p>
          </div>
        </>
      )}

      {mode === 'choose' ? (
        <div className="choices">
          <button className="panel choice" onClick={() => handleModeChange('create')}>
            <h2>{t('createGame')}</h2>
            <p>{t('createDesc')}</p>
          </button>
          <Link className="panel choice" to="/games/memory/join">
            <h2>{t('joinRoom')}</h2>
            <p>{t('joinDesc')}</p>
          </Link>
          <button className="panel choice" onClick={() => handleModeChange('local')}>
            <h2>{t('localPlay')}</h2>
            <p>{t('localDesc')}</p>
          </button>
        </div>
      ) : (
        <>
          {!isLocalPlaying && (
            <button className="text-button" onClick={() => handleModeChange('choose')}>
              ← {t('back')}
            </button>
          )}
          <div className={isLocalPlaying ? 'local-playing-wrap' : 'setup-grid'}>
            {!isLocalPlaying && (
              <section className="panel padded">
                <h2>{t('preparePairs')}</h2>
                <p className="muted">{t('pairInstructions')}</p>
                <textarea
                  className="field pairs-input"
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
                <div className="row">
                  <strong>{result.pairs.length} {t('pairs')}</strong>
                  <button className="button secondary" onClick={() => setText(examplePairs)}>
                    {t('loadExample')}
                  </button>
                  <button className="button subtle" onClick={() => setText('')}>
                    {t('clear')}
                  </button>
                </div>
                {result.errors.map((e, i) => (
                  <p className="error" key={i}>{e}</p>
                ))}
              </section>
            )}
            <section className={isLocalPlaying ? 'local-playing-panel' : 'panel padded'}>
              {mode === 'create' ? (
                <>
                  <h2>{t('createOnline')}</h2>
                  <p>{t('shareRoom')}</p>
                  <fieldset className="room-language-options"><legend>{t('roomLanguagePolicy')}</legend>
                    <label><input type="radio" name="room-language-mode" checked={!allowStudentLanguageChoice} onChange={()=>setAllowStudentLanguageChoice(false)} /> {t('everyoneSameLanguage')}</label>
                    <label><input type="radio" name="room-language-mode" checked={allowStudentLanguageChoice} onChange={()=>setAllowStudentLanguageChoice(true)} /> {t('studentsChooseLanguage')}</label>
                  </fieldset>
                  {error && <p role="alert" className="error">{error}</p>}
                  <button
                    className="button primary stretch"
                    disabled={busy || !!validateForRoom(result)}
                    onClick={() => void create()}
                  >
                    {busy ? t('creating') : t('createRoom')}
                  </button>
                </>
              ) : (
                <LocalMemory
                  pairs={result.pairs}
                  errors={result.errors}
                  onPlayingChange={setIsLocalPlaying}
                />
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
