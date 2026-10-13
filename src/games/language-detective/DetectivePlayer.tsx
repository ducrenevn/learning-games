import { useId, useState, type Ref } from 'react';
import { Check } from 'lucide-react';
import { t } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { useFocusFirstOnChange, useFocusWhen } from '../../shared/activities/focus';
import type { PlayerProps } from '../../shared/activities/Workspace';
import type { Locale } from '../../shared/activities/contract';
import { scoreDetective } from './engine';
import type { DetectiveDraft } from './draft';
import type { DetectiveTask, Segment } from './model';

type Mark = 'hit' | 'extra' | 'missed';
const MARK_ICON: Record<Mark, string> = { hit: '✓', extra: '✗', missed: '!' };
const MAX_SUGGESTION = 300;
const EMPTY: ReadonlySet<string> = new Set();

interface CardProps {
  task: DetectiveTask; index: number; single: boolean; lang: string; locale: Locale; typing: boolean;
  selected: ReadonlySet<string>; noErrors: boolean; suggestions: ReadonlyMap<string, string>;
  checked: boolean; revealed: boolean; summary?: string; keyRef?: Ref<HTMLElement>;
  onToggle: (segmentId: string) => void; onNoErrors: (value: boolean) => void; onSuggest: (segmentId: string, value: string) => void;
}

/** The same words as the original, with each picked word replaced by an empty input in its own position. */
function CorrectedLine({ task, lang, locale, selected, suggestions, checked, label, onSuggest }: {
  task: DetectiveTask; lang: string; locale: Locale; selected: ReadonlySet<string>; suggestions: ReadonlyMap<string, string>;
  checked: boolean; label: string; onSuggest: (segmentId: string, value: string) => void;
}) {
  return <div className="detective-corrected">
    <p className="detective-corrected-caption small">{u(locale, 'yourCorrection')}</p>
    <div className="detective-segments corrected" lang={lang}>
      {task.segments.map(segment => selected.has(segment.id)
        ? <FixInput key={segment.id} segment={segment} value={suggestions.get(segment.id) ?? ''} lang={lang} locale={locale} label={label}
            disabled={checked} onChange={value => onSuggest(segment.id, value)} />
        : <span key={segment.id} className="detective-word" lang={lang}>{segment.text}</span>)}
    </div>
  </div>;
}
function FixInput({ segment, value, lang, locale, label, disabled, onChange }: {
  segment: Segment; value: string; lang: string; locale: Locale; label: string; disabled: boolean; onChange: (value: string) => void;
}) {
  // Sized from the original word so typing does not shift the sentence; a longer answer grows the box.
  const chars = Math.max(segment.text.length, value.length, 5) + 2;
  return <input type="text" className="detective-fix" lang={lang} value={value} disabled={disabled}
    placeholder="…" style={{ width: chars + 'ch' }} aria-label={u(locale, 'fixFor', { word: segment.text }) + label}
    onChange={e => onChange(Array.from(e.target.value).slice(0, MAX_SUGGESTION).join(''))} />;
}

