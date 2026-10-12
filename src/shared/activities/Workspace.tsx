import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound } from 'lucide-react';
import { ArrowLeft, ArrowRight, Check, Download, FileUp, PencilLine, Presentation, UserRound } from 'lucide-react';
import type { ActivityBase, ActivityType, Locale, PlayMode, Validator, Issue } from './contract';
import { MAX_BYTES } from './contract';
import { downloadActivity, serializeActivity, validateImported } from './portable';
import { t, issueText } from './i18n';
import { u, type UXKey } from './uxCopy';

export interface EditorProps<T> { activity: T; onChange: (next: T) => void; locale: Locale; section?: string }
export interface PlayerProps<T> { activity: T; mode: PlayMode; locale: Locale }
interface Props<T extends ActivityBase<ActivityType, unknown>> {
  kind: ActivityType;
  makeBlank: () => T;
  validate: Validator<T>;
  Editor: ComponentType<EditorProps<T>>;
  Player: ComponentType<PlayerProps<T>>;
  /** Optional existing Memory-only room flow; never called by local preview or import. */
  onOnline?: (activity: T) => Promise<void>;
  joinHref?: string;
}
type Screen = 'choose' | 'import' | 'edit' | PlayMode;
const LABELS: Record<ActivityType, string> = { sort:'Sort', sequence:'Sequence', 'language-detective':'Language Detective', memory:'Memory' };
const STEPS: Record<ActivityType, readonly UXKey[]> = {
  sort:['details', 'categories', 'cards', 'review'],
  sequence:['details', 'steps', 'review'],
  'language-detective':['details', 'passage', 'errors', 'review'],
  memory:['details', 'pairs', 'review'],
};
const LIMIT = 20;
export function stepIssues(kind: ActivityType, step: UXKey, issues: readonly Issue[]): Issue[] {
  if (step === 'review') return [...issues];
  return issues.filter(issue => {
    const path = issue.path;
    if (step === 'details') return ['title', 'instructions', 'targetLanguage', 'id', 'format', 'schemaVersion', 'activityType'].some(p => path === p || path.startsWith(p + '.'));
    if (kind === 'memory') return path.startsWith('content.pairs');
    if (kind === 'sort') return step === 'categories' ? path.startsWith('content.categories') : path.startsWith('content.items');
    if (kind === 'sequence') return path.startsWith('content.');
    if (step === 'passage') return path.startsWith('content.segments') || path === 'content.prompt';
    return path.startsWith('content.issues') || path === 'content.summary';
  });
}
/** Teacher-facing field labels; raw schema paths are only shown in import diagnostics. */
function friendlyIssue(kind:ActivityType,issue:Issue,locale:Locale){
  const raw=issueText(issue,locale);
  const description=raw.startsWith(issue.path+': ')?raw.slice(issue.path.length+2):raw;
  const match=/^content\.(categories|items|segments|issues|pairs)\[(\d+)\](?:\.([a-zA-Z]+))?$/.exec(issue.path);
  if(match){
    const collection=match[1],index=Number(match[2])+1,field=match[3];
    const subject=collection==='pairs'?'pairs':collection==='categories'?'categories':collection==='segments'?'passage':collection==='issues'?'errors':kind==='sort'?'cards':'steps';
    const label=field==='left'?'leftCard':field==='right'?'rightCard':field==='label'?'title':field==='text'?'passage':field==='categoryId'?'categories':field==='correction'?'errors':field==='explanation'?'instructions':field==='segmentId'?'errors':null;
    return u(locale,subject)+' '+index+(label?' · '+u(locale,label):'')+': '+description;
  }
  const collection=/^content\.(categories|items|segments|issues|pairs)$/.exec(issue.path);
  if(collection){const subject=collection[1]==='pairs'?'pairs':collection[1]==='items'?(kind==='sort'?'cards':'steps'):collection[1]==='segments'?'passage':collection[1]==='categories'?'categories':'errors';return u(locale,subject)+': '+description;}
  const label=issue.path==='title'?'title':issue.path==='instructions'?'instructions':issue.path==='targetLanguage'?'language':issue.path==='id'?'activityId':issue.path==='content.prompt'?'details':null;
  return (label?u(locale,label):issue.path)+': '+description;
}
function cleanSlug(value: string, fallback: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '') || fallback;
}
function IssueList({ issues, locale }: { issues: readonly Issue[]; locale: Locale }) {
  return <ul>{issues.slice(0,LIMIT).map((i,index) => <li key={index}>{issueText(i,locale)}</li>)}
    {issues.length > LIMIT && <li>+{issues.length-LIMIT}</li>}</ul>;
}

