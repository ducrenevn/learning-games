import { useId, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { t, tf } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { moveKey, useFocusFirstOnChange, useFocusWhen, useMoveFocus } from '../../shared/activities/focus';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { moveSequence, scoreSequence, startSequence } from './engine';
import type { SequenceActivity } from './model';

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
        <ol className="seq-rows sequence-list" role="list" ref={listRef}>{rows.map((row, index) => {
          const right = checked ? score.positions[index].correct : null;
          return <li key={row.id} className={'seq-row sequence-card' + (right === true ? ' good' : right === false ? ' bad' : '')}>
            <span className="seq-num" aria-hidden="true">{index + 1}</span>
            <div className="sequence-card-copy"><span lang={lang}>{row.text}</span>
              {checked && <strong className="activity-status"><span aria-hidden="true">{right ? '✓' : '✗'}</span> {right ? t(locale, 'correct') : t(locale, 'wrong')}</strong>}
            </div>
            <div className="seq-tools">
              <button type="button" className="icon-button" disabled={checked || index === 0} onClick={() => move(index, -1)}
                data-move={moveKey(row.id, 'up')} aria-label={t(locale, 'up') + ': ' + row.text}><ArrowUp size={18} aria-hidden="true"/></button>
              <button type="button" className="icon-button" disabled={checked || index === rows.length - 1} onClick={() => move(index, 1)}
                data-move={moveKey(row.id, 'down')} aria-label={t(locale, 'down') + ': ' + row.text}><ArrowDown size={18} aria-hidden="true"/></button>
            </div>
          </li>;
        })}</ol>
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
