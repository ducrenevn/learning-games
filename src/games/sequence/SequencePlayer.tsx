import { useState } from 'react';
import { t } from '../../shared/activities/i18n';
import type { PlayerProps } from '../../shared/activities/Workspace';
import { moveSequence, scoreSequence, startSequence } from './engine';
import type { SequenceActivity } from './model';

export function SequencePlayer({ activity, locale }: PlayerProps<SequenceActivity>) {
  const [initial] = useState(() => startSequence(activity.content.items));
  const [order, setOrder] = useState(initial);
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const score = scoreSequence(activity.content.items, order);
  const rows = order.map(id => activity.content.items.find(i => i.id === id)!);
  function retry() { setOrder(startSequence(activity.content.items)); setChecked(false); setRevealed(false); }
  return <div className="activity-board">
    <p className="lead">{activity.content.prompt}</p>
    <ol className="sequence-list">{rows.map((row, index) => <li key={row.id} className="sequence-card">
      <div className="sequence-card-copy"><span>{row.text}</span>
        {checked && <strong className="activity-status">{score.positions[index].correct ? t(locale, 'correct') : t(locale, 'wrong')}</strong>}
      </div>
      <div className="activity-item-tools">
        <button className="button secondary" disabled={checked || index === 0} onClick={() => setOrder(prev => moveSequence(prev, index, -1))}
          aria-label={t(locale, 'up') + ': ' + row.text}>↑</button>
        <button className="button secondary" disabled={checked || index === rows.length - 1} onClick={() => setOrder(prev => moveSequence(prev, index, 1))}
          aria-label={t(locale, 'down') + ': ' + row.text}>↓</button>
      </div>
    </li>)}</ol>
    <div className="row activity-controls">{!checked
      ? <button className="button primary" onClick={() => setChecked(true)}>{t(locale, 'check')}</button>
      : <><div role="status">{t(locale, 'result')}: {score.correct} {t(locale, 'of')} {score.total} {t(locale, 'correct')}</div>
        <button className="button secondary" onClick={retry}>{t(locale, 'retry')}</button>
        <button className="button primary" disabled={revealed} onClick={() => setRevealed(true)}>{t(locale, 'reveal')}</button></>}
    </div>
    {revealed && <section className="activity-key"><h3>{t(locale, 'answerKey')}</h3>
      <ol>{activity.content.items.map(item => <li key={item.id}>{item.text}</li>)}</ol>
      {activity.content.explanation && <p>{activity.content.explanation}</p>}
    </section>}
  </div>;
}
