import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { t, tf } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { useFocusWhen } from '../../shared/activities/focus';
import { DragArea } from '../../shared/activities/dnd';
import { HintPopover } from '../../shared/activities/HintPopover';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { placementOf, placeSort, scoreSort, shuffledIds, type Placements } from './engine';
import type { SortActivity, SortItem } from './model';

const BANK = 'bank';
const binId = (categoryId: string) => 'bin:' + categoryId;
/** Resolves a drop target id to a category id (null = back to the bank), or undefined when it is not a Sort target. */
export function dropTarget(overId: string | number | undefined, categoryIds: readonly string[]): string | null | undefined {
  if (overId === BANK) return null;
  if (typeof overId !== 'string' || !overId.startsWith('bin:')) return undefined;
  const id = overId.slice(4);
  return categoryIds.includes(id) ? id : undefined;
}

interface ChipProps {
  item: SortItem; lang: string; open: boolean; checked: boolean; revealed: boolean; right: boolean;
  placedIn?: string; correctLabel: string; correctWord: string; wrongWord: string; categoryWord: string;
  register: (id: string, el: HTMLButtonElement | null) => void; onChoose: () => void;
}
/** A card: a button (select-and-place) that can also be dragged with mouse or finger. */
function SortChip(p: ChipProps) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: p.item.id, disabled: p.checked });
  return <li className="sort-chip-item">
    <button type="button" ref={el => { setNodeRef(el); p.register(p.item.id, el); }}
      className={'sort-card-choice sort-chip' + (p.open ? ' selected' : '') + (isDragging ? ' dragging' : '') + (p.checked ? (p.right ? ' good' : ' bad') : '')}
      disabled={p.checked} aria-pressed={p.open} {...listeners} onClick={p.onChoose}>
      <strong lang={p.lang}>{p.item.text}</strong>
      {p.placedIn && <span className="sr-only">, {p.categoryWord}: {p.placedIn}</span>}
      {p.checked && <span className="activity-status"><span aria-hidden="true">{p.right ? '✓' : '✗'}</span> {p.right ? p.correctWord : p.wrongWord}</span>}
      {p.revealed && !p.right && <span className="chip-fix small"><span aria-hidden="true">→</span> <span lang={p.lang}>{p.correctLabel}</span></span>}
    </button>
  </li>;
}
interface TargetProps { id: string; className: string; labelledBy: string; onBackgroundClick: (target: EventTarget) => void; children: ReactNode }
function DropSection({ id, className, labelledBy, onBackgroundClick, children }: TargetProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <section ref={setNodeRef} className={className + (isOver ? ' over' : '')} aria-labelledby={labelledBy} onClick={event => onBackgroundClick(event.target)}>{children}</section>;
}

/**
 * Sort board with two clearly different states: an unsorted bank and category bins. A card lives in exactly one place
 * (derived from `placements`), so there are no duplicate or ghost cards. Select-and-place is the complete, accessible
 * path (tap/Enter a card, then its category — or press 1–5); dragging a card onto a bin (or back onto the bank) is an
 * enhancement that calls the same placement.
 */
