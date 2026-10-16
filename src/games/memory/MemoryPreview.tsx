import { u } from '../../shared/activities/uxCopy';
import type { PreviewProps } from '../../shared/activities/Workspace';
import type { MemoryActivity } from './activity';

const SHOWN = 6;
/** Read-only Memory pairs for import review: the first few, then a count of the rest. */
export function MemoryPreview({ activity, locale }: PreviewProps<MemoryActivity>) {
  const lang = activity.targetLanguage;
  const pairs = activity.content.pairs;
  return <div className="rb-pairs">
    <ul>{pairs.slice(0, SHOWN).map(pair => <li className="rb-pair" key={pair.id}>
      <span lang={lang}>{pair.left}</span><i aria-hidden="true">↔</i><span lang={lang}>{pair.right}</span>
      {pair.category && <em lang={lang}>{pair.category}</em>}
    </li>)}</ul>
    {pairs.length > SHOWN && <p className="muted small">{u(locale, 'moreItems', { n: pairs.length - SHOWN })}</p>}
  </div>;
}
