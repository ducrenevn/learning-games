import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Info } from 'lucide-react';

const EDGE = 10; // closest the note may come to the viewport edge
const GAP = 8; // space between the icon and the note
const ARROW_INSET = 14; // keeps the pointer clear of the rounded corners

interface Position { left: number; top: number; arrow: number; below: boolean; maxHeight: number }

/** Above the icon when the note fits there, otherwise below. Right-aligned to the icon and kept inside the viewport. */
function placeNote(icon: DOMRect, noteWidth: number, noteHeight: number): Position {
  const viewportWidth = document.documentElement.clientWidth;
  const roomAbove = icon.top - GAP - EDGE;
  const roomBelow = window.innerHeight - icon.bottom - GAP - EDGE;
  const below = noteHeight > roomAbove && roomBelow > roomAbove;
  const room = Math.max(below ? roomBelow : roomAbove, 48);
  const left = Math.min(Math.max(icon.right - noteWidth, EDGE), Math.max(EDGE, viewportWidth - noteWidth - EDGE));
  const arrow = Math.min(Math.max(icon.left + icon.width / 2 - left, ARROW_INSET), noteWidth - ARROW_INSET);
  const height = Math.min(noteHeight, room);
  return { left, top: below ? icon.bottom + GAP : icon.top - GAP - height, arrow, below, maxHeight: room };
}

/** Small information icon with a popover anchored above it (below when there is no room). Tap, Esc or an outside tap closes it; focus stays on the trigger. */
export function HintPopover({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const icon = useRef<HTMLButtonElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  // Positioned before paint, and again whenever the page or any scroll container moves.
  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    const update = () => {
      const iconBox = icon.current?.getBoundingClientRect();
      const noteBox = note.current?.getBoundingClientRect();
      const textEl = text.current;
      if (!iconBox || !noteBox || !textEl) return;
      // Full text height, even when the note is capped, so the note can still flip to the roomier side.
      const naturalHeight = textEl.scrollHeight + (noteBox.height - textEl.clientHeight);
      setPosition(placeNote(iconBox, noteBox.width, naturalHeight));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  return <span className="hint-popover" ref={root}>
    <button ref={icon} type="button" className="hint-trigger" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>
      <Info size={16} aria-hidden="true" />
    </button>
    {open && <div
      id={id}
      ref={note}
      className="hint-body"
      role="note"
      data-placement={position?.below ? 'below' : 'above'}
      style={position
        ? { left: position.left, top: position.top, maxHeight: position.maxHeight, '--arrow-x': position.arrow + 'px' } as CSSProperties
        : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <div ref={text} className="hint-body-text">{children}</div>
    </div>}
  </span>;
}
