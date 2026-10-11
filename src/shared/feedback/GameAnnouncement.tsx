import { useEffect,useRef,useState } from 'react';
export type Announcement={id:string;text:string;tone?:'success'|'wrong'|'turn'};
export function GameAnnouncement({event}:{event:Announcement|null}){
 const [shown,setShown]=useState<Announcement|null>(null);
 const seen=useRef<string|null>(null);
 useEffect(()=>{
  if(!event||event.id===seen.current)return;
  seen.current=event.id;
  setShown(event);
  const timer=window.setTimeout(()=>setShown(current=>current?.id===event.id?null:current),1600);
  return ()=>window.clearTimeout(timer);
 },[event?.id]);
 if(!shown)return null;
 return <div className={'game-announcement '+(shown.tone??'turn')} role="status" aria-live="polite"><strong>{shown.text}</strong></div>;
}
