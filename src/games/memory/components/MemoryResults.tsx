import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Locale } from '../../../shared/activities/contract';
import type { Player } from '../types';
import { memoryText } from '../roomCopy';

export function MemoryResults({ players, locale, languageControl }: { players: Player[]; locale: Locale; languageControl?: ReactNode }) {
  const best = Math.max(0, ...players.map(player => player.score));
  const winners = players.filter(player => player.score === best).map(player => player.name);
  return <main className="page panel results">
    {languageControl}
    <div className="eyebrow">{memoryText(locale, 'resultsEyebrow')}</div>
    <h1>{memoryText(locale, 'resultsTitle')}</h1>
    <p className="lead">{winners.length === 1
      ? memoryText(locale, 'wins', { name: winners[0] })
      : memoryText(locale, 'tie', { names: winners.join(', ') })}</p>
    <div className="result-grid">{players.map(player => <div className="result-item" key={player.id}>
      <span>{player.name}</span><strong>{memoryText(locale, 'points', { score: player.score })}</strong>
    </div>)}</div>
    <Link className="button primary" to="/games/memory">{memoryText(locale, 'newGame')}</Link>
  </main>;
}
