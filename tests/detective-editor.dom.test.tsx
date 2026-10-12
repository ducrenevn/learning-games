// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { splitPassage } from '../src/games/language-detective/DetectiveEditor';
import { detectiveFixture, detectiveCleanFixture } from './helpers/fixtures';
import { captureDownload, importActivity, openAuthorStep, openReview, renderPage } from './helpers/dom';

afterEach(()=>vi.restoreAllMocks());
const button=(name:string|RegExp)=>screen.getByRole('button',{name}) as HTMLButtonElement;
const field=(name:string|RegExp)=>screen.getByLabelText(name) as HTMLInputElement;
async function create(user:UserEvent){await user.click(button(/Selbst erstellen/));await openAuthorStep(user,1);}
async function loaded(user:UserEvent){await importActivity(user,detectiveFixture());expect(field('Titel').value).toBe('Finde den Fehler');}
async function passage(user:UserEvent){await openAuthorStep(user,1);}
async function errors(user:UserEvent){await openAuthorStep(user,2);}
const marked=()=>within(screen.getByRole('group',{name:'Fehler markieren'}));

async function fill(user:UserEvent,sentence='Ich haben heute Zeit.'){
  await create(user);
  await user.type(field('Aufgabe'),'Finde Fehler.');
  await user.type(screen.getByLabelText('Text'),sentence);
}

