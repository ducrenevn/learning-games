import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import type { EditorProps } from '../../shared/activities/Workspace';
import { tf } from '../../shared/activities/i18n';
import { useListFocus } from '../../shared/activities/focus';
import { type MemoryActivity } from './activity';

type Pair = MemoryActivity['content']['pairs'][number];
const MAX_PAIRS = 16;
function nextPairId(ids: string[]) {
  let n = 1;
  while (ids.includes(`pair-${n}`)) n++;
  return `pair-${n}`;
}
const text = {
  de: { pairs: 'Paare', left: 'Karte A', right: 'Karte B', group: 'Gruppe', addGroup: '+ Gruppe', add: 'Paar hinzufügen', limit: 'Höchstens 16 Paare.',
    paste: 'Tipp: Mehrere Zeilen aus Excel, Word oder einer Liste („links | rechts“) direkt in eine Zelle einfügen.', pasted: 'Eingefügt: {n} Paare.', pastedCut: 'Eingefügt: {n} Paare – weitere passen nicht (höchstens 16).' },
  en: { pairs: 'Pairs', left: 'Card A', right: 'Card B', group: 'Group', addGroup: '+ Group', add: 'Add pair', limit: 'At most 16 pairs.',
    paste: 'Tip: paste several lines from Excel, Word or a list ("left | right") straight into a cell.', pasted: 'Pasted {n} pairs.', pastedCut: 'Pasted {n} pairs – the rest do not fit (at most 16).' },
  vi: { pairs: 'Các cặp', left: 'Thẻ A', right: 'Thẻ B', group: 'Nhóm', addGroup: '+ Nhóm', add: 'Thêm cặp', limit: 'Tối đa 16 cặp.',
    paste: 'Mẹo: dán nhiều dòng từ Excel, Word hoặc danh sách ("trái | phải") thẳng vào một ô.', pasted: 'Đã dán {n} cặp.', pastedCut: 'Đã dán {n} cặp – phần còn lại không vừa (tối đa 16).' },
} as const;

/** Spreadsheet and plain-text lists: tab- or pipe-separated, one pair per line, optional third column = group. */
export function parsePastedRows(raw: string): { left: string; right: string; category?: string }[] | null {
  if (!/[\n\t|]/.test(raw.trim())) return null;
  const rows = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const cells = (line.includes('\t') ? line.split('\t') : line.split('|')).map(cell => cell.trim());
    return { left: cells[0] ?? '', right: cells[1] ?? '', ...(cells[2] ? { category: cells[2] } : {}) };
  });
  return rows.length ? rows : null;
}

