import type { Issue, Result } from '../../shared/activities/contract';
import { V1_LIMITS, validateDetective, type DetectiveActivity, type DetectiveActivityV2, type DetectiveFile, type DetectiveTask } from './model';

/**
 * The editor and player always work on stacked sentence tasks. A v1 file opens as one task; export writes the lowest
 * version that can represent the activity (DETECTIVE_V2_CONTRACT.md §6). All three functions are pure.
 */
export type DetectiveDraft = DetectiveActivityV2;

export function makeBlankDraft(): DetectiveDraft {
  return { format: 'learning-games.activity', schemaVersion: 2, activityType: 'language-detective',
    id: 'new-detective-activity', title: 'Language Detective', targetLanguage: 'de',
    instructions: 'Markiere Fehler und vergleiche die Korrekturen.',
    content: { prompt: '', tasks: [{ id: 'task-1', segments: [], issues: [] }] } };
}

/** v1 file -> one task; v2 file -> as is. Key order is canonical so a re-export is byte-stable. */
export function toDraft(file: DetectiveFile): DetectiveDraft {
  const base = { format: file.format, schemaVersion: 2 as const, activityType: file.activityType, id: file.id, title: file.title, targetLanguage: file.targetLanguage, instructions: file.instructions };
  if (file.schemaVersion === 2) return structuredClone({ ...base, content: file.content });
  const { prompt, segments, issues, summary } = file.content;
  return structuredClone({ ...base, content: { prompt, tasks: [{ id: 'task-1', segments, issues }], ...(summary !== undefined ? { summary } : {}) } });
}

/** v1 can hold exactly one task of 4–80 words with at most 12 marked errors. */
export function fitsV1(draft: DetectiveDraft): boolean {
  const tasks = draft.content.tasks;
  if (tasks.length !== 1) return false;
  const { segments, issues } = tasks[0];
  return segments.length >= V1_LIMITS.segments.min && segments.length <= V1_LIMITS.segments.max && issues.length <= V1_LIMITS.issues;
}

export function fromDraft(draft: DetectiveDraft): DetectiveFile {
  const head = { format: draft.format, activityType: draft.activityType, id: draft.id, title: draft.title, targetLanguage: draft.targetLanguage, instructions: draft.instructions };
  const { prompt, tasks, summary } = draft.content;
  const tail = summary !== undefined ? { summary } : {};
  if (fitsV1(draft)) {
    const v1: DetectiveActivity = { format: head.format, schemaVersion: 1, activityType: head.activityType, id: head.id, title: head.title, targetLanguage: head.targetLanguage, instructions: head.instructions,
      content: { prompt, segments: tasks[0].segments, issues: tasks[0].issues, ...tail } };
    return v1;
  }
  return { format: head.format, schemaVersion: 2, activityType: head.activityType, id: head.id, title: head.title, targetLanguage: head.targetLanguage, instructions: head.instructions,
    content: { prompt, tasks, ...tail } };
}

/** Issue paths of a v1 file refer to the flat form; the editor's fields are addressed through the task. */
function draftPath(path: string) { return path.replace(/^content\.(segments|issues)\b/, 'content.tasks[0].$1'); }

/** A draft is valid exactly when the file it would export is valid. */
export function validateDraft(raw: unknown): Result<DetectiveDraft> {
  const draft = raw as DetectiveDraft;
  const file = fromDraft(draft);
  const checked = validateDetective(file);
  if (checked.issues.length || !checked.value) {
    const v1 = file.schemaVersion === 1;
    const issues: Issue[] = checked.issues.map(issue => v1 ? { ...issue, path: draftPath(issue.path) } : issue);
    return { issues };
  }
  return { value: draft, issues: [] };
}

export const taskById = (draft: DetectiveDraft, id: string): DetectiveTask | undefined => draft.content.tasks.find(task => task.id === id);
