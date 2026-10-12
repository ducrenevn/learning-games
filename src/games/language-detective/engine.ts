import type { DetectiveActivity } from './model';
/**
 * Scores ONLY which segments were flagged against the teacher's issue list. Typed corrections are deliberately not an
 * input: free text is compared by a human at review, never judged by the program.
 */
export function scoreDetective(activity: DetectiveActivity, selected: ReadonlySet<string>, noErrors: boolean) {
  const answer = new Set(activity.content.issues.map(i => i.segmentId));
  const valid = new Set(activity.content.segments.map(s => s.id));
  const hits = [...answer].filter(id => selected.has(id));
  const extra = [...selected].filter(id => valid.has(id) && !answer.has(id));
  const missed = [...answer].filter(id => !selected.has(id));
  const solved = extra.length === 0 && missed.length === 0 && (answer.size > 0 ? !noErrors : noErrors && selected.size === 0);
  return { correct: hits.length, hits, total: answer.size, extra, missed, solved };
}