/** One sentence: its own words, "no errors" choice, verdict and key. With a single sentence it looks like the original passage. */
function SentenceCard(p: CardProps) {
  const uid = useId();
  const { task, lang, locale } = p;
  const score = scoreDetective(task, p.selected, p.noErrors);
  const issueMap = new Map(task.issues.map(issue => [issue.segmentId, issue]));
  // Missed error locations are concealed until Reveal: after Check only the learner's own picks are marked.
  const markOf = (id: string): Mark | null => !p.checked ? null
    : p.selected.has(id) ? (issueMap.has(id) ? 'hit' : 'extra') : issueMap.has(id) && p.revealed ? 'missed' : null;
  const textsOf = (mark: Mark) => task.segments.filter(s => markOf(s.id) === mark).map(s => s.text).join(', ');
  const reviewHasContent = p.checked && (score.extra.length > 0 || score.missed.length > 0);
  const label = p.single ? '' : ' (' + u(locale, 'sentenceNo', { n: p.index + 1 }) + ')';
  const showCorrection = p.typing && !p.noErrors && p.selected.size > 0;
  return <article className={'sent-card' + (p.single ? ' single' : '') + (p.checked && !p.single ? (score.solved ? ' good' : ' bad') : '')}>
    {!p.single && <header><b>{u(locale, 'sentenceNo', { n: p.index + 1 })}</b>
      {p.checked && <span className={'sent-badge ' + (score.solved ? 'good' : 'bad')}><span aria-hidden="true">{score.solved ? '✓' : '✗'}</span> {u(locale, score.solved ? 'sentenceRight' : 'sentenceWrong')}</span>}</header>}
    <div className="detective-segments" role="group" aria-label={t(locale, 'passage') + (p.single ? '' : ' · ' + u(locale, 'sentenceNo', { n: p.index + 1 }))}>
      {task.segments.map(segment => {
        const mark = markOf(segment.id);
        return <button type="button" key={segment.id} className={'detective-segment' + (p.selected.has(segment.id) ? ' selected' : '') + (mark ? ' ' + mark : '')}
          aria-pressed={p.selected.has(segment.id)} disabled={p.checked} onClick={() => p.onToggle(segment.id)}>
          <span lang={lang}>{segment.text}</span>
          {mark && <span className="detective-mark small"><span aria-hidden="true">{MARK_ICON[mark]}</span> {t(locale, mark)}</span>}
        </button>;
      })}
    </div>
    {showCorrection && <CorrectedLine task={task} lang={lang} locale={locale} selected={p.selected} suggestions={p.suggestions}
      checked={p.checked} label={label} onSuggest={p.onSuggest} />}
    <label className={'detective-none' + (p.noErrors ? ' on' : '') + (p.checked ? ' locked' : '')}>
      <input type="checkbox" className="detective-none-input" checked={p.noErrors} disabled={p.checked} onChange={e => p.onNoErrors(e.target.checked)}/>
      <span className="detective-none-mark" aria-hidden="true">{p.noErrors && <Check size={16} strokeWidth={3} />}</span>
      <span>{t(locale, 'noErrors')}</span>{label && <span className="sr-only">{label}</span>}
    </label>
    {reviewHasContent && <div className="activity-key">
      {score.extra.length > 0 && <p>{t(locale, 'extra')}: <span lang={lang}>{textsOf('extra')}</span></p>}
      {score.missed.length > 0 && (p.revealed
        ? <p>{t(locale, 'missed')}: <span lang={lang}>{textsOf('missed')}</span></p>
        : <p>{u(locale, 'notFoundYet', { n: score.missed.length })}</p>)}
    </div>}
    {p.revealed && <section className="activity-key" tabIndex={-1} ref={p.keyRef} aria-labelledby={uid + 'key'}><h3 id={uid + 'key'}>{t(locale, 'answerKey')}{label}</h3>
      {!task.issues.length && <p>{t(locale, 'noErrors')}</p>}
      {task.segments.filter(s => issueMap.has(s.id)).map(s => {
        const issue = issueMap.get(s.id)!;
        const mine = p.typing && p.selected.has(s.id) ? (p.suggestions.get(s.id) ?? '') : '';
        return <article key={s.id} className="activity-key-entry">
          <strong lang={lang}>{s.text} → {issue.correction}</strong><p lang={lang}>{issue.explanation}</p>
          {mine.trim() !== '' && <p>{t(locale, 'suggestion')}: <span lang={lang}>{mine}</span></p>}
        </article>;
      })}
      {p.single && p.summary && <p lang={lang}>{p.summary}</p>}
    </section>}
  </article>;
}

/**
 * Identification is scored per sentence; typed corrections are not. A learner's own wording is shown beside the teacher's
 * model correction after Reveal so a human can compare them. Presentation mode has no typing boxes: the teacher flags
 * words the class proposes on the shared screen.
 */
