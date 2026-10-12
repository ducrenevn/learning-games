import { useState } from 'react';
import { t, tf } from '../../shared/activities/i18n';
import { moveKey, useListFocus, useMoveFocus } from '../../shared/activities/focus';
import type { EditorProps } from '../../shared/activities/Workspace';
import type { DetectiveActivity } from './model';

const MAX_ISSUES = 12;
function nextId(ids: string[]) { let n = 1; while (ids.includes('segment-' + n)) n++; return 'segment-' + n; }
export function DetectiveEditor({ activity, onChange, locale }: EditorProps<DetectiveActivity>) {
  const { segments, issues } = activity.content;
  const [notice, setNotice] = useState('');
  const { rootRef: moveRoot, keepFocus } = useMoveFocus<HTMLDivElement>();
  const list = useListFocus<HTMLDivElement>();
  const update = (change: Partial<DetectiveActivity['content']>) => onChange({ ...activity, content: { ...activity.content, ...change } });
  function issueChange(id: string, field: 'correction' | 'explanation', value: string) {
    update({ issues: issues.map(i => i.segmentId === id ? { ...i, [field]: value } : i) });
  }
  function move(i: number, direction: -1 | 1) {
    const copy = [...segments];
    [copy[i], copy[i + direction]] = [copy[i + direction], copy[i]];
    update({ segments: copy });
    setNotice(tf(locale, 'announceMoved', { card: segments[i].text || t(locale, 'segment') + ' ' + (i + 1), pos: i + direction + 1, total: segments.length }));
    keepFocus(segments[i].id, direction === -1 ? 'up' : 'down');
  }
  // Screen-reader-only row context so repeated fields ("Issue", "Model correction") are distinguishable.
  const rowOf = (n: number) => <span className="sr-only"> ({t(locale, 'segment')} {n + 1})</span>;
  return <div className="activity-editor">
    <label className="activity-field">{t(locale, 'prompt')}
      <textarea className="field" rows={3} value={activity.content.prompt} onChange={e => update({ prompt: e.target.value })}/>
    </label>
    <div className="activity-list" ref={node => { moveRoot.current = node; list.rootRef.current = node; }}>
      <h2>{t(locale, 'passage')}</h2>
      {issues.length >= MAX_ISSUES && <p className="muted small">{t(locale, 'maxIssues')}</p>}
      <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      {segments.map((segment, i) => {
        const issue = issues.find(v => v.segmentId === segment.id);
        return <div className="activity-edit-row" data-row key={segment.id}>
          <label className="activity-field">{t(locale, 'segment')} {i + 1}
            <input className="field" value={segment.text} onChange={e => update({ segments: segments.map((v, j) => j === i ? { ...v, text: e.target.value } : v) })}/>
          </label>
          <div className="activity-item-tools">
            <button type="button" className="button secondary" disabled={i === 0} data-move={moveKey(segment.id, 'up')} onClick={() => move(i, -1)}
              aria-label={t(locale, 'up') + ': ' + t(locale, 'segment') + ' ' + (i + 1)}>↑</button>
            <button type="button" className="button secondary" disabled={i === segments.length - 1} data-move={moveKey(segment.id, 'down')} onClick={() => move(i, 1)}
              aria-label={t(locale, 'down') + ': ' + t(locale, 'segment') + ' ' + (i + 1)}>↓</button>
            <button type="button" className="button secondary" disabled={segments.length <= 4} aria-label={tf(locale, 'removeRow', { what: t(locale, 'segment') + ' ' + (i + 1) })}
              onClick={() => { update({ segments: segments.filter((_, j) => i !== j), issues: issues.filter(v => v.segmentId !== segment.id) }); list.rowRemoved(); }}>{t(locale, 'remove')}</button>
          </div>
          <label className="activity-issue-toggle"><input type="checkbox" checked={!!issue} disabled={!issue && issues.length >= MAX_ISSUES}
            onChange={e => update({ issues: e.target.checked ? [...issues, { segmentId: segment.id, correction: '', explanation: '' }] : issues.filter(v => v.segmentId !== segment.id) })}/> {t(locale, 'issue')}{rowOf(i)}</label>
          {issue && <>
            <label className="activity-field">{t(locale, 'correction')}{rowOf(i)}
              <input className="field" value={issue.correction} onChange={e => issueChange(segment.id, 'correction', e.target.value)}/>
            </label>
            <label className="activity-field">{t(locale, 'issueExplanation')}{rowOf(i)}
              <textarea className="field" rows={2} value={issue.explanation} onChange={e => issueChange(segment.id, 'explanation', e.target.value)}/>
            </label>
          </>}
        </div>;
      })}
      <button type="button" className="button secondary" data-add disabled={segments.length >= 80}
        onClick={() => { update({ segments: [...segments, { id: nextId(segments.map(v => v.id)), text: '' }] }); list.rowAdded(); }}>{t(locale, 'addSegment')}</button>
    </div>
    <label className="activity-field">{t(locale, 'summary')}
      <textarea className="field" rows={2} value={activity.content.summary ?? ''} onChange={e => {
        const next = { ...activity.content };
        if (e.target.value) next.summary = e.target.value; else delete next.summary;
        onChange({ ...activity, content: next });
      }}/>
    </label>
  </div>;
}
