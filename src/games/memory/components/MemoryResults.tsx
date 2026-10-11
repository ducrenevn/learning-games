import { Link } from 'react-router-dom';
import type { Player } from '../types';
import { useLanguage } from '../../../shared/i18n';
export function MemoryResults({players}:{players:Player[]}){
 const {t}=useLanguage();
 const best=Math.max(0,...players.map(player=>player.score));
 const winners=players.filter(player=>player.score===best).map(player=>player.name);
 return <main className="page panel results"><div className="eyebrow">{t('finishedEyebrow')}</div>
 <h1>{t('gameOver')}</h1>
 <p className="lead">{winners.length===1?t('wins',{name:winners[0]}):t('tie',{names:winners.join(', ')})}</p>
 <div className="result-grid">{players.map(player=><div className="result-item" key={player.id}><span>{player.name}</span><strong>{player.score} {t('points')}</strong></div>)}</div>
 <Link className="button primary" to="/games/memory">{t('newGame')}</Link></main>;
}
