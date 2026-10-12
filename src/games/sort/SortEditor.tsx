import { t, tf } from '../../shared/activities/i18n';
import { useListFocus } from '../../shared/activities/focus';
import type { EditorProps } from '../../shared/activities/Workspace';
import type { SortActivity } from './model';

function nextId(prefix: string, used: string[]) {
  let i = 1;
  while (used.includes(prefix + '-' + i)) i++;
  return prefix + '-' + i;
}
export function SortEditor({ activity, onChange, locale, section }: EditorProps<SortActivity>) {
  const { categories, items } = activity.content;
  const categoryList = useListFocus<HTMLDivElement>(), cardList = useListFocus<HTMLDivElement>();
  const update = (part: Partial<SortActivity['content']>) => onChange({ ...activity, content: { ...activity.content, ...part } });
  // Screen-reader-only row context so repeated fields ("Answer", "Remove") are distinguishable.
  const rowOf = (n: number) => <span className="sr-only"> ({t(locale, 'card')} {n + 1})</span>;
  return <div className="activity-editor">
    {(!section || section === 'categories') && <div className="activity-list activity-ux-row-list" ref={categoryList.rootRef}>
      <h2>{t(locale, 'category')}</h2>
      {categories.map((category, i) => <div className="activity-edit-row" data-row key={category.id}>
        <label className="activity-field">{t(locale, 'label')} {i + 1}
          <input className="field" value={category.label} onChange={e => update({ categories: categories.map((c, j) => j === i ? { ...c, label: e.target.value } : c) })}/>
        </label>
        <button type="button" className="button secondary" aria-label={tf(locale, 'removeRow', { what: t(locale, 'category') + ' ' + (i + 1) })} disabled={categories.length <= 2}
          onClick={() => { update({ categories: categories.filter((_, j) => i !== j) }); categoryList.rowRemoved(); }}>{t(locale, 'remove')}</button>
      </div>)}
      <button type="button" className="button secondary" data-add disabled={categories.length >= 5}
        onClick={() => { update({ categories: [...categories, { id: nextId('category', categories.map(c => c.id)), label: '' }] }); categoryList.rowAdded(); }}>{t(locale, 'addCategory')}</button>
    </div>}
    {(!section || section === 'cards') && <div className="activity-list activity-ux-row-list" ref={cardList.rootRef}>
      <h2>{t(locale, 'card')}</h2>
      {items.map((item, i) => <div className="activity-edit-row" data-row key={item.id}>
        <label className="activity-field">{t(locale, 'card')} {i + 1}
          <input className="field" value={item.text} onChange={e => update({ items: items.map((v, j) => j === i ? { ...v, text: e.target.value } : v) })}/>
        </label>
        <label className="activity-field">{t(locale, 'answer')}{rowOf(i)}
          <select className="field" value={item.categoryId} aria-invalid={!categories.some(c => c.id === item.categoryId)}
            onChange={e => update({ items: items.map((v, j) => j === i ? { ...v, categoryId: e.target.value } : v) })}>
            {!categories.some(c => c.id === item.categoryId) && <option value={item.categoryId}>⚠ {item.categoryId}</option>}
            {categories.map(c => <option key={c.id} value={c.id}>{c.label || c.id}</option>)}
          </select>
        </label>
        <details className="activity-ux-optional"><summary>{t(locale, 'explanation')}{rowOf(i)}</summary><label className="activity-field">
          <input className="field" value={item.explanation ?? ''} onChange={e => update({ items: items.map((v, j) => {
            if (j !== i) return v;
            const copy = { ...v };
            if (e.target.value) copy.explanation = e.target.value;
            else delete copy.explanation;
            return copy;
          }) })}/>
        </label></details>
        <button type="button" className="button secondary" aria-label={tf(locale, 'removeRow', { what: t(locale, 'card') + ' ' + (i + 1) })} disabled={items.length <= 4}
          onClick={() => { update({ items: items.filter((_, j) => i !== j) }); cardList.rowRemoved(); }}>{t(locale, 'remove')}</button>
      </div>)}
      <button type="button" className="button secondary" data-add disabled={items.length >= 30}
        onClick={() => { update({ items: [...items, { id: nextId('card', items.map(v => v.id)), text: '', categoryId: categories[0]?.id ?? '' }] }); cardList.rowAdded(); }}>{t(locale, 'addItem')}</button>
    </div>}
  </div>;
}
