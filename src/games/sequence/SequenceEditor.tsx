import { t } from '../../shared/activities/i18n';
import type { EditorProps } from '../../shared/activities/Workspace';
import { moveSequence } from './engine';
import type { SequenceActivity } from './model';

function nextId(ids: string[]) { let n = 1; while (ids.includes('step-' + n)) n++; return 'step-' + n; }
export function SequenceEditor({ activity, onChange, locale }: EditorProps<SequenceActivity>) {
  const { items } = activity.content;
  const update = (content: Partial<SequenceActivity['content']>) => onChange({ ...activity, content: { ...activity.content, ...content } });
  return <div className="activity-editor">
    <label className="activity-field">{t(locale, 'prompt')}
      <textarea className="field" rows={3} value={activity.content.prompt} onChange={e => update({ prompt: e.target.value })}/>
    </label>
    <h2>{t(locale, 'answerKey')}</h2>
    <p className="muted small">{t(locale, 'exact')}</p>
    {items.map((item, i) => <div className="activity-edit-row" key={item.id}>
      <label className="activity-field">{t(locale, 'item')} {i + 1}
        <input className="field" value={item.text} onChange={e => update({ items: items.map((v, j) => j === i ? { ...v, text: e.target.value } : v) })}/>
      </label>
      <div className="activity-item-tools">
        <button type="button" className="button secondary" disabled={i === 0} onClick={() => {
          const order = moveSequence(items.map(v => v.id), i, -1);
          update({ items: order.map(id => items.find(v => v.id === id)!) });
        }} aria-label={t(locale, 'up') + ' ' + (i + 1)}>↑</button>
        <button type="button" className="button secondary" disabled={i === items.length - 1} onClick={() => {
          const order = moveSequence(items.map(v => v.id), i, 1);
          update({ items: order.map(id => items.find(v => v.id === id)!) });
        }} aria-label={t(locale, 'down') + ' ' + (i + 1)}>↓</button>
        <button type="button" className="button secondary" disabled={items.length <= 3} onClick={() => update({ items: items.filter((_, j) => j !== i) })}>{t(locale, 'remove')}</button>
      </div>
    </div>)}
    <button className="button secondary" disabled={items.length >= 20} onClick={() => update({ items: [...items, { id: nextId(items.map(v => v.id)), text: '' }] })}>{t(locale, 'addItem')}</button>
    <label className="activity-field">{t(locale, 'explanation')}
      <textarea className="field" rows={3} value={activity.content.explanation ?? ''} onChange={e => {
        const content = { ...activity.content };
        if (e.target.value) content.explanation = e.target.value;
        else delete content.explanation;
        onChange({ ...activity, content });
      }}/>
    </label>
  </div>;
}
