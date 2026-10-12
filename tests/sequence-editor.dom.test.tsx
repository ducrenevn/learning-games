// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { captureDownload, importActivity,   renderPage } from './helpers/dom';
import { sequenceFixture } from './helpers/fixtures';

afterEach(() => vi.restoreAllMocks());
const button = (name: string | RegExp) => screen.getByRole('button', {name}) as HTMLButtonElement;
const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement;
async function create(user: UserEvent) {
  await user.click(button(/Selbst erstellen/));
}
async function loaded(user: UserEvent) {
  await importActivity(user,sequenceFixture());
  expect(field('Titel').value).toBe('Gespräch ordnen');
  
}
const order=()=>[...document.querySelectorAll<HTMLInputElement>('.activity-edit-row input.field')].map(el=>el.value);

async function expectBlocked(user:UserEvent,dl=captureDownload()){
  await user.click(button('Herunterladen'));
  expect(dl.names).toHaveLength(0);
  expect(screen.getByRole('alert').textContent).toContain('Noch nicht spielbereit');
}
async function fill(user:UserEvent) {
  await create(user);
  await user.type(field('Aufgabe'), 'Ordne die Sätze.');
  for(const [i,v] of ['Eins','Zwei','Drei'].entries()) await user.type(field('Schritt '+(i+1)),v);
}

describe('Sequence guided authoring',()=>{
  it('opens the editable steps only after the teacher chooses create',async()=>{
    const {user}=renderPage(<SequencePage/>);
    expect(screen.queryByLabelText('Schritt 1')).toBeNull();
    await create(user);
    expect(field('Schritt 1')).toBeTruthy();
    expect(screen.getAllByText(/Reihenfolge.*Lösung/).length).toBeGreaterThan(0);
  });
  it('explains missing prompt and steps when the teacher tries to play, then plays once complete',async()=>{
    const {user}=renderPage(<SequencePage/>);
    await create(user);
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(button('Ausprobieren'));
    expect(screen.getByRole('alert').textContent).toContain('Noch nicht spielbereit');
    expect(document.activeElement).toBe(field('Aufgabe'));
    await user.type(field('Aufgabe'),'Ordne.');
    for(const [i,v] of ['Eins','Zwei','Drei'].entries()) await user.type(field('Schritt '+(i+1)),v);
    await user.click(button('Ausprobieren'));
    expect(document.querySelector('.activity-ux-play')).toBeTruthy();
  });
  it('serializes edited answer-key order without changing the item IDs',async()=>{
    const dl=captureDownload();
    const {user}=renderPage(<SequencePage/>);
    await fill(user);
    await user.click(button('Nach oben: Schritt 3'));
    await user.click(button('Nach unten: Schritt 1'));
    expect(order()).toEqual(['Drei','Eins','Zwei']);
    await user.click(button('Herunterladen'));
    expect(JSON.parse(await dl.text()).content.items.map((v:{text:string})=>v.text)).toEqual(['Drei','Eins','Zwei']);
  });
  it('reimports the same answer key byte for byte',async()=>{
    const dl=captureDownload();
    const first=renderPage(<SequencePage/>);
    await loaded(first.user);
    await first.user.click(button('Nach oben: Schritt 4'));
    await (first.user);
    await first.user.click(button('Herunterladen'));
    const exported=await dl.text();first.unmount();
    const second=renderPage(<SequencePage/>);
    await importActivity(second.user,JSON.parse(exported));
    await (second.user);
    await second.user.click(button('Herunterladen'));
    expect(await dl.text()).toBe(exported);
  });
  it('supports 3 to 20 steps and disables controls at both limits',async()=>{
    const {user}=renderPage(<SequencePage/>);
    await create(user);
    expect(button('Entfernen: Schritt 1').disabled).toBe(true);
    for(let n=0;n<17;n++)await user.click(button('Schritt hinzufügen'));
    expect(button('Schritt hinzufügen').disabled).toBe(true);
    await user.click(button('Entfernen: Schritt 20'));
    expect(button('Schritt hinzufügen').disabled).toBe(false);
  },30000);
  it('rejects case-insensitive duplicates without overwriting another row',async()=>{
    const {user}=renderPage(<SequencePage/>);
    await loaded(user);
    await user.clear(field('Schritt 2'));
    await user.type(field('Schritt 2'),' guten tag, praxis müller. ');
    await expectBlocked(user);
    
    expect(field('Schritt 1').value).toBe('Guten Tag, Praxis Müller.');
  });
  it('omits a cleared optional explanation from the downloaded JSON',async()=>{
    const dl=captureDownload();
    const {user}=renderPage(<SequencePage/>);
    await loaded(user);
    await user.click(screen.getByText('Erklärung (optional)'));
    await user.clear(document.querySelector<HTMLTextAreaElement>('.activity-ux-disclosure textarea')!);
    await user.click(button('Herunterladen'));
    expect(JSON.parse(await dl.text()).content).not.toHaveProperty('explanation');
  });
  it('generates fresh IDs after a middle deletion',async()=>{
    const dl=captureDownload();
    const {user}=renderPage(<SequencePage/>);
    await fill(user);
    await user.click(button('Schritt hinzufügen'));await user.type(field('Schritt 4'),'Vier');
    await user.click(button('Schritt hinzufügen'));await user.type(field('Schritt 5'),'Fünf');
    await user.click(button('Entfernen: Schritt 4'));
    await user.click(button('Schritt hinzufügen'));await user.type(field('Schritt 5'),'Sechs');
    await (user);await user.click(button('Herunterladen'));
    expect(JSON.parse(await dl.text()).content.items.map((v:{id:string})=>v.id)).toEqual(['step-1','step-2','step-3','step-5','step-4']);
  });
  it('keeps focus on moved rows, even when the Up button disables',async()=>{
    const {user}=renderPage(<SequencePage/>);
    await loaded(user);
    button('Nach oben: Schritt 3').focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(button('Nach oben: Schritt 2'));
    await user.keyboard('{Enter}');
    expect(button('Nach oben: Schritt 1').disabled).toBe(true);
    expect(document.activeElement).toBe(button('Nach unten: Schritt 1'));
    expect(order()[0]).toBe('Wann haben Sie Zeit?');
  });
  it('focuses new inputs after Add and the Add control after Remove',async()=>{
    const {user}=renderPage(<SequencePage/>);
    await loaded(user);
    await user.click(button('Schritt hinzufügen'));
    expect(document.activeElement).toBe(field('Schritt 5'));
    await user.click(button('Entfernen: Schritt 5'));
    expect(document.activeElement).toBe(button('Schritt hinzufügen'));
  });
  it('announces reordering and distinguishes every repeated row button',async()=>{
    const {user}=renderPage(<SequencePage/>);
    await loaded(user);
    await user.click(button('Nach unten: Schritt 1'));
    expect(document.querySelector('.activity-editor [role="status"].sr-only')?.textContent).toContain('jetzt Position 2 von 4');
    const names=screen.getAllByRole('button').map(el=>el.getAttribute('aria-label')).filter((n):n is string=>!!n&&/^(Nach|Entfernen)/.test(n));
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(12);
  });
});
