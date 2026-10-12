import { useEffect, useRef, useState } from 'react';

const FIRST_CONTROL = 'button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])';

/** Moves focus to the returned element once `active` turns true, e.g. the result summary after Check. */
export function useFocusWhen<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => { if (active) ref.current?.focus(); }, [active]);
  return ref;
}

/** Moves focus to the first enabled control inside the returned container each time `token` increments (e.g. after Retry). */
export function useFocusFirstOnChange<T extends HTMLElement>(token: number) {
  const ref = useRef<T>(null);
  useEffect(() => { if (token > 0) ref.current?.querySelector<HTMLElement>(FIRST_CONTROL)?.focus(); }, [token]);
  return ref;
}

/**
 * Editor lists: after the teacher adds a row, focus its first field; after removing one, focus the list's Add button
 * (the removed row's own button no longer exists). Rows carry `data-row`, the Add button `data-add`. Only user actions
 * request focus, so importing a file never moves it.
 */
export function useListFocus<T extends HTMLElement>() {
  const rootRef = useRef<T>(null);
  const [request, setRequest] = useState<{ kind: 'added' | 'removed' } | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!request || !root) return;
    if (request.kind === 'removed') { root.querySelector<HTMLElement>('[data-add]:not([disabled])')?.focus(); return; }
    const rows = root.querySelectorAll('[data-row]');
    rows[rows.length - 1]?.querySelector<HTMLElement>('input, textarea, select')?.focus();
  }, [request]);
  return { rootRef, rowAdded: () => setRequest({ kind: 'added' }), rowRemoved: () => setRequest({ kind: 'removed' }) };
}

export type MoveDirection = 'up' | 'down';
/** `data-move` value that a row's move buttons must carry so focus can follow the row after it is reordered. */
export const moveKey = (id: string, direction: MoveDirection) => id + ':' + direction;

/**
 * Keeps keyboard focus on a row's move button after the row changes position. Reordering re-renders the list, and a
 * button that becomes disabled at either end of the list would otherwise drop focus to <body>. Focus goes to the same
 * direction button when it is still enabled, otherwise to the opposite one.
 */
export function useMoveFocus<T extends HTMLElement>() {
  const rootRef = useRef<T>(null);
  const [request, setRequest] = useState<{ id: string; direction: MoveDirection } | null>(null);
  useEffect(() => {
    if (!request || !rootRef.current) return;
    const buttons = Array.from(rootRef.current.querySelectorAll<HTMLButtonElement>('[data-move]'));
    const find = (direction: MoveDirection) => buttons.find(b => b.getAttribute('data-move') === moveKey(request.id, direction));
    const same = find(request.direction), other = find(request.direction === 'up' ? 'down' : 'up');
    (same && !same.disabled ? same : other && !other.disabled ? other : null)?.focus();
  }, [request]);
  return { rootRef, keepFocus: (id: string, direction: MoveDirection) => setRequest({ id, direction }) };
}
