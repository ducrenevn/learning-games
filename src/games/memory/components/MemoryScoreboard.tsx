import type { CSSProperties } from 'react';
import type { Player } from '../types';
import type { OwnerMark } from '../ownership';

export interface ScoreboardLabels { eyebrow: string; yourTurn: string; turnOf: (name: string) => string; waiting: string }
const GERMAN_LABELS: ScoreboardLabels = { eyebrow: 'AKTUELLER ZUG', yourTurn: 'Du bist dran!', turnOf: name => name + ' ist an der Reihe', waiting: 'Warte auf den Zug' };
interface Props {
  players: Player[]; activeId: string | null; myId?: string | null;
  /** Local play only: colour + shape + initial per player id, matching the marks on the cards they found. */
  marks?: Readonly<Record<string, OwnerMark>>;
  labels?: ScoreboardLabels;
}
export function MemoryScoreboard({ players, activeId, myId, marks, labels = GERMAN_LABELS }: Props) {
  const active = players.find(player => player.id === activeId);
  const isMyTurn = !!myId && activeId === myId;
  return <div className="scoreboard">
    <div className="eyebrow">{labels.eyebrow}</div>
    <h2>{isMyTurn ? labels.yourTurn : active ? labels.turnOf(active.name) : labels.waiting}</h2>
    <div className="score-list">{players.map(player => {
      const mark = marks?.[player.id];
      return <div key={player.id} className={'score-row ' + (player.id === activeId ? 'active' : '')}>
        <span className="score-name">{mark && <span className="owner-badge" style={{ '--owner': mark.color } as CSSProperties} aria-hidden="true">{mark.symbol} {mark.initial}</span>}{player.name}</span><strong>{player.score}</strong>
      </div>;
    })}</div>
  </div>;
}
