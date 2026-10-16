import { u } from '../../shared/activities/uxCopy';
import type { PreviewProps } from '../../shared/activities/Workspace';
import type { SequenceActivity } from './model';

/** Read-only Sequence list for import review, in solution order. */
export function SequencePreview({ activity, locale }: PreviewProps<SequenceActivity>) {
  const lang = activity.targetLanguage;
  const { prompt, items, explanation } = activity.content;
  return <div className="rb-seq">
    {prompt !== activity.instructions && <p className="readonly-instructions" lang={lang}>{prompt}</p>}
    <p className="muted small">{u(locale, 'correctOrder')}</p>
    <ol className="rb-rows">{items.map(item => <li className="rb-row" key={item.id}><span lang={lang}>{item.text}</span></li>)}</ol>
    {explanation && <p className="rb-note" lang={lang}>{explanation}</p>}
  </div>;
}