/** Memory is edited as a table, because the relationship between the two sides is the data (a grid would hide it). */
export function MemoryEditor({ activity, onChange, locale, field }: EditorProps<MemoryActivity>) {
  const words = text[locale];
  const pairs = activity.content.pairs;
  const list = useListFocus<HTMLDivElement>();
  const [groupOpen, setGroupOpen] = useState<ReadonlySet<string>>(() => new Set());
  const [notice, setNotice] = useState('');
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const update = (next: Pair[]) => onChange({ ...activity, content: { pairs: next } });
  const patch = (id: string, change: Partial<Pair>) => update(pairs.map(p => p.id === id ? { ...p, ...change } : p));
  const setCategory = (id: string, value: string) => update(pairs.map(p => {
    if (p.id !== id) return p;
    const copy = { ...p };
    if (value) copy.category = value; else delete copy.category;
    return copy;
  }));
  const add = () => { if (pairs.length >= MAX_PAIRS) return; update([...pairs, { id: nextPairId(pairs.map(p => p.id)), left: '', right: '' }]); list.rowAdded(); };
  const remove = (id: string) => { update(pairs.filter(p => p.id !== id)); list.rowRemoved(); };
  function paste(event: ClipboardEvent<HTMLInputElement>, index: number, side: 'left' | 'right') {
    const rows = parsePastedRows(event.clipboardData.getData('text'));
    if (!rows) return; // a single value pastes into the cell as usual
    event.preventDefault();
    const next = [...pairs];
    const used = next.map(p => p.id);
    let written = 0;
    const singleColumn = rows.every(row => !row.right);
    rows.forEach((row, offset) => {
      const at = index + offset;
      if (at >= MAX_PAIRS) return;
      // A single pasted column fills only the column it was pasted into; two or three columns fill A, B and the group.
      const incoming = singleColumn ? (side === 'left' ? { left: row.left } : { right: row.left }) : { left: row.left, right: row.right };
      const group = row.category ? { category: row.category } : {};
      if (next[at]) next[at] = { ...next[at], ...incoming, ...group };
      else { const id = nextPairId(used); used.push(id); next[at] = { id, left: '', right: '', ...incoming, ...group }; }
      written++;
    });
    update(next);
    setNotice(tf0(rows.length > written ? words.pastedCut : words.pasted, written));
  }
  function enter(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const nextPair = pairs[index + 1];
    if (nextPair) inputs.current.get(nextPair.id + ':left')?.focus();
    else add();
  }
  const rowOf = (n: number) => <span className="sr-only"> ({words.pairs} {n + 1})</span>;
  return <div className="activity-editor pairs-editor">
    <div className="pairs-head"><strong>{words.pairs}</strong><span className="muted small" aria-live="polite">{pairs.length} / {MAX_PAIRS}</span></div>
    <p className="sr-only" role="status" aria-live="polite">{notice}</p>
    <div className="pairs-table" ref={list.rootRef} role="group" aria-label={words.pairs}>
      <div className="pairs-row pairs-labels" aria-hidden="true"><span/><b>{words.left}</b><span/><b>{words.right}</b><b>{words.group}</b><span/></div>
      {pairs.map((pair, index) => <div className="pairs-row" data-row key={pair.id}>
        <span className="pairs-num" aria-hidden="true">{index + 1}</span>
        <label className="pairs-cell pairs-a"><span className="sr-only">{words.left} · {index + 1}</span>
          <input className="field" value={pair.left} maxLength={80} placeholder={words.left} {...field('content.pairs[' + index + '].left')}
            ref={el => { if (el) inputs.current.set(pair.id + ':left', el); else inputs.current.delete(pair.id + ':left'); }}
            onPaste={e => paste(e, index, 'left')} onChange={e => patch(pair.id, { left: e.target.value })}/>
        </label>
        <i className="pairs-link" aria-hidden="true">↔</i>
        <label className="pairs-cell pairs-b"><span className="sr-only">{words.right} · {index + 1}</span>
          <input className="field" value={pair.right} maxLength={80} placeholder={words.right} {...field('content.pairs[' + index + '].right')}
            onKeyDown={e => enter(e, index)} onPaste={e => paste(e, index, 'right')} onChange={e => patch(pair.id, { right: e.target.value })}/>
        </label>
        <div className="pairs-group">{pair.category !== undefined || groupOpen.has(pair.id)
          ? <label><span className="sr-only">{words.group}{rowOf(index)}</span><input className="field" value={pair.category ?? ''} maxLength={80} placeholder={words.group}
              {...field('content.pairs[' + index + '].category')} onChange={e => setCategory(pair.id, e.target.value)}/></label>
          : <button type="button" className="group-chip" aria-label={words.addGroup + ': ' + words.pairs + ' ' + (index + 1)}
              onClick={() => setGroupOpen(prev => new Set(prev).add(pair.id))}>{words.addGroup}</button>}</div>
        <button type="button" className="icon-button" disabled={pairs.length <= 1} aria-label={tf(locale, 'removeRow', { what: words.pairs + ' ' + (index + 1) })}
          onClick={() => remove(pair.id)}>×</button>
      </div>)}
      <button type="button" className="pairs-add" data-add disabled={pairs.length >= MAX_PAIRS} onClick={add}>＋ {words.add}</button>
      {pairs.length >= MAX_PAIRS && <p className="muted small">{words.limit}</p>}
    </div>
    <p className="muted small">{words.paste}</p>
  </div>;
}
function tf0(template: string, n: number) { return template.replace('{n}', String(n)); }
