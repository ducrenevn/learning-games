import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { t, tf } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { moveKey, useFocusFirstOnChange, useFocusWhen, useMoveFocus } from '../../shared/activities/focus';
import { DragArea } from '../../shared/activities/dnd';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { moveSequence, scoreSequence, startSequence } from './engine';
import type { SequenceActivity } from './model';

interface RowProps {
  id: string; text: string; lang: string; index: number; last: boolean; checked: boolean; right: boolean | null;
  upLabel: string; downLabel: string; correctWord: string; wrongWord: string; onMove: (direction: -1 | 1) => void;
}
/** One slim row: grip (pointer drag), number, text, verdict and the labelled up/down buttons (the keyboard path). */
function SequenceRow(p: RowProps) {
  const { setNodeRef, setActivatorNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: p.id, disabled: p.checked });
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
    className={'seq-row sequence-card' + (p.right === true ? ' good' : p.right === false ? ' bad' : '') + (isDragging ? ' dragging' : '')}>
    {!p.checked && <span className="seq-grip" ref={setActivatorNodeRef} aria-hidden="true" {...listeners}><GripVertical size={18} /></span>}
    <span className="seq-num" aria-hidden="true">{p.index + 1}</span>
    <div className="sequence-card-copy"><span lang={p.lang}>{p.text}</span>
      {p.right !== null && <strong className="activity-status"><span aria-hidden="true">{p.right ? '✓' : '✗'}</span> {p.right ? p.correctWord : p.wrongWord}</strong>}
    </div>
    <div className="seq-tools">
      <button type="button" className="icon-button" disabled={p.checked || p.index === 0} onClick={() => p.onMove(-1)}
        data-move={moveKey(p.id, 'up')} aria-label={p.upLabel}><ArrowUp size={18} aria-hidden="true" /></button>
      <button type="button" className="icon-button" disabled={p.checked || p.last} onClick={() => p.onMove(1)}
        data-move={moveKey(p.id, 'down')} aria-label={p.downLabel}><ArrowDown size={18} aria-hidden="true" /></button>
    </div>
  </li>;
}

export function SequencePlayer({ activity, locale }: PlayerProps<SequenceActivity>) {
  const uid = useId();
  const lang = activity.targetLanguage;
  const items = activity.content.items;
  const byId = new Map(items.map(item => [item.id, item]));
  const [order, setOrder] = useState(() => startSequence(items));
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [notice, setNotice] = useState('');
  const [restarts, setRestarts] = useState(0);
  const { rootRef: listRef, keepFocus } = useMoveFocus<HTMLOListElement>();
  const boardRef = useFocusFirstOnChange<HTMLDivElement>(restarts);
  const resultRef = useFocusWhen<HTMLDivElement>(checked);
  const keyRef = useFocusWhen<HTMLElement>(revealed);
  const score = scoreSequence(items, order);
  const rows = order.map(id => byId.get(id)!);
  // The instruction is already the page lead; repeat the prompt only when it adds something.
  const prompt = activity.content.prompt.trim();
  const showPrompt = prompt !== '' && prompt !== activity.instructions.trim();

  function move(index: number, direction: -1 | 1) {
    const row = rows[index];
    setOrder(prev => moveSequence(prev, index, direction));
    setNotice(tf(locale, 'announceMoved', { card: row.text, pos: index + direction + 1, total: rows.length }));
    keepFocus(row.id, direction === -1 ? 'up' : 'down');
  }
  function dropped(event: DragEndEvent) {
    const from = order.indexOf(String(event.active.id)), to = event.over ? order.indexOf(String(event.over.id)) : -1;
    if (checked || from < 0 || to < 0 || from === to) return;
    setOrder(prev => arrayMove(prev, from, to));
    setNotice(tf(locale, 'announceMoved', { card: rows[from].text, pos: to + 1, total: rows.length }));
  }
  function retry() {
    setOrder(startSequence(items)); setChecked(false); setRevealed(false); setNotice('');
    setRestarts(n => n + 1);
  }
  return <div className="activity-board" ref={boardRef}>
    {showPrompt && <p className="lead play-prompt" lang={lang}>{activity.content.prompt}</p>}
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <div className={'sequence-compare' + (revealed ? ' two' : '')}>
      <div className="sequence-mine">
        {revealed && <h3>{u(locale, 'yourOrder')}</h3>}
        <DragArea onEnd={dropped} overlay={null}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ol className="seq-rows sequence-list" role="list" ref={listRef}>{rows.map((row, index) => <SequenceRow key={row.id} id={row.id} text={row.text} lang={lang}
              index={index} last={index === rows.length - 1} checked={checked} right={checked ? score.positions[index].correct : null}
              correctWord={t(locale, 'correct')} wrongWord={t(locale, 'wrong')}
              upLabel={t(locale, 'up') + ': ' + row.text} downLabel={t(locale, 'down') + ': ' + row.text} onMove={direction => move(index, direction)} />)}</ol>
          </SortableContext>
        </DragArea>
      </div>
      {revealed && <section className="activity-key" tabIndex={-1} ref={keyRef} aria-labelledby={uid + 'key'}><h3 id={uid + 'key'}>{t(locale, 'answerKey')}</h3>
        <ol lang={lang}>{items.map(item => <li key={item.id}>{item.text}</li>)}</ol>
        {activity.content.explanation && <p lang={lang}>{activity.content.explanation}</p>}
      </section>}
    </div>
    <div className="row activity-controls">{!checked
      ? <button type="button" className="button primary" onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
      : <><div role="status" tabIndex={-1} ref={resultRef}>{t(locale, 'result')}: {score.correct} {t(locale, 'of')} {score.total} {t(locale, 'correct')}</div>
        <button type="button" className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
        <button type="button" className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button></>}
    </div>
  </div>;
}
