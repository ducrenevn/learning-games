import { useId, useState } from 'react';
import { t } from '../../shared/activities/i18n';
import { useFocusFirstOnChange, useFocusWhen } from '../../shared/activities/focus';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { scoreDetective } from './engine';
import type { DetectiveActivity } from './model';

type Mark = 'hit' | 'extra' | 'missed';
const MARK_ICON: Record<Mark, string> = { hit: '✓', extra: '✗', missed: '!' };
const MAX_SUGGESTION = 300;

/**
 * Identification is scored; typed corrections are not. A learner's own wording is shown beside the teacher's model
 * correction after Reveal so a human can compare them. Presentation mode has no typing boxes: the teacher flags
 * segments the class proposes on the shared screen.
 */
export function DetectivePlayer({ activity, mode, locale }: PlayerProps<DetectiveActivity>) {
  const uid = useId();
  const lang = activity.targetLanguage;
  const typing = mode !== 'presentation';
  const { segments, issues } = activity.content;
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [noErrors, setNoErrors] = useState(false);
  const [suggestions, setSuggestions] = useState<ReadonlyMap<string, string>>(() => new Map());
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [restarts, setRestarts] = useState(0);
  const boardRef = useFocusFirstOnChange<HTMLDivElement>(restarts);
  const resultRef = useFocusWhen<HTMLDivElement>(checked);
  const keyRef = useFocusWhen<HTMLElement>(revealed);
  const score = scoreDetective(activity, selected, noErrors);
  const issueMap = new Map(issues.map(issue => [issue.segmentId, issue]));
  const markOf = (id: string): Mark | null => !checked ? null
    : selected.has(id) ? (issueMap.has(id) ? 'hit' : 'extra') : issueMap.has(id) ? 'missed' : null;
  const textsOf = (mark: Mark) => segments.filter(s => markOf(s.id) === mark).map(s => s.text).join(', ');
  const canCheck = selected.size > 0 || noErrors;

  function toggle(id: string) {
    if (checked) return;
    setSelected(prev => { const copy = new Set(prev); if (copy.has(id)) copy.delete(id); else copy.add(id); return copy; });
    setNoErrors(false);
  }
  function suggest(id: string, value: string) {
    setSuggestions(prev => new Map(prev).set(id, Array.from(value).slice(0, MAX_SUGGESTION).join('')));
  }
  function retry() {
    setSelected(new Set()); setNoErrors(false); setSuggestions(new Map()); setChecked(false); setRevealed(false);
    setRestarts(n => n + 1);
  }
  const reviewHasContent = checked && (typing || score.extra.length > 0 || score.missed.length > 0);
  return <div className="activity-board" ref={boardRef}>
    <p className="lead" lang={lang}>{activity.content.prompt}</p>
    <div className="detective-segments" role="group" aria-label={t(locale, 'passage')}>
      {segments.map(segment => {
        const mark = markOf(segment.id);
        return <button type="button" key={segment.id} className={'detective-segment' + (selected.has(segment.id) ? ' selected' : '') + (mark ? ' ' + mark : '')}
          aria-pressed={selected.has(segment.id)} disabled={checked} onClick={() => toggle(segment.id)}>
          <span lang={lang}>{segment.text}</span>
          {mark && <span className="detective-mark small"><span aria-hidden="true">{MARK_ICON[mark]}</span> {t(locale, mark)}</span>}
        </button>;
      })}
    </div>
    <label className="activity-issue-toggle"><input type="checkbox" checked={noErrors} disabled={checked} onChange={e => {
      setNoErrors(e.target.checked); if (e.target.checked) setSelected(new Set());
    }}/> {t(locale, 'noErrors')}</label>
    {typing && segments.filter(s => selected.has(s.id)).map(segment => <label className="activity-field" key={segment.id}>
      <span><span lang={lang}>{segment.text}</span> — {t(locale, 'suggestion')}</span>
      <textarea className="field" rows={2} disabled={checked} value={suggestions.get(segment.id) ?? ''} onChange={e => suggest(segment.id, e.target.value)}/>
    </label>)}
    <div className="row activity-controls">{!checked
      ? <button type="button" className="button primary" disabled={!canCheck} onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
      : <><div role="status" tabIndex={-1} ref={resultRef}>{t(locale, 'result')}: {score.solved ? t(locale, 'correct') : t(locale, 'wrong')}
          {score.total > 0 && <> — {score.correct} {t(locale, 'of')} {score.total} {t(locale, 'correct')}</>}</div>
        <button type="button" className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
        <button type="button" className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button></>}
    </div>
    {!checked && !canCheck && <p className="muted small">{t(locale, 'nothingSelected')}</p>}
    {reviewHasContent && <div className="activity-key">
      {typing && <p>{t(locale, 'review')}</p>}
      {score.extra.length > 0 && <p>{t(locale, 'extra')}: <span lang={lang}>{textsOf('extra')}</span></p>}
      {score.missed.length > 0 && <p>{t(locale, 'missed')}: <span lang={lang}>{textsOf('missed')}</span></p>}
    </div>}
    {revealed && <section className="activity-key" tabIndex={-1} ref={keyRef} aria-labelledby={uid + 'key'}><h3 id={uid + 'key'}>{t(locale, 'answerKey')}</h3>
      {!issues.length && <p>{t(locale, 'noErrors')}</p>}
      {segments.filter(s => issueMap.has(s.id)).map(s => {
        const issue = issueMap.get(s.id)!;
        const mine = typing && selected.has(s.id) ? (suggestions.get(s.id) ?? '') : '';
        return <article key={s.id} className="activity-key-entry">
          <strong lang={lang}>{s.text} → {issue.correction}</strong><p lang={lang}>{issue.explanation}</p>
          {mine.trim() !== '' && <p>{t(locale, 'suggestion')}: <span lang={lang}>{mine}</span></p>}
        </article>;
      })}
      {activity.content.summary && <p lang={lang}>{activity.content.summary}</p>}
    </section>}
  </div>;
}
