// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPage, captureDownload, chooseLocale, jsonFile } from './helpers/dom';
import { SortPage } from '../src/games/sort/SortPage';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { sequenceFixture, sortFixture } from './helpers/fixtures';
import { splitPassage } from '../src/games/language-detective/DetectiveEditor';

afterEach(()=>vi.restoreAllMocks());
const button=(name:string|RegExp)=>screen.getByRole('button',{name});
const file=()=>document.querySelector('input[type="file"]') as HTMLInputElement;

describe('single-canvas entry and local authoring',()=>{
  for(const [name,Page] of [['Sort',SortPage],['Sequence',SequencePage],['Language Detective',DetectivePage]] as const){
    it(name+' opens as a calm chooser, not a technical invalid form',async()=>{
      const {user}=renderPage(<Page/>);
      expect(button(/Selbst erstellen/)).toBeTruthy();
      expect(button(/Aktivität importieren/)).toBeTruthy();
      expect(screen.queryByText(/content\.items|content\.segments|Aktivitäts-ID/)).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      await chooseLocale(user,'vi');
      expect(button(/Nhập hoạt động/)).toBeTruthy();
    });
  }
  it('shows the whole canvas at once, explains the first problem when played too early, then downloads once complete',async()=>{
    const dl=captureDownload();
    const {user}=renderPage(<SortPage/>);
    await user.click(button(/Selbst erstellen/));
    // No wizard: title, categories, cards and play actions are all on one page from the start.
    expect(document.querySelector('.activity-ux-navigation')).toBeNull();
    expect(screen.queryByRole('button',{name:'Weiter'})).toBeNull();
    expect(screen.getByLabelText('Beschriftung 1')).toBeTruthy();
    expect(screen.getByLabelText('Karte 1')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText('Titel'));
    expect(screen.queryByRole('alert')).toBeNull();
    // Invalid activities never start; the first missing field is focused and named.
    await user.click(button('Ausprobieren'));
    expect(document.querySelector('.activity-ux-play')).toBeNull();
    const alert=screen.getByRole('alert');
    expect(alert.textContent).toContain('Noch nicht spielbereit');
    expect(alert.textContent).toContain('Kategorie 1');
    expect(document.activeElement).toBe(screen.getByLabelText('Beschriftung 1'));
    await user.click(button('Präsentieren'));
    expect(document.querySelector('.activity-ux-play')).toBeNull();
    for(const [index,label] of ['Obst','Gemüse'].entries()){
      await user.type(screen.getByLabelText('Beschriftung '+(index+1)),label);
    }
    for(const [index,word] of ['Apfel','Birne','Karotte','Gurke'].entries()){
      await user.type(screen.getByLabelText('Karte '+(index+1)),word);
      if(index>1)await user.selectOptions(screen.getByLabelText(new RegExp('Lösung.*Karte '+(index+1))),'category-2');
    }
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/spielbereit/)).toBeTruthy();
    await user.click(button('Herunterladen'));
    expect(dl.names[0]).toMatch(/^sort_.*\.json$/);
    const data=JSON.parse(await dl.text());
    expect(data.content.items.map((x:{text:string})=>x.text)).toEqual(['Apfel','Birne','Karotte','Gurke']);
    await user.click(button('Ausprobieren'));
    expect(document.querySelector('.activity-ux-play')).toBeTruthy();
  });
  it('validates imported activities without replacing a draft until explicitly accepted',async()=>{
    const {user}=renderPage(<SequencePage/>);
    await user.click(button(/Aktivität importieren/));
    await user.upload(file(),jsonFile('wrong.json',sortFixture()));
    expect((await screen.findByRole('alert')).textContent).toContain('falscher Spieltyp');
    await user.upload(file(),jsonFile('sequence.json',sequenceFixture()));
    expect(await screen.findByText('Datei gültig')).toBeTruthy();
    expect(button('Im Editor öffnen')).toBeTruthy();
    expect(screen.queryByLabelText('Titel')).toBeNull();
    await user.click(button('Im Editor öffnen'));
    expect(screen.getByDisplayValue('Gespräch ordnen')).toBeTruthy();
    await user.click(button('Ausprobieren'));
    expect(document.querySelector('.activity-ux-play')).toBeTruthy();
    await chooseLocale(user,'en');
    expect(screen.getByText('Gespräch ordnen')).toBeTruthy();
    expect(document.querySelector('.activity-ux-back')?.textContent).toContain('Back to editor');
  });
  it('prepares a detective sentence as selectable words with separately authored corrections',async()=>{
    const {user}=renderPage(<DetectivePage/>);
    await user.click(button(/Selbst erstellen/));
    await user.type(screen.getByLabelText('Aufgabe'),'Finde die falschen Wörter.');
    const passage=screen.getByLabelText('Text') as HTMLTextAreaElement;
    await user.type(passage,'Ich haben heute Zeit.');
    expect(splitPassage(passage.value)).toEqual(['Ich','haben','heute','Zeit.']);
    const text=within(screen.getByRole('group',{name:'Fehler markieren'}));
    await user.click(text.getByRole('button',{name:'haben'}));
    await user.type(screen.getByLabelText(/Musterkorrektur/),'habe');
    await user.type(screen.getByLabelText(/Erklärung/),'Kongruenz.');
    await waitFor(()=>expect(screen.getByText(/spielbereit/)).toBeTruthy());
    await user.click(button('Ausprobieren'));
    expect(document.querySelector('.activity-ux-play')).toBeTruthy();
  });
});
