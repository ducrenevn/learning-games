import { useState } from 'react';
import { t } from '../../shared/activities/i18n';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { placeSort, scoreSort, shuffledIds, type Placements } from './engine';
import type { SortActivity } from './model';

export function SortPlayer({ activity, locale }: PlayerProps<SortActivity>) {
  const [order] = useState(() => shuffledIds(activity.content.items));
  const [placements, setPlacements] = useState<Placements>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const categories = activity.content.categories;
  const score = scoreSort(activity, placements);
  const items = order.map(id => activity.content.items.find(item => item.id === id)!);
  function setCategory(categoryId: string) {
    if (!selected || checked) return;
    setPlacements(prev => placeSort(activity.content.items, categories.map(c => c.id), prev, selected, categoryId));
    setSelected(null);
  }
  function retry() {
    setPlacements({}); setSelected(null); setChecked(false); setRevealed(false);
  }
  return <div className="activity-board">
    <p className="muted" aria-live="polite">{selected ? t(locale, 'picked') + ': ' + (items.find(i => i.id === selected)?.text ?? '') : t(locale, 'choose')}</p>
    <div className="sort-trays">
      {categories.map(cat => <button key={cat.id} type="button" className="sort-tray" disabled={!selected || checked} onClick={() => setCategory(cat.id)}>
        <strong>{cat.label}</strong><span className="small">{t(locale, 'placement')}</span>
        <span className="sort-tray-entries">{items.filter(item => placements[item.id] === cat.id).map(item => <span key={item.id} className="sort-tray-entry">{item.text}</span>)}</span>
      </button>)}
    </div>
    <div className="activity-cards" role="group" aria-label={t(locale, 'card')}>
      {items.map(item => {
        const assigned = categories.find(c => c.id === placements[item.id]);
        const status = checked ? (placements[item.id] === item.categoryId ? t(locale, 'correct') : t(locale, 'wrong')) : '';
        return <div className="sort-card" key={item.id}>
          <button type="button" className={'sort-card-choice' + (selected === item.id ? ' selected' : '')} disabled={checked}
            aria-pressed={selected === item.id} onClick={() => setSelected(selected === item.id ? null : item.id)}>
            <strong>{item.text}</strong><span className="small">{assigned?.label ?? t(locale, 'unplaced')}</span>
          </button>
          {assigned && !checked && <button className="button secondary" onClick={() => {
            setPlacements(prev => placeSort(activity.content.items, categories.map(c => c.id), prev, item.id, null));
            setSelected(item.id);
          }}>{t(locale, 'clear')}</button>}
          {checked && <span className="activity-status">{status}</span>}
          {revealed && <div className="activity-key small"><strong>{t(locale, 'categoryCorrect')}: {categories.find(c => c.id === item.categoryId)?.label}</strong>
            {item.explanation && <p>{item.explanation}</p>}</div>}
        </div>;
      })}
    </div>
    <div className="row activity-controls">
      {!checked ? <button className="button primary" disabled={!score.complete} onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
        : <><div role="status">{t(locale, 'result')}: {score.correct} {t(locale, 'of')} {score.total} {t(locale, 'correct')}</div>
          <button className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
          <button className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button></>}
    </div>
    {!score.complete && !checked && <p className="muted small" role="status">{t(locale, 'missing')}</p>}
  </div>;
}
