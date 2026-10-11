import { useCallback, useEffect, useRef, useState } from 'react';
import type { MemoryRoomState, RoomIdentity } from '../types';
import {
  advanceMemoryTurn, fetchMemoryRoom, flipMemoryCard, skipMemoryTurn, startMemoryRoom,
} from '../api/memoryRpc';

export function useMemoryRoom(identity: RoomIdentity) {
  const [state, setState] = useState<MemoryRoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRef = useRef<MemoryRoomState | null>(null);
  const fetchBusy = useRef(false);
  const mutationBusy = useRef(false);
  const { roomCode, token, role } = identity;

  const accept = useCallback((incoming: MemoryRoomState) => {
    if (!incoming || incoming.roomCode !== roomCode || typeof incoming.revision !== 'number') return;
    const previous = currentRef.current;
    // Legacy mutation RPC responses omit the new room policy fields. Preserve
    // the validated policy from an earlier authorized state() response.
    if (previous && (incoming.roomLanguage === undefined || incoming.allowStudentLanguageChoice === undefined)) {
      incoming = { ...incoming, roomLanguage: previous.roomLanguage,
        allowStudentLanguageChoice: previous.allowStudentLanguageChoice };
    }
    if (!incoming.roomLanguage || typeof incoming.allowStudentLanguageChoice !== 'boolean') {
      setError('ROOM_LANGUAGE_POLICY_MISSING');
      return;
    }
    if (previous && incoming.revision < previous.revision) return;
    if (previous && incoming.revision === previous.revision &&
        incoming.status === previous.status && incoming.phase === previous.phase &&
        incoming.myPlayerId === previous.myPlayerId) return;
    currentRef.current = incoming;
    setState(incoming);
    setError(null);
  }, [roomCode]);

  const refresh = useCallback(async () => {
    if (fetchBusy.current) return;
    fetchBusy.current = true;
    try { accept(await fetchMemoryRoom(roomCode, token)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen.'); }
    finally { fetchBusy.current = false; }
  }, [accept, roomCode, token]);

  const act = useCallback(async (perform: () => Promise<MemoryRoomState>, quietStale = false) => {
    if (mutationBusy.current) return false;
    mutationBusy.current = true;
    setBusy(true);
    try {
      const result = await perform();
      accept(result);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Aktion fehlgeschlagen.';
      if (msg.includes('Stale revision')) {
        await refresh();
      } else if (!quietStale) {
        setError(msg);
      }
      return false;
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  }, [accept, refresh]);

  const start = useCallback(() => act(() => startMemoryRoom(roomCode, token)), [act, roomCode, token]);
  const flip = useCallback((cardId: number) => {
    const latest = currentRef.current;
    if (role !== 'student' || !latest || !latest.canFlip || latest.myPlayerId !== latest.currentPlayerId) return;
    void act(() => flipMemoryCard(roomCode, token, cardId, latest.revision));
  }, [act, role, roomCode, token]);
  const skip = useCallback(() => {
    const latest = currentRef.current;
    if (role !== 'host' || !latest || latest.status !== 'active') return;
    void act(() => skipMemoryTurn(roomCode, token, latest.revision));
  }, [act, role, roomCode, token]);
  const recover = useCallback(() => {
    const latest = currentRef.current;
    if (role !== 'host' || !latest || latest.phase !== 'resolve') return;
    void act(() => advanceMemoryTurn(roomCode, token, latest.revision), true);
  }, [act, role, roomCode, token]);

  // HTTP polling is the proven connectivity path. Realtime is deliberately deferred.
  // The live board refreshes every second; a lobby refreshes every two seconds.
  useEffect(() => {
    void refresh();
    let tick = 0;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      tick += 1;
      if (currentRef.current?.status !== 'active' && tick % 2 !== 0) return;
      void refresh();
    }, 1000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [refresh]);

  const revision = state?.revision;
  const phase = state?.phase;
  const status = state?.status;
  const currentPlayerId = state?.currentPlayerId;
  const myPlayerId = state?.myPlayerId;

  useEffect(() => {
    if (status !== 'active' || phase !== 'resolve' || revision === undefined) return;
    const shouldAdvance = role === 'student' && myPlayerId === currentPlayerId;
    const isFallbackHost = role === 'host';
    if (!shouldAdvance && !isFallbackHost) return;
    const timer = window.setTimeout(() => {
      const latest = currentRef.current;
      if (!latest || latest.revision !== revision || latest.phase !== 'resolve') return;
      void act(() => advanceMemoryTurn(roomCode, token, revision), true);
    }, shouldAdvance ? 1800 : 4500);
    return () => window.clearTimeout(timer);
  }, [status, phase, revision, role, roomCode, token, currentPlayerId, myPlayerId, act]);

  return { state, busy, error, refresh, start, flip, skip, recover };
}
