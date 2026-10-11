import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clearRoomIdentity, loadRoomIdentity } from '../../shared/classroom/identity';
import { RoomShare } from '../../shared/classroom/RoomShare';
import { useMemoryRoom } from './hooks/useMemoryRoom';
import { MemoryBoard } from './components/MemoryBoard';
import { MemoryScoreboard } from './components/MemoryScoreboard';
import { MemoryResults } from './components/MemoryResults';
import { GameAnnouncement, type Announcement } from '../../shared/feedback/GameAnnouncement';
import { LanguageSwitcher, useLanguage } from '../../shared/i18n';
import { resolveRoomLanguage } from '../../shared/classroom/roomLanguagePolicy';

export function MemoryRoom(){
 const {t}=useLanguage();const {roomCode=''}=useParams();
 const identity=useMemo(()=>loadRoomIdentity(roomCode),[roomCode]);
 if(!identity) return <main className="page panel padded">
  <h1>{t('noAccess')}</h1><p>{t('noAccessHint')}</p>
  <Link className="button primary" to={'/games/memory/join'+(roomCode?'?room='+roomCode:'')}>{t('joinRoom')}</Link>
 </main>;
 return <ActiveRoom key={identity.roomCode+identity.role} identity={identity}/>;
}
function ActiveRoom({identity}:{identity:NonNullable<ReturnType<typeof loadRoomIdentity>>}){
 const {t,language,setLanguage}=useLanguage();
 const {state,busy,error,refresh,start,flip,skip,recover}=useMemoryRoom(identity);
 const roomLanguage=state?.roomLanguage;
 const learnerChoice=state?.allowStudentLanguageChoice;
 useEffect(()=>{
   if(!roomLanguage || learnerChoice===undefined) return;
   const next=resolveRoomLanguage({roomLanguage,allowStudentLanguageChoice:learnerChoice},language);
   if(next!==language)setLanguage(next);
 },[roomLanguage,learnerChoice,language,setLanguage]);
 const isHost=identity.role==='host',roomCode=identity.roomCode;
 function leave(){clearRoomIdentity(roomCode);window.location.assign('/games/memory')}
 if(!state)return <main className="page panel padded">
  <h1>{t('connecting')} {roomCode}</h1>
  {error&&<p role="alert" className="error">{error}</p>}
  <button className="button secondary" onClick={()=>void refresh()}>{t('retry')}</button>
 </main>;
 if(state.status==='finished')return <><div className="room-language-toolbar">{state.allowStudentLanguageChoice && <LanguageSwitcher />}</div><MemoryResults players={state.players}/></>;
 if(state.status==='lobby')return <main className="page">
  {state.allowStudentLanguageChoice && <div className="room-language-toolbar"><LanguageSwitcher /></div>}
  <div className="intro"><div className="eyebrow">{t('playingTogether')}</div>
   <h1>{isHost?t('yourRoom'):t('waitingStart')}</h1>
   <p className="lead">{t('room')} <strong className="room-code">{roomCode}</strong></p>
  </div>
  <div className="setup-grid">
   <section className="panel padded">
    <h2>{t('participants')} ({state.players.length})</h2>
    <div className="score-list">{state.players.map(p=><div className="score-row" key={p.id}>{p.name}</div>)}</div>
    {!state.players.length&&<p className="muted">{t('noPlayers')}</p>}
    {isHost?<button className="button primary stretch" disabled={!state.players.length||busy} onClick={()=>void start()}>{t('startGame')}</button>:<p className="muted">{t('teacherStarts')}</p>}
    <button className="button subtle" onClick={leave}>{t('leaveRoom')}</button>
    {error&&<p className="error">{error}</p>}
   </section>{isHost&&<RoomShare roomCode={roomCode}/>}
  </div>
 </main>;
 const matched=state.cards.filter(c=>c.matched).length/2;
 const myTurn=state.myPlayerId!==null&&state.myPlayerId===state.currentPlayerId&&state.canFlip;
 // Revision advances on each server mutation. Restrict attention messages to
 // turn-entry (first phase) and resolve, not every 1 Hz polling response.
 const event:Announcement|null=state.phase==='resolve'?
  {id:`resolve:${state.revision}`,text:state.lastMatch?t('correct'):t('wrong'),tone:state.lastMatch?'success':'wrong'}:
  state.phase==='first'&&state.myPlayerId===state.currentPlayerId?
  {id:`turn:${state.revision}:${state.currentPlayerId}`,text:t('yourTurn'),tone:'turn'}:null;
 return <><div className="room-language-toolbar">{state.allowStudentLanguageChoice && <LanguageSwitcher />}</div><main className="play-layout">
  <GameAnnouncement event={event}/>
  <aside className="panel play-sidebar">
   <MemoryScoreboard players={state.players} activeId={state.currentPlayerId} myId={state.myPlayerId}/>
   <div className="progress-pill">{t('pairsFound',{count:matched,total:state.cards.length/2})}</div>
   <p className="muted">{state.phase==='first'?t('pickFirst'):state.phase==='second'?t('pickSecond'):state.phase==='resolve'?t('waitResolve'):''}</p>
   {error&&<p role="alert" className="error">{error}</p>}
   <div className="sidebar-actions">
    {isHost&&<>
     <button className="button secondary" disabled={busy||state.phase!=='resolve'} onClick={recover}>{t('continueResolve')}</button>
     <button className="button secondary" disabled={busy} onClick={skip}>{t('skipTurn')}</button>
    </>}
    <button className="button subtle" onClick={leave}>{t('leaveGame')}</button>
   </div>
  </aside>
  <MemoryBoard cards={state.cards} canFlip={myTurn&&!busy} onFlip={flip} notice={null} wrong={state.lastMatch===false}/>
 </main></>;
}
