import { useState } from 'react';
import { t } from '../../shared/activities/i18n';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { scoreDetective } from './engine';
import type { DetectiveActivity } from './model';

export function DetectivePlayer({ activity, locale }: PlayerProps<DetectiveActivity>) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [noErrors, setNoErrors] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const score = scoreDetective(activity, selected, noErrors);
  const issueMap = new Map(activity.content.issues.map(issue => [issue.segmentId, issue]));
  function toggle(id: string) {
    if (checked) return;
    setSelected(prev => { const copy = new Set(prev); if (copy.has(id)) copy.delete(id); else copy.add(id); return copy; });
    setNoErrors(false);
  }
  function retry() { setSelected(new Set()); setNoErrors(false); setSuggestions({}); setChecked(false); setRevealed(false); }
  return <div className="activity-board">
    <p className="lead">{activity.content.prompt}</p>
    <div className="detective-segments" role="group" aria-label={t(locale, 'passage')}>
      {activity.content.segments.map(segment => <button key={segment.id} className={'detective-segment' + (selected.has(segment.id) ? ' selected' : '')}
        aria-pressed={selected.has(segment.id)} disabled={checked} onClick={() => toggle(segment.id)}>{segment.text}</button>)}
    </div>
    <label className="activity-issue-toggle"><input type="checkbox" checked={noErrors} disabled={checked} onChange={e => {
      setNoErrors(e.target.checked); if (e.target.checked) setSelected(new Set());
    }}/> {t(locale, 'noErrors')}</label>
    {activity.content.segments.filter(s => selected.has(s.id)).map(segment => <label className="activity-field" key={segment.id}>
      {segment.text} — {t(locale, 'suggestion')}
      <textarea className="field" rows={2} disabled={checked} value={suggestions[segment.id] ?? ''}
        onChange={e => setSuggestions(prev => ({ ...prev, [segment.id]: e.target.value.slice(0, 300) }))}/>
    </label>)}
    <div className="row activity-controls">{!checked
      ? <button className="button primary" disabled={selected.size === 0 && !noErrors} onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
      : <><div role="status">{t(locale, 'result')}: {score.solved ? t(locale, 'correct') : t(locale, 'wrong')} — {score.correct} {t(locale, 'of')} {score.total} {t(locale, 'correct')}</div>
        <button className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
        <button className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button></>}
    </div>
    {checked && <div className="activity-key" role="status"><p>{t(locale, 'review')}</p>
      {score.extra.length > 0 && <p>{t(locale, 'extra')}: {score.extra.map(id => activity.content.segments.find(s => s.id === id)?.text).join(', ')}</p>}
      {score.missed.length > 0 && <p>{t(locale, 'missed')}: {score.missed.map(id => activity.content.segments.find(s => s.id === id)?.text).join(', ')}</p>}
    </div>}
    {revealed && <section className="activity-key"><h3>{t(locale, 'answerKey')}</h3>
      {!activity.content.issues.length && <p>{t(locale, 'noErrors')}</p>}
      {activity.content.segments.filter(s => issueMap.has(s.id)).map(s => <article key={s.id} className="activity-key-entry">
        <strong>{s.text} → {issueMap.get(s.id)!.correction}</strong><p>{issueMap.get(s.id)!.explanation}</p>
        {Object.hasOwn(suggestions, s.id) && <p>{t(locale, 'suggestion')}: {suggestions[s.id]}</p>}
      </article>)}
      {activity.content.summary && <p>{activity.content.summary}</p>}
    </section>}
  </div>;
}
