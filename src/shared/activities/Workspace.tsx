import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type DragEvent } from 'react';
import { Link, useBlocker } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Download, FileUp, PencilLine, Presentation, Play, UsersRound, AlertTriangle } from 'lucide-react';
import type { ActivityBase, ActivityType, Locale, PlayMode, Validator, Issue } from './contract';
import { MAX_BYTES } from './contract';
import { downloadActivity, serializeActivity, validateImported } from './portable';
import { t, issueText } from './i18n';
import { count, u } from './uxCopy';
import { friendlyIssue, makeFieldHelpers, type FieldAttrs, type RegionAttrs } from './issues';
import { AutoTextarea, TargetLanguageField } from './canvasParts';
import { useLocale } from '../locale/LocaleProvider';

export interface EditorProps<T> {
  activity: T; onChange: (next: T) => void; locale: Locale;
  /** Spread onto inputs: tags the validator path, and marks the input invalid once the teacher tried to play. */
  field: (path: string) => FieldAttrs;
  /** Same for list containers and other non-input regions. */
  region: (path: string) => RegionAttrs;
}
export interface PlayerProps<T> { activity: T; mode: PlayMode; locale: Locale }
export interface PreviewProps<T> { activity: T; locale: Locale }
interface Props<T extends ActivityBase<ActivityType, unknown, 1 | 2>> {
  kind: ActivityType;
  makeBlank: () => T;
  validate: Validator<T>;
  Editor: ComponentType<EditorProps<T>>;
  Player: ComponentType<PlayerProps<T>>;
  /** Read-only, human-readable rendering of an activity (import review). */
  Preview: ComponentType<PreviewProps<T>>;
  /** Games whose editing model differs from the portable file (Language Detective): file -> model on import, model -> file on download. */
  fromFile?: (file: never) => T;
  toFile?: (activity: T) => unknown;
  /** Optional existing Memory-only room flow; never called by local preview or import. */
  onOnline?: (activity: T) => Promise<void>;
  joinHref?: string;
}
type Screen = 'choose' | 'import' | 'edit' | 'play';
const LABELS: Record<ActivityType, string> = { sort:'Sort', sequence:'Sequence', 'language-detective':'Language Detective', memory:'Memory' };
const RULE: Record<ActivityType, 'ruleSort' | 'ruleSequence' | 'ruleDetective' | 'ruleMemory'> = { sort:'ruleSort', sequence:'ruleSequence', 'language-detective':'ruleDetective', memory:'ruleMemory' };
const LIMIT = 20;

function cleanSlug(value: string, fallback: string) {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '') || fallback;
}
function IssueList({ issues, locale }: { issues: readonly Issue[]; locale: Locale }) {
  return <ul>{issues.slice(0,LIMIT).map((i,index) => <li key={index}>{issueText(i,locale)}</li>)}
    {issues.length > LIMIT && <li>+{issues.length-LIMIT}</li>}</ul>;
}
/** "9 Karten · 3 Kategorien" — what a teacher expects to see on a file before opening it. */
function countsOf(kind: ActivityType, content: unknown, locale: Locale) {
  const c = content as Record<string, unknown[]>;
  switch (kind) {
    case 'sort': return count(locale,'nCard1','nCards',c.items.length) + ' · ' + count(locale,'nCategory1','nCategories',c.categories.length);
    case 'sequence': return count(locale,'nStep1','nSteps',c.items.length);
    case 'memory': return count(locale,'nPair1','nPairs',c.pairs.length);
    default: {
      const tasks = (c.tasks ?? [{ issues: c.issues }]) as { issues: unknown[] }[];
      return count(locale,'nSentence1','nSentences',tasks.length) + ' · ' + u(locale,'nErrors',{n:tasks.reduce((sum,task)=>sum+task.issues.length,0)});
    }
  }
}

