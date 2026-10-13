import { useId, useRef, useState, type Ref } from 'react';
import { Check } from 'lucide-react';
import { t } from '../../shared/activities/i18n';
import { u, type UXKey } from '../../shared/activities/uxCopy';
import { useFocusFirstOnChange, useFocusWhen } from '../../shared/activities/focus';
import type { PlayerProps } from '../../shared/activities/Workspace';
import type { Locale } from '../../shared/activities/contract';
import { matchesModel, scoreDetective } from './engine';
import type { DetectiveDraft } from './draft';
import type { DetectiveTask, Segment } from './model';

/**
 * Colour meaning: copper = a word the learner picked as an error, or a missed teacher answer after Reveal (both are errors
 * in the sentence, so copper never means "right"); green = a verified result (the sentence verdict, a correct "Kein Fehler",
 * a correction that matches the model, and the model answer after Reveal). Every state also has a non-colour cue: a dotted
 * or dashed frame and a glyph. A correct pick carries no glyph: repeating a tick on every word adds noise.
 */
type Mark = 'hit' | 'extra' | 'missed';
const MARK_ICON: Partial<Record<Mark, string>> = { extra: '✗', missed: '!' };
const MAX_SUGGESTION = 300;
const EMPTY: ReadonlySet<string> = new Set();
/** How a typed correction reads after Check. "open" is the learner's own text before Check, and for a word with no model answer. */
type FixState = 'open' | 'match' | 'differs' | 'empty';
const FIX_CLASS: Record<FixState, string> = { open: '', match: ' fix-match', differs: ' fix-differs', empty: ' fix-empty' };
const FIX_TEXT: Record<Exclude<FixState, 'open'>, UXKey> = { match: 'fixMatch', differs: 'fixDiffers', empty: 'fixEmpty' };

interface CardProps {
  task: DetectiveTask; index: number; single: boolean; lang: string; locale: Locale; typing: boolean;
  selected: ReadonlySet<string>; noErrors: boolean; suggestions: ReadonlyMap<string, string>;
  checked: boolean; revealed: boolean; summary?: string; keyRef?: Ref<HTMLElement>;
  onToggle: (segmentId: string, fromKeyboard: boolean) => void; onNoErrors: (value: boolean) => void; onSuggest: (segmentId: string, value: string) => void;
  pending: Pending;
}
/** A keyboard pick asks for its correction input to take focus; a pointer pick never moves focus (no keyboard on touch). */
type Pending = { current: string | null };

/**
 * The same words as the original, with each picked word replaced by an empty input in its own position. After Check, each
 * input says whether it matches the teacher's model; the text is kept exactly as the learner typed it.
 */
