import { Link } from 'react-router-dom';
import type { Player } from '../types';

export function MemoryResults({ players }: { players: Player[] }) {
  const best = Math.max(0, ...players.map(player => player.score));
  const winners = players.filter(player => player.score === best).map(player => player.name);
  return <main className="page panel results">
    <div className="eyebrow">GESCHAFFT</div>
    <h1>Spiel beendet!</h1>
    <p className="lead">{winners.length === 1 ? winners[0] + ' gewinnt!' : 'Gleichstand: ' + winners.join(', ')}</p>
    <div className="result-grid">{players.map(player => <div className="result-item" key={player.id}>
      <span>{player.name}</span><strong>{player.score} Punkte</strong>
    </div>)}</div>
    <Link className="button primary" to="/games/memory">Neues Spiel</Link>
  </main>;
}
