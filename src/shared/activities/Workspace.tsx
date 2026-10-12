import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import type { ActivityBase, ActivityType, Locale, PlayMode, Validator, Issue } from './contract';
import { MAX_BYTES } from './contract';
import { downloadActivity, serializeActivity, validateImported } from './portable';
import { t, tf, issueText } from './i18n';
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
type EditorMode = PlayMode | 'edit';
interface FileProblem { action: 'import' | 'export'; issues: Issue[] }

/** Long hostile files can produce many problems; list the first ones and summarise the rest. */
const MAX_LISTED = 25;
function IssueList({ issues, locale }: { issues: Issue[]; locale: Locale }) {
  const shown = issues.slice(0, MAX_LISTED);
  return <ul>
    {shown.map((issue, i) => <li key={i}>{issueText(issue, locale)}</li>)}
    {issues.length > shown.length && <li>{tf(locale, 'moreIssues', { n: issues.length - shown.length })}</li>}
  </ul>;
}

export function ActivityWorkspace<T extends ActivityBase<ActivityType, unknown>>({ kind, makeBlank, validate, Editor, Player }: Props<T>) {
  const [locale, setLocale] = useState<Locale>('de');
  const [draft, setDraft] = useState<T>(makeBlank);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [playing, setPlaying] = useState<T | null>(null);
  const [fileProblem, setFileProblem] = useState<FileProblem | null>(null);
  const [playCounter, setPlayCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const problemsRef = useRef<HTMLElement>(null);
  /** Counts edits to the draft so an import that was slow to read can tell whether the teacher edited meanwhile. */
  const edits = useRef(0);
  const result = validate(draft);
  const issues = result.issues;
  const name = kind === 'sort' ? 'Sort' : kind === 'sequence' ? 'Sequence' : 'Language Detective';

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  // Interface language only; authored content carries its own `lang` (the activity's target language).
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => { document.documentElement.lang = previous; };
  }, [locale]);

  function update(next: T) {
    edits.current++;
    setDraft(next);
    setDirty(true);
    setFileProblem(null);
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
    edits.current++;
    setDraft(makeBlank());
    setDirty(false);
    setMode('edit');
    setFileProblem(null);
  }
  async function importFile(file?: File) {
    const input = inputRef.current;
    // Always clear the chooser so the same file can be selected again after an error or a declined confirmation.
    const finish = () => { if (input) input.value = ''; };
    if (!file) return;
    if (file.size > MAX_BYTES) { setFileProblem({ action: 'import', issues: [{ path: 'file', code: 'size' }] }); finish(); return; }
    if (dirty && !window.confirm(t(locale, 'unsavedWarn'))) { finish(); return; }
    const editsAtStart = edits.current;
    let text: string;
    try { text = await file.text(); }
    catch { setFileProblem({ action: 'import', issues: [{ path: 'file', code: 'json' }] }); finish(); return; }
    // The read is asynchronous: the teacher may have typed since the file was chosen.
    if (edits.current !== editsAtStart && !window.confirm(t(locale, 'unsavedWarn'))) { finish(); return; }
    const read = validateImported(text, kind);
    finish();
    if (!read.value || read.issues.length) { setFileProblem({ action: 'import', issues: read.issues }); return; }
    edits.current++;
    setDraft(read.value as T);
    setDirty(false);
    setMode('edit');
    setFileProblem(null);
  }
  function exportFile() {
    const output = serializeActivity(draft, validate);
    if (!output.value) { setFileProblem({ action: 'export', issues: output.issues }); return; }
    downloadActivity(kind + '_' + draft.id + '.json', output.value);
    setDirty(false);
    setFileProblem(null);
  }
  function commonField(field: 'id' | 'title' | 'targetLanguage' | 'instructions', key: MessageKey) {
    return <label className="activity-field" key={field}>{t(locale, key)}
      {field === 'instructions' ? <textarea className="field" rows={3} value={draft[field]} onChange={e => update({ ...draft, [field]: e.target.value })} />
        : <input className="field" value={draft[field]} onChange={e => update({ ...draft, [field]: e.target.value })} />}
    </label>;
  }
  function modeButton(target: PlayMode, label: MessageKey) {
    const active = mode === target;
    return <button type="button" className={'button ' + (active ? 'primary' : 'secondary')} aria-current={active ? 'true' : undefined}
      disabled={!!issues.length} onClick={() => { if (!active) enter(target); }}>{t(locale, label)}</button>;
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
      <button type="button" className={'button ' + (mode === 'edit' ? 'primary' : 'secondary')} aria-current={mode === 'edit' ? 'true' : undefined}
        onClick={() => setMode('edit')}>{t(locale, 'edit')}</button>
      {modeButton('preview', 'preview')}
      {modeButton('presentation', 'present')}
      {modeButton('independent', 'practice')}
    </nav>
    {mode === 'edit' ? <>
      <div className="activity-toolbar">
        <button type="button" className="button secondary" onClick={create}>{t(locale, 'create')}</button>
        <label className="button secondary activity-upload">{t(locale, 'import')}
          <input ref={inputRef} type="file" accept=".json,application/json" aria-label={t(locale, 'chooseFile')} onChange={e => void importFile(e.target.files?.[0])} />
        </label>
        <button type="button" className="button primary" disabled={!!issues.length} onClick={exportFile}>{t(locale, 'export')}</button>
        {issues.length > 0 && <button type="button" className="button subtle" onClick={() => problemsRef.current?.focus()}>{tf(locale, 'showProblems', { n: issues.length })}</button>}
        <span className="muted small" role="status">{dirty ? t(locale, 'unsaved') : t(locale, 'saved')}</span>
      </div>
      {fileProblem &&
        <section className="error activity-errors" role="alert"><strong>{t(locale, fileProblem.action === 'import' ? 'loadError' : 'exportError')}</strong>
          <IssueList issues={fileProblem.issues} locale={locale} />
          {fileProblem.action === 'import' && <p className="small">{t(locale, 'importKept')}</p>}
        </section>}
      <section className="panel padded activity-authoring">
        <div className="activity-meta">
          {commonField('id', 'activityId')}{commonField('title', 'title')}
          {commonField('targetLanguage', 'targetLanguage')}{commonField('instructions', 'instructions')}
        </div>
        <Editor activity={draft} onChange={update} locale={locale} />
      </section>
      {issues.length > 0 &&
        <section id="activity-problems" ref={problemsRef} tabIndex={-1} className="error activity-errors" aria-label={t(locale, 'invalid')}>
          <strong>{t(locale, 'invalid')}</strong>
          <IssueList issues={issues} locale={locale} />
        </section>}
      <p className="muted small">{t(locale, 'noCloud')}</p>
    </> : playing ? <section className="panel padded activity-play" key={kind + ':' + playCounter}>
      <div className="eyebrow">{t(locale, mode === 'preview' ? 'modePreview' : mode === 'presentation' ? 'modePresentation' : 'modeIndependent')}</div>
      <h2 lang={playing.targetLanguage}>{playing.title}</h2><p className="lead" lang={playing.targetLanguage}>{playing.instructions}</p>
      <Player activity={playing} mode={mode} locale={locale}/>
      <div className="row"><button type="button" className="button secondary" onClick={() => setMode('edit')}>{t(locale, 'back')}</button>
        <button type="button" className="button secondary" onClick={() => enter(mode)}>{t(locale, 'reset')}</button></div>
      <p className="muted small">{t(locale, 'noCloud')}</p>
    </section> : null}
  </main>;
}
