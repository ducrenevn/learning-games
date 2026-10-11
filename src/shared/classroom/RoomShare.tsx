import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { useLanguage } from '../i18n';
export function makeJoinUrl(roomCode:string,origin:string):string {
 const url=new URL('/games/memory/join',origin);url.searchParams.set('room',roomCode);return url.toString();
}
export function RoomShare({roomCode}:{roomCode:string}){
 const {t}=useLanguage();const [copied,setCopied]=useState(false);
 const link=makeJoinUrl(roomCode,window.location.origin);
 async function copy(){try{await navigator.clipboard.writeText(link);setCopied(true)}catch{setCopied(false)}}
 return <aside className="share-panel panel">
  <h2>{t('shareWith')}</h2><p>{t('roomCode')} <strong className="room-code">{roomCode}</strong></p>
  <div className="qr"><QRCodeSVG value={link} size={190} level="M"/></div>
  <label htmlFor="join-url">{t('joinLink')}</label><input id="join-url" className="field" readOnly value={link} onFocus={event=>event.currentTarget.select()}/>
  <button className="button secondary stretch" type="button" onClick={()=>void copy()}>{copied?t('copied'):t('copyLink')}</button>
  <p className="muted small">{t('shareAlternative')}</p>
 </aside>;
}
