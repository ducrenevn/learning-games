import { t } from '../../shared/activities/i18n';
import type { EditorProps } from '../../shared/activities/Workspace';
import type { DetectiveActivity } from './model';
function nextId(ids: string[]) { let n = 1; while (ids.includes('segment-' + n)) n++; return 'segment-' + n; }
export function DetectiveEditor({ activity, onChange, locale }: EditorProps<DetectiveActivity>) {
  const { segments, issues } = activity.content;
  const update = (change: Partial<DetectiveActivity['content']>) => onChange({ ...activity, content: { ...activity.content, ...change } });
  function issueChange(id: string, field: 'correction' | 'explanation', value: string) {
    update({ issues: issues.map(i => i.segmentId === id ? { ...i, [field]: value } : i) });
  }
  return <div className="activity-editor">
    <label className="activity-field">{t(locale, 'prompt')}
      <textarea className="field" rows={3} value={activity.content.prompt} onChange={e => update({ prompt: e.target.value })}/>
    </label>
    <h2>{t(locale, 'passage')}</h2>
    {segments.map((segment, i) => {
      const issue = issues.find(v => v.segmentId === segment.id);
      return <div className="activity-edit-row" key={segment.id}>
        <label className="activity-field">{t(locale, 'segment')} {i + 1}
          <input className="field" value={segment.text} onChange={e => update({ segments: segments.map((v, j) => j === i ? { ...v, text: e.target.value } : v) })}/>
        </label>
        <div className="activity-item-tools">
          <button className="button secondary" disabled={i === 0} onClick={() => { const copy = [...segments]; [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]]; update({ segments: copy }); }} aria-label={t(locale, 'up') + ' ' + (i + 1)}>↑</button>
          <button className="button secondary" disabled={i === segments.length - 1} onClick={() => { const copy = [...segments]; [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]]; update({ segments: copy }); }} aria-label={t(locale, 'down') + ' ' + (i + 1)}>↓</button>
          <button className="button secondary" disabled={segments.length <= 4} onClick={() => update({ segments: segments.filter((_, j) => i !== j), issues: issues.filter(v => v.segmentId !== segment.id) })}>{t(locale, 'remove')}</button>
        </div>
        <label className="activity-issue-toggle"><input type="checkbox" checked={!!issue} disabled={!issue && issues.length >= 12}
          onChange={e => update({ issues: e.target.checked ? [...issues, { segmentId: segment.id, correction: '', explanation: '' }] : issues.filter(v => v.segmentId !== segment.id) })}/> {t(locale, 'issue')}</label>
        {issue && <>
          <label className="activity-field">{t(locale, 'correction')}
            <input className="field" value={issue.correction} onChange={e => issueChange(segment.id, 'correction', e.target.value)}/>
          </label>
          <label className="activity-field">{t(locale, 'explanation')}
            <textarea className="field" rows={2} value={issue.explanation} onChange={e => issueChange(segment.id, 'explanation', e.target.value)}/>
          </label>
        </>}
      </div>;
    })}
    <button className="button secondary" disabled={segments.length >= 80} onClick={() => update({ segments: [...segments, { id: nextId(segments.map(v => v.id)), text: '' }] })}>{t(locale, 'addSegment')}</button>
    <label className="activity-field">{t(locale, 'summary')}
      <textarea className="field" rows={2} value={activity.content.summary ?? ''} onChange={e => {
        const next = { ...activity.content };
        if (e.target.value) next.summary = e.target.value; else delete next.summary;
        onChange({ ...activity, content: next });
      }}/>
    </label>
  </div>;
}
