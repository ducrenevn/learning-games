import { arrayField, distinct, envelope, optionalText, record, slugField, textField, type ActivityBase, type Issue, type Result } from '../../shared/activities/contract';
export interface Segment { id: string; text: string }
export interface DetectiveIssue { segmentId: string; correction: string; explanation: string }

/** v1 file content: one flat word stream. Frozen — see docs/architecture/DETECTIVE_V2_CONTRACT.md. */
export interface DetectiveContent { prompt: string; segments: Segment[]; issues: DetectiveIssue[]; summary?: string }
export type DetectiveActivity = ActivityBase<'language-detective', DetectiveContent>;

/** v2 file content: stacked sentence tasks, each marked and scored on its own. */
export interface DetectiveTask { id: string; segments: Segment[]; issues: DetectiveIssue[] }
export interface DetectiveContentV2 { prompt: string; tasks: DetectiveTask[]; summary?: string }
export type DetectiveActivityV2 = ActivityBase<'language-detective', DetectiveContentV2, 2>;
export type DetectiveFile = DetectiveActivity | DetectiveActivityV2;

/**
 * v2 limits. PROVISIONAL educational/product choices awaiting owner confirmation (DETECTIVE_V2_CONTRACT.md §5):
 * one place, so changing a number is a one-line edit plus a fixture.
 */
export const LIMITS = {
  tasks: { min: 1, max: 10 },
  segmentsPerTask: { min: 2, max: 40 },
  totalSegments: 200,
  issuesPerTask: 12,
  totalIssues: 30,
} as const;
/** v1 limits, unchanged. */
export const V1_LIMITS = { segments: { min: 4, max: 80 }, issues: 12 } as const;

export function makeBlankDetective(): DetectiveActivity {
  return { format: 'learning-games.activity', schemaVersion: 1, activityType: 'language-detective',
    id: 'new-detective-activity', title: 'Language Detective', targetLanguage: 'de',
    instructions: 'Markiere Fehler und vergleiche die Korrekturen.',
    content: { prompt: '', segments: Array.from({ length: 4 }, (_, i) => ({ id: 'segment-' + (i + 1), text: '' })), issues: [] } };
}

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasSegment = (segments: unknown[], id: unknown) => segments.some(segment => isObject(segment) && segment.id === id);

/** Segments and issues shared by v1 (flat) and v2 (per task); `where` is the object that holds them. */
function validateSegmentsAndIssues(holder: Record<string, unknown>, path: string, limits: { min: number; max: number; issues: number }, issues: Issue[]) {
  const segments = arrayField(holder, 'segments', path, limits.min, limits.max, issues);
  segments.forEach((segment, i) => {
    const at = path + '.segments[' + i + ']';
    if (record(segment, at, ['id', 'text'], issues)) {
      slugField(segment, 'id', at, issues); textField(segment, 'text', at, 1, 160, issues);
    }
  });
  distinct(segments, 'id', path + '.segments', issues);
  const found = arrayField(holder, 'issues', path, 0, limits.issues, issues);
  found.forEach((issue, i) => {
    const at = path + '.issues[' + i + ']';
    if (!record(issue, at, ['segmentId', 'correction', 'explanation'], issues)) return;
    slugField(issue, 'segmentId', at, issues);
    textField(issue, 'correction', at, 1, 300, issues);
    textField(issue, 'explanation', at, 1, 1000, issues);
    if (!hasSegment(segments, issue.segmentId)) issues.push({ path: at + '.segmentId', code: 'reference' });
  });
  distinct(found, 'segmentId', path + '.issues', issues);
  return { segments, found };
}

function validateV1(raw: unknown): Result<DetectiveActivity> {
  const issues: Issue[] = [];
  if (!envelope(raw, 'language-detective', issues)) return { issues };
  if (!record(raw.content, 'content', ['prompt', 'segments', 'issues', 'summary'], issues)) return { issues };
  const content = raw.content;
  textField(content, 'prompt', 'content', 1, 1000, issues);
  optionalText(content, 'summary', 'content', 1000, issues);
  validateSegmentsAndIssues(content, 'content', { min: V1_LIMITS.segments.min, max: V1_LIMITS.segments.max, issues: V1_LIMITS.issues }, issues);
  return issues.length ? { issues } : { value: raw as unknown as DetectiveActivity, issues };
}

function validateV2(raw: unknown): Result<DetectiveActivityV2> {
  const issues: Issue[] = [];
  if (!envelope(raw, 'language-detective', issues, [2])) return { issues };
  if (!record(raw.content, 'content', ['prompt', 'tasks', 'summary'], issues)) return { issues };
  const content = raw.content;
  textField(content, 'prompt', 'content', 1, 1000, issues);
  optionalText(content, 'summary', 'content', 1000, issues);
  const tasks = arrayField(content, 'tasks', 'content', LIMITS.tasks.min, LIMITS.tasks.max, issues);
  let words = 0, marked = 0;
  tasks.forEach((task, i) => {
    const path = 'content.tasks[' + i + ']';
    if (!record(task, path, ['id', 'segments', 'issues'], issues)) return;
    slugField(task, 'id', path, issues);
    const { segments, found } = validateSegmentsAndIssues(task, path, { min: LIMITS.segmentsPerTask.min, max: LIMITS.segmentsPerTask.max, issues: LIMITS.issuesPerTask }, issues);
    words += segments.length; marked += found.length;
  });
  distinct(tasks, 'id', 'content.tasks', issues);
  if (words > LIMITS.totalSegments || marked > LIMITS.totalIssues) issues.push({ path: 'content.tasks', code: 'count' });
  return issues.length ? { issues } : { value: raw as unknown as DetectiveActivityV2, issues };
}

/**
 * File validator. `schemaVersion: 2` is validated as stacked tasks; everything else (including an unsupported version such
 * as 3) goes through the unchanged v1 rules, so every v1 result and issue path is exactly what it was.
 */
export function validateDetective(raw: unknown): Result<DetectiveFile> {
  return isObject(raw) && raw.schemaVersion === 2 ? validateV2(raw) : validateV1(raw);
}
