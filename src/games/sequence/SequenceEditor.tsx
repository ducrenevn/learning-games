import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { t, tf } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { moveKey, useMoveFocus } from '../../shared/activities/focus';
import { AutoTextarea } from '../../shared/activities/canvasParts';
import type { EditorProps } from '../../shared/activities/Workspace';
import { moveSequence } from './engine';
import type { SequenceActivity } from './model';

const MIN_STEPS = 3, MAX_STEPS = 20;
function nextId(ids: string[]) { let n = 1; while (ids.includes('step-' + n)) n++; return 'step-' + n; }
/** One step per line; a leading "1." "2)" "-" or bullet from a pasted list is not part of the step. */
export function splitSteps(raw: string): string[] {
  return raw.split(/\r?\n/).map(line => line.trim().replace(/^(?:\d{1,2}[.)]|[-•*])\s+/, '').trim()).filter(Boolean);
}
const oneLine = (value: string) => value.replace(/\s*[\r\n]+\s*/g, ' ');
const msg = {
  de: { paste: 'Tipp: Enter fügt einen Schritt ein, eine eingefügte Liste wird zu einzelnen Schritten.', max: 'Höchstens 20 Schritte.', min: 'Mindestens 3 Schritte.', pasted: 'Eingefügt: {n} Schritte.', cut: 'Eingefügt: {n} Schritte – weitere passen nicht (höchstens 20).', hint: 'Nächsten Schritt tippen' },
  en: { paste: 'Tip: Enter adds a step; a pasted list becomes separate steps.', max: 'At most 20 steps.', min: 'At least 3 steps.', pasted: 'Pasted {n} steps.', cut: 'Pasted {n} steps – the rest do not fit (at most 20).', hint: 'Type the next step' },
  vi: { paste: 'Mẹo: Enter thêm một bước; danh sách dán vào sẽ thành các bước riêng.', max: 'Tối đa 20 bước.', min: 'Tối thiểu 3 bước.', pasted: 'Đã dán {n} bước.', cut: 'Đã dán {n} bước – phần còn lại không vừa (tối đa 20).', hint: 'Nhập bước tiếp theo' },
} as const;

