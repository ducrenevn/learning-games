import type { DetectiveActivity } from './model';
export function scoreDetective(activity: DetectiveActivity, selected: ReadonlySet<string>, noErrors: boolean) {
  const answer = new Set(activity.content.issues.map(i => i.segmentId));
  const valid = new Set(activity.content.segments.map(s => s.id));
  const correct = [...selected].filter(id => valid.has(id) && answer.has(id)).length;
  const extra = [...selected].filter(id => valid.has(id) && !answer.has(id));
  const missed = [...answer].filter(id => !selected.has(id));
  const solved = extra.length === 0 && missed.length === 0 && (answer.size > 0 ? !noErrors : noErrors && selected.size === 0);
  return { correct, total: answer.size, extra, missed, solved };
}
