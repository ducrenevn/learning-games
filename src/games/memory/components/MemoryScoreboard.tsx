import type { Player } from '../types';

export function MemoryScoreboard({ players, activeId, myId }: { players: Player[]; activeId: string | null; myId?: string | null }) {
  const active = players.find(player => player.id === activeId);
  const isMyTurn = !!myId && activeId === myId;
  return <div className="scoreboard">
    <div className="eyebrow">AKTUELLER ZUG</div>
    <h2>{isMyTurn ? 'Du bist dran!' : active ? active.name + ' ist an der Reihe' : 'Warte auf den Zug'}</h2>
    <div className="score-list">{players.map(player => <div key={player.id} className={'score-row ' + (player.id === activeId ? 'active' : '')}>
      <span>{player.name}</span><strong>{player.score}</strong>
    </div>)}</div>
  </div>;
}
