import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import type { Locale } from '../activities/contract';
import { roomText } from './roomCopy';

export function makeJoinUrl(roomCode: string, origin: string): string {
  const url = new URL('/games/memory/join', origin);
  url.searchParams.set('room', roomCode);
  return url.toString();
}

export function RoomShare({ roomCode, locale }: { roomCode: string; locale: Locale }) {
  const [copied, setCopied] = useState(false);
  const link = makeJoinUrl(roomCode, window.location.origin);
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); }
    catch { setCopied(false); }
  }
  return <aside className="share-panel panel">
    <h2>{roomText(locale, 'shareTitle')}</h2>
    <p>{roomText(locale, 'shareCode')} <strong className="room-code">{roomCode}</strong></p>
    <div className="qr"><QRCodeSVG value={link} size={190} level="M" /></div>
    <label htmlFor="join-url">{roomText(locale, 'shareLink')}</label>
    <input id="join-url" className="field" readOnly value={link} onFocus={event => event.currentTarget.select()} />
    <button className="button secondary stretch" type="button" onClick={() => void copy()}>
      {copied ? roomText(locale, 'shareCopied') : roomText(locale, 'shareCopy')}
    </button>
    <p className="muted small">{roomText(locale, 'shareAlt')}</p>
  </aside>;
}
