import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import type { ActivityBase, ActivityType, Locale, PlayMode, Validator, Issue } from './contract';
import { MAX_BYTES } from './contract';
import { downloadActivity, serializeActivity, validateImported } from './portable';
import { t, issueText } from './i18n';
import type { MessageKey } from './i18n';

export interface EditorProps<T> { activity: T; onChange: (next: T) => void; locale: Locale }
export interface PlayerProps<T> { activity: T; mode: PlayMode; locale: Locale }
interface Props<T extends ActivityBase<ActivityType, unknown>> {
  kind: ActivityType;
  makeBlank: () => T;
  validate: Validator<T>;
  Editor: ComponentType<EditorProps<T>>;
  Player: ComponentType<PlayerProps<T>>;
}

export function ActivityWorkspace<T extends ActivityBase<ActivityType, unknown>>({ kind, makeBlank, validate, Editor, Player }: Props<T>) {
  const [locale, setLocale] = useState<Locale>('de');
  const [draft, setDraft] = useState<T>(makeBlank);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<PlayMode | 'edit'>('edit');
  const [playing, setPlaying] = useState<T | null>(null);
  const [importIssues, setImportIssues] = useState<Issue[]>([]);
  const [playCounter, setPlayCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const result = validate(draft);
  const issues = result.issues;
  const name = kind === 'sort' ? 'Sort' : kind === 'sequence' ? 'Sequence' : 'Language Detective';

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  function update(next: T) {
    setDraft(next);
    setDirty(true);
    setImportIssues([]);
  }
  function enter(nextMode: PlayMode) {
    const checked = validate(draft);
    if (!checked.value || checked.issues.length) { setMode('edit'); return; }
    setPlaying(structuredClone(checked.value));
    setPlayCounter(v => v + 1);
    setMode(nextMode);
  }
  function create() {
    if (dirty && !window.confirm(t(locale, 'confirmNew'))) return;
    setDraft(makeBlank());
    setDirty(false);
    setMode('edit');
    setImportIssues([]);
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (dirty && !window.confirm(t(locale, 'unsavedWarn'))) return;
    if (file.size > MAX_BYTES) { setImportIssues([{ path: 'file', code: 'size' }]); return; }
    try {
      const read = validateImported(await file.text(), kind);
      if (!read.value || read.issues.length) { setImportIssues(read.issues); return; }
      setDraft(read.value as T);
      setDirty(false);
      setMode('edit');
      setImportIssues([]);
    } catch {
      setImportIssues([{ path: 'file', code: 'json' }]);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }
  function exportFile() {
    const output = serializeActivity(draft, validate);
    if (!output.value) { setImportIssues(output.issues); return; }
    downloadActivity(kind + '_' + draft.id + '.json', output.value);
    setDirty(false);
    setImportIssues([]);
  }
  function commonField(field: 'id' | 'title' | 'targetLanguage' | 'instructions', key: MessageKey) {
    return <label className="activity-field" key={field}>{t(locale, key)}
      {field === 'instructions' ? <textarea className="field" rows={3} value={draft[field]} onChange={e => update({ ...draft, [field]: e.target.value })} />
        : <input className="field" value={draft[field]} onChange={e => update({ ...draft, [field]: e.target.value })} />}
    </label>;
  }
  return <main className={'page activity-page' + (mode === 'presentation' ? ' activity-projected' : '')}>
    <div className="activity-head">
      <div><Link to="/" className="back-link" onClick={e => { if (dirty && !window.confirm(t(locale, 'unsavedWarn'))) e.preventDefault(); }}>← Learning Games</Link>
        <div className="eyebrow">LG · {t(locale, 'header')}</div><h1>{name}</h1>
      </div>
      <label className="activity-language">{t(locale, 'language')}
        <select className="field" aria-label={t(locale, 'language')} value={locale} onChange={e => setLocale(e.target.value as Locale)}>
          <option value="de">Deutsch</option><option value="en">English</option><option value="vi">Tiếng Việt</option>
        </select>
      </label>
    </div>
    <nav className="activity-toolbar" aria-label={t(locale, 'mode')}>
      <button className={'button ' + (mode === 'edit' ? 'primary' : 'secondary')} onClick={() => setMode('edit')}>{t(locale, 'edit')}</button>
      <button className="button secondary" disabled={!!issues.length} onClick={() => enter('preview')}>{t(locale, 'preview')}</button>
      <button className="button secondary" disabled={!!issues.length} onClick={() => enter('presentation')}>{t(locale, 'present')}</button>
      <button className="button secondary" disabled={!!issues.length} onClick={() => enter('independent')}>{t(locale, 'practice')}</button>
    </nav>
    {mode === 'edit' ? <>
      <div className="activity-toolbar">
        <button className="button secondary" onClick={create}>{t(locale, 'create')}</button>
        <label className="button secondary activity-upload">{t(locale, 'import')}
          <input ref={inputRef} type="file" accept=".json,application/json" aria-label={t(locale, 'chooseFile')} onChange={e => void importFile(e.target.files?.[0])} />
        </label>
        <button className="button primary" disabled={!!issues.length} onClick={exportFile}>{t(locale, 'export')}</button>
        <span className="muted small" role="status">{dirty ? t(locale, 'unsaved') : t(locale, 'saved')}</span>
      </div>
      <section className="panel padded activity-authoring">
        <div className="activity-meta">
          {commonField('id', 'activityId')}{commonField('title', 'title')}
          {commonField('targetLanguage', 'targetLanguage')}{commonField('instructions', 'instructions')}
        </div>
        <Editor activity={draft} onChange={update} locale={locale} />
      </section>
      {(importIssues.length > 0 || issues.length > 0) &&
        <section className="error activity-errors" role="alert"><strong>{t(locale, 'invalid')}</strong>
          <ul>{[...importIssues, ...issues].map((issue, i) => <li key={i}>{issueText(issue, locale)}</li>)}</ul>
        </section>}
      <p className="muted small">{t(locale, 'noCloud')}</p>
    </> : playing ? <section className="panel padded activity-play" key={kind + ':' + playCounter}>
      <div className="eyebrow">{t(locale, mode === 'preview' ? 'modePreview' : mode === 'presentation' ? 'modePresentation' : 'modeIndependent')}</div>
      <h2>{playing.title}</h2><p className="lead">{playing.instructions}</p>
      <Player activity={playing} mode={mode} locale={locale}/>
      <div className="row"><button className="button secondary" onClick={() => setMode('edit')}>{t(locale, 'back')}</button>
        <button className="button secondary" onClick={() => enter(mode)}>{t(locale, 'reset')}</button></div>
      <p className="muted small">{t(locale, 'noCloud')}</p>
    </section> : null}
  </main>;
}
