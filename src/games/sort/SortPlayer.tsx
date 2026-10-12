import { useId, useRef, useState } from 'react';
import { t, tf } from '../../shared/activities/i18n';
import { useFocusFirstOnChange, useFocusWhen } from '../../shared/activities/focus';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { placementOf, placeSort, scoreSort, shuffledIds, type Placements } from './engine';
import type { SortActivity } from './model';

/**
 * Select-and-place Sort board. A card is selected first; its categories then appear directly under it (the next
 * focus stop for keyboard users, and next to the thumb on a phone). The category trays above are a board summary
 * that can also receive the selected card, which suits a projected screen. Nothing here relies on dragging.
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
  const boardRef = useFocusFirstOnChange<HTMLDivElement>(restarts);
  const resultRef = useFocusWhen<HTMLDivElement>(checked);
  const keyRef = useFocusWhen<HTMLDivElement>(revealed);
  const score = scoreSort(activity, placements);
  const items = order.map(id => byId.get(id)!);

  function choose(id: string) {
    if (checked) return;
    const next = selected === id ? null : id;
    setSelected(next);
    setNotice(next ? tf(locale, 'placeIn', { card: byId.get(next)!.text }) : '');
  }
  function place(categoryId: string | null) {
    if (!selected || checked) return;
    const item = byId.get(selected)!;
    setPlacements(prev => placeSort(activity.content.items, categoryIds, prev, item.id, categoryId));
    const label = categories.find(c => c.id === categoryId)?.label ?? '';
    setNotice(categoryId === null ? tf(locale, 'announceCleared', { card: item.text }) : tf(locale, 'announcePlaced', { card: item.text, category: label }));
    setSelected(null);
    cardButtons.current.get(item.id)?.focus(); // the clicked tray/category button is about to unmount or disable
  }
  function retry() {
    setPlacements({}); setSelected(null); setChecked(false); setRevealed(false); setNotice('');
    setRestarts(n => n + 1);
  }
  return <div className="activity-board" ref={boardRef}>
    <p className="muted sort-hint">{t(locale, 'choose')}</p>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <div className="sort-trays">
      {categories.map(cat => <section key={cat.id} className="sort-tray" aria-labelledby={uid + cat.id}>
        <h3 id={uid + cat.id} lang={lang}>{cat.label}</h3>
        <ul className="sort-tray-entries" lang={lang}>
          {items.filter(item => placementOf(placements, item.id) === cat.id).map(item => <li key={item.id} className="sort-tray-entry">{item.text}</li>)}
        </ul>
        <button type="button" className="button secondary" disabled={!selected || checked}
          aria-label={t(locale, 'placement') + ': ' + cat.label} onClick={() => place(cat.id)}>{t(locale, 'placement')}</button>
      </section>)}
    </div>
    <div className="activity-cards">
      {items.map(item => {
        const current = placementOf(placements, item.id);
        const assigned = categories.find(c => c.id === current);
        const open = selected === item.id && !checked;
        const right = current === item.categoryId;
        return <div className="sort-card" key={item.id}>
          <button type="button" className={'sort-card-choice' + (open ? ' selected' : '')} disabled={checked} aria-pressed={open}
            ref={el => { if (el) cardButtons.current.set(item.id, el); else cardButtons.current.delete(item.id); }}
            onClick={() => choose(item.id)}>
            <strong lang={lang}>{item.text}</strong>{' '}
            <span className="small">{assigned ? <>{t(locale, 'category')}: <span lang={lang}>{assigned.label}</span></> : t(locale, 'unplaced')}</span>
          </button>
          {open && <div className="sort-place" role="group" aria-labelledby={uid + 'place-' + item.id}>
            <span id={uid + 'place-' + item.id} className="small">{tf(locale, 'placeIn', { card: item.text })}</span>
            <div className="sort-place-options">
              {categories.map(cat => <button key={cat.id} type="button" className="button secondary" aria-pressed={current === cat.id}
                onClick={() => place(cat.id)}><span lang={lang}>{cat.label}</span></button>)}
              {assigned && <button type="button" className="button subtle" onClick={() => place(null)}>{t(locale, 'clear')}</button>}
            </div>
          </div>}
          {checked && <span className="activity-status"><span aria-hidden="true">{right ? '✓' : '✗'}</span> {right ? t(locale, 'correct') : t(locale, 'wrong')}</span>}
          {revealed && <div className="activity-key small" tabIndex={-1} ref={item.id === items[0].id ? keyRef : undefined}>
            <strong>{t(locale, 'categoryCorrect')}: <span lang={lang}>{categories.find(c => c.id === item.categoryId)?.label}</span></strong>
            {item.explanation && <p lang={lang}>{item.explanation}</p>}</div>}
        </div>;
      })}
    </div>
    <div className="row activity-controls">
      {!checked ? <button type="button" className="button primary" disabled={!score.complete} onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
        : <><div role="status" tabIndex={-1} ref={resultRef}>{t(locale, 'result')}: {score.correct} {t(locale, 'of')} {score.total} {t(locale, 'correct')}</div>
          <button type="button" className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
          <button type="button" className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button></>}
    </div>
    {!score.complete && !checked && <p className="muted small">{t(locale, 'missing')}</p>}
  </div>;
}
