import { Link } from 'react-router-dom';
import { gameRegistry } from '../games/registry';

export function Home() {
  return <main className="page home-page">
    <div className="eyebrow">SPIELERISCH LERNEN</div>
    <h1>Learning Games</h1>
    <p className="lead">Kurze Spiele für Unterricht, Gruppen und eigene Übung.</p>
    <div className="catalog-grid">{gameRegistry.map(game =>
      <article className="panel game-tile" key={game.id}>
        <div className="tile-icon" aria-hidden="true">{game.symbol}</div>
        <h2>{game.title}</h2><p>{game.description}</p>
        <Link className="button primary" to={game.href}>Spiel öffnen</Link>
      </article>)}
    </div>
  </main>;
}
