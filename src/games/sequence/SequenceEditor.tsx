import { useState } from 'react';
import { t, tf } from '../../shared/activities/i18n';
import { moveKey, useListFocus, useMoveFocus } from '../../shared/activities/focus';
import type { EditorProps } from '../../shared/activities/Workspace';
import { moveSequence } from './engine';
import type { SequenceActivity } from './model';

function nextId(ids: string[]) { let n = 1; while (ids.includes('step-' + n)) n++; return 'step-' + n; }
export function SequenceEditor({ activity, onChange, locale }: EditorProps<SequenceActivity>) {
  const { items } = activity.content;
  const [notice, setNotice] = useState('');
  const { rootRef: moveRoot, keepFocus } = useMoveFocus<HTMLDivElement>();
  const list = useListFocus<HTMLDivElement>();
  const update = (content: Partial<SequenceActivity['content']>) => onChange({ ...activity, content: { ...activity.content, ...content } });
  function move(i: number, direction: -1 | 1) {
    const order = moveSequence(items.map(v => v.id), i, direction);
    update({ items: order.map(id => items.find(v => v.id === id)!) });
    setNotice(tf(locale, 'announceMoved', { card: items[i].text || t(locale, 'item') + ' ' + (i + 1), pos: i + direction + 1, total: items.length }));
    keepFocus(items[i].id, direction === -1 ? 'up' : 'down');
  }
  return <div className="activity-editor">
    <label className="activity-field">{t(locale, 'prompt')}
      <textarea className="field" rows={3} value={activity.content.prompt} onChange={e => update({ prompt: e.target.value })}/>
    </label>
    <div className="activity-list" ref={node => { moveRoot.current = node; list.rootRef.current = node; }}>
      <h2>{t(locale, 'answerKey')}</h2>
      <p className="muted small">{t(locale, 'orderHint')}</p>
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      {items.map((item, i) => <div className="activity-edit-row" data-row key={item.id}>
        <label className="activity-field">{t(locale, 'item')} {i + 1}
          <input className="field" value={item.text} onChange={e => update({ items: items.map((v, j) => j === i ? { ...v, text: e.target.value } : v) })}/>
        </label>
        <div className="activity-item-tools">
          <button type="button" className="button secondary" disabled={i === 0} data-move={moveKey(item.id, 'up')} onClick={() => move(i, -1)}
            aria-label={t(locale, 'up') + ': ' + t(locale, 'item') + ' ' + (i + 1)}>↑</button>
          <button type="button" className="button secondary" disabled={i === items.length - 1} data-move={moveKey(item.id, 'down')} onClick={() => move(i, 1)}
            aria-label={t(locale, 'down') + ': ' + t(locale, 'item') + ' ' + (i + 1)}>↓</button>
          <button type="button" className="button secondary" disabled={items.length <= 3} aria-label={tf(locale, 'removeRow', { what: t(locale, 'item') + ' ' + (i + 1) })}
            onClick={() => { update({ items: items.filter((_, j) => j !== i) }); list.rowRemoved(); }}>{t(locale, 'remove')}</button>
        </div>
      </div>)}
      <button type="button" className="button secondary" data-add disabled={items.length >= 20}
        onClick={() => { update({ items: [...items, { id: nextId(items.map(v => v.id)), text: '' }] }); list.rowAdded(); }}>{t(locale, 'addStep')}</button>
    </div>
    <details className="activity-ux-disclosure"><summary>{t(locale, 'explanation')}</summary><label className="activity-field">
      <textarea className="field" rows={3} value={activity.content.explanation ?? ''} onChange={e => {
        const content = { ...activity.content };
        if (e.target.value) content.explanation = e.target.value;
        else delete content.explanation;
        onChange({ ...activity, content });
      }}/>
    </label></details>
  </div>;
}
