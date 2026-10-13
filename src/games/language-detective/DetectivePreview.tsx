import { t } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import type { PreviewProps } from '../../shared/activities/Workspace';
import type { DetectiveDraft } from './draft';

/**
 * Read-only Language Detective review: every sentence with its marked words, corrections and explanations. This is the
 * teacher's own screen, so the model answers are shown on purpose: the wrong word in copper, the correct replacement in green.
 */
export function DetectivePreview({ activity, locale }: PreviewProps<DetectiveDraft>) {
  const lang = activity.targetLanguage;
  const { prompt, tasks, summary } = activity.content;
  return <div className="rb-detective">
    {prompt !== activity.instructions && <p className="readonly-instructions" lang={lang}>{prompt}</p>}
    {tasks.map((task, index) => {
      const issueOf = new Map(task.issues.map(issue => [issue.segmentId, issue]));
      return <div className="rb-sentence" key={task.id}>
        {tasks.length > 1 && <b className="rb-sentence-no">{u(locale, 'sentenceNo', { n: index + 1 })}</b>}
        <div className="rb-words" lang={lang}>{task.segments.map(segment => <span key={segment.id} className={'rb-word' + (issueOf.has(segment.id) ? ' marked' : '')}>{segment.text}</span>)}</div>
        {task.issues.length === 0 && <p className="rb-badge">{t(locale, 'noErrors')}</p>}
        <ul className="rb-fixes">{task.segments.filter(segment => issueOf.has(segment.id)).map(segment => {
          const issue = issueOf.get(segment.id)!;
          return <li key={segment.id} lang={lang}><strong>{segment.text}</strong> → <span className="rb-fix-correct">{issue.correction}</span> <span>{issue.explanation}</span></li>;
        })}</ul>
      </div>;
    })}
    {summary && <p className="rb-note" lang={lang}>{summary}</p>}
  </div>;
}