export function SortPlayer({ activity, locale }: PlayerProps<SortActivity>) {
  const uid = useId();
  const lang = activity.targetLanguage;
  const categories = activity.content.categories;
  const categoryIds = categories.map(c => c.id);
  const byId = new Map(activity.content.items.map(item => [item.id, item]));
  const [order] = useState(() => shuffledIds(activity.content.items));
  const [placements, setPlacements] = useState<Placements>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState('');
  const [restarts, setRestarts] = useState(0);
  const cardButtons = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const resultRef = useFocusWhen<HTMLDivElement>(checked);
  const keyRef = useFocusWhen<HTMLDivElement>(revealed);
  const score = scoreSort(activity, placements);
  const items = order.map(id => byId.get(id)!);
  const inBank = items.filter(item => placementOf(placements, item.id) === undefined);
  const selectedItem = selected ? byId.get(selected) ?? null : null;
  const selectedPlaced = !!selectedItem && placementOf(placements, selectedItem.id) !== undefined;
  const armed = !!selectedItem && !checked;
  const placedCount = items.length - inBank.length;
  const labelOf = (id: string | undefined) => categories.find(c => c.id === id)?.label ?? '';

  // After Retry, focus the first card (not the hint icon that precedes it in the bank header).
  useEffect(() => { if (restarts > 0) boardRef.current?.querySelector<HTMLElement>('.sort-bank .sort-chip')?.focus(); }, [restarts]);
  // Placing moves the card to another list, so its button is re-created: put focus back on the new button.
  useEffect(() => {
    if (!refocus.current) return;
    cardButtons.current.get(refocus.current)?.focus({ preventScroll: true });
    refocus.current = null;
  });

  function choose(id: string) {
    if (checked) return;
    const next = selected === id ? null : id;
    setSelected(next);
    setNotice(next ? tf(locale, 'placeIn', { card: byId.get(next)!.text }) : '');
  }
  function placeItem(item: SortItem, categoryId: string | null) {
    if (checked) return;
    setPlacements(prev => placeSort(activity.content.items, categoryIds, prev, item.id, categoryId));
    setNotice(categoryId === null ? tf(locale, 'announceCleared', { card: item.text }) : tf(locale, 'announcePlaced', { card: item.text, category: labelOf(categoryId) }));
    setSelected(null);
    refocus.current = item.id;
  }
  const place = (categoryId: string | null) => { if (selectedItem) placeItem(selectedItem, categoryId); };
  function dropped(event: DragEndEvent) {
    setDragging(null);
    const item = byId.get(String(event.active.id));
    const target = dropTarget(event.over?.id, categoryIds);
    if (!item || target === undefined || target === (placementOf(placements, item.id) ?? null)) return;
    placeItem(item, target);
  }
  function retry() {
    setPlacements({}); setSelected(null); setChecked(false); setRevealed(false); setNotice('');
    setRestarts(n => n + 1);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!armed || (event.target as HTMLElement).tagName === 'INPUT') return;
    if (event.key === 'Escape') { setSelected(null); setNotice(''); return; }
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= categories.length) { event.preventDefault(); place(categories[digit - 1].id); }
  }
  const backgroundClick = (target: EventTarget, categoryId: string | null) => {
    if (!armed || (target as HTMLElement).closest('button, .hint-popover')) return;
    place(categoryId);
  };
  const chip = (item: SortItem, placedIn?: string) => <SortChip key={item.id} item={item} lang={lang} open={selected === item.id && !checked}
    checked={checked} revealed={revealed} right={item.categoryId === placementOf(placements, item.id)} placedIn={placedIn}
    correctLabel={labelOf(item.categoryId)} correctWord={t(locale, 'correct')} wrongWord={t(locale, 'wrong')} categoryWord={t(locale, 'category')}
    register={(id, el) => { if (el) cardButtons.current.set(id, el); else cardButtons.current.delete(id); }} onChoose={() => choose(item.id)} />;
  // Wrong answers first: that is what a learner wants to read next.
  const keyItems = [...items.filter(i => i.categoryId !== placementOf(placements, i.id)), ...items.filter(i => i.categoryId === placementOf(placements, i.id))];
  const draggedItem = dragging ? byId.get(dragging) : undefined;
  return <DragArea onStart={event => { setDragging(String(event.active.id)); setSelected(null); setNotice(''); }} onEnd={dropped} onCancel={() => setDragging(null)}
    overlay={draggedItem ? <div className="sort-chip drag-ghost"><strong lang={lang}>{draggedItem.text}</strong></div> : null}>
    <div className="activity-board sort-board" ref={boardRef} onKeyDown={keyDown}>
      <p className="muted sort-hint">{t(locale, 'choose')}</p>
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      <div className="sort-progress">
        <span>{u(locale, 'sortedCount', { n: placedCount, total: items.length })}</span>
        <span className="sort-progress-bar" aria-hidden="true"><i style={{ width: (items.length ? placedCount / items.length * 100 : 0) + '%' }} /></span>
      </div>
      <div className="sort-layout">
        <div className="sort-bins">
          {categories.map((cat, index) => <DropSection key={cat.id} id={binId(cat.id)} className={'sort-bin' + (armed || dragging ? ' armed' : '')}
            labelledBy={uid + cat.id} onBackgroundClick={target => backgroundClick(target, cat.id)}>
            <header><h3 id={uid + cat.id} lang={lang}>{cat.label}</h3>
              <span className="rb-count" aria-hidden="true">{items.filter(i => placementOf(placements, i.id) === cat.id).length}</span></header>
            <ul className="sort-bin-chips" lang={lang}>{items.filter(i => placementOf(placements, i.id) === cat.id).map(i => chip(i, cat.label))}</ul>
            <button type="button" className="sort-drop" disabled={!armed} aria-label={t(locale, 'placement') + ': ' + cat.label}
              aria-keyshortcuts={String(index + 1)} onClick={() => place(cat.id)}>{t(locale, 'placement')}</button>
          </DropSection>)}
        </div>
        <DropSection id={BANK} className={'sort-bank' + ((armed && selectedPlaced) || dragging ? ' armed' : '')} labelledBy={uid + 'bank'}
          onBackgroundClick={target => backgroundClick(target, null)}>
          <header><h3 id={uid + 'bank'}>{u(locale, 'bankTitle')}</h3>
            <span className="rb-count" aria-hidden="true">{inBank.length}</span>
            <HintPopover label={u(locale, 'infoLabel')}>{u(locale, 'infoTap')} {u(locale, 'infoDrag')}</HintPopover></header>
          <ul className="sort-bank-chips">{inBank.map(i => chip(i))}</ul>
          {inBank.length === 0 && !checked && <p className="muted small sort-bank-done">{u(locale, 'bankDone')}</p>}
          {armed && selectedPlaced && <button type="button" className="button subtle sort-return" onClick={() => place(null)}>{t(locale, 'clear')}</button>}
        </DropSection>
      </div>
      <div className="row activity-controls">
        {!checked ? <button type="button" className="button primary" disabled={!score.complete} onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
          : <><div role="status" tabIndex={-1} ref={resultRef}>{t(locale, 'result')}: {score.correct} {t(locale, 'of')} {score.total} {t(locale, 'correct')}</div>
            <button type="button" className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
            <button type="button" className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button></>}
      </div>
      {!score.complete && !checked && <p className="muted small">{t(locale, 'missing')}</p>}
      {revealed && <div className="activity-key" tabIndex={-1} ref={keyRef} role="region" aria-labelledby={uid + 'key'}>
        <h3 id={uid + 'key'}>{t(locale, 'answerKey')}</h3>
        <ul className="sort-key-list">{keyItems.map(item => <li key={item.id}>
          <strong lang={lang}>{item.text}</strong> — {t(locale, 'categoryCorrect')}: <span lang={lang}>{labelOf(item.categoryId)}</span>
          {item.explanation && <p lang={lang}>{item.explanation}</p>}
        </li>)}</ul>
      </div>}
    </div>
  </DragArea>;
}
