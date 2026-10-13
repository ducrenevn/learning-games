import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
import type { Locale } from '../../shared/activities/contract';
import { MemoryBoard } from './components/MemoryBoard';
import { MemoryScoreboard } from './components/MemoryScoreboard';
import { MAX_LOCAL_PLAYERS, ownerMarks, type OwnerMark } from './ownership';

interface Props {
  pairs: MemoryPair[];
  errors: string[];
  onPlayingChange?: (isPlaying: boolean) => void;
  locale?: Locale;
  singlePlayer?: boolean;
}

const copy = {
  de: { initial:'Spieler 1, Spieler 2', solo:'Spieler 1', local:'Lokal spielen', names:'Spielernamen (durch Komma getrennt)',
    start:'Spiel starten', hit:'Richtig! Ein Paar gefunden!', miss:'Das passt leider nicht!', done:'Alle Paare gefunden!',
    won:'gewinnt mit', point:'Punkt', points:'Punkten', tie:'Gleichstand', finished:'Spiel beendet!', again:'Nochmal spielen',
    settings:'Einstellungen', found:'Paare gefunden', quit:'Spiel beenden', complete:'GESCHAFFT',
    turn:'AKTUELLER ZUG', turnOf:'{name} ist an der Reihe', hidden:'Verdeckte Karte', revealed:'Aufgedeckte Karte', foundBy:'gefunden von {name}', playersHint:'Bis zu 6 Spieler. Jede Farbe hat auch eine eigene Form.' },
  en: { initial:'Player 1, Player 2', solo:'Player 1', local:'Play locally', names:'Player names (comma-separated)',
    start:'Start game', hit:'Correct! A pair found!', miss:'These cards do not match!', done:'All pairs found!',
    won:'wins with', point:'point', points:'points', tie:'Tie', finished:'Game complete!', again:'Play again',
    settings:'Settings', found:'Pairs found', quit:'End game', complete:'COMPLETE',
    turn:'CURRENT TURN', turnOf:"{name}'s turn", hidden:'Face-down card', revealed:'Face-up card', foundBy:'found by {name}', playersHint:'Up to 6 players. Every colour also has its own shape.' },
  vi: { initial:'Người chơi 1, Người chơi 2', solo:'Người chơi 1', local:'Chơi tại chỗ', names:'Tên người chơi (cách nhau bằng dấu phẩy)',
    start:'Bắt đầu', hit:'Đúng! Tìm được một cặp!', miss:'Hai thẻ chưa khớp!', done:'Đã tìm thấy tất cả các cặp!',
    won:'thắng với', point:'điểm', points:'điểm', tie:'Hòa', finished:'Hoàn thành!', again:'Chơi lại',
    settings:'Cài đặt', found:'Số cặp đã tìm', quit:'Kết thúc', complete:'XONG',
    turn:'LƯỢT HIỆN TẠI', turnOf:'Đến lượt {name}', hidden:'Thẻ úp', revealed:'Thẻ đã lật', foundBy:'do {name} tìm thấy', playersHint:'Tối đa 6 người chơi. Mỗi màu có thêm một hình riêng.' },
} as const;
export function LocalMemory({ pairs, errors, onPlayingChange, locale = 'de', singlePlayer = false }: Props) {
  const m = copy[locale];
  const [names, setNames] = useState<string>(singlePlayer ? m.solo : m.initial);
  const [deck, setDeck] = useState<LocalCard[] | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [turn, setTurn] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastMatch, setLastMatch] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [owners, setOwners] = useState<Record<number, OwnerMark>>({});

  const timerRef = useRef<number | null>(null);

  const players = names
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, MAX_LOCAL_PLAYERS);
  const marks: Record<string, OwnerMark> = {};
  ownerMarks(players).forEach((mark, i) => { marks[String(i)] = mark; });
  // With one player every pair would carry the same mark, so ownership is only shown in turn-taking games.
  const showOwners = players.length > 1;

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
    setOwners({});
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
    setOwners({});
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
    setNotice(isMatch ? m.hit : m.miss);

    if (isMatch) {
      const updatedDeck = matchCards(deck, [firstId, id]);
      setDeck(updatedDeck);
      setScores(prev => prev.map((val, idx) => idx === turn ? val + 1 : val));
      const finder = marks[String(turn)];
      if (finder) setOwners(prev => ({ ...prev, [firstId]: finder, [id]: finder }));

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
        <h2>{m.local}</h2>
        <label>
          {m.names}
          <input
            className="field"
            value={names}
            onChange={e => setNames(e.target.value)}
          />
        </label>
        {players.length > 1 && <ul className="player-chips" aria-label={m.names}>{players.map((name, i) => <li key={name + i} style={{ '--owner': marks[String(i)].color } as CSSProperties}>
          <span className="owner-badge" aria-hidden="true">{marks[String(i)].symbol} {marks[String(i)].initial}</span>{name}</li>)}</ul>}
        <p className="muted small">{m.playersHint}</p>
        <button
          className="button primary"
          disabled={errors.length > 0 || pairs.length < 1 || players.length < 1}
          onClick={start}
        >
          {m.start}
        </button>
      </div>
    );
  }

  if (finished) {
    const { winners, bestScore } = calculateWinners(
      players.map((name, i) => ({ name, score: scores[i] ?? 0 }))
    );
    const winnerLead = players.length === 1
      ? m.done
      : winners.length === 1
        ? `${winners[0]} ${m.won} ${bestScore} ${bestScore === 1 ? m.point : m.points}!`
        : `${m.tie} (${bestScore} ${bestScore === 1 ? m.point : m.points}): ${winners.join(', ')}`;

    return (
      <div className="panel results">
        <div className="eyebrow">{m.complete}</div>
        <h1>{m.finished}</h1>
        <p className="lead">{winnerLead}</p>
        <div className="result-grid">
          {players.map((name, i) => (
            <div className="result-item" key={name + i}>
              <span>{name}</span>
              <strong>{scores[i] ?? 0} {scores[i] === 1 ? m.point : m.points}</strong>
            </div>
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="button primary" onClick={start}>{m.again}</button>
          <button className="button secondary" onClick={exitGame}>{m.settings}</button>
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
          marks={showOwners ? marks : undefined}
          labels={{ eyebrow: m.turn, yourTurn: '', turnOf: name => m.turnOf.replace('{name}', name), waiting: '' }}
        />
        <div className="progress-pill">
          {m.found}: {matchedPairs} / {pairs.length}
        </div>
        <div className="sidebar-actions">
          <button className="button subtle" onClick={exitGame}>{m.quit}</button>
        </div>
      </aside>
      <MemoryBoard
        cards={deck}
        canFlip={!locked && !finished}
        onFlip={flip}
        notice={notice}
        wrong={lastMatch === false}
        owners={showOwners ? owners : undefined}
        labels={{ hidden: m.hidden, revealed: m.revealed, foundBy: name => m.foundBy.replace('{name}', name) }}
      />
    </div>
  );
}