/** The teacher edits the same slim numbered rows the learner will later reorder. Row order is the answer. */
export function SequenceEditor({ activity, onChange, locale, field }: EditorProps<SequenceActivity>) {
  const { items } = activity.content;
  const words = msg[locale];
  const [notice, setNotice] = useState('');
  const { rootRef, keepFocus } = useMoveFocus<HTMLDivElement>();
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
  const addButton = useRef<HTMLButtonElement>(null);
  // Focus is requested by item id (or the add button) and applied after the re-render that creates/removes the row.
  const [focusTarget, setFocusTarget] = useState<{ id: string | 'add'; end?: boolean } | null>(null);
  useEffect(() => {
    if (!focusTarget) return;
    if (focusTarget.id === 'add') { addButton.current?.focus(); return; }
    const el = inputs.current.get(focusTarget.id);
    if (!el) return;
    el.focus();
    if (focusTarget.end) el.setSelectionRange(el.value.length, el.value.length);
  }, [focusTarget]);
  const update = (content: Partial<SequenceActivity['content']>) => onChange({ ...activity, content: { ...activity.content, ...content } });
  const setText = (id: string, text: string) => update({ items: items.map(v => v.id === id ? { ...v, text: oneLine(text) } : v) });
  const label = (i: number) => t(locale, 'item') + ' ' + (i + 1);

  function move(i: number, direction: -1 | 1) {
    const order = moveSequence(items.map(v => v.id), i, direction);
    update({ items: order.map(id => items.find(v => v.id === id)!) });
    setNotice(tf(locale, 'announceMoved', { card: items[i].text || label(i), pos: i + direction + 1, total: items.length }));
    keepFocus(items[i].id, direction === -1 ? 'up' : 'down');
  }
  function insertAfter(index: number, texts: string[] = ['']) {
    const room = MAX_STEPS - items.length;
    if (room <= 0) return null;
    const used = items.map(v => v.id);
    const created = texts.slice(0, room).map(text => { const id = nextId(used); used.push(id); return { id, text }; });
    update({ items: [...items.slice(0, index + 1), ...created, ...items.slice(index + 1)] });
    return created;
  }
  function remove(index: number) {
    if (items.length <= MIN_STEPS) return;
    const neighbour = items[index - 1] ?? items[index + 1];
    update({ items: items.filter((_, j) => j !== index) });
    return neighbour;
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>, index: number) {
    const item = items[index];
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      const created = insertAfter(index);
      if (created?.[0]) setFocusTarget({ id: created[0].id });
    } else if (event.key === 'Backspace' && item.text === '' && items.length > MIN_STEPS) {
      event.preventDefault();
      const neighbour = remove(index);
      if (neighbour) setFocusTarget({ id: neighbour.id, end: true });
    }
  }
  function paste(event: ClipboardEvent<HTMLTextAreaElement>, index: number) {
    const lines = splitSteps(event.clipboardData.getData('text'));
    if (lines.length < 2) return; // a single line pastes into the row as usual
    event.preventDefault();
    const item = items[index];
    const fillCurrent = item.text.trim() === '';
    const room = MAX_STEPS - items.length + (fillCurrent ? 1 : 0);
    const accepted = lines.slice(0, Math.max(room, 0));
    if (accepted.length === 0) return;
    const used = items.map(v => v.id);
    const created = accepted.slice(fillCurrent ? 1 : 0).map(text => { const id = nextId(used); used.push(id); return { id, text }; });
    const head = items.slice(0, index).concat(fillCurrent ? [{ ...item, text: accepted[0] }] : [item]);
    update({ items: [...head, ...created, ...items.slice(index + 1)] });
    setNotice(words[accepted.length < lines.length ? 'cut' : 'pasted'].replace('{n}', String(accepted.length)));
    setFocusTarget({ id: (created[created.length - 1] ?? head[head.length - 1]).id, end: true });
  }
  return <div className="activity-editor sequence-editor">
    <label className="activity-field sequence-prompt">{t(locale, 'prompt')}
      <AutoTextarea className="field" minRows={1} value={activity.content.prompt} {...field('content.prompt')} onChange={e => update({ prompt: e.target.value })}/>
    </label>
    <div className="pairs-head"><strong>{t(locale, 'answerKey')}</strong><span className="muted small" aria-live="polite">{items.length} / {MAX_STEPS}</span></div>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <div className="seq-rows" ref={rootRef} role="group" aria-label={t(locale, 'answerKey')}>
      {items.map((item, i) => <div className="seq-row seq-edit" data-row key={item.id}>
        <span className="seq-num" aria-hidden="true">{i + 1}</span>
        <label className="seq-text"><span className="sr-only">{label(i)}</span>
          <AutoTextarea className="seq-input" minRows={1} value={item.text} placeholder={words.hint} {...field('content.items[' + i + '].text')}
            inputRef={el => { if (el) inputs.current.set(item.id, el); else inputs.current.delete(item.id); }}
            onKeyDown={e => keyDown(e, i)} onPaste={e => paste(e, i)} onChange={e => setText(item.id, e.target.value)}/>
        </label>
        <div className="seq-tools">
          <button type="button" className="icon-button" disabled={i === 0} data-move={moveKey(item.id, 'up')} onClick={() => move(i, -1)}
            aria-label={t(locale, 'up') + ': ' + label(i)}><ArrowUp size={16} aria-hidden="true"/></button>
          <button type="button" className="icon-button" disabled={i === items.length - 1} data-move={moveKey(item.id, 'down')} onClick={() => move(i, 1)}
            aria-label={t(locale, 'down') + ': ' + label(i)}><ArrowDown size={16} aria-hidden="true"/></button>
          <button type="button" className="icon-button danger" disabled={items.length <= MIN_STEPS} title={items.length <= MIN_STEPS ? words.min : undefined}
            aria-label={tf(locale, 'removeRow', { what: label(i) })}
            onClick={() => { remove(i); setFocusTarget({ id: 'add' }); }}><X size={16} aria-hidden="true"/></button>
        </div>
      </div>)}
      <button type="button" className="seq-row seq-add" data-add ref={addButton} disabled={items.length >= MAX_STEPS}
        onClick={() => { const created = insertAfter(items.length - 1); if (created?.[0]) setFocusTarget({ id: created[0].id }); }}>
        <span className="seq-num" aria-hidden="true"><Plus size={14}/></span>{t(locale, 'addStep')}
      </button>
      {items.length >= MAX_STEPS && <p className="muted small">{words.max}</p>}
    </div>
    <p className="muted small">{words.paste}</p>
    <details className="activity-ux-disclosure"><summary>{t(locale, 'explanation')}</summary><label className="activity-field"><span className="sr-only">{u(locale, 'stepExplanation')}</span>
      <AutoTextarea className="field" minRows={2} value={activity.content.explanation ?? ''} {...field('content.explanation')} onChange={e => {
        const content = { ...activity.content };
        if (e.target.value) content.explanation = e.target.value;
        else delete content.explanation;
        onChange({ ...activity, content });
      }}/>
    </label></details>
  </div>;
}
