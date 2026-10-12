import { useEffect, useRef, useState } from 'react';
import { t, tf } from '../../shared/activities/i18n';
import { u } from '../../shared/activities/uxCopy';
import { moveKey, useListFocus, useMoveFocus } from '../../shared/activities/focus';
import type { EditorProps } from '../../shared/activities/Workspace';
import type { DetectiveActivity } from './model';

const MAX_ISSUES = 12;
function nextId(ids: string[]) { let n=1;while(ids.includes('segment-'+n))n++;return 'segment-'+n; }
/** Word-first convenience layer. Validation and canonical segment IDs remain the existing v1 contract. */
export function splitPassage(text:string) {
  return text.trim().split(/\s+/u).filter(Boolean);
}
export function DetectiveEditor({ activity,onChange,locale,field }:EditorProps<DetectiveActivity>) {
  const {segments,issues}=activity.content;
  const [passage,setPassage]=useState(()=>segments.map(s=>s.text).filter(Boolean).join(' '));
  const [manual,setManual]=useState(false);
  const editingText=useRef(false);
  const [notice,setNotice]=useState('');
  const [splitError,setSplitError]=useState('');
  const {rootRef:moveRoot,keepFocus}=useMoveFocus<HTMLDivElement>();
  const list=useListFocus<HTMLDivElement>();
  const update=(change:Partial<DetectiveActivity['content']>)=>onChange({...activity,content:{...activity.content,...change}});
  const issueChange=(id:string,field:'correction'|'explanation',value:string)=>update({issues:issues.map(v=>v.segmentId===id?{...v,[field]:value}:v)});
  const passages=segments.map(s=>s.text).filter(Boolean).join(' ');
  useEffect(()=>{if(editingText.current){editingText.current=false;return;}setPassage(passages);},[passages]);
  function prepare(){
    const words=splitPassage(passage);
    if(words.length<4||words.length>80||words.some(word=>Array.from(word).length>160)) {setSplitError(u(locale,'segmentTooLong'));return;}
    if(issues.length>0&&!window.confirm(u(locale,'splitWarning')))return;
    setSplitError('');
    const used=new Set(segments.map(s=>s.id));
    let counter=1;
    const next=words.map((text,index)=>{
      if(segments[index])return {id:segments[index].id,text};
      while(used.has('segment-'+counter))counter++;
      const id='segment-'+counter++;used.add(id);return {id,text};
    });
    // IDs of pre-existing segments stay stable at their indices; issue annotations must be intentionally reconstructed.
    update({segments:next,issues:[]});
  }
  function editPassage(value:string){
    const words=splitPassage(value);
    // Never allocate/render thousands of segments from a pasted passage.
    if(words.length>80||words.some(word=>Array.from(word).length>160)){
      setSplitError(u(locale,'segmentTooLong'));
      return;
    }
    if(issues.length>0&&!window.confirm(u(locale,'splitWarning')))return;
    setPassage(value);
    editingText.current=true;
    const count=Math.max(4,words.length);
    const used=new Set(segments.map(s=>s.id));let counter=1;
    const next=Array.from({length:count},(_,index)=>{
      if(segments[index])return {id:segments[index].id,text:words[index]??''};
      while(used.has('segment-'+counter))counter++;
      const id='segment-'+counter++;used.add(id);
      return {id,text:words[index]??''};
    });
    update({segments:next,issues:[]});
    setSplitError('');
  }
  function move(i:number,direction:-1|1){
    const next=[...segments];[next[i],next[i+direction]]=[next[i+direction],next[i]];
    update({segments:next});
    setNotice(tf(locale,'announceMoved',{card:segments[i].text||t(locale,'segment')+' '+(i+1),pos:i+direction+1,total:segments.length}));
    keepFocus(segments[i].id,direction===-1?'up':'down');
  }
  function toggleIssue(id:string){
    const marked=issues.some(v=>v.segmentId===id);
    if(!marked&&issues.length>=MAX_ISSUES)return;
    update({issues:marked?issues.filter(v=>v.segmentId!==id):[...issues,{segmentId:id,correction:'',explanation:''}]});
  }
  const rowOf=(n:number)=><span className="sr-only"> ({t(locale,'segment')} {n+1})</span>;
  const showPassage=true;
  const showIssues=true;
  return <div className="activity-editor">
    {showPassage&&<section className="activity-ux-editor-section">
      <label className="activity-field">{t(locale,'prompt')}
        <textarea className="field" rows={2} value={activity.content.prompt} {...field('content.prompt')} onChange={e=>update({prompt:e.target.value})}/>
      </label>
      <label className="activity-field">{u(locale,'passage')}
        <textarea className="field activity-ux-passage-input" rows={5} maxLength={16000} value={passage} {...field('content.segments')} onChange={e=>editPassage(e.target.value)}/>
      </label>
      <div className="row"><button type="button" className="button primary" onClick={prepare}>{u(locale,'segmentAction')}</button>
        <span className="muted small">{segments.filter(s=>s.text).length} {t(locale,'segment')}</span></div>
      {splitError&&<p role="alert" className="error">{splitError}</p>}
      <div className="activity-ux-segment-preview" lang={activity.targetLanguage}>{segments.filter(s=>s.text).map(s=><span key={s.id}>{s.text}</span>)}</div>
      <details className="activity-ux-disclosure" open={manual} onToggle={e=>setManual(e.currentTarget.open)}><summary>{u(locale,'segmentManual')}</summary>
        <div className="activity-list" ref={node=>{moveRoot.current=node;list.rootRef.current=node;}}>
          <p role="status" className="sr-only">{notice}</p>
          {segments.map((s,i)=><div className="activity-edit-row activity-ux-simple-row" data-row key={s.id}>
            <label className="activity-field">{t(locale,'segment')} {i+1}<input className="field" value={s.text} onChange={e=>update({segments:segments.map((v,n)=>n===i?{...v,text:e.target.value}:v)})}/></label>
            <div className="activity-item-tools"><button type="button" className="button secondary" data-move={moveKey(s.id,'up')} aria-label={t(locale,'up')+' '+(i+1)} disabled={i===0} onClick={()=>move(i,-1)}>↑</button>
              <button type="button" className="button secondary" data-move={moveKey(s.id,'down')} aria-label={t(locale,'down')+' '+(i+1)} disabled={i===segments.length-1} onClick={()=>move(i,1)}>↓</button>
              <button type="button" className="button secondary" disabled={segments.length<=4} onClick={()=>{update({segments:segments.filter((_,n)=>n!==i),issues:issues.filter(v=>v.segmentId!==s.id)});list.rowRemoved();}}>{t(locale,'remove')}</button></div>
          </div>)}
          <button type="button" className="button secondary" data-add disabled={segments.length>=80} onClick={()=>{update({segments:[...segments,{id:nextId(segments.map(s=>s.id)),text:''}]});list.rowAdded();}}>{t(locale,'addSegment')}</button>
        </div>
      </details>
    </section>}
    {showIssues&&<section className="activity-ux-editor-section">
      <p className="muted">{u(locale,'markHint')}</p>
      <div className="activity-ux-mark-text" role="group" aria-label={u(locale,'errors')} lang={activity.targetLanguage}>
        {segments.map((s,i)=><button type="button" key={s.id} className={'activity-ux-mark'+(issues.some(v=>v.segmentId===s.id)?' active':'')}
          aria-pressed={issues.some(v=>v.segmentId===s.id)} disabled={!issues.some(v=>v.segmentId===s.id)&&issues.length>=MAX_ISSUES}
          onClick={()=>toggleIssue(s.id)}>{s.text||t(locale,'segment')+' '+(i+1)}</button>)}
      </div>
      <p className="muted small">{u(locale,'marks')}: {issues.length} / {MAX_ISSUES}</p>
      {issues.length===0&&<p className="activity-ux-note">{u(locale,'noErrors')}</p>}
      {issues.map(issue=>{
        const index=segments.findIndex(s=>s.id===issue.segmentId);
        return <div key={issue.segmentId} className="activity-ux-issue-edit">
          <div className="activity-ux-issue-heading"><strong>{segments[index]?.text}</strong><button type="button" className="button secondary" onClick={()=>toggleIssue(issue.segmentId)}>{t(locale,'deleteIssue')}</button></div>
          <label className="activity-field">{t(locale,'correction')}{rowOf(index)}<input className="field" value={issue.correction} onChange={e=>issueChange(issue.segmentId,'correction',e.target.value)}/></label>
          <label className="activity-field">{t(locale,'issueExplanation')}{rowOf(index)}<textarea className="field" rows={2} value={issue.explanation} onChange={e=>issueChange(issue.segmentId,'explanation',e.target.value)}/></label>
        </div>;
      })}
      <details className="activity-ux-disclosure"><summary>{t(locale,'summary')}</summary><label className="activity-field">{t(locale,'summary')}
        <textarea className="field" rows={3} value={activity.content.summary??''} onChange={e=>{
          const next={...activity.content};if(e.target.value)next.summary=e.target.value;else delete next.summary;onChange({...activity,content:next});
        }}/></label></details>
    </section>}
  </div>;
}