describe('Language Detective sentence-first guided authoring',()=>{
  it('prepares a sentence without asking for numbered segments on first load',async()=>{
    const {user}=renderPage(<DetectivePage/>);
    expect(screen.queryByRole('alert')).toBeNull();
    await create(user);
    expect(screen.getByLabelText('Text')).toBeTruthy();
    expect(document.querySelector<HTMLDetailsElement>('.activity-ux-disclosure')?.open).toBe(false);
    expect(splitPassage('Ich   haben\theute Zeit.')).toEqual(['Ich','haben','heute','Zeit.']);
  });
  it('accepts zero flagged issues and exports the canonical empty issue array',async()=>{
    const dl=captureDownload();const {user}=renderPage(<DetectivePage/>);
    await fill(user,'Ich habe heute Zeit.');
    await errors(user);await openReview(user);
    expect(button('Aktivität herunterladen').disabled).toBe(false);
    await user.click(button('Aktivität herunterladen'));
    const data=JSON.parse(await dl.text());
    expect(data.content.issues).toEqual([]);
    expect(data.content.segments.map((s:{text:string})=>s.text)).toEqual(['Ich','habe','heute','Zeit.']);
  });
  it('requires a model correction and an explanation for each marked word',async()=>{
    const dl=captureDownload();const {user}=renderPage(<DetectivePage/>);
    await fill(user);await errors(user);
    await user.click(marked().getByRole('button',{name:'haben'}));
    await openReview(user);
    expect(button('Aktivität herunterladen').disabled).toBe(true);
    await errors(user);
    await user.type(field(/Musterkorrektur/),'habe');
    await user.type(field(/Erklärung/),'Verb mit ich.');
    await openReview(user);
    await user.click(button('Aktivität herunterladen'));
    expect(JSON.parse(await dl.text()).content.issues).toEqual([{segmentId:'segment-2',correction:'habe',explanation:'Verb mit ich.'}]);
  });
  it('removes a marked issue without leaving dangling private answer references',async()=>{
    const dl=captureDownload();const {user}=renderPage(<DetectivePage/>);
    await loaded(user);await errors(user);
    await user.click(marked().getByRole('button',{name:'haben'}));
    expect(screen.queryByLabelText(/Musterkorrektur.*Textteil 2/)).toBeNull();
    await user.click(marked().getByRole('button',{name:'dem'}));
    await openReview(user);await user.click(button('Aktivität herunterladen'));
    expect(JSON.parse(await dl.text()).content.issues).toEqual([]);
  });
  it('can move and edit sentence segments without losing their validated text',async()=>{
    const dl=captureDownload();const {user}=renderPage(<DetectivePage/>);
    await loaded(user);await passage(user);
    await user.click(screen.getByText('Textteile einzeln bearbeiten'));
    const inputs=document.querySelectorAll<HTMLInputElement>('.activity-ux-simple-row input');
    expect([...inputs].map(x=>x.value)).toEqual(['Ich','haben','gestern','dem','Film','gesehen.']);
    await user.click(document.querySelectorAll<HTMLButtonElement>('.activity-ux-simple-row [data-move]')[2]);
    expect([...document.querySelectorAll<HTMLInputElement>('.activity-ux-simple-row input')].map(x=>x.value)[0]).toBe('haben');
    await openReview(user);
    await user.click(button('Aktivität herunterladen'));
    expect(JSON.parse(await dl.text()).content.segments[0]).toEqual({id:'s2',text:'haben'});
  });
  it('supports the 12 marked-issue limit and disables further marking',async()=>{
    const {user}=renderPage(<DetectivePage/>);
    const a=detectiveFixture();a.content.segments=Array.from({length:14},(_,i)=>({id:'s'+(i+1),text:'Wort'+(i+1)}));
    a.content.issues=Array.from({length:12},(_,i)=>({segmentId:'s'+(i+1),correction:'C'+(i+1),explanation:'Grund'+(i+1)}));
    await importActivity(user,a);await errors(user);
    expect((marked().getByRole('button',{name:'Wort13'}) as HTMLButtonElement).disabled).toBe(true);
    await user.click(marked().getByRole('button',{name:'Wort1'}));
    expect((marked().getByRole('button',{name:'Wort13'}) as HTMLButtonElement).disabled).toBe(false);
  });
  it('rejects oversized pasted text without allocating thousands of controls',async()=>{
    const {user}=renderPage(<DetectivePage/>);
    await create(user);
    const text=screen.getByLabelText('Text');
    await user.click(text);
    await user.paste('Wort '.repeat(81));
    expect(document.querySelectorAll('.activity-ux-segment-preview span').length).toBeLessThanOrEqual(80);
    expect(screen.getByText(/zu viele oder zu lange Wörter/)).toBeTruthy();
    expect(text).toBeTruthy();
  });
  it('keeps multiple marked corrections attached to their IDs after import/export',async()=>{
    const dl=captureDownload();const first=renderPage(<DetectivePage/>);
    await loaded(first.user);await openReview(first.user);
    await first.user.click(button('Aktivität herunterladen'));
    const json=await dl.text();first.unmount();
    const second=renderPage(<DetectivePage/>);
    await importActivity(second.user,JSON.parse(json));await openReview(second.user);
    await second.user.click(button('Aktivität herunterladen'));
    expect(await dl.text()).toBe(json);
  });
  it('keeps 4–80 segments and generates unique IDs after a middle removal',async()=>{
    const dl=captureDownload();const {user}=renderPage(<DetectivePage/>);
    await importActivity(user,detectiveCleanFixture());await passage(user);
    await user.click(screen.getByText('Textteile einzeln bearbeiten'));
    const add=button('Textteil hinzufügen');
    expect(document.querySelectorAll('.activity-ux-simple-row').length).toBe(6);
    for(let i=0;i<74;i++)await user.click(add);
    expect(add.disabled).toBe(true);
    expect(document.querySelectorAll('.activity-ux-simple-row').length).toBe(80);
    const rows=document.querySelectorAll('.activity-ux-simple-row');
    await user.click(within(rows[79] as HTMLElement).getByRole('button',{name:'Entfernen'}));
    await user.click(within(document.querySelectorAll('.activity-ux-simple-row')[4] as HTMLElement).getByRole('button',{name:'Entfernen'}));
    await user.click(add);
    // The new row's ID is unique even after deleting a segment in the middle.
    const ids=[...document.querySelectorAll('.activity-ux-simple-row')].map((_,i)=>i);
    expect(ids).toHaveLength(79);
    // Unfilled added rows correctly keep Review/Download disabled; no fake export accepted.
    await openReview(user);
    expect(button('Aktivität herunterladen').disabled).toBe(true);
    expect(dl.names).toHaveLength(0);
  },120000);
  it('rejects unsafe markup in teacher corrections without exposing the answer to learners',async()=>{
    const {user}=renderPage(<DetectivePage/>);
    await loaded(user);await errors(user);
    await user.clear(field(/Musterkorrektur.*Textteil 2/));
    await user.type(field(/Musterkorrektur.*Textteil 2/),'<img src=x>');
    await openReview(user);
    expect(button('Aktivität herunterladen').disabled).toBe(true);
  });
  it('uses separate passage and error stages with unique accessible segment buttons',async()=>{
    const {user}=renderPage(<DetectivePage/>);
    await loaded(user);await passage(user);
    expect(screen.getByRole('heading',{name:'Text',level:2})).toBeTruthy();
    await errors(user);
    const btns=marked().getAllByRole('button');
    expect(btns).toHaveLength(6);
    expect(new Set(btns.map(b=>b.textContent)).size).toBe(6);
    expect(screen.queryByLabelText('Text')).toBeNull();
  });
});
