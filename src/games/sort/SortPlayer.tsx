import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { t, tf } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { useFocusWhen } from '../../shared/activities/focus';
import { HintPopover } from '../../shared/activities/HintPopover';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { placementOf, placeSort, scoreSort, shuffledIds, type Placements } from './engine';
import type { SortActivity, SortItem } from './model';

/**
 * Sort board with two clearly different states: an unsorted bank and category bins. A card lives in exactly one place
 * (derived from `placements`), so there are no duplicate or ghost cards. Select-and-place is the complete, accessible
 * path (tap/Enter a card, then its category — or press 1–5); nothing requires dragging.
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
    cardButtons.current.get(refocus.current)?.focus();
    refocus.current = null;
  });

  function choose(id: string) {
    if (checked) return;
    const next = selected === id ? null : id;
    setSelected(next);
    setNotice(next ? tf(locale, 'placeIn', { card: byId.get(next)!.text }) : '');
  }
  function place(categoryId: string | null) {
    if (!selectedItem || checked) return;
    const item = selectedItem;
    setPlacements(prev => placeSort(activity.content.items, categoryIds, prev, item.id, categoryId));
    setNotice(categoryId === null ? tf(locale, 'announceCleared', { card: item.text }) : tf(locale, 'announcePlaced', { card: item.text, category: labelOf(categoryId) }));
    setSelected(null);
    refocus.current = item.id;
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
  const chip = (item: SortItem, placedIn?: string) => {
    const open = selected === item.id && !checked;
    const right = item.categoryId === placementOf(placements, item.id);
    return <li key={item.id} className="sort-chip-item">
      <button type="button" className={'sort-card-choice sort-chip' + (open ? ' selected' : '') + (checked ? (right ? ' good' : ' bad') : '')}
        disabled={checked} aria-pressed={open}
        ref={el => { if (el) cardButtons.current.set(item.id, el); else cardButtons.current.delete(item.id); }}
        onClick={() => choose(item.id)}>
        <strong lang={lang}>{item.text}</strong>
        {placedIn && <span className="sr-only">, {t(locale, 'category')}: {placedIn}</span>}
        {checked && <span className="activity-status"><span aria-hidden="true">{right ? '✓' : '✗'}</span> {right ? t(locale, 'correct') : t(locale, 'wrong')}</span>}
        {revealed && !right && <span className="chip-fix small"><span aria-hidden="true">→</span> <span lang={lang}>{labelOf(item.categoryId)}</span></span>}
      </button>
    </li>;
  };
  // Wrong answers first: that is what a learner wants to read next.
  const keyItems = [...items.filter(i => i.categoryId !== placementOf(placements, i.id)), ...items.filter(i => i.categoryId === placementOf(placements, i.id))];
  return <div className="activity-board sort-board" ref={boardRef} onKeyDown={keyDown}>
    <p className="muted sort-hint">{t(locale, 'choose')}</p>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <div className="sort-progress">
      <span>{u(locale, 'sortedCount', { n: placedCount, total: items.length })}</span>
      <span className="sort-progress-bar" aria-hidden="true"><i style={{ width: (items.length ? placedCount / items.length * 100 : 0) + '%' }} /></span>
    </div>
    <div className="sort-layout">
      <div className="sort-bins">
        {categories.map((cat, index) => <section key={cat.id} className={'sort-bin' + (armed ? ' armed' : '')} aria-labelledby={uid + cat.id}
          onClick={event => backgroundClick(event.target, cat.id)}>
          <header><h3 id={uid + cat.id} lang={lang}>{cat.label}</h3>
            <span className="rb-count" aria-hidden="true">{items.filter(i => placementOf(placements, i.id) === cat.id).length}</span></header>
          <ul className="sort-bin-chips" lang={lang}>{items.filter(i => placementOf(placements, i.id) === cat.id).map(i => chip(i, cat.label))}</ul>
          <button type="button" className="sort-drop" disabled={!armed} aria-label={t(locale, 'placement') + ': ' + cat.label}
            aria-keyshortcuts={String(index + 1)} onClick={() => place(cat.id)}>{t(locale, 'placement')}</button>
        </section>)}
      </div>
      <section className={'sort-bank' + (armed && selectedPlaced ? ' armed' : '')} aria-labelledby={uid + 'bank'}
        onClick={event => backgroundClick(event.target, null)}>
        <header><h3 id={uid + 'bank'}>{u(locale, 'bankTitle')}</h3>
          <span className="rb-count" aria-hidden="true">{inBank.length}</span>
          <HintPopover label={u(locale, 'infoLabel')}>{u(locale, 'infoTap')}</HintPopover></header>
        <ul className="sort-bank-chips">{inBank.map(i => chip(i))}</ul>
        {inBank.length === 0 && !checked && <p className="muted small sort-bank-done">{u(locale, 'bankDone')}</p>}
        {armed && selectedPlaced && <button type="button" className="button subtle sort-return" onClick={() => place(null)}>{t(locale, 'clear')}</button>}
      </section>
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
  </div>;
}
