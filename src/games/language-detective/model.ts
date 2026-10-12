import { arrayField, distinct, envelope, optionalText, record, slugField, textField, type ActivityBase, type Issue, type Result } from '../../shared/activities/contract';
export interface Segment { id: string; text: string }
export interface DetectiveIssue { segmentId: string; correction: string; explanation: string }
export interface DetectiveContent { prompt: string; segments: Segment[]; issues: DetectiveIssue[]; summary?: string }
export type DetectiveActivity = ActivityBase<'language-detective', DetectiveContent>;
export function makeBlankDetective(): DetectiveActivity {
  return { format: 'learning-games.activity', schemaVersion: 1, activityType: 'language-detective',
    id: 'new-detective-activity', title: 'Language Detective', targetLanguage: 'de',
    instructions: 'Markiere Fehler und vergleiche die Korrekturen.',
    content: { prompt: '', segments: Array.from({ length: 4 }, (_, i) => ({ id: 'segment-' + (i + 1), text: '' })), issues: [] } };
}
export function validateDetective(raw: unknown): Result<DetectiveActivity> {
  const issues: Issue[] = [];
  if (!envelope(raw, 'language-detective', issues)) return { issues };
  if (!record(raw.content, 'content', ['prompt', 'segments', 'issues', 'summary'], issues)) return { issues };
  const content = raw.content;
  textField(content, 'prompt', 'content', 1, 1000, issues);
  optionalText(content, 'summary', 'content', 1000, issues);
  const segments = arrayField(content, 'segments', 'content', 4, 80, issues);
  segments.forEach((segment, i) => {
    const path = 'content.segments[' + i + ']';
    if (record(segment, path, ['id', 'text'], issues)) {
      slugField(segment, 'id', path, issues); textField(segment, 'text', path, 1, 160, issues);
    }
  });
  distinct(segments, 'id', 'content.segments', issues);
  const found = arrayField(content, 'issues', 'content', 0, 12, issues);
  found.forEach((issue, i) => {
    const path = 'content.issues[' + i + ']';
    if (!record(issue, path, ['segmentId', 'correction', 'explanation'], issues)) return;
    slugField(issue, 'segmentId', path, issues);
    textField(issue, 'correction', path, 1, 300, issues);
    textField(issue, 'explanation', path, 1, 1000, issues);
    if (!segments.some(segment => segment !== null && typeof segment === 'object' && (segment as Segment).id === issue.segmentId)) {
      issues.push({ path: path + '.segmentId', code: 'reference' });
    }
  });
  distinct(found, 'segmentId', 'content.issues', issues);
  return issues.length ? { issues } : { value: raw as unknown as DetectiveActivity, issues };
}
