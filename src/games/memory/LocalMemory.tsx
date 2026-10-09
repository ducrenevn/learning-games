import { useEffect, useRef, useState } from 'react';
import {
  calculateWinners,
  hideCards,
  isDeckComplete,
  makeLocalDeck,
  matchCards,
  revealCard,
  type LocalCard,
} from './engine/local';
import type { MemoryPair } from './types';
import { MemoryBoard } from './components/MemoryBoard';
import { MemoryScoreboard } from './components/MemoryScoreboard';

interface Props {
  pairs: MemoryPair[];
  errors: string[];
  onPlayingChange?: (isPlaying: boolean) => void;
}

export function LocalMemory({ pairs, errors, onPlayingChange }: Props) {
  const [names, setNames] = useState('Spieler 1, Spieler 2');
  const [deck, setDeck] = useState<LocalCard[] | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [turn, setTurn] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastMatch, setLastMatch] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);

  const timerRef = useRef<number | null>(null);

  const players = names
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 6);

  function clearActiveTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function start() {
    clearActiveTimer();
    const newDeck = makeLocalDeck(pairs);
    setDeck(newDeck);
    setScores(players.map(() => 0));
    setTurn(0);
    setPicks([]);
    setLocked(false);
    setNotice(null);
    setLastMatch(null);
    setFinished(false);
    onPlayingChange?.(true);
  }

  function exitGame() {
    clearActiveTimer();
    setDeck(null);
    setPicks([]);
    setLocked(false);
    setNotice(null);
    setLastMatch(null);
    setFinished(false);
    onPlayingChange?.(false);
  }

  useEffect(() => {
    return () => {
      clearActiveTimer();
    };
  }, []);

  function flip(id: number) {
    if (!deck || locked || picks.length >= 2 || picks.includes(id)) return;
    const card = deck.find(c => c.id === id);
    if (!card || card.visible || card.matched) return;

    if (picks.length === 0) {
      setDeck(revealCard(deck, id));
      setPicks([id]);
      return;
    }

    // Second pick: immediately lock to prevent further clicks
    setLocked(true);
    const firstId = picks[0];
    const firstCard = deck.find(c => c.id === firstId);
    if (!firstCard) {
      setLocked(false);
      return;
    }

    const isMatch = firstCard.pairId === card.pairId;
    setLastMatch(isMatch);
    setNotice(isMatch ? 'Richtig! Ein Paar gefunden!' : 'Das passt leider nicht!');

    if (isMatch) {
      const updatedDeck = matchCards(deck, [firstId, id]);
      setDeck(updatedDeck);
      setScores(prev => prev.map((val, idx) => idx === turn ? val + 1 : val));

      const isComplete = isDeckComplete(updatedDeck);

      timerRef.current = window.setTimeout(() => {
        setPicks([]);
        setNotice(null);
        setLastMatch(null);
        timerRef.current = null;
        if (isComplete) {
          setFinished(true);
        } else {
          setLocked(false);
        }
      }, 1400);
    } else {
      setDeck(revealCard(deck, id));
      timerRef.current = window.setTimeout(() => {
        setDeck(prevDeck => prevDeck ? hideCards(prevDeck, [firstId, id]) : null);
        setTurn(currentTurn => (currentTurn + 1) % Math.max(1, players.length));
        setPicks([]);
        setLocked(false);
        setNotice(null);
        setLastMatch(null);
        timerRef.current = null;
      }, 1800);
    }
  }

  if (!deck) {
    return (
      <div className="form">
        <h2>Lokal spielen</h2>
        <label>
          Spielernamen (durch Komma getrennt)
          <input
            className="field"
            value={names}
            onChange={e => setNames(e.target.value)}
          />
        </label>
        <button
          className="button primary"
          disabled={errors.length > 0 || pairs.length < 1 || players.length < 1}
          onClick={start}
        >
          Spiel starten
        </button>
      </div>
    );
  }

  if (finished) {
    const { winners, bestScore } = calculateWinners(
      players.map((name, i) => ({ name, score: scores[i] ?? 0 }))
    );
    const winnerLead = players.length === 1
      ? 'Alle Paare gefunden!'
      : winners.length === 1
        ? `${winners[0]} gewinnt mit ${bestScore} ${bestScore === 1 ? 'Punkt' : 'Punkten'}!`
        : `Gleichstand (${bestScore} Punkte): ${winners.join(', ')}`;

    return (
      <div className="panel results">
        <div className="eyebrow">GESCHAFFT</div>
        <h1>Spiel beendet!</h1>
        <p className="lead">{winnerLead}</p>
        <div className="result-grid">
          {players.map((name, i) => (
            <div className="result-item" key={name + i}>
              <span>{name}</span>
              <strong>{scores[i] ?? 0} {scores[i] === 1 ? 'Punkt' : 'Punkte'}</strong>
            </div>
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="button primary" onClick={start}>Nochmal spielen</button>
          <button className="button secondary" onClick={exitGame}>Einstellungen</button>
        </div>
      </div>
    );
  }

  const matchedPairs = deck.filter(c => c.matched).length / 2;

  return (
    <div className="play-layout">
      <aside className="panel play-sidebar">
        <MemoryScoreboard
          players={players.map((name, i) => ({ id: String(i), name, score: scores[i] ?? 0 }))}
          activeId={String(turn)}
        />
        <div className="progress-pill">
          Paare gefunden: {matchedPairs} / {pairs.length}
        </div>
        <div className="sidebar-actions">
          <button className="button subtle" onClick={exitGame}>Spiel beenden</button>
        </div>
      </aside>
      <MemoryBoard
        cards={deck}
        canFlip={!locked && !finished}
        onFlip={flip}
        notice={notice}
        wrong={lastMatch === false}
      />
    </div>
  );
}
