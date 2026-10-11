import { Link } from 'react-router-dom';
import { gameRegistry } from '../games/registry';
import { useLanguage } from '../shared/i18n';

export function Home() {
  const {t}=useLanguage();
  return <main className="page home-page">
    <div className="eyebrow">{t('homeEyebrow')}</div>
    <h1>Learning Games</h1>
    <p className="lead">{t('homeLead')}</p>
    <div className="catalog-grid">{gameRegistry.map(game =>
      <article className="panel game-tile" key={game.id}>
        <div className="tile-icon" aria-hidden="true">{game.symbol}</div>
        <h2>{game.id==='memory'?t('memoryTitle'):game.title}</h2><p>{game.id==='memory'?t('memoryDescription'):game.description}</p>
        <Link className="button primary" to={game.href}>{t('openGame')}</Link>
      </article>)}
    </div>
  </main>;
}
