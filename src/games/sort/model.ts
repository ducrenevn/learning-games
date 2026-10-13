import { arrayField, distinct, envelope, optionalText, record, slugField, textField, type ActivityBase, type Issue, type Result } from '../../shared/activities/contract';

export interface SortCategory { id: string; label: string }
export interface SortItem { id: string; text: string; categoryId: string; explanation?: string }
export interface SortContent { categories: SortCategory[]; items: SortItem[] }
export type SortActivity = ActivityBase<'sort', SortContent>;
export function makeBlankSort(): SortActivity {
  return {
    format: 'learning-games.activity', schemaVersion: 1, activityType: 'sort',
    id: 'new-sort-activity', title: 'Sort', targetLanguage: 'de', instructions: 'Ordne die Karten den passenden Kategorien zu.',
    content: { categories: [{ id: 'category-1', label: '' }, { id: 'category-2', label: '' }],
      items: Array.from({ length: 4 }, (_, i) => ({ id: 'card-' + (i + 1), text: '', categoryId: i < 2 ? 'category-1' : 'category-2' })) }
  };
}
export function validateSort(raw: unknown): Result<SortActivity> {
  const issues: Issue[] = [];
  if (!envelope(raw, 'sort', issues)) return { issues };
  if (!record(raw.content, 'content', ['categories', 'items'], issues)) return { issues };
  const content = raw.content;
  const categories = arrayField(content, 'categories', 'content', 2, 5, issues);
  const items = arrayField(content, 'items', 'content', 4, 30, issues);
  categories.forEach((cat, i) => {
    const path = 'content.categories[' + i + ']';
    if (record(cat, path, ['id', 'label'], issues)) {
      slugField(cat, 'id', path, issues);
      textField(cat, 'label', path, 1, 80, issues);
    }
  });
  items.forEach((item, i) => {
    const path = 'content.items[' + i + ']';
    if (record(item, path, ['id', 'text', 'categoryId', 'explanation'], issues)) {
      slugField(item, 'id', path, issues);
      textField(item, 'text', path, 1, 240, issues);
      slugField(item, 'categoryId', path, issues);
      optionalText(item, 'explanation', path, 1000, issues);
      if (!categories.some(cat => cat !== null && typeof cat === 'object' && (cat as SortCategory).id === item.categoryId)) {
        issues.push({ path: path + '.categoryId', code: 'reference' });
      }
    }
  });
  distinct(categories, 'id', 'content.categories', issues);
  distinct(categories, 'label', 'content.categories', issues, true);
  distinct(items, 'id', 'content.items', issues);
  distinct(items, 'text', 'content.items', issues, true);
  return issues.length ? { issues } : { issues, value: raw as unknown as SortActivity };
}
