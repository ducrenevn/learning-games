// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { splitSteps } from '../src/games/sequence/SequenceEditor';
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
const order=()=>[...document.querySelectorAll<HTMLTextAreaElement>('.seq-edit textarea')].map(el=>el.value);

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

describe('Sequence canvas: type, Enter, paste', () => {
  it('shows the numbered rows of the answer key, not a form with a separate navigator', async () => {
    const { user } = renderPage(<SequencePage />);
    await loaded(user);
    expect(document.querySelectorAll('.seq-edit')).toHaveLength(4);
    expect([...document.querySelectorAll('.seq-edit .seq-num')].map(n => n.textContent)).toEqual(['1', '2', '3', '4']);
    expect(document.querySelector('.activity-ux-navigation')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Weiter' })).toBeNull();
  });
  it('Enter inserts a new step directly below and focuses it', async () => {
    const { user } = renderPage(<SequencePage />);
    await loaded(user);
    await user.click(field('Schritt 2'));
    await user.keyboard('{Enter}');
    expect(order()).toHaveLength(5);
    expect(order()[2]).toBe('');
    expect(document.activeElement).toBe(field('Schritt 3'));
    expect(order()[1]).toBe('Ich möchte einen Termin.');
  });
  it('Enter does not put a line break into the step text', async () => {
    const { user } = renderPage(<SequencePage />);
    await create(user);
    await user.type(field('Schritt 1'), 'Eins{Shift>}{Enter}{/Shift}zwei');
    expect(order()[0]).toBe('Eins zwei');
  });
  it('Backspace on an empty step removes it, keeps at least 3 and returns to the previous step', async () => {
    const { user } = renderPage(<SequencePage />);
    await loaded(user);
    await user.click(field('Schritt 4'));
    await user.keyboard('{Enter}');                       // new empty step 5
    expect(order()).toHaveLength(5);
    await user.keyboard('{Backspace}');
    expect(order()).toHaveLength(4);
    expect(document.activeElement).toBe(field('Schritt 4'));
    await user.click(button('Entfernen: Schritt 4'));    // down to 3
    await user.click(field('Schritt 3'));
    await user.clear(field('Schritt 3'));
    await user.keyboard('{Backspace}');
    expect(order()).toHaveLength(3);                      // never below the minimum
  });
  it('turns a pasted multi-line list into one step per line and drops list numbering', async () => {
    const { user } = renderPage(<SequencePage />);
    await create(user);
    await user.click(field('Schritt 1'));
    await user.paste('1. Aufstehen\n2) Frühstücken\n- Zur Schule gehen\n\n• Lernen\nHeimgehen');
    // The two empty placeholder rows below are filled by the list, not left behind as blank steps.
    expect(order()).toEqual(['Aufstehen', 'Frühstücken', 'Zur Schule gehen', 'Lernen', 'Heimgehen']);
    expect(document.querySelector('.activity-editor [role="status"].sr-only')?.textContent).toContain('5 Schritte');
  });
  it('a list pasted above empty rows fills those rows first and adds new ones only after them', async () => {
    const { user } = renderPage(<SequencePage />);
    await create(user);
    await user.type(field('Schritt 1'), 'Erster');
    await user.click(field('Schritt 1'));
    await user.paste('A\nB');
    expect(order()).toEqual(['Erster', 'A', 'B']);
  });
  it('inserts pasted lines after a filled row and caps at 20 with a message', async () => {
    const { user } = renderPage(<SequencePage />);
    await loaded(user);
    await user.click(field('Schritt 1'));
    await user.paste(Array.from({ length: 30 }, (_, i) => 'Neu ' + (i + 1)).join('\n'));
    expect(order()).toHaveLength(20);
    expect(order()[0]).toBe('Guten Tag, Praxis Müller.');
    expect(order()[1]).toBe('Neu 1');
    expect(button('Schritt hinzufügen').disabled).toBe(true);
    expect(document.querySelector('.activity-editor [role="status"].sr-only')?.textContent).toContain('höchstens 20');
  });
  it('a single pasted line stays an ordinary paste', async () => {
    const { user } = renderPage(<SequencePage />);
    await create(user);
    await user.click(field('Schritt 1'));
    await user.paste('Nur eine Zeile');
    expect(order()).toHaveLength(3);
    expect(order()[0]).toBe('Nur eine Zeile');
  });
  it('lets long steps wrap instead of truncating them', async () => {
    const { user } = renderPage(<SequencePage />);
    await create(user);
    const long = 'Guten Tag, hier ist das Hotel am Marktplatz, wie kann ich Ihnen helfen?';
    await user.type(field('Schritt 1'), long);
    expect(field('Schritt 1').tagName).toBe('TEXTAREA');
    expect(field('Schritt 1').value).toBe(long);
  });
  it('splits steps predictably', () => {
    expect(splitSteps('1. a\n 2) b \n\n- c')).toEqual(['a', 'b', 'c']);
    expect(splitSteps('Wort')).toEqual(['Wort']);
  });
});