/** One local activity, guided from choice -> content -> review -> detached play. No hosted state. */
export function ActivityWorkspace<T extends ActivityBase<ActivityType, unknown>>({ kind, makeBlank, validate, Editor, Player, onOnline, joinHref }: Props<T>) {
  const [locale,setLocale] = useState<Locale>('de');
  const [screen,setScreen] = useState<Screen>('choose');
  const [draft,setDraft] = useState<T>(makeBlank);
  const [dirty,setDirty] = useState(false);
  const [autoId,setAutoId] = useState(true);
  const [step,setStep] = useState(0);
  const [attempted,setAttempted] = useState<Set<number>>(() => new Set());
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const edits = useRef(0);
  const importToken = useRef(0);
  const steps = STEPS[kind];
  const issues = validate(draft).issues;
  const current = steps[step];
  const currentProblems = stepIssues(kind,current,issues);
  const isPlay = screen === 'presentation' || screen === 'preview' || screen === 'independent';
  const name = LABELS[kind];

  useEffect(() => {
    if (!dirty && !fileBusy && !importCandidate) return;
    const warn = (event:BeforeUnloadEvent) => {event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return () => window.removeEventListener('beforeunload',warn);
  },[dirty,fileBusy,importCandidate]);
  useEffect(() => {
    const before=document.documentElement.lang;
    document.documentElement.lang=locale;
    return () => {document.documentElement.lang=before;};
  },[locale]);
  useLayoutEffect(() => { if (screen === 'edit' && step !== 0) headingRef.current?.focus({preventScroll:true}); },[step,screen]);
  function change(next:T){edits.current++;setDraft(next);setDirty(true);}
  function titleChange(title:string) {
    change({...draft,title,id:autoId?cleanSlug(title,'new-'+kind):draft.id});
  }
  function requestDiscard() {return !dirty || window.confirm(t(locale,'unsavedWarn'));}
  function backToChoice() {
    if (!requestDiscard())return;
    importToken.current++;
    setFileBusy(false);setFileError(null);setImportCandidate(null);setScreen('choose');
  }
  function backFromImport() {
    if((importCandidate || fileBusy) && !window.confirm(u(locale,'discard')))return;
    importToken.current++;setFileBusy(false);setImportCandidate(null);setFileError(null);setImportName('');setScreen('choose');
  }
  function startNew() {
    if (!requestDiscard())return;
    importToken.current++;edits.current++;
    setDraft(makeBlank());setAutoId(true);setDirty(false);setStep(0);setAttempted(new Set());
    setFileError(null);setImportCandidate(null);setScreen('edit');
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
      setImportCandidate(parsed.value as T);
    } catch {
      if(token===importToken.current)setFileError([{path:'file',code:'json'}]);
    } finally {if(token===importToken.current)setFileBusy(false);}
  }
  function acceptFile() {
    if(!importCandidate || !requestDiscard())return;
    edits.current++;
    setDraft(structuredClone(importCandidate));setDirty(false);setAutoId(false);setStep(0);
    setAttempted(new Set());setImportCandidate(null);setFileError(null);setScreen('edit');
  }
  function goStep(next:number,force=false) {
    if(next<0 || next>=steps.length)return;
    if(next>step && !force && current!=='review' && currentProblems.length){
      setAttempted(old=>new Set([...old,step]));return;
    }
    setStep(next);
  }
  function play(next:PlayMode) {
    const result=validate(draft);
    if(!result.value || result.issues.length){setAttempted(new Set(steps.map((_,i)=>i)));return;}
    setPlaying(structuredClone(result.value));setPlayCounter(i=>i+1);setScreen(next);
  }
  function download() {
    const out=serializeActivity(draft,validate);
    if(!out.value){setAttempted(new Set(steps.map((_,i)=>i)));return;}
    downloadActivity(kind+'_'+draft.id+'.json',out.value);
    setDirty(false);
  }
  function restart() {if(isPlay)play(screen as PlayMode);}
  function statusLabel(index:number) {
    return stepIssues(kind,steps[index],issues).length ? u(locale,'incomplete') : u(locale,'ready');
  }
  function summary() {
    const c=draft.content as Record<string,unknown>;
    const list=kind==='memory'?c.pairs:kind==='sort'?c.items:kind==='sequence'?c.items:c.segments;
    return Array.isArray(list)?list.length:0;
  }
  const languageSelect=<label className="activity-language">{t(locale,'language')}
    <select className="field" aria-label={t(locale,'language')} value={locale} onChange={event=>setLocale(event.target.value as Locale)}>
      <option value="de">Deutsch</option><option value="en">English</option><option value="vi">Tiếng Việt</option>
    </select></label>;
  const header=<header className="activity-ux-head">
    <div className="activity-ux-heading">
      {screen==='choose'?<Link className="back-link" to="/">← Learning Games</Link>
        :<button type="button" className="activity-ux-back" onClick={isPlay?()=>setScreen('edit'):screen==='edit'?backToChoice:backFromImport}>
          <ArrowLeft size={17}/>{isPlay?u(locale,'backEditor'):u(locale,'backChoice')}
        </button>}
      <div className="eyebrow">LEARNING GAMES · {u(locale,'defaultType')}</div>
      <h1>{name}</h1>
    </div>
    {languageSelect}
  </header>;

  return <main className={'activity-ux-page'+(screen==='edit'?' activity-in-editor':'')+(screen==='presentation'?' activity-projected':'')}>
    {header}
    {screen==='choose' && <section className="activity-ux-entry" aria-labelledby="activity-start-heading">
      <h2 id="activity-start-heading">{u(locale,'startTitle')}</h2>
      <p className="lead">{u(locale,'startLead')}</p>
      <div className="activity-ux-options">
        <button type="button" className="activity-ux-option" onClick={startNew}><PencilLine aria-hidden="true" size={27}/><strong>{u(locale,'manual')}</strong><span>{u(locale,'manualHint')}</span><ArrowRight className="activity-ux-option-arrow" aria-hidden="true"/></button>
        <button type="button" className="activity-ux-option" onClick={startImport}><FileUp aria-hidden="true" size={27}/><strong>{u(locale,'importActivity')}</strong><span>{u(locale,'importHint')}</span><ArrowRight className="activity-ux-option-arrow" aria-hidden="true"/></button>
        {joinHref && <Link className="activity-ux-option" to={joinHref}><UsersRound aria-hidden="true" size={27}/><strong>{u(locale,'joinGame')}</strong><span>{u(locale,'joinHint')}</span><ArrowRight className="activity-ux-option-arrow" aria-hidden="true"/></Link>}
      </div><p className="muted small">{u(locale,'localOnly')}</p>
    </section>}
    {screen==='import' && <section className="activity-ux-import panel padded" aria-labelledby="activity-import-heading">
      <div className="activity-section-kicker">02 · {u(locale,'importActivity')}</div>
      <h2 id="activity-import-heading">{u(locale,'importActivity')}</h2>
      <p className="muted">{u(locale,'importHint')}</p>
      <div className={'activity-import-drop'+(dragging?' dragging':'')} onDragOver={(event:DragEvent<HTMLDivElement>)=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={(event:DragEvent<HTMLDivElement>)=>{event.preventDefault();setDragging(false);void loadFile(event.dataTransfer.files[0]);}}>
        <FileUp size={32} aria-hidden="true"/><strong>{u(locale,'drop')}</strong><span className="muted small">{u(locale,'fileHelp')}</span>
        <input ref={fileRef} type="file" accept=".json,application/json" aria-label={u(locale,'chooseFile')} className="sr-only" onChange={event=>void loadFile(event.target.files?.[0])}/>
        <button className="button primary" type="button" onClick={()=>fileRef.current?.click()}>{u(locale,importName?'importAnother':'chooseFile')}</button>
      </div>
      {fileBusy&&<p role="status">{u(locale,'loading')}</p>}
      {fileError&&<section className="error" role="alert"><strong>{t(locale,'loadError')}</strong><IssueList issues={fileError} locale={locale}/><p>{u(locale,'importUnchanged')}</p></section>}
      {importCandidate&&<section className="activity-import-review" aria-label={u(locale,'importReview')}>
        <p className="activity-ux-good"><Check size={18}/>{u(locale,'importValid')}</p>
        <h3 lang={importCandidate.targetLanguage}>{importCandidate.title}</h3>
        <p lang={importCandidate.targetLanguage}>{importCandidate.instructions}</p>
        <p>{u(locale,'importSuccess')}</p>
        <p className="muted small">{u(locale,'importSummary')}: {u(locale,'metaCount',{n:kind==='language-detective'?(importCandidate.content as {segments:unknown[]}).segments.length:kind==='memory'?(importCandidate.content as {pairs:unknown[]}).pairs.length:(importCandidate.content as {items:unknown[]}).items.length})}</p>
        <details><summary>{u(locale,'importKeys')}</summary><pre className="activity-import-json">{JSON.stringify(importCandidate.content,null,2)}</pre></details>
        <button type="button" className="button primary" onClick={acceptFile}>{u(locale,'openEditor')} <ArrowRight size={16}/></button>
      </section>}
      <p className="muted small">{u(locale,'localOnly')}</p>
    </section>}
    {screen==='edit' && <section className="activity-ux-workspace" aria-label={u(locale,'newActivity')}>
      <div className="activity-ux-editor-head">
        <div><div className="activity-section-kicker">{u(locale,'newActivity')}</div><strong lang={draft.targetLanguage}>{draft.title || name}</strong></div>
        <button type="button" className="button secondary" onClick={()=>play('preview')} disabled={issues.length>0}>{u(locale,'preview')}</button>
      </div>
      <div className="activity-ux-body">
        <nav className="activity-ux-navigation" aria-label={u(locale,'newActivity')}>
          <ol className="activity-ux-step-list">{steps.map((item,index)=><li key={item}>
            <button type="button" onClick={()=>goStep(index,true)} aria-current={step===index?'step':undefined} className={'activity-ux-step'+(step===index?' active':'')}>
              <span className="activity-ux-step-num">{index+1}</span><span className="activity-ux-step-copy"><strong>{u(locale,item)}</strong>
              <small>{statusLabel(index)}</small></span>{stepIssues(kind,item,issues).length===0&&<Check size={15} aria-hidden="true"/>}
            </button></li>)}</ol>
          <div className="activity-ux-navigation-hint">{u(locale,'localOnly')}</div>
        </nav>
        <div className="activity-ux-editor-scroll" key={step}>
          <div className="activity-ux-editor-inner">
            <div className="activity-section-kicker">{u(locale,'stepCount',{n:step+1,total:steps.length})}</div>
            <h2 ref={headingRef} tabIndex={-1} className="activity-ux-step-heading">{u(locale,current)}</h2>
            {current==='details' && <div className="activity-ux-fields">
              <label className="activity-field">{u(locale,'title')}<input className="field" value={draft.title} onChange={event=>titleChange(event.target.value)}/></label>
              <label className="activity-field">{u(locale,'instructions')}<textarea className="field" rows={4} value={draft.instructions} onChange={event=>change({...draft,instructions:event.target.value})}/></label>
              <label className="activity-field">{u(locale,'language')}<input className="field" value={draft.targetLanguage} onChange={event=>change({...draft,targetLanguage:event.target.value})}/></label>
              <details className="activity-ux-disclosure"><summary>{u(locale,'advanced')}</summary><p className="muted small">{u(locale,'advancedHelp')}</p>
                <label className="activity-field">{u(locale,'activityId')}<input className="field" value={draft.id} onChange={event=>{setAutoId(false);change({...draft,id:event.target.value});}}/></label>
              </details>
              <p className="muted small">{u(locale,'emptyHelp')}</p>
            </div>}
            {current==='categories'&&<p className="muted">{u(locale,'categoryHint')}</p>}
            {current==='cards'&&<p className="muted">{u(locale,'cardsHint')}</p>}
            {current==='steps'&&<p className="muted">{u(locale,'sequenceHint')}</p>}
            {current==='passage'&&<p className="muted">{u(locale,'segmentHint')}</p>}
            {current==='errors'&&<p className="muted">{u(locale,'markHint')}</p>}
            {current!=='details'&&current!=='review'&&<Editor activity={draft} onChange={change} locale={locale} section={current}/>}
            {current==='review'&&<div className="activity-ux-review">
              <p className="muted">{u(locale,'reviewLead')}</p>
              <div className="activity-ux-review-summary" lang={draft.targetLanguage}><strong>{draft.title}</strong><p>{draft.instructions}</p>
                <span>{u(locale,'metaCount',{n:summary()})}</span></div>
              <div className="activity-ux-review-status">{issues.length===0?<><Check size={18}/>{u(locale,'noProblems')}</>:
                <><span>{u(locale,'needsWork')}: {issues.length}</span>{steps.slice(0,-1).map((s,i)=>stepIssues(kind,s,issues).length>0&&
                <button type="button" className="button secondary" key={s} onClick={()=>goStep(i,true)}>{u(locale,s)} · {stepIssues(kind,s,issues).length}</button>)}</>}</div>
              <p className="muted small">{u(locale,'previewHint')}</p>
              <div className="activity-ux-review-actions">
                <button className="button primary" type="button" disabled={issues.length>0} onClick={()=>play('presentation')}><Presentation size={18}/>{u(locale,'present')}</button>
                <button className="button secondary" type="button" disabled={issues.length>0} onClick={()=>play('independent')}><UserRound size={18}/>{u(locale,'practice')}</button>
                <button className="button secondary" type="button" disabled={issues.length>0} onClick={()=>play('preview')}>{u(locale,'preview')}</button>
              </div>
              {onOnline && <div className="activity-ux-export activity-memory-online">
                <div><strong>{u(locale,'onlineRoom')}</strong><p className="muted small">{u(locale,'onlineHint')}</p></div>
                <button className="button secondary" type="button" disabled={issues.length>0 || onlineBusy || summary()<2} onClick={() => {
                  if (onlineBusy) return;
                  const checked=validate(draft);
                  if (!checked.value || checked.issues.length || summary()<2) return;
                  setOnlineBusy(true);setOnlineError('');
                  void onOnline(structuredClone(checked.value)).catch(e => setOnlineError(e instanceof Error ? e.message : u(locale,'onlineError'))).finally(() => setOnlineBusy(false));
                }}>{onlineBusy ? u(locale,'onlineBusy') : u(locale,'createRoom')}</button>
                {onlineError && <p className="error" role="alert">{onlineError}</p>}
                {summary()<2 && <p className="muted small">{u(locale,'roomNeedsPairs')}</p>}
              </div>}
              <div className="activity-ux-export"><button className="button secondary" type="button" disabled={issues.length>0} onClick={download}><Download size={16}/>{u(locale,'download')}</button>
                <p className="muted small">{u(locale,'downloadHint')}</p></div>
            </div>}
            {attempted.has(step)&&currentProblems.length>0&&<div className="activity-ux-step-errors" role="alert"><strong>{u(locale,'fixFields')}</strong><ul>
              {currentProblems.slice(0,10).map((issue,i)=><li key={i}>{u(locale,'invalidAt',{label:friendlyIssue(kind,issue,locale)})}</li>)}</ul>
              {currentProblems.length>10&&<details><summary>{u(locale,'showTech')}</summary><IssueList locale={locale} issues={currentProblems.slice(10)}/></details>}
            </div>}
          </div>
        </div>
      </div>
      <footer className="activity-ux-footer">
        <div className="activity-ux-save-state"><span className="activity-ux-save-dot"/>{dirty?u(locale,'statusDirty'):u(locale,'statusLocal')}</div>
        <div className="activity-ux-footer-actions">
          <button type="button" className="button secondary" disabled={step===0} onClick={()=>goStep(step-1,true)}>{u(locale,'previous')}</button>
          {step<steps.length-1&&<button type="button" className="button primary" onClick={()=>goStep(step+1)}>{u(locale,'next')}<ArrowRight size={16}/></button>}
          {step===steps.length-1&&<button type="button" className="button primary" disabled={issues.length>0} onClick={()=>play('presentation')}>{u(locale,'present')}<ArrowRight size={16}/></button>}
        </div>
      </footer>
    </section>}
    {isPlay&&playing&&<section className="activity-ux-play activity-play panel padded" key={kind+':'+playCounter}>
      <div className="activity-ux-play-top"><div className="activity-section-kicker">{u(locale,screen==='preview'?'preview':screen==='presentation'?'present':'practice')}</div>
        <button type="button" className="button secondary" onClick={()=>setScreen('edit')}>{u(locale,'backEditor')}</button></div>
      <h2 lang={playing.targetLanguage}>{playing.title}</h2><p className="lead" lang={playing.targetLanguage}>{playing.instructions}</p>
      <Player activity={playing} mode={screen as PlayMode} locale={locale}/>
      <div className="row"><button type="button" className="button secondary" onClick={restart}>{u(locale,'reset')}</button></div>
    </section>}
  </main>;
}
