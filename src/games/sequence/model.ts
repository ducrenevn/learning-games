import { arrayField, distinct, envelope, optionalText, record, slugField, textField, type ActivityBase, type Issue, type Result } from '../../shared/activities/contract';
export interface SequenceItem { id: string; text: string }
export interface SequenceContent { prompt: string; items: SequenceItem[]; explanation?: string }
export type SequenceActivity = ActivityBase<'sequence', SequenceContent>;

export function makeBlankSequence(): SequenceActivity {
  return {
    format: 'learning-games.activity', schemaVersion: 1, activityType: 'sequence',
    id: 'new-sequence-activity', title: 'Sequence', targetLanguage: 'de',
    instructions: 'Ordne die Schritte in die richtige Reihenfolge.',
    content: { prompt: '', items: Array.from({ length: 3 }, (_, i) => ({ id: 'step-' + (i + 1), text: '' })) }
  };
}
export function validateSequence(raw: unknown): Result<SequenceActivity> {
  const issues: Issue[] = [];
  if (!envelope(raw, 'sequence', issues)) return { issues };
  if (!record(raw.content, 'content', ['prompt', 'items', 'explanation'], issues)) return { issues };
  const content = raw.content;
  textField(content, 'prompt', 'content', 1, 1000, issues);
  optionalText(content, 'explanation', 'content', 1000, issues);
  const items = arrayField(content, 'items', 'content', 3, 20, issues);
  items.forEach((item, i) => {
    const path = 'content.items[' + i + ']';
    if (record(item, path, ['id', 'text'], issues)) {
      slugField(item, 'id', path, issues);
      textField(item, 'text', path, 1, 240, issues);
    }
  });
  distinct(items, 'id', 'content.items', issues);
  distinct(items, 'text', 'content.items', issues, true);
  return issues.length ? { issues } : { issues, value: raw as unknown as SequenceActivity };
}