function CorrectedLine({ task, lang, locale, selected, suggestions, checked, label, onSuggest, pending, stateOf }: {
  task: DetectiveTask; lang: string; locale: Locale; selected: ReadonlySet<string>; suggestions: ReadonlyMap<string, string>;
  checked: boolean; label: string; onSuggest: (segmentId: string, value: string) => void; pending: Pending; stateOf: (segmentId: string) => FixState;
}) {
  const uid = useId();
  const described = task.segments.filter(segment => selected.has(segment.id) && stateOf(segment.id) !== 'open');
  return <div className="detective-corrected">
    <p className="detective-corrected-caption small">{u(locale, checked ? 'yourCorrectionChecked' : 'yourCorrection')}</p>
    <div className="detective-segments corrected" lang={lang}>
      {task.segments.map(segment => selected.has(segment.id)
        ? <FixInput key={segment.id} segment={segment} value={suggestions.get(segment.id) ?? ''} lang={lang} locale={locale} label={label}
            disabled={checked} state={stateOf(segment.id)} describedBy={uid + segment.id} focusKey={task.id + ':' + segment.id} pending={pending}
            onChange={value => onSuggest(segment.id, value)} />
        : <span key={segment.id} className="detective-word" lang={lang}>{segment.text}</span>)}
    </div>
    {described.length > 0 && <div className="sr-only">{described.map(segment => {
      const state = stateOf(segment.id) as Exclude<FixState, 'open'>;
      return <span key={segment.id} id={uid + segment.id}>{u(locale, FIX_TEXT[state])}</span>;
    })}</div>}
  </div>;
}
function FixInput({ segment, value, lang, locale, label, disabled, state, describedBy, focusKey, pending, onChange }: {
  segment: Segment; value: string; lang: string; locale: Locale; label: string; disabled: boolean; state: FixState; describedBy: string;
  focusKey: string; pending: Pending; onChange: (value: string) => void;
}) {
  // Sized from the original word so typing does not shift the sentence; a longer answer grows the box.
  const chars = Math.max(segment.text.length, value.length, 5) + 2;
  return <input type="text" className={'detective-fix' + FIX_CLASS[state]} lang={lang} value={value} disabled={disabled}
    ref={el => { if (el && pending.current === focusKey) { pending.current = null; el.focus(); } }}
    placeholder="…" style={{ width: chars + 'ch' }} aria-label={u(locale, 'fixFor', { word: segment.text }) + label}
    aria-describedby={state === 'open' ? undefined : describedBy}
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
  const label = p.single ? '' : ' (' + u(locale, 'sentenceNo', { n: p.index + 1 }) + ')';
  const showCorrection = p.typing && !p.noErrors && p.selected.size > 0;
  // One concise verdict per sentence; the aggregate result stays below the sentences.
  const verdict = p.checked && <span className={'sent-badge ' + (score.solved ? 'good' : 'bad')}><span aria-hidden="true">{score.solved ? '✓' : '✗'}</span> {u(locale, score.solved ? 'sentenceRight' : 'sentenceWrong')}</span>;
  const markLabel = (mark: Mark) => mark === 'extra' ? u(locale, 'notAnError') : t(locale, 'missed');
  // Only marks that are on screen are named in the legend; "missed" appears after Reveal only, like the marks themselves.
  const legend = (['extra', 'missed'] as const).filter(mark => task.segments.some(s => markOf(s.id) === mark));
  // A typed correction is compared with the model only after Check, and only for a word that has a model answer.
  const fixStateOf = (id: string): FixState => {
    const issue = issueMap.get(id);
    if (!p.checked || !issue) return 'open';
    const value = p.suggestions.get(id) ?? '';
    return value.trim() === '' ? 'empty' : matchesModel(value, issue.correction) ? 'match' : 'differs';
  };
  const noneState = p.checked && p.noErrors ? (score.solved ? ' good' : ' bad') : '';
  return <article className={'sent-card' + (p.single ? ' single' : '') + (p.checked && !p.single ? (score.solved ? ' good' : ' bad') : '')}>
    {!p.single && <header><b>{u(locale, 'sentenceNo', { n: p.index + 1 })}</b>{verdict}</header>}
    <div className="detective-segments" role="group" aria-label={t(locale, 'passage') + (p.single ? '' : ' · ' + u(locale, 'sentenceNo', { n: p.index + 1 }))}>
      {task.segments.map(segment => {
        const mark = markOf(segment.id);
        // The word keeps one line: the glyph and the status name sit beside it, so every card has the same height before and after Check.
        return <button type="button" key={segment.id} className={'detective-segment' + (p.selected.has(segment.id) ? ' selected' : '') + (mark ? ' ' + mark : '')}
          aria-pressed={p.selected.has(segment.id)} disabled={p.checked} onClick={e => p.onToggle(segment.id, e.detail === 0)}>
          <span lang={lang}>{segment.text}</span>
          {mark && mark !== 'hit' && <>
            <span className="detective-mark" aria-hidden="true">{MARK_ICON[mark]}</span>
            <span className="sr-only">{' ' + markLabel(mark)}</span>
          </>}
        </button>;
      })}
    </div>
    {p.checked && legend.length > 0 && <p className="detective-legend small" aria-hidden="true">{legend.map(mark =>
      <span key={mark} className={'legend-' + mark}><span className="detective-mark">{MARK_ICON[mark]}</span> {markLabel(mark)}</span>)}</p>}
    {p.single && verdict && <p className="sent-verdict">{verdict}</p>}
    {showCorrection && <CorrectedLine task={task} lang={lang} locale={locale} selected={p.selected} suggestions={p.suggestions}
      checked={p.checked} label={label} onSuggest={p.onSuggest} pending={p.pending} stateOf={fixStateOf} />}
    <label className={'detective-none' + (p.noErrors ? ' on' : '') + (p.checked ? ' locked' : '') + noneState}>
      <input type="checkbox" className="detective-none-input" checked={p.noErrors} disabled={p.checked} onChange={e => p.onNoErrors(e.target.checked)}/>
      <span className="detective-none-mark" aria-hidden="true">{p.noErrors && (p.checked && !score.solved ? '✗' : <Check size={16} strokeWidth={3} />)}</span>
      <span>{t(locale, 'noErrors')}</span>{label && <span className="sr-only">{label}</span>}
    </label>
    {/* The tags on the words already say which picks were false and which answers were missed, so the only addition is the
        count of answers not found yet, and only before Reveal. */}
    {p.checked && !p.revealed && score.missed.length > 0 && <p className="muted small">{u(locale, 'notFoundYet', { n: score.missed.length })}</p>}
    {/* An error-free sentence gets a one-line confirmation: the heading is kept for screen readers, not drawn as a panel. */}
    {p.revealed && <section className={'activity-key' + (task.issues.length ? '' : ' compact')} tabIndex={-1} ref={p.keyRef} aria-labelledby={uid + 'key'}>
      <h3 id={uid + 'key'} className={task.issues.length ? undefined : 'sr-only'}>{t(locale, 'answerKey')}{label}</h3>
      {!task.issues.length && <div className="key-clear"><span aria-hidden="true">✓</span><p>{t(locale, 'noErrors')}</p></div>}
      {task.segments.filter(s => issueMap.has(s.id)).map(s => {
        const issue = issueMap.get(s.id)!;
        const mine = p.typing && p.selected.has(s.id) ? (p.suggestions.get(s.id) ?? '') : '';
        return <article key={s.id} className="activity-key-entry">
          <strong lang={lang}>{s.text} → <span className="key-model">{issue.correction}</span></strong><p lang={lang}>{issue.explanation}</p>
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
  const pending = useRef<string | null>(null);
  const boardRef = useFocusFirstOnChange<HTMLDivElement>(restarts);
  const resultRef = useFocusWhen<HTMLDivElement>(checked);
  const keyRef = useFocusWhen<HTMLElement>(revealed);
  const pickedIn = (task: DetectiveTask) => selected.get(task.id) ?? EMPTY;
  const scores = tasks.map(task => scoreDetective(task, pickedIn(task), none.has(task.id)));
  const answered = tasks.filter(task => pickedIn(task).size > 0 || none.has(task.id)).length;
  const canCheck = answered === tasks.length;

  function toggle(task: DetectiveTask, id: string, fromKeyboard: boolean) {
    if (checked) return;
    if (fromKeyboard && !pickedIn(task).has(id)) pending.current = task.id + ':' + id;
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
        pending={pending} onToggle={(id, fromKeyboard) => toggle(task, id, fromKeyboard)} onNoErrors={value => setNoErrors(task, value)} onSuggest={(id, value) => suggest(task, id, value)} />)}
    </div>
    <div className="row activity-controls">{!checked
      ? <button type="button" className="button primary" disabled={!canCheck} onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
      : <><div role="status" tabIndex={-1} ref={resultRef}>{result}</div>
        <button type="button" className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
        {!revealed && <button type="button" className="button primary" onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button>}</>}
    </div>
    {!checked && !canCheck && <p className="muted small">{single ? t(locale, 'nothingSelected') : u(locale, 'openSentences', { n: tasks.length - answered })}</p>}
    {revealed && !single && summary && <p className="detective-summary" lang={lang}>{summary}</p>}
  </div>;
}
