import type { Player } from '../types';
import { useLanguage } from '../../../shared/i18n';
export function MemoryScoreboard({players,activeId,myId}:{players:Player[];activeId:string|null;myId?:string|null}){
 const {t}=useLanguage();const active=players.find(p=>p.id===activeId);const mine=!!myId&&activeId===myId;
 return <div className="scoreboard"><div className="eyebrow">{t('currentTurn')}</div>
 <h2>{mine?t('yourTurn'):active?t('playerTurn',{name:active.name}):t('waitTurn')}</h2>
 <div className="score-list">{players.map(p=><div key={p.id} className={'score-row '+(p.id===activeId?'active':'')}><span>{p.name}</span><strong>{p.score}</strong></div>)}</div>
 </div>;
}
