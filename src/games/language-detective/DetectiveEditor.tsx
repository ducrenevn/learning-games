import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { t, tf } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { moveKey, useMoveFocus } from '../../shared/activities/focus';
import { splitLines } from '../../shared/activities/listPaste';
import { AutoTextarea } from '../../shared/activities/canvasParts';
import type { EditorProps } from '../../shared/activities/Workspace';
import { fitsV1, type DetectiveDraft } from './draft';
import { LIMITS, V1_LIMITS, type DetectiveTask } from './model';

/** Word units are whitespace-separated tokens; punctuation stays attached (unchanged from v1). */
export function splitPassage(text: string) {
  return text.trim().split(/\s+/u).filter(Boolean);
}
/** Proposes one sentence per line, and splits a line after . ! ? … when a capital letter, digit or quote follows. Teachers can still merge or edit. */
export function splitSentences(text: string): string[] {
  return text.split(/\r?\n+/).flatMap(line => line.trim().split(/(?<=[.!?…])\s+(?=[\p{Lu}\p{N}„"'«(])/u)).map(s => s.trim()).filter(Boolean);
}
const oneLine = (value: string) => value.replace(/\s*[\r\n]+\s*/g, ' ');
const joined = (task: DetectiveTask) => task.segments.map(s => s.text).join(' ');
function nextId(prefix: string, used: readonly string[]) { let n = 1; while (used.includes(prefix + '-' + n)) n++; return prefix + '-' + n; }
function freshTask(tasks: readonly DetectiveTask[], text = ''): DetectiveTask {
  const id = nextId('task', tasks.map(t => t.id));
  return { id, segments: splitPassage(text).map((word, i) => ({ id: 'segment-' + (i + 1), text: word })), issues: [] };
}
/**
 * New words for a task: ids stay stable by position, and a mark survives only while the word at its position is unchanged
 * (a changed word is a different question, so its model correction would no longer fit).
 */
function retokenize(task: DetectiveTask, text: string): { task: DetectiveTask; removed: number } {
  const words = splitPassage(text);
  const used = new Set(task.segments.map(s => s.id));
  let counter = 1;
  const segments = words.map((word, i) => {
    if (task.segments[i]) return { id: task.segments[i].id, text: word };
    while (used.has('segment-' + counter)) counter++;
    const id = 'segment-' + counter; used.add(id);
    return { id, text: word };
  });
  const kept = task.issues.filter(issue => {
    const old = task.segments.findIndex(s => s.id === issue.segmentId);
    return old >= 0 && segments[old]?.text === task.segments[old].text;
  });
  return { task: { ...task, segments, issues: kept }, removed: task.issues.length - kept.length };
}

interface SentenceInputProps { value: string; label: string; placeholder: string; maxLength: number; attrs: object; onText: (text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void; onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void; inputRef: (el: HTMLTextAreaElement | null) => void }
/** Keeps what the teacher typed (including a trailing space) while the words are derived from it. */
function SentenceInput(p: SentenceInputProps) {
  const [text, setText] = useState(p.value);
  useEffect(() => { if (splitPassage(text).join(' ') !== p.value) setText(p.value); }, [p.value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <AutoTextarea className="sentence-input" aria-label={p.label} placeholder={p.placeholder} maxLength={p.maxLength} value={text} {...p.attrs}
    inputRef={p.inputRef} onKeyDown={p.onKeyDown} onPaste={p.onPaste} onChange={e => { const next = oneLine(e.target.value); setText(next); p.onText(next); }} />;
}

/**
 * Stacked sentence cards: each is a text field, the same word chips the learner will tap, and — beneath each marked
 * word — its model correction and explanation. A sentence with no marks is an error-free sentence.
 */
export function DetectiveEditor({ activity, onChange, locale, field }: EditorProps<DetectiveDraft>) {
  const { tasks, summary } = activity.content;
  const [notice, setNotice] = useState('');
  const [removedMarks, setRemovedMarks] = useState<{ id: string; n: number } | null>(null);
  const [paste, setPaste] = useState('');
  const [focus, setFocus] = useState<{ id: string; end?: boolean } | null>(null);
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  const { rootRef, keepFocus } = useMoveFocus<HTMLDivElement>();
  useEffect(() => {
    if (!focus) return;
    if (focus.id === 'add') { addButton.current?.focus(); return; }
    const el = inputs.current.get(focus.id);
    el?.focus();
    if (el && focus.end) el.setSelectionRange(el.value.length, el.value.length);
  }, [focus]);
  const update = (change: Partial<DetectiveDraft['content']>) => onChange({ ...activity, content: { ...activity.content, ...change } });
  const setTasks = (next: DetectiveTask[]) => update({ tasks: next });
  const patchTask = (id: string, fn: (task: DetectiveTask) => DetectiveTask) => setTasks(tasks.map(task => task.id === id ? fn(task) : task));
  const name = (i: number) => u(locale, 'sentenceNo', { n: i + 1 });
  const maxTasks = LIMITS.tasks.max;
  // A lone sentence may still be a v1 file (up to 80 words); with several sentences each is limited to the v2 maximum.
  const maxWords = tasks.length === 1 ? V1_LIMITS.segments.max : LIMITS.segmentsPerTask.max;

  function editText(task: DetectiveTask, text: string) {
    const { task: next, removed } = retokenize(task, text);
    patchTask(task.id, () => next);
    setRemovedMarks(removed ? { id: task.id, n: removed } : null);
    if (removed) setNotice(u(locale, removed === 1 ? 'markedGone' : 'markedGoneMany', { n: removed }));
  }
  function toggleMark(task: DetectiveTask, segmentId: string) {
    const marked = task.issues.some(v => v.segmentId === segmentId);
    if (!marked && task.issues.length >= LIMITS.issuesPerTask) return;
    patchTask(task.id, current => ({ ...current, issues: marked ? current.issues.filter(v => v.segmentId !== segmentId) : [...current.issues, { segmentId, correction: '', explanation: '' }] }));
  }
  function fix(task: DetectiveTask, segmentId: string, which: 'correction' | 'explanation', value: string) {
    patchTask(task.id, current => ({ ...current, issues: current.issues.map(v => v.segmentId === segmentId ? { ...v, [which]: value } : v) }));
  }
  function addAfter(index: number, texts: string[] = ['']) {
    const room = maxTasks - tasks.length;
    if (room <= 0) return [];
    const list = [...tasks];
    const created = texts.slice(0, room).map(text => { const task = freshTask(list, text); list.push(task); return task; });
    setTasks([...tasks.slice(0, index + 1), ...created, ...tasks.slice(index + 1)]);
    return created;
  }
  function removeTask(index: number) {
    if (tasks.length <= LIMITS.tasks.min) return;
    const neighbour = tasks[index - 1] ?? tasks[index + 1];
    setTasks(tasks.filter((_, i) => i !== index));
    setFocus(neighbour ? { id: neighbour.id, end: true } : { id: 'add' });
  }
  function move(index: number, direction: -1 | 1) {
    const next = [...tasks];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setTasks(next);
    setNotice(tf(locale, 'announceMoved', { card: joined(tasks[index]) || name(index), pos: index + direction + 1, total: tasks.length }));
    keepFocus(tasks[index].id, direction === -1 ? 'up' : 'down');
  }
  function keys(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    const task = tasks[index];
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const created = addAfter(index);
      if (created[0]) setFocus({ id: created[0].id });
    } else if (event.key === 'Backspace' && joined(task) === '' && tasks.length > LIMITS.tasks.min) {
      event.preventDefault();
      removeTask(index);
    }
  }
  function pasteInto(event: ClipboardEvent<HTMLTextAreaElement>, index: number) {
    const lines = splitLines(event.clipboardData.getData('text'));
    if (lines.length < 2) return;
    event.preventDefault();
    const task = tasks[index];
    const fillCurrent = joined(task) === '';
    const room = maxTasks - tasks.length + (fillCurrent ? 1 : 0);
    const accepted = lines.slice(0, Math.max(room, 0));
    if (!accepted.length) return;
    const list = [...tasks];
    const created = accepted.slice(fillCurrent ? 1 : 0).map(text => { const made = freshTask(list, text); list.push(made); return made; });
    const head = fillCurrent ? { ...freshTask([], accepted[0]), id: task.id } : task;
    setTasks([...tasks.slice(0, index), head, ...created, ...tasks.slice(index + 1)]);
    setFocus({ id: (created[created.length - 1] ?? head).id, end: true });
  }
  const proposed = splitSentences(paste);
  const onlyEmpty = tasks.length === 1 && joined(tasks[0]) === '';
  const roomForPaste = maxTasks - (onlyEmpty ? 0 : tasks.length);
  function applyPaste() {
    if (!proposed.length) return;
    const accepted = proposed.slice(0, roomForPaste);
    const list: DetectiveTask[] = onlyEmpty ? [] : [...tasks];
    for (const text of accepted) list.push(freshTask(list, text));
    setTasks(list);
    setPaste('');
    setFocus({ id: list[list.length - 1].id, end: true });
  }
  return <div className="activity-editor detective-editor">
    <label className="activity-field">{t(locale, 'prompt')}
      <AutoTextarea className="field" minRows={1} value={activity.content.prompt} {...field('content.prompt')} onChange={e => update({ prompt: e.target.value })}/>
    </label>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <div className="sentence-stack" ref={rootRef} role="group" aria-label={u(locale, 'sentences')}>
      {tasks.map((task, i) => {
        const marked = new Map(task.issues.map((issue, k) => [issue.segmentId, { issue, k }]));
        const words = task.segments.length;
        return <article className="sent-card edit" data-row key={task.id}>
          <header>
            <b>{name(i)}</b>
            <span className={'sent-badge' + (marked.size ? '' : ' none')}>{marked.size ? u(locale, 'marks') + ': ' + marked.size : u(locale, 'noMarkBadge')}</span>
            <span className={'muted small word-count' + (words > 0 && (words < LIMITS.segmentsPerTask.min || words > maxWords) ? ' warn' : '')}>{u(locale, 'wordCount', { n: words, max: maxWords })}</span>
            <span className="sent-tools">
              <button type="button" className="icon-button" disabled={i === 0} data-move={moveKey(task.id, 'up')} aria-label={u(locale, 'moveSentenceUp') + ': ' + name(i)} onClick={() => move(i, -1)}><ArrowUp size={16} aria-hidden="true"/></button>
              <button type="button" className="icon-button" disabled={i === tasks.length - 1} data-move={moveKey(task.id, 'down')} aria-label={u(locale, 'moveSentenceDown') + ': ' + name(i)} onClick={() => move(i, 1)}><ArrowDown size={16} aria-hidden="true"/></button>
              <button type="button" className="icon-button danger" disabled={tasks.length <= LIMITS.tasks.min} aria-label={tf(locale, 'removeRow', { what: name(i) })} onClick={() => removeTask(i)}><X size={16} aria-hidden="true"/></button>
            </span>
          </header>
          <SentenceInput value={joined(task)} label={name(i)} placeholder={u(locale, 'sentencePlaceholder')} maxLength={4000} attrs={field('content.tasks[' + i + '].segments')}
            inputRef={el => { if (el) inputs.current.set(task.id, el); else inputs.current.delete(task.id); }}
            onText={text => editText(task, text)} onKeyDown={e => keys(e, i)} onPaste={e => pasteInto(e, i)} />
          {removedMarks?.id === task.id && <p className="muted small" role="note">{u(locale, removedMarks.n === 1 ? 'markedGone' : 'markedGoneMany', { n: removedMarks.n })}</p>}
          {words === 0 ? <p className="muted small">{u(locale, 'wordsAdvice')}</p>
            : <div className="detective-segments mark-words" role="group" aria-label={u(locale, 'errors') + ' · ' + name(i)} lang={activity.targetLanguage}>
              {task.segments.map(segment => <button type="button" key={segment.id} className={'detective-segment' + (marked.has(segment.id) ? ' selected' : '')} aria-pressed={marked.has(segment.id)}
                disabled={!marked.has(segment.id) && task.issues.length >= LIMITS.issuesPerTask} onClick={() => toggleMark(task, segment.id)}>
                <span>{segment.text}</span></button>)}
            </div>}
          {task.segments.filter(s => marked.has(s.id)).map(s => {
            const { issue, k } = marked.get(s.id)!;
            return <div className="fix-row" key={s.id}>
              <strong className="fix-word" lang={activity.targetLanguage}>{s.text} →</strong>
              <label className="fix-field"><span className="sr-only">{t(locale, 'correction')} · {name(i)} · {s.text}</span>
                <input className="field" placeholder={t(locale, 'correction')} aria-label={t(locale, 'correction') + ' · ' + name(i) + ' · ' + s.text} value={issue.correction}
                  {...field('content.tasks[' + i + '].issues[' + k + '].correction')} onChange={e => fix(task, s.id, 'correction', e.target.value)}/></label>
              <label className="fix-field wide"><span className="sr-only">{t(locale, 'issueExplanation')} · {name(i)} · {s.text}</span>
                <input className="field" placeholder={t(locale, 'issueExplanation')} aria-label={t(locale, 'issueExplanation') + ' · ' + name(i) + ' · ' + s.text} value={issue.explanation}
                  {...field('content.tasks[' + i + '].issues[' + k + '].explanation')} onChange={e => fix(task, s.id, 'explanation', e.target.value)}/></label>
              <button type="button" className="icon-button danger" aria-label={t(locale, 'deleteIssue') + ': ' + name(i) + ' · ' + s.text} onClick={() => toggleMark(task, s.id)}><X size={16} aria-hidden="true"/></button>
            </div>;
          })}
        </article>;
      })}
      <button type="button" className="seq-row seq-add" data-add ref={addButton} disabled={tasks.length >= maxTasks}
        onClick={() => { const created = addAfter(tasks.length - 1); if (created[0]) setFocus({ id: created[0].id }); }}>
        <span className="seq-num" aria-hidden="true"><Plus size={14}/></span>{u(locale, 'addSentence')}
      </button>
      {tasks.length >= maxTasks && <p className="muted small">{u(locale, 'maxSentences', { n: maxTasks })}</p>}
    </div>
    <details className="activity-ux-disclosure"><summary>{u(locale, 'sentencesPaste')}</summary>
      <p className="muted small">{u(locale, 'sentencesPasteHelp')}</p>
      <textarea className="field" rows={4} maxLength={8000} aria-label={u(locale, 'sentencesPaste')} value={paste} onChange={e => setPaste(e.target.value)}/>
      <div className="row"><span className="muted small" aria-live="polite">{u(locale, 'sentencesFound', { n: proposed.length })}{proposed.length > roomForPaste ? ' · ' + u(locale, 'sentencesTooMany', { n: maxTasks }) : ''}</span>
        <button type="button" className="button primary" disabled={!proposed.length} onClick={applyPaste}>{u(locale, 'sentencesApply')}</button></div>
    </details>
    <details className="activity-ux-disclosure"><summary>{t(locale, 'summary')}</summary><label className="activity-field"><span className="sr-only">{t(locale, 'summary')}</span>
      <AutoTextarea className="field" minRows={2} value={summary ?? ''} {...field('content.summary')} onChange={e => {
        const next = { ...activity.content };
        if (e.target.value) next.summary = e.target.value; else delete next.summary;
        onChange({ ...activity, content: next });
      }}/></label></details>
    {!fitsV1(activity) && <p className="muted small" role="note">{u(locale, 'extendedFormat')}</p>}
  </div>;
}
