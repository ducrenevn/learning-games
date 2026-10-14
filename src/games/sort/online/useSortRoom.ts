import { useCallback, useEffect, useRef, useState } from 'react';
import { commandSortRoom, fetchSortRoom } from './sortRpc';
import type { SortRoomIdentity, SortRoomState } from './types';

export type SortOnlineError =
  | 'REVISION_CONFLICT' | 'ROOM_CLOSED' | 'ROOM_EXPIRED' | 'ROOM_FULL'
  | 'FORBIDDEN' | 'INVALID_PAYLOAD' | 'INCOMPLETE_ATTEMPT'
  | 'SORT_SERVER_ERROR' | 'SORT_NO_RESPONSE' | 'INVALID_SORT_STATE';

function errorCode(error: unknown): SortOnlineError {
  const message = error instanceof Error ? error.message : '';
  const known: readonly string[] = ['REVISION_CONFLICT', 'ROOM_CLOSED', 'ROOM_EXPIRED',
    'ROOM_FULL', 'FORBIDDEN', 'INVALID_PAYLOAD', 'INCOMPLETE_ATTEMPT',
    'SORT_SERVER_ERROR', 'SORT_NO_RESPONSE', 'INVALID_SORT_STATE'];
  return known.includes(message) ? message as SortOnlineError : 'SORT_SERVER_ERROR';
}

export function useSortRoom(identity: SortRoomIdentity) {
  const [state, setState] = useState<SortRoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SortOnlineError | null>(null);
  const latest = useRef<SortRoomState | null>(null);
  const inflight = useRef(false);
  const mutating = useRef(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    const requestVersion = generation.current;
    try {
      const incoming = await fetchSortRoom(identity, latest.current);
      // A response launched before a mutation must not overwrite its newer state.
      if (requestVersion !== generation.current) return;
      const existing = latest.current;
      if (existing && incoming.role === existing.role &&
          (incoming.roomRevision < existing.roomRevision ||
           (incoming.roomRevision === existing.roomRevision && incoming.role === 'student' &&
            existing.role === 'student' && incoming.attemptRevision < existing.attemptRevision))) return;
      latest.current = incoming;
      setState(incoming);
      setError(null);
    } catch (e) { if (requestVersion === generation.current) setError(errorCode(e)); }
    finally { inflight.current = false; }
  }, [identity.roomCode, identity.token, identity.role]);

  const send = useCallback(async (kind: string, payload: Record<string, unknown> = {}) => {
    const current = latest.current;
    if (!current || mutating.current) return false;
    const isPlacement = kind === 'sort.place';
    const isSubmit = kind === 'sort.submit';
    if ((isPlacement || isSubmit) && current.role !== 'student') return false;
    if (!(isPlacement || isSubmit) && current.role !== 'host') return false;
    mutating.current = true;
    generation.current++;
    setBusy(true);
    setError(null);
    try {
      const receipt = await commandSortRoom(identity, kind, payload,
        isPlacement ? null : current.roomRevision,
        (isPlacement || isSubmit) ? current.attemptRevision : null);
      // Server receipts carry revisions but not the full actor-scoped state.
      if (!Number.isSafeInteger(receipt.roomRevision)) throw new Error('INVALID_SORT_STATE');
      await fetchSortRoom(identity, null).then(incoming => {
        const existing = latest.current;
        if (existing && (incoming.roomRevision < existing.roomRevision ||
          (incoming.roomRevision === existing.roomRevision && incoming.role === 'student' &&
           existing.role === 'student' && incoming.attemptRevision < existing.attemptRevision))) return;
        latest.current = incoming;
        setState(incoming);
      });
      return true;
    } catch (e) {
      setError(errorCode(e));
      // Conflict, uncertain network error, or successful write followed by failed read:
      // refresh the authoritative state; never blindly replay the command with a new revision.
      try {
        const incoming = await fetchSortRoom(identity, null);
        latest.current = incoming;
        setState(incoming);
      } catch { /* Preserve the original diagnostic. */ }
      return false;
    } finally {
      mutating.current = false;
      setBusy(false);
    }
  }, [identity.roomCode, identity.token, identity.role]);

  useEffect(() => {
    void refresh();
    let tick = 0;
    const timer = window.setInterval(() => {
      if (document.hidden || mutating.current) return;
      tick++;
      if (latest.current?.roomStatus !== 'active' && tick % 2) return;
      void refresh();
    }, 1000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { state, busy, error, refresh, send };
}
