import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { joinMemoryRoom } from './api/memoryRpc';
import { normalizeRoomCode } from './engine/pairs';
import { saveRoomIdentity } from '../../shared/classroom/identity';
import { useLanguage } from '../../shared/i18n';

export function MemoryJoin(){
 const {t}=useLanguage();
 const [params]=useSearchParams();
 const [code,setCode]=useState(params.get('room')||'');
 const [name,setName]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const navigate=useNavigate();
 async function submit(e:FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try {
   const room=normalizeRoomCode(code);
   if(!/^[A-Z0-9]{6}$/.test(room))throw new Error(t('invalidCode'));
   const data=await joinMemoryRoom(room,name.trim());
   saveRoomIdentity({roomCode:data.roomCode,token:data.playerToken,role:'student'});
   navigate('/games/memory/room/'+data.roomCode);
  } catch(e){setError(e instanceof Error?e.message:t('joinFailed'))}
  finally{setBusy(false)}
 }
 return <main className="page narrow">
  <Link className="back-link" to="/games/memory">← {t('memoryTitle')}</Link>
  <section className="panel padded"><div className="eyebrow">{t('playingTogether')}</div>
  <h1>{t('joinRoom')}</h1><p className="muted">{t('joinIntro')}</p>
  <form onSubmit={e=>void submit(e)} className="form">
   <label>{t('roomCode')}<input className="field" value={code} maxLength={6} required onChange={e=>setCode(e.target.value.toUpperCase())}/></label>
   <label>{t('yourName')}<input className="field" value={name} maxLength={40} required onChange={e=>setName(e.target.value)}/></label>
   {error&&<p role="alert" className="error">{error}</p>}
   <button className="button primary" disabled={busy}>{busy?t('connecting'):t('joinRoom')}</button>
  </form></section>
 </main>;
}