/** One local activity: choose -> single authoring canvas -> detached play. No hosted state. */
export function ActivityWorkspace<T extends ActivityBase<ActivityType, unknown, 1 | 2>>({ kind, makeBlank, validate, Editor, Player, Preview, fromFile, toFile, onOnline, joinHref }: Props<T>) {
  const { locale } = useLocale();
  const [screen,setScreen] = useState<Screen>('choose');
  const [mode,setMode] = useState<PlayMode>('independent');
  const [draft,setDraft] = useState<T>(makeBlank);
  const [dirty,setDirty] = useState(false);
  const [origin,setOrigin] = useState<'new'|'file'>('new');
  const [savedAt,setSavedAt] = useState<Date|null>(null);
  const [autoId,setAutoId] = useState(true);
  const [attempted,setAttempted] = useState(false);
  // Problems that existed at the last attempt. Only these are marked red; a problem added later (a new blank row) waits
  // for the next attempt, while the problem summary still counts it.
  const [flagged,setFlagged] = useState<string[]>([]);
  const [attemptToken,setAttemptToken] = useState(0);
  const [advancedOpen,setAdvancedOpen] = useState(false);
  const [importCandidate,setImportCandidate] = useState<T|null>(null);
  const [importName,setImportName] = useState('');
  const [fileError,setFileError] = useState<Issue[]|null>(null);
  const [fileBusy,setFileBusy] = useState(false);
  const [dragging,setDragging] = useState(false);
  const [playing,setPlaying] = useState<T|null>(null);
  const [onlineBusy,setOnlineBusy] = useState(false);
  const [onlineError,setOnlineError] = useState('');
  const [playCounter,setPlayCounter] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const importToken = useRef(0);
  const issues = validate(draft).issues;
  const { field, region } = makeFieldHelpers(issues.filter(issue => flagged.includes(issue.path)), attempted);
  const isPlay = screen === 'play';
  const name = LABELS[kind];

  useEffect(() => {
    if (!dirty && !fileBusy && !importCandidate) return;
    const warn = (event:BeforeUnloadEvent) => {event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  },[dirty,fileBusy,importCandidate]);
  // Internal navigation (logo, homepage links, browser back/forward) is blocked like the browser close warning. Confirmed
  // discards reset the flag in the in-page flows, so the same unsaved work does not prompt twice.
  const unsaved = dirty || fileBusy || !!importCandidate;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => unsaved && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(dirty ? t(locale, 'unsavedWarn') : u(locale, 'discard'))) blocker.proceed();
    else blocker.reset();
  }, [blocker, dirty, locale]);
  // After a play/download attempt on an incomplete activity: focus the first flagged field (DOM order = reading order),
  // otherwise the problem summary, which names the first problem in the teacher's words.
  useLayoutEffect(() => {
    if (attemptToken === 0 || screen !== 'edit') return;
    const first = canvasRef.current?.querySelector<HTMLElement>('[aria-invalid="true"][data-path], [data-invalid="true"][data-path]');
    const target = first ?? problemRef.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'center', behavior: 'auto' });
  },[attemptToken,screen]);

  function change(next:T){setDraft(next);setDirty(true);}
  function markAttempt(found:Issue[]){setAttempted(true);setFlagged(found.map(issue=>issue.path));setAttemptToken(n=>n+1);}
  function titleChange(title:string) {
    change({...draft,title,id:autoId?cleanSlug(title,'new-'+kind):draft.id});
  }
  function requestDiscard() {return !dirty || window.confirm(t(locale,'unsavedWarn'));}
  function backToChoice() {
    if (!requestDiscard())return;
    importToken.current++;
    setDirty(false);setFileBusy(false);setFileError(null);setImportCandidate(null);setScreen('choose');
  }
  function backFromImport() {
    if((importCandidate || fileBusy) && !window.confirm(u(locale,'discard')))return;
    importToken.current++;setFileBusy(false);setImportCandidate(null);setFileError(null);setImportName('');setScreen('choose');
  }
  function startNew() {
    if (!requestDiscard())return;
    importToken.current++;
    setDraft(makeBlank());setAutoId(true);setDirty(false);setOrigin('new');setSavedAt(null);setAttempted(false);setFlagged([]);setAdvancedOpen(false);
    setFileError(null);setImportCandidate(null);setOnlineError('');setScreen('edit');
    queueMicrotask(() => titleRef.current?.focus());
  }
  function startImport() {
    importToken.current++;
    setImportCandidate(null);setFileError(null);setImportName('');setScreen('import');
  }
  async function loadFile(file?:File) {
    if(fileRef.current)fileRef.current.value='';
    if(!file)return;
    const token=++importToken.current;
    setImportCandidate(null);setFileError(null);setImportName(file.name);
    if(file.size>MAX_BYTES){setFileError([{path:'file',code:'size'}]);return;}
    if(!file.name.toLowerCase().endsWith('.json')) {setFileError([{path:'file',code:'format'}]);return;}
    setFileBusy(true);
    try {
      const text=await file.text();
      if(token!==importToken.current)return;
      const parsed=validateImported(text,kind);
      if(parsed.issues.length || !parsed.value){setFileError(parsed.issues);return;}
      setImportCandidate(fromFile ? fromFile(parsed.value as never) : parsed.value as T);
    } catch {
      if(token===importToken.current)setFileError([{path:'file',code:'json'}]);
    } finally {if(token===importToken.current)setFileBusy(false);}
  }
  function acceptFile() {
    if(!importCandidate || !requestDiscard())return;
    setDraft(structuredClone(importCandidate));setDirty(false);setAutoId(false);setOrigin('file');setSavedAt(null);
    setAttempted(false);setFlagged([]);setAdvancedOpen(false);setImportCandidate(null);setFileError(null);setOnlineError('');setScreen('edit');
  }
  /** Returns the validated activity, or flags the first problem (focus + explanation) and returns null. */
  function requireValid(): T | null {
    const result=validate(draft);
    if(result.value && !result.issues.length) return result.value;
    if(result.issues.some(issue=>issue.path==='id'))setAdvancedOpen(true);
    markAttempt(result.issues);
    return null;
  }
  function play(next:PlayMode) {
    const value=requireValid();
    if(!value)return;
    setPlaying(structuredClone(value));setPlayCounter(i=>i+1);setMode(next);setScreen('play');
  }
  function download() {
    if(!requireValid())return;
    const out=serializeActivity(draft,validate,toFile);
    if(!out.value)return;
    downloadActivity(kind+'_'+draft.id+'.json',out.value);
    setDirty(false);setSavedAt(new Date());
  }
  function createRoom() {
    if(onlineBusy||!onOnline)return;
    const value=requireValid();
    if(!value)return;
    const pairs=(value.content as {pairs?:unknown[]}).pairs;
    if(!pairs||pairs.length<2){setOnlineError(u(locale,'roomNeedsPairs'));return;}
    setOnlineBusy(true);setOnlineError('');
    void onOnline(structuredClone(value)).catch(e => setOnlineError(e instanceof Error ? e.message : u(locale,'onlineError'))).finally(() => setOnlineBusy(false));
  }
  const time=(date:Date)=>new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit'}).format(date);
  const status = dirty ? {tone:'dirty',text:u(locale,'statusUnsaved')}
    : savedAt ? {tone:'saved',text:u(locale,'statusDownloaded',{time:time(savedAt)})}
    : origin==='file' ? {tone:'neutral',text:u(locale,'statusImported')} : {tone:'neutral',text:u(locale,'statusNew')};
  const firstProblem = issues[0];

  const header=<header className="activity-ux-head">
    <div className="activity-ux-heading">
      {screen==='choose'?<Link className="back-link" to="/">← Learning Games</Link>
        :<button type="button" className="activity-ux-back" onClick={backFromImport}><ArrowLeft size={17}/>{u(locale,'backChoice')}</button>}
      <div className="eyebrow">LEARNING GAMES · {u(locale,'defaultType')}</div>
      <h1>{name}</h1>
    </div>
  </header>;
  const dropHandlers={
    onDragOver:(event:DragEvent<HTMLDivElement>)=>{event.preventDefault();setDragging(true);},
    onDragLeave:()=>setDragging(false),
    onDrop:(event:DragEvent<HTMLDivElement>)=>{event.preventDefault();setDragging(false);void loadFile(event.dataTransfer.files[0]);},
  };

  return <main className={'activity-ux-page'+(screen==='edit'?' activity-in-editor':'')+(isPlay&&mode==='presentation'?' activity-projected':'')}>
    {(screen==='choose'||screen==='import')&&header}
    {screen==='choose' && <section className="activity-ux-entry" aria-labelledby="activity-start-heading">
      <h2 id="activity-start-heading">{u(locale,'startTitle')}</h2>
      <p className="lead">{u(locale,'startLead')}</p>
      <div className="activity-ux-options">
        <button type="button" className="card-link activity-ux-option" onClick={startNew}><PencilLine aria-hidden="true" size={27}/><strong>{u(locale,'manual')}</strong><span>{u(locale,'manualHint')}</span><ArrowRight className="card-link-arrow" aria-hidden="true"/></button>
        <button type="button" className="card-link activity-ux-option" onClick={startImport}><FileUp aria-hidden="true" size={27}/><strong>{u(locale,'importActivity')}</strong><span>{u(locale,'importHint')}</span><ArrowRight className="card-link-arrow" aria-hidden="true"/></button>
        {joinHref && <Link className="card-link activity-ux-option" to={joinHref}><UsersRound aria-hidden="true" size={27}/><strong>{u(locale,'joinGame')}</strong><span>{u(locale,'joinHint')}</span><ArrowRight className="card-link-arrow" aria-hidden="true"/></Link>}
      </div><p className="muted small">{u(locale,'localOnly')}</p>
    </section>}
    {screen==='import' && <section className="activity-ux-import" aria-labelledby="activity-import-heading">
      <h2 id="activity-import-heading">{u(locale,'importActivity')}</h2>
      <p className="muted">{u(locale,'importHint')}</p>
      <div className={'import-area'+(dragging?' dragging':'')} {...dropHandlers}>
        <input ref={fileRef} type="file" accept=".json,application/json" aria-label={u(locale,'chooseFile')} className="sr-only" onChange={event=>void loadFile(event.target.files?.[0])}/>
        {!importCandidate && <div className="import-drop">
          <FileUp size={26} aria-hidden="true"/><div><strong>{u(locale,'dropStrip')}</strong><span className="muted small">{u(locale,'fileHelp')}</span></div>
          <button className="button primary" type="button" onClick={()=>fileRef.current?.click()}>{u(locale,importName?'importAnother':'chooseFile')}</button>
        </div>}
        {importCandidate && <div className="import-file">
          <FileUp size={22} aria-hidden="true"/>
          <div className="import-file-name"><strong>{importName}</strong><span className="muted small">{countsOf(kind,importCandidate.content,locale)}</span></div>
          <p className="activity-ux-good"><Check size={18} aria-hidden="true"/>{u(locale,'importValid')}</p>
          <button className="button secondary" type="button" onClick={()=>fileRef.current?.click()}>{u(locale,'importAnother')}</button>
          <button type="button" className="button primary" onClick={acceptFile}>{u(locale,'openEditor')} <ArrowRight size={16} aria-hidden="true"/></button>
        </div>}
      </div>
      {fileBusy&&<p role="status">{u(locale,'loading')}</p>}
      {fileError&&<section className="error" role="alert"><strong>{t(locale,'loadError')}</strong><IssueList issues={fileError} locale={locale}/><p>{u(locale,'importUnchanged')}</p></section>}
      {importCandidate&&<section className="import-review" aria-label={u(locale,'importReview')}>
        <p className="muted small">{u(locale,'importSuccess')}</p>
        <div className="readonly-board">
          <h3 lang={importCandidate.targetLanguage}>{importCandidate.title}</h3>
          <p className="readonly-instructions" lang={importCandidate.targetLanguage}>{importCandidate.instructions}</p>
          <Preview activity={importCandidate} locale={locale}/>
        </div>
        <details className="technical"><summary>{u(locale,'importKeys')}</summary><pre className="activity-import-json">{JSON.stringify(importCandidate.content,null,2)}</pre></details>
      </section>}
      <p className="muted small">{u(locale,'localOnly')}</p>
    </section>}
    {screen==='edit' && <section className="canvas-edit" aria-label={u(locale,'newActivity')}>
      <div className="activity-bar">
        <button type="button" className="activity-ux-back" onClick={backToChoice}><ArrowLeft size={17} aria-hidden="true"/>{u(locale,'backChoice')}</button>
        <h1 className="activity-bar-game">{name}</h1>
        <span className={'save-chip '+status.tone} role="status"><span className="save-dot" aria-hidden="true"/>{status.text}</span>
        <span className="activity-bar-space"/>
        <button type="button" className="button secondary" onClick={download}><Download size={16} aria-hidden="true"/>{u(locale,'downloadShort')}</button>
        {onOnline && <button type="button" className="button secondary" disabled={onlineBusy} onClick={createRoom}><UsersRound size={16} aria-hidden="true"/>{onlineBusy ? u(locale,'onlineBusy') : u(locale,'createRoom')}</button>}
        <button type="button" className="button secondary" onClick={()=>play('presentation')}><Presentation size={16} aria-hidden="true"/>{u(locale,'present')}</button>
        <button type="button" className="button primary" onClick={()=>play('independent')}><Play size={16} aria-hidden="true"/>{u(locale,'try')}</button>
      </div>
      <div className="canvas" ref={canvasRef}>
        {attempted && issues.length>0 && <div className="problem-banner" role="alert" tabIndex={-1} ref={problemRef}>
          <AlertTriangle size={18} aria-hidden="true"/>
          <div><strong>{u(locale,'notReady')}.</strong> {u(locale,'fixFirst')} {friendlyIssue(kind,firstProblem,locale)}
            {issues.length>1 && <details><summary>{u(locale,'validation')} ({issues.length})</summary><ul>{issues.slice(0,10).map((issue,i)=><li key={i}>{friendlyIssue(kind,issue,locale)}</li>)}</ul>
              {issues.length>10&&<IssueList locale={locale} issues={issues.slice(10)}/>}</details>}</div>
        </div>}
        {onlineError && <p className="error" role="alert">{onlineError}</p>}
        <div className="canvas-head" lang={draft.targetLanguage}>
          <input ref={titleRef} className="canvas-title" aria-label={u(locale,'title')} placeholder={u(locale,'titlePlaceholder')} value={draft.title} {...field('title')} onChange={event=>titleChange(event.target.value)}/>
          <AutoTextarea className="canvas-instructions" aria-label={u(locale,'instructions')} placeholder={u(locale,'instructionPlaceholder')} value={draft.instructions} {...field('instructions')} onChange={event=>change({...draft,instructions:event.target.value})}/>
        </div>
        <TargetLanguageField value={draft.targetLanguage} locale={locale} field={field('targetLanguage')} onChange={targetLanguage=>change({...draft,targetLanguage})}/>
        <p className="canvas-rule">{u(locale,RULE[kind])}</p>
        <Editor activity={draft} onChange={change} locale={locale} field={field} region={region}/>
        <div className="canvas-foot">
          <p className={'canvas-status '+(issues.length?'incomplete':'ready')}>
            {issues.length===0 ? <><Check size={17} aria-hidden="true"/>{countsOf(kind,draft.content,locale)} · {u(locale,'readyChip')}</>
              : <><span>{count(locale,'needsChip1','needsChip',issues.length)}</span> <button type="button" className="text-button" onClick={()=>markAttempt(issues)}>{u(locale,'gotoProblem')} →</button></>}
          </p>
          <details className="activity-ux-disclosure" open={advancedOpen} onToggle={event=>setAdvancedOpen(event.currentTarget.open)}><summary>{u(locale,'advanced')}</summary>
            <p className="muted small">{u(locale,'advancedHelp')}</p>
            <label className="activity-field">{u(locale,'activityId')}<input className="field" value={draft.id} {...field('id')} onChange={event=>{setAutoId(false);change({...draft,id:event.target.value});}}/></label>
          </details>
          <p className="muted small">{u(locale,'localOnly')}</p>
        </div>
      </div>
    </section>}
    {isPlay&&playing&&<section className="activity-ux-play activity-play panel padded" key={kind+':'+playCounter}>
      <div className="activity-ux-play-top">
        <button type="button" className="activity-ux-back" onClick={()=>setScreen('edit')}><ArrowLeft size={17} aria-hidden="true"/>{u(locale,'backEditor')}</button>
        <h1 className="play-game">{name}</h1>
        <span className="play-mode-chip">{u(locale,mode==='presentation'?'present':'try')}</span>
      </div>
      <h2 lang={playing.targetLanguage}>{playing.title}</h2><p className="lead play-instructions" lang={playing.targetLanguage}>{playing.instructions}</p>
      <Player activity={playing} mode={mode} locale={locale}/>
    </section>}
  </main>;
}
