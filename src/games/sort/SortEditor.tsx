import { t } from '../../shared/activities/i18n';
import type { EditorProps } from '../../shared/activities/Workspace';
import type { SortActivity } from './model';

function nextId(prefix: string, used: string[]) {
  let i = 1;
  while (used.includes(prefix + '-' + i)) i++;
  return prefix + '-' + i;
}
export function SortEditor({ activity, onChange, locale }: EditorProps<SortActivity>) {
  const { categories, items } = activity.content;
  const update = (part: Partial<SortActivity['content']>) => onChange({ ...activity, content: { ...activity.content, ...part } });
  return <div className="activity-editor">
    <h2>{t(locale, 'category')}</h2>
    {categories.map((category, i) => <div className="activity-edit-row" key={category.id}>
      <label className="activity-field">{t(locale, 'label')} {i + 1}
        <input className="field" value={category.label} onChange={e => update({ categories: categories.map((c, j) => j === i ? { ...c, label: e.target.value } : c) })}/>
      </label>
      <button type="button" className="button secondary" aria-label={t(locale, 'remove') + ' ' + (i + 1)} disabled={categories.length <= 2} onClick={() => update({ categories: categories.filter((_, j) => i !== j) })}>{t(locale, 'remove')}</button>
    </div>)}
    <button className="button secondary" disabled={categories.length >= 5} onClick={() => update({ categories: [...categories, { id: nextId('category', categories.map(c => c.id)), label: '' }] })}>{t(locale, 'addCategory')}</button>
    <h2>{t(locale, 'card')}</h2>
    {items.map((item, i) => <div className="activity-edit-row" key={item.id}>
      <label className="activity-field">{t(locale, 'card')} {i + 1}
        <input className="field" value={item.text} onChange={e => update({ items: items.map((v, j) => j === i ? { ...v, text: e.target.value } : v) })}/>
      </label>
      <label className="activity-field">{t(locale, 'answer')}
        <select className="field" value={item.categoryId} onChange={e => update({ items: items.map((v, j) => j === i ? { ...v, categoryId: e.target.value } : v) })}>
          {!categories.some(c => c.id === item.categoryId) && <option value={item.categoryId}>⚠ {item.categoryId}</option>}
          {categories.map(c => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
        </select>
      </label>
      <label className="activity-field">{t(locale, 'explanation')}
        <input className="field" value={item.explanation ?? ''} onChange={e => update({ items: items.map((v, j) => {
          if (j !== i) return v;
          const copy = { ...v };
          if (e.target.value) copy.explanation = e.target.value;
          else delete copy.explanation;
          return copy;
        }) })}/>
      </label>
      <button className="button secondary" disabled={items.length <= 4} onClick={() => update({ items: items.filter((_, j) => i !== j) })}>{t(locale, 'remove')}</button>
    </div>)}
    <button className="button secondary" disabled={items.length >= 30} onClick={() => update({ items: [...items, { id: nextId('card', items.map(i => i.id)), text: '', categoryId: categories[0]?.id ?? '' }] })}>{t(locale, 'addItem')}</button>
  </div>;
}
