import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Locale } from '../../shared/activities/contract';
import { clearRoomIdentity, loadRoomIdentity } from '../../shared/classroom/identity';
import { RoomShare } from '../../shared/classroom/RoomShare';
import { roomText } from '../../shared/classroom/roomCopy';
import { useRoomInterfaceLocale } from '../../shared/classroom/useRoomInterfaceLocale';
import { LanguageFlags, useLocale } from '../../shared/locale/LocaleProvider';
import { useMemoryRoom } from './hooks/useMemoryRoom';
import { MemoryBoard, type BoardLabels } from './components/MemoryBoard';
import { MemoryScoreboard, type ScoreboardLabels } from './components/MemoryScoreboard';
import { MemoryResults } from './components/MemoryResults';
import { memoryText } from './roomCopy';
import type { RoomIdentity } from './types';

export function MemoryRoom() {
  const { roomCode = '' } = useParams();
  const identity = useMemo(() => loadRoomIdentity(roomCode), [roomCode]);
  if (!identity) return <NoAccess roomCode={roomCode} />;
  return <ActiveRoom key={identity.roomCode + identity.role} identity={identity} />;
}

/** No room policy is known here, so this is the one place a room route shows a global-style language control. */
function NoAccess({ roomCode }: { roomCode: string }) {
  const { locale } = useLocale();
  return <main className="page panel padded">
    <LanguageFlags />
    <h1>{memoryText(locale, 'noAccessTitle')}</h1>
    <p>{memoryText(locale, 'noAccessHint')}</p>
    <Link className="button primary" to={'/games/memory/join' + (roomCode ? '?room=' + roomCode : '')}>{memoryText(locale, 'joinSubmit')}</Link>
  </main>;
}

/** Shown only in student-choice rooms. Each participant's selection stays in their own browser. */
function RoomLanguageBar({ locale }: { locale: Locale }) {
  return <div className="room-language-bar">
    <span className="muted small">{roomText(locale, 'languageViewLabel')}</span>
    <LanguageFlags />
  </div>;
}

function ActiveRoom({ identity }: { identity: RoomIdentity }) {
  const { state, busy, error, refresh, start, flip, skip, recover } = useMemoryRoom(identity);
  const { locale } = useLocale();
  useRoomInterfaceLocale(state?.roomLanguage ?? null, state?.allowStudentLanguageChoice ?? null);
  const isHost = identity.role === 'host';
  const roomCode = identity.roomCode;
  const errorText = error ? roomText(locale, error) : null;
  const languageControl = state?.allowStudentLanguageChoice ? <RoomLanguageBar locale={locale} /> : null;

  function leave() {
    clearRoomIdentity(roomCode);
    window.location.assign('/games/memory');
  }

  if (!state) return <main className="page panel padded">
    <h1>{memoryText(locale, 'connecting', { code: roomCode })}</h1>
    {errorText && <p role="alert" className="error">{errorText}</p>}
    <button className="button secondary" onClick={() => void refresh()}>{memoryText(locale, 'retry')}</button>
  </main>;

  if (state.status === 'finished') return <MemoryResults players={state.players} locale={locale} languageControl={languageControl} />;

  if (state.status === 'lobby') return <main className="page">
    {languageControl}
    <div className="intro">
      <div className="eyebrow">{memoryText(locale, 'eyebrow')}</div>
      <h1>{isHost ? memoryText(locale, 'lobbyHost') : memoryText(locale, 'lobbyStudent')}</h1>
      <p className="lead">{memoryText(locale, 'roomLabel')} <strong className="room-code">{roomCode}</strong></p>
    </div>
    <div className="setup-grid">
      <section className="panel padded">
        <h2>{memoryText(locale, 'participants', { n: state.players.length })}</h2>
        <div className="score-list">{state.players.map(player => <div className="score-row" key={player.id}>{player.name}</div>)}</div>
        {!state.players.length && <p className="muted">{memoryText(locale, 'noPlayers')}</p>}
        {isHost
          ? <button className="button primary stretch" disabled={!state.players.length || busy} onClick={() => void start()}>{memoryText(locale, 'startGame')}</button>
          : <p className="muted">{memoryText(locale, 'teacherStarts')}</p>}
        <button className="button subtle" onClick={leave}>{memoryText(locale, 'leaveRoom')}</button>
        {errorText && <p className="error">{errorText}</p>}
      </section>
      {isHost && <RoomShare roomCode={roomCode} locale={locale} />}
    </div>
  </main>;

  const matched = state.cards.filter(card => card.matched).length / 2;
  const myTurn = state.myPlayerId !== null && state.myPlayerId === state.currentPlayerId && state.canFlip;
  const notice = state.phase === 'resolve'
    ? (state.lastMatch ? memoryText(locale, 'correct') : memoryText(locale, 'wrong'))
    : null;
  const hint = state.phase === 'first' ? memoryText(locale, 'pickFirst')
    : state.phase === 'second' ? memoryText(locale, 'pickSecond')
    : state.phase === 'resolve' ? memoryText(locale, 'waitResolve') : '';
  const boardLabels: BoardLabels = {
    hidden: memoryText(locale, 'hidden'), revealed: memoryText(locale, 'revealed'),
    foundBy: name => memoryText(locale, 'foundBy', { name }),
  };
  const scoreLabels: ScoreboardLabels = {
    eyebrow: memoryText(locale, 'turnEyebrow'), yourTurn: memoryText(locale, 'yourTurn'),
    turnOf: name => memoryText(locale, 'turnOf', { name }), waiting: memoryText(locale, 'waitingTurn'),
  };

  return <main className="play-layout">
    <aside className="panel play-sidebar">
      {languageControl}
      <MemoryScoreboard players={state.players} activeId={state.currentPlayerId} myId={state.myPlayerId} labels={scoreLabels} />
      <div className="progress-pill">{memoryText(locale, 'pairsFound', { found: matched, total: state.cards.length / 2 })}</div>
      <p className="muted">{hint}</p>
      {errorText && <p role="alert" className="error">{errorText}</p>}
      <div className="sidebar-actions">
        {isHost && <>
          <button className="button secondary" disabled={busy || state.phase !== 'resolve'} onClick={recover}>{memoryText(locale, 'continueRound')}</button>
          <button className="button secondary" disabled={busy} onClick={skip}>{memoryText(locale, 'skipTurn')}</button>
        </>}
        <button className="button subtle" onClick={leave}>{memoryText(locale, 'leaveGame')}</button>
      </div>
    </aside>
    <MemoryBoard cards={state.cards} canFlip={myTurn && !busy} onFlip={flip} notice={notice} wrong={state.lastMatch === false} labels={boardLabels} />
  </main>;
}
