import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowRightLeft, GripVertical, MessageSquareText, Plus, X } from 'lucide-react';
import { useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { DragArea } from '../../shared/activities/dnd';
import { t, tf } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { splitLines } from '../../shared/activities/listPaste';
import type { EditorProps } from '../../shared/activities/Workspace';
import type { SortActivity, SortItem } from './model';
import { dropTarget } from './SortPlayer';

const MIN_CATEGORIES = 2, MAX_CATEGORIES = 5, MIN_CARDS = 4, MAX_CARDS = 30;
function nextId(prefix: string, used: string[]) {
  let i = 1;
  while (used.includes(prefix + '-' + i)) i++;
  return prefix + '-' + i;
}
/** A bin that accepts a dragged card (the buttons remain the keyboard path). */
function DropBin({ id, className, label, children }: { id: string; className: string; label: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bin:' + id });
  return <section ref={setNodeRef} className={className + (isOver ? ' over' : '')} aria-label={label}>{children}</section>;
}
/** A card row that can be dragged by its grip into another bin. */
function DragCard({ id, lifted, children }: { id: string; lifted: boolean; children: (grip: ReactNode) => ReactNode }) {
  const { setNodeRef, setActivatorNodeRef, listeners, isDragging } = useDraggable({ id });
  return <li ref={setNodeRef} className={'card-edit' + (lifted ? ' lifted' : '') + (isDragging ? ' dragging' : '')} data-row>
    {children(<span className="seq-grip" ref={setActivatorNodeRef} aria-hidden="true" {...listeners}><GripVertical size={16} /></span>)}
  </li>;
}
type Focus = { kind: 'card' | 'category' | 'add-card' | 'add-category'; id?: string; end?: boolean };

/**
 * The teacher edits the real Sort board: the category bins, with their cards inside. A card's bin is its answer, so
 * there is no separate answer field. Moving a card uses the same select-and-place model as the player (keyboard and
 * touch friendly); typing, Enter, Backspace and list paste work on the cards directly.
 */
export function SortEditor({ activity, onChange, locale, field, region }: EditorProps<SortActivity>) {
  const { categories, items } = activity.content;
  const [moving, setMoving] = useState<string | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [notice, setNotice] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const cardInputs = useRef(new Map<string, HTMLInputElement>());
  const categoryInputs = useRef(new Map<string, HTMLInputElement>());
  const addCardButtons = useRef(new Map<string, HTMLButtonElement>());
  const addCategoryButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!focus) return;
    const el = focus.kind === 'card' ? cardInputs.current.get(focus.id!)
      : focus.kind === 'category' ? categoryInputs.current.get(focus.id!)
      : focus.kind === 'add-card' ? addCardButtons.current.get(focus.id!) : addCategoryButton.current;
    el?.focus();
    if (el instanceof HTMLInputElement && focus.end) el.setSelectionRange(el.value.length, el.value.length);
  }, [focus]);
  const update = (part: Partial<SortActivity['content']>) => onChange({ ...activity, content: { ...activity.content, ...part } });
  const labelOf = (id: string) => categories.find(c => c.id === id)?.label || t(locale, 'category');
  const cardsIn = (categoryId: string) => items.filter(item => item.categoryId === categoryId);
  // Card numbers follow what the teacher sees (bin by bin), so "Karte 5" is always the fifth card on screen.
  const visual = categories.flatMap(c => cardsIn(c.id));
  const numberOf = (id: string) => visual.findIndex(item => item.id === id) + 1;
  const cardName = (id: string) => t(locale, 'card') + ' ' + numberOf(id);
  const patchItem = (id: string, change: Partial<SortItem>) => update({ items: items.map(item => item.id === id ? { ...item, ...change } : item) });
  const setText = (id: string, text: string) => patchItem(id, { text: text.replace(/\s*[\r\n]+\s*/g, ' ') });
  const setExplanation = (id: string, value: string) => update({ items: items.map(item => {
    if (item.id !== id) return item;
    const copy = { ...item };
    if (value) copy.explanation = value; else delete copy.explanation;
    return copy;
  }) });

  function addCard(categoryId: string, afterId?: string, texts: string[] = ['']) {
    const room = MAX_CARDS - items.length;
    if (room <= 0) return [];
    const used = items.map(i => i.id);
    const created: SortItem[] = texts.slice(0, room).map(text => { const id = nextId('card', used); used.push(id); return { id, text, categoryId }; });
    const at = afterId ? items.findIndex(i => i.id === afterId) + 1 : items.length;
    update({ items: [...items.slice(0, at), ...created, ...items.slice(at)] });
    return created;
  }
  function removeCard(id: string) {
    if (items.length <= MIN_CARDS) return;
    const item = items.find(i => i.id === id)!;
    const mates = cardsIn(item.categoryId);
    const index = mates.findIndex(i => i.id === id);
    const neighbour = mates[index - 1] ?? mates[index + 1];
    update({ items: items.filter(i => i.id !== id) });
    if (moving === id) setMoving(null);
    setFocus(neighbour ? { kind: 'card', id: neighbour.id, end: true } : { kind: 'add-card', id: item.categoryId });
  }
  function addCategory() {
    if (categories.length >= MAX_CATEGORIES) return;
    const id = nextId('category', categories.map(c => c.id));
    update({ categories: [...categories, { id, label: '' }] });
    setFocus({ kind: 'category', id });
  }
  function removeCategory(id: string) {
    if (categories.length <= MIN_CATEGORIES) return;
    const index = categories.findIndex(c => c.id === id);
    const target = categories[index - 1] ?? categories[index + 1];
    const cards = cardsIn(id);
    // Never silently re-assign answers: ask first, and say where the cards will go.
    if (cards.length && !window.confirm(tf0(u(locale, 'deleteCategoryConfirm'), { name: labelOf(id), n: cards.length, target: labelOf(target.id) }))) return;
    update({ categories: categories.filter(c => c.id !== id), items: items.map(item => item.categoryId === id ? { ...item, categoryId: target.id } : item) });
    setMoving(null);
    setFocus({ kind: 'add-category' });
  }
  function moveTo(categoryId: string) {
    if (!moving) return;
    const item = items.find(i => i.id === moving)!;
    if (item.categoryId !== categoryId) {
      patchItem(item.id, { categoryId });
      setNotice(tf(locale, 'announcePlaced', { card: item.text || cardName(item.id), category: labelOf(categoryId) }));
    }
    setMoving(null);
    setFocus({ kind: 'card', id: item.id, end: true });
  }
  function dropped(event: DragEndEvent) {
    setDragId(null);
    const item = items.find(i => i.id === event.active.id);
    const target = dropTarget(event.over?.id, categories.map(c => c.id));
    if (!item || !target || target === item.categoryId) return;
    patchItem(item.id, { categoryId: target });
    setNotice(tf(locale, 'announcePlaced', { card: item.text || cardName(item.id), category: labelOf(target) }));
  }
  function cardKeys(event: KeyboardEvent<HTMLInputElement>, item: SortItem) {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const created = addCard(item.categoryId, item.id);
      if (created[0]) setFocus({ kind: 'card', id: created[0].id });
    } else if (event.key === 'Backspace' && item.text === '' && items.length > MIN_CARDS) {
      event.preventDefault();
      removeCard(item.id);
    } else if (event.key === 'Escape' && moving) {
      setMoving(null);
    }
  }
  function paste(event: ClipboardEvent<HTMLInputElement>, item: SortItem) {
    const lines = splitLines(event.clipboardData.getData('text'));
    if (lines.length < 2) return;
    event.preventDefault();
    const fillCurrent = item.text.trim() === '';
    const room = MAX_CARDS - items.length + (fillCurrent ? 1 : 0);
    const accepted = lines.slice(0, Math.max(room, 0));
    if (!accepted.length) return;
    const used = items.map(i => i.id);
    const created: SortItem[] = accepted.slice(fillCurrent ? 1 : 0).map(text => { const id = nextId('card', used); used.push(id); return { id, text, categoryId: item.categoryId }; });
    const at = items.findIndex(i => i.id === item.id);
    update({ items: [...items.slice(0, at), fillCurrent ? { ...item, text: accepted[0] } : item, ...created, ...items.slice(at + 1)] });
    setFocus({ kind: 'card', id: (created[created.length - 1] ?? item).id, end: true });
  }
  const dragged = items.find(i => i.id === dragId);
  return <DragArea onStart={event => { setDragId(String(event.active.id)); setMoving(null); }} onEnd={dropped} onCancel={() => setDragId(null)}
    overlay={dragged ? <div className="sort-chip drag-ghost"><strong>{dragged.text || t(locale, 'card')}</strong></div> : null}>
  <div className="activity-editor sort-author" onKeyDown={event => { if (event.key === 'Escape' && moving) setMoving(null); }}>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <div className="sort-bins edit" {...region('content.items')}>
      {categories.map((category, ci) => {
        const cards = cardsIn(category.id);
        return <DropBin key={category.id} id={category.id} className={'sort-bin edit' + (moving || dragId ? ' armed' : '')} label={category.label || t(locale, 'category') + ' ' + (ci + 1)}>
          <header>
            <input className="bin-title" aria-label={t(locale, 'label') + ' ' + (ci + 1)} placeholder={u(locale, 'categoryHint2')} value={category.label}
              {...field('content.categories[' + ci + '].label')}
              ref={el => { if (el) categoryInputs.current.set(category.id, el); else categoryInputs.current.delete(category.id); }}
              onChange={e => update({ categories: categories.map(c => c.id === category.id ? { ...c, label: e.target.value } : c) })}/>
            <button type="button" className="icon-button danger" disabled={categories.length <= MIN_CATEGORIES} title={categories.length <= MIN_CATEGORIES ? u(locale, 'minCategories') : undefined}
              aria-label={tf(locale, 'removeRow', { what: t(locale, 'category') + ' ' + (ci + 1) })} onClick={() => removeCategory(category.id)}><X size={16} aria-hidden="true"/></button>
          </header>
          <ul className="bin-cards">{cards.map(item => {
            const realIndex = items.findIndex(i => i.id === item.id);
            const showExplanation = open.has(item.id) || item.explanation !== undefined;
            return <DragCard key={item.id} id={item.id} lifted={moving === item.id}>{grip => <>
              <div className="card-edit-main">
                {grip}
                <input className="chip-input" aria-label={cardName(item.id)} placeholder={u(locale, 'cardHint')} value={item.text} {...field('content.items[' + realIndex + '].text')}
                  ref={el => { if (el) cardInputs.current.set(item.id, el); else cardInputs.current.delete(item.id); }}
                  onKeyDown={e => cardKeys(e, item)} onPaste={e => paste(e, item)} onChange={e => setText(item.id, e.target.value)}/>
                <button type="button" className="icon-button" aria-pressed={moving === item.id} aria-label={u(locale, 'moveCard') + ': ' + cardName(item.id)}
                  onClick={() => setMoving(moving === item.id ? null : item.id)}><ArrowRightLeft size={16} aria-hidden="true"/></button>
                <button type="button" className="icon-button" aria-expanded={showExplanation} aria-label={u(locale, 'explainCard') + ': ' + cardName(item.id)}
                  onClick={() => setOpen(prev => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}><MessageSquareText size={16} aria-hidden="true"/></button>
                <button type="button" className="icon-button danger" disabled={items.length <= MIN_CARDS} title={items.length <= MIN_CARDS ? u(locale, 'minCards') : undefined}
                  aria-label={tf(locale, 'removeRow', { what: cardName(item.id) })} onClick={() => removeCard(item.id)}><X size={16} aria-hidden="true"/></button>
              </div>
              {showExplanation && <input className="chip-input chip-explanation" aria-label={u(locale, 'explainCard') + ' · ' + cardName(item.id)} placeholder={u(locale, 'explainCard')}
                value={item.explanation ?? ''} {...field('content.items[' + realIndex + '].explanation')} onChange={e => setExplanation(item.id, e.target.value)}/>}
            </>}</DragCard>;
          })}</ul>
          <button type="button" className="add-card" disabled={items.length >= MAX_CARDS} aria-label={t(locale, 'addItem') + ': ' + (category.label || t(locale, 'category') + ' ' + (ci + 1))}
            ref={el => { if (el) addCardButtons.current.set(category.id, el); else addCardButtons.current.delete(category.id); }}
            onClick={() => { const created = addCard(category.id, cards[cards.length - 1]?.id); if (created[0]) setFocus({ kind: 'card', id: created[0].id }); }}>
            <Plus size={14} aria-hidden="true"/> {t(locale, 'card')}
          </button>
          {moving && <button type="button" className="sort-drop" disabled={items.find(i => i.id === moving)?.categoryId === category.id}
            aria-label={u(locale, 'moveHere') + ': ' + (category.label || t(locale, 'category') + ' ' + (ci + 1))} onClick={() => moveTo(category.id)}>{u(locale, 'moveHere')}</button>}
        </DropBin>;
      })}
      <button type="button" className="sort-bin ghost" data-add ref={addCategoryButton} disabled={categories.length >= MAX_CATEGORIES} onClick={addCategory}>
        <Plus size={18} aria-hidden="true"/><span>{t(locale, 'addCategory')}</span>
        {categories.length >= MAX_CATEGORIES && <small>{u(locale, 'maxCategories')}</small>}
      </button>
    </div>
    {items.length >= MAX_CARDS && <p className="muted small">{u(locale, 'maxCards')}</p>}
    <p className="muted small">{u(locale, 'tipCards')}</p>
  </div>
  </DragArea>;
}
function tf0(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => Object.hasOwn(vars, name) ? String(vars[name]) : whole);
}