export function DetectivePlayer({ activity, mode, locale }: PlayerProps<DetectiveDraft>) {
  const lang = activity.targetLanguage;
  const typing = mode !== 'presentation';
  const { tasks, summary } = activity.content;
  const single = tasks.length === 1;
  const [selected, setSelected] = useState<ReadonlyMap<string, ReadonlySet<string>>>(() => new Map());
  const [none, setNone] = useState<ReadonlySet<string>>(() => new Set());
  const [suggestions, setSuggestions] = useState<ReadonlyMap<string, ReadonlyMap<string, string>>>(() => new Map());
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [restarts, setRestarts] = useState(0);
  const boardRef = useFocusFirstOnChange<HTMLDivElement>(restarts);
  const resultRef = useFocusWhen<HTMLDivElement>(checked);
  const keyRef = useFocusWhen<HTMLElement>(revealed);
  const pickedIn = (task: DetectiveTask) => selected.get(task.id) ?? EMPTY;
  const scores = tasks.map(task => scoreDetective(task, pickedIn(task), none.has(task.id)));
  const answered = tasks.filter(task => pickedIn(task).size > 0 || none.has(task.id)).length;
  const canCheck = answered === tasks.length;

  function toggle(task: DetectiveTask, id: string) {
    if (checked) return;
    setSelected(prev => {
      const next = new Map(prev), copy = new Set(prev.get(task.id) ?? EMPTY);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return next.set(task.id, copy);
    });
    setNone(prev => { const copy = new Set(prev); copy.delete(task.id); return copy; });
  }
  function setNoErrors(task: DetectiveTask, value: boolean) {
    setNone(prev => { const copy = new Set(prev); if (value) copy.add(task.id); else copy.delete(task.id); return copy; });
    if (value) setSelected(prev => new Map(prev).set(task.id, new Set()));
  }
  function suggest(task: DetectiveTask, id: string, value: string) {
    setSuggestions(prev => new Map(prev).set(task.id, new Map(prev.get(task.id) ?? []).set(id, value)));
  }
  function retry() {
    setSelected(new Map()); setNone(new Set()); setSuggestions(new Map()); setChecked(false); setRevealed(false);
    setRestarts(n => n + 1);
  }
  const solvedCount = scores.filter(s => s.solved).length;
  const found = scores.reduce((sum, s) => sum + s.correct, 0), errors = scores.reduce((sum, s) => sum + s.total, 0);
  const result = single
    ? t(locale, 'result') + ': ' + (scores[0].solved ? t(locale, 'correct') : t(locale, 'wrong')) + (errors > 0 ? ' — ' + scores[0].correct + ' ' + t(locale, 'of') + ' ' + errors + ' ' + t(locale, 'correct') : '')
    : u(locale, 'resultSentences', { c: solvedCount, t: tasks.length }) + (errors > 0 ? ' · ' + u(locale, 'foundErrors', { f: found, e: errors }) : '');
  const prompt = activity.content.prompt.trim();
  const showPrompt = prompt !== '' && prompt !== activity.instructions.trim();
  return <div className="activity-board" ref={boardRef}>
    {showPrompt && <p className="lead play-prompt" lang={lang}>{activity.content.prompt}</p>}
    <div className="sentence-stack">
      {tasks.map((task, index) => <SentenceCard key={task.id} task={task} index={index} single={single} lang={lang} locale={locale} typing={typing}
        selected={pickedIn(task)} noErrors={none.has(task.id)} suggestions={suggestions.get(task.id) ?? new Map()} checked={checked} revealed={revealed}
        summary={summary} keyRef={index === 0 ? keyRef : undefined}
        onToggle={id => toggle(task, id)} onNoErrors={value => setNoErrors(task, value)} onSuggest={(id, value) => suggest(task, id, value)} />)}
    </div>
    <div className="row activity-controls">{!checked
      ? <button type="button" className="button primary" disabled={!canCheck} onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
      : <><div role="status" tabIndex={-1} ref={resultRef}>{result}</div>
        <button type="button" className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
        <button type="button" className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button></>}
    </div>
    {!checked && !canCheck && <p className="muted small">{single ? t(locale, 'nothingSelected') : u(locale, 'openSentences', { n: tasks.length - answered })}</p>}
    {revealed && !single && summary && <p className="detective-summary" lang={lang}>{summary}</p>}
  </div>;
}
