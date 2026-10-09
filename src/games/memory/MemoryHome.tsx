import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { parsePairs, examplePairs, validateForRoom } from './engine/pairs';
import { createMemoryRoom } from './api/memoryRpc';
import { saveRoomIdentity } from '../../shared/classroom/identity';
import { LocalMemory } from './LocalMemory';

type Mode = 'choose' | 'create' | 'local';

export function MemoryHome() {
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
      const data = await createMemoryRoom(result.pairs);
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
          <Link className="back-link" to="/">← Alle Spiele</Link>
          <div className="intro">
            <div className="eyebrow">GEMEINSAM LERNEN</div>
            <h1>Memory-Spiel</h1>
            <p className="lead">Finde die passenden Paare!</p>
          </div>
        </>
      )}

      {mode === 'choose' ? (
        <div className="choices">
          <button className="panel choice" onClick={() => handleModeChange('create')}>
            <h2>Spiel erstellen</h2>
            <p>Eigene Paare eingeben und einen gemeinsamen Raum starten.</p>
          </button>
          <Link className="panel choice" to="/games/memory/join">
            <h2>Raum beitreten</h2>
            <p>Mit Raumcode und Namen zusammen spielen.</p>
          </Link>
          <button className="panel choice" onClick={() => handleModeChange('local')}>
            <h2>Lokal spielen</h2>
            <p>Gemeinsam an einem Gerät spielen.</p>
          </button>
        </div>
      ) : (
        <>
          {!isLocalPlaying && (
            <button className="text-button" onClick={() => handleModeChange('choose')}>
              ← Zurück zur Auswahl
            </button>
          )}
          <div className={isLocalPlaying ? 'local-playing-wrap' : 'setup-grid'}>
            {!isLocalPlaying && (
              <section className="panel padded">
                <h2>Paare vorbereiten</h2>
                <p className="muted">Eine Zeile je Paar: LINKS | RECHTS | KATEGORIE (optional)</p>
                <textarea
                  className="field pairs-input"
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
                <div className="row">
                  <strong>{result.pairs.length} Paare</strong>
                  <button className="button secondary" onClick={() => setText(examplePairs)}>
                    Beispiel laden
                  </button>
                  <button className="button subtle" onClick={() => setText('')}>
                    Leeren
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
                  <h2>Online-Raum erstellen</h2>
                  <p>Teile den Raumcode und starte, sobald alle da sind.</p>
                  {error && <p role="alert" className="error">{error}</p>}
                  <button
                    className="button primary stretch"
                    disabled={busy || !!validateForRoom(result)}
                    onClick={() => void create()}
                  >
                    {busy ? 'Erstelle …' : 'Raum erstellen'}
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
