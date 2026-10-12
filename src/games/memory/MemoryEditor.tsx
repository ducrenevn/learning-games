import { useState } from 'react';
import type { EditorProps } from '../../shared/activities/Workspace';
import { t } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { fromMemoryPairs, type MemoryActivity } from './activity';
import { parsePairs, examplePairs } from './engine/pairs';

function nextPairId(ids: string[]) {
  let n = 1;
  while (ids.includes(`pair-${n}`)) n++;
  return `pair-${n}`;
}
const text = {
  de: { pairs: 'Paare', left: 'Karte A', right: 'Karte B', category: 'Kategorie (optional)', add: 'Paar hinzufügen',
    bulk: 'Paare aus einer Textliste übernehmen (optional)', bulkHelp: 'Eine Zeile je Paar: LINKS | RECHTS | KATEGORIE (optional)',
    replace: 'Textliste übernehmen', replaceWarning: 'Alle bisherigen Paare ersetzen?', bad: 'Bitte Textliste korrigieren:', sample: 'Beispiel einfügen' },
  en: { pairs: 'Pairs', left: 'Card A', right: 'Card B', category: 'Category (optional)', add: 'Add pair',
    bulk: 'Paste a pair list (optional)', bulkHelp: 'One pair per line: LEFT | RIGHT | CATEGORY (optional)',
    replace: 'Use text list', replaceWarning: 'Replace all current pairs?', bad: 'Please correct the pair list:', sample: 'Insert example' },
  vi: { pairs: 'Các cặp', left: 'Thẻ A', right: 'Thẻ B', category: 'Nhóm (tùy chọn)', add: 'Thêm cặp',
    bulk: 'Dán danh sách cặp thẻ (tùy chọn)', bulkHelp: 'Mỗi dòng: TRÁI | PHẢI | NHÓM (tùy chọn)',
    replace: 'Dùng danh sách', replaceWarning: 'Thay thế toàn bộ cặp hiện tại?', bad: 'Hãy sửa danh sách:', sample: 'Chèn ví dụ' },
} as const;

export function MemoryEditor({ activity, onChange, locale, field }: EditorProps<MemoryActivity>) {
  const [legacy, setLegacy] = useState('');
  const [legacyErrors, setLegacyErrors] = useState<string[]>([]);
  const words = text[locale];
  const pairs = activity.content.pairs;
  const update = (next: MemoryActivity['content']['pairs']) => onChange({ ...activity, content: { pairs: next } });
  const useLegacy = () => {
    const parsed = parsePairs(legacy);
    if (parsed.errors.length || parsed.pairs.length < 1 || parsed.pairs.length > 16 || parsed.pairs.some(p => (p.category?.length ?? 0) > 80)) {
      setLegacyErrors(parsed.errors.length ? parsed.errors : [t(locale, 'invalid')]); return;
    }
    if (!window.confirm(words.replaceWarning)) return;
    // validate step prevents publishing an invalid or duplicated converted activity.
    update(fromMemoryPairs(parsed.pairs, activity.title).content.pairs);
    setLegacyErrors([]);
  };
  return <div className="activity-editor activity-ux-editor-section">
    <p className="muted">{words.pairs}: {pairs.length} / 16</p>
    {pairs.map((pair, index) => <div className="activity-edit-row activity-memory-pair" key={pair.id}>
      <label className="activity-field">{words.left} · {index + 1}
        <input className="field" value={pair.left} maxLength={80} {...field('content.pairs[' + index + '].left')} onChange={e => update(pairs.map(p => p.id === pair.id ? { ...p, left: e.target.value } : p))}/>
      </label>
      <label className="activity-field">{words.right} · {index + 1}
        <input className="field" value={pair.right} maxLength={80} {...field('content.pairs[' + index + '].right')} onChange={e => update(pairs.map(p => p.id === pair.id ? { ...p, right: e.target.value } : p))}/>
      </label>
      <label className="activity-field">{words.category}
        <input className="field" value={pair.category ?? ''} maxLength={80} onChange={e => update(pairs.map(p => {
          if (p.id !== pair.id) return p;
          const copy = { ...p }; if (e.target.value) copy.category = e.target.value; else delete copy.category;
          return copy;
        }))}/>
      </label>
      <button type="button" className="button secondary" disabled={pairs.length <= 1}
        aria-label={`${t(locale, 'remove')} ${index + 1}`} onClick={() => update(pairs.filter(p => p.id !== pair.id))}>{t(locale, 'remove')}</button>
    </div>)}
    <button type="button" className="button secondary" disabled={pairs.length >= 16}
      onClick={() => update([...pairs, { id: nextPairId(pairs.map(p => p.id)), left: '', right: '' }])}>{words.add}</button>
    <details className="activity-ux-disclosure"><summary>{words.bulk}</summary>
      <p className="muted small">{words.bulkHelp}</p>
      <textarea className="field" rows={7} value={legacy} onChange={e => {setLegacy(e.target.value);setLegacyErrors([]);}}/>
      <div className="row"><button className="button secondary" type="button" onClick={() => setLegacy(examplePairs)}>{words.sample}</button>
      <button className="button primary" type="button" disabled={!legacy.trim()} onClick={useLegacy}>{words.replace}</button></div>
      {legacyErrors.length > 0 && <div className="error" role="alert">{words.bad}<ul>{legacyErrors.map((e,i) => <li key={i}>{e}</li>)}</ul></div>}
    </details>
    <p className="muted small">{u(locale, 'localOnly')}</p>
  </div>;
}
