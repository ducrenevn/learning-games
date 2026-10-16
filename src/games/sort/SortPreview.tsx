import { t } from '../../shared/activities/i18n';
import type { PreviewProps } from '../../shared/activities/Workspace';
import type { SortActivity } from './model';

/** Read-only Sort board for import review: each category with the cards that belong in it. */
export function SortPreview({ activity, locale }: PreviewProps<SortActivity>) {
  const lang = activity.targetLanguage;
  const { categories, items } = activity.content;
  return <div className="rb-bins" style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, minmax(0, 1fr))` }}>
    {categories.map(category => {
      const cards = items.filter(item => item.categoryId === category.id);
      return <section className="rb-bin" key={category.id} aria-label={category.label}>
        <header><h4 lang={lang}>{category.label}</h4><span className="rb-count">{cards.length}</span></header>
        <ul>{cards.map(card => <li className="rb-chip" key={card.id} lang={lang}>{card.text}</li>)}</ul>
        {cards.length === 0 && <p className="muted small">{t(locale, 'unplaced')}</p>}
      </section>;
    })}
  </div>;
}
