import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

/** Small information icon with a popover. Esc or an outside tap closes it; focus stays on the trigger. */
export function HintPopover({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  return <span className="hint-popover" ref={root}>
    <button type="button" className="hint-trigger" aria-label={label} aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>
      <Info size={16} aria-hidden="true" />
    </button>
    {open && <div id={id} className="hint-body" role="note">{children}</div>}
  </span>;
}
