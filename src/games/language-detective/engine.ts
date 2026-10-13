import type { DetectiveIssue, Segment } from './model';
/** Anything with segments and issues: a v1 activity (`content`), or one v2 task. */
type Scorable = { content: { segments: readonly Segment[]; issues: readonly DetectiveIssue[] } } | { segments: readonly Segment[]; issues: readonly DetectiveIssue[] };
/**
 * Scores ONLY which segments were flagged against the teacher's issue list. Typed corrections are deliberately not an
 * input: free text is compared by a human at review, never judged by the program. In a multi-sentence activity it is
 * called once per task, with that task's own "no errors" choice.
 */
export function scoreDetective(source: Scorable, selected: ReadonlySet<string>, noErrors: boolean) {
  const { segments, issues } = 'content' in source ? source.content : source;
  const answer = new Set(issues.map(i => i.segmentId));
  const valid = new Set(segments.map(s => s.id));
  const hits = [...answer].filter(id => selected.has(id));
  const extra = [...selected].filter(id => valid.has(id) && !answer.has(id));
  const missed = [...answer].filter(id => !selected.has(id));
  const solved = extra.length === 0 && missed.length === 0 && (answer.size > 0 ? !noErrors : noErrors && selected.size === 0);
  return { correct: hits.length, hits, total: answer.size, extra, missed, solved };
}
