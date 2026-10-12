// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderPage, captureDownload, jsonFile } from './helpers/dom';
import { SortPage } from '../src/games/sort/SortPage';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { sequenceFixture, sortFixture } from './helpers/fixtures';
import { splitPassage } from '../src/games/language-detective/DetectiveEditor';

afterEach(()=>vi.restoreAllMocks());
const button=(name:string|RegExp)=>screen.getByRole('button',{name});
const file=()=>document.querySelector('input[type="file"]') as HTMLInputElement;

describe('guided Wave F entry and local authoring',()=>{
  for(const [name,Page] of [['Sort',SortPage],['Sequence',SequencePage],['Language Detective',DetectivePage]] as const){
    it(name+' opens as a calm chooser, not a technical invalid form',async()=>{
      const {user}=renderPage(<Page/>);
      expect(button(/Selbst erstellen/)).toBeTruthy();
      expect(button(/Aktivität importieren/)).toBeTruthy();
      expect(screen.queryByText(/content\.items|content\.segments|Aktivitäts-ID/)).toBeNull();
      expect(screen.queryByRole('alert')).toBeNull();
      await user.selectOptions(screen.getByRole('combobox',{name:'Sprache'}),'vi');
      expect(button(/Nhập hoạt động/)).toBeTruthy();
    });
  }
  it('separates new, step validation, review and downloadable activity',async()=>{
    const dl=captureDownload();
    const {user}=renderPage(<SortPage/>);
    await user.click(button(/Selbst erstellen/));
    expect(screen.getByRole('heading',{name:'Aufgabe',level:2})).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(button('Weiter'));
    expect(screen.getByRole('heading',{name:'Kategorien',level:2})).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(button('Weiter'));
    expect(screen.getByRole('alert')).toBeTruthy();
    for(const [index,label] of ['Obst','Gemüse'].entries()){
      await user.type(screen.getByLabelText('Beschriftung '+(index+1)),label);
    }
    await user.click(button('Weiter'));
    expect(screen.getByRole('heading',{name:'Karten',level:2})).toBeTruthy();
    for(const [index,word] of ['Apfel','Birne','Karotte','Gurke'].entries()){
      await user.type(screen.getByLabelText('Karte '+(index+1)),word);
      if(index>1)await user.selectOptions(screen.getByLabelText(new RegExp('Lösung.*Karte '+(index+1))),'category-2');
    }
    await user.click(button('Weiter'));
    expect(screen.getByRole('heading',{name:'Prüfen',level:2})).toBeTruthy();
    expect(button('Präsentieren')).toBeTruthy();
    await user.click(button('Aktivität herunterladen'));
    expect(dl.names[0]).toMatch(/^sort_.*\.json$/);
    const data=JSON.parse(await dl.text());
    expect(data.content.items.map((x:{text:string})=>x.text)).toEqual(['Apfel','Birne','Karotte','Gurke']);
  });
  it('validates imported activities without replacing a draft until explicitly accepted',async()=>{
    const {user}=renderPage(<SequencePage/>);
    await user.click(button(/Aktivität importieren/));
    await user.upload(file(),jsonFile('wrong.json',sortFixture()));
    expect((await screen.findByRole('alert')).textContent).toContain('falscher Spieltyp');
    await user.upload(file(),jsonFile('sequence.json',sequenceFixture()));
    expect(await screen.findByText('Datei gültig')).toBeTruthy();
    expect(button('Im Editor öffnen')).toBeTruthy();
    expect(screen.queryByRole('heading',{name:'Schritte',level:2})).toBeNull();
    await user.click(button('Im Editor öffnen'));
    expect(screen.getByDisplayValue('Gespräch ordnen')).toBeTruthy();
    await user.click(button(/Prüfen/));
    await user.click(button('Allein üben'));
    expect(document.querySelector('.activity-ux-play')).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox',{name:'Sprache'}),'en');
    expect(screen.getByText('Gespräch ordnen')).toBeTruthy();
    expect(button('Back to editor')).toBeTruthy();
  });
  it('prepares a detective sentence as selectable words with separately authored corrections',async()=>{
    const {user}=renderPage(<DetectivePage/>);
    await user.click(button(/Selbst erstellen/));
    await user.click(button('Weiter'));
    await user.type(screen.getByLabelText('Aufgabe'),'Finde die falschen Wörter.');
    const passage=screen.getByLabelText('Text') as HTMLTextAreaElement;
    await user.type(passage,'Ich haben heute Zeit.');
    expect(splitPassage(passage.value)).toEqual(['Ich','haben','heute','Zeit.']);
    await user.click(button('Weiter'));
    const text=within(screen.getByRole('group',{name:'Fehler markieren'}));
    await user.click(text.getByRole('button',{name:'haben'}));
    await user.type(screen.getByLabelText(/Musterkorrektur/),'habe');
    await user.type(screen.getByLabelText(/Erklärung/),'Kongruenz.');
    await user.click(button('Weiter'));
    await waitFor(()=>expect(within(document.querySelector('.activity-ux-review-actions')!).getByRole('button',{name:'Präsentieren'})).not.toHaveProperty('disabled',true));
  });
});
