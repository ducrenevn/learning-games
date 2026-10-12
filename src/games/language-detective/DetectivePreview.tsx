import { t } from '../../shared/activities/i18n';
import type { PreviewProps } from '../../shared/activities/Workspace';
import type { DetectiveActivity } from './model';

/** Read-only Language Detective review: the sentence with its marked words, then each correction and explanation. */
export function DetectivePreview({ activity, locale }: PreviewProps<DetectiveActivity>) {
  const lang = activity.targetLanguage;
  const { prompt, segments, issues, summary } = activity.content;
  const issueOf = new Map(issues.map(issue => [issue.segmentId, issue]));
  return <div className="rb-detective">
    {prompt !== activity.instructions && <p className="readonly-instructions" lang={lang}>{prompt}</p>}
    <div className="rb-sentence">
      <div className="rb-words" lang={lang}>{segments.map(segment => <span key={segment.id} className={'rb-word' + (issueOf.has(segment.id) ? ' marked' : '')}>{segment.text}</span>)}</div>
      {issues.length === 0 && <p className="rb-badge">{t(locale, 'noErrors')}</p>}
      <ul className="rb-fixes">{segments.filter(segment => issueOf.has(segment.id)).map(segment => {
        const issue = issueOf.get(segment.id)!;
        return <li key={segment.id} lang={lang}><strong>{segment.text} → {issue.correction}</strong> <span>{issue.explanation}</span></li>;
      })}</ul>
    </div>
    {summary && <p className="rb-note" lang={lang}>{summary}</p>}
  </div>;
}
