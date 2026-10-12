// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import { renderPage, jsonFile, captureDownload } from './helpers/dom';
import { MemoryHome } from '../src/games/memory/MemoryHome';
import { fromMemoryPairs } from '../src/games/memory/activity';

afterEach(() => {cleanup();vi.restoreAllMocks();});
const sample = fromMemoryPairs([{left:'Haus',right:'house'},{left:'Tür',right:'door'}], 'Wortschatz');

describe('Memory unified entry without hosted writes', () => {
  it('shows create/import plus existing join route, and switches interface language', async () => {
    const {user} = renderPage(<MemoryHome/>);
    expect(screen.getByRole('button',{name:/Selbst erstellen/})).toBeTruthy();
    expect(screen.getByRole('button',{name:/Aktivität importieren/})).toBeTruthy();
    expect(screen.getByRole('link',{name:/Raum beitreten/}).getAttribute('href')).toBe('/games/memory/join');
    await user.selectOptions(screen.getByRole('combobox',{name:'Sprache'}),'en');
    expect(screen.getByRole('button',{name:/Create activity/})).toBeTruthy();
    expect(screen.getByRole('link',{name:/Join game/})).toBeTruthy();
  });
  it('imports teacher content, reviews, offers local play and exports Memory JSON', async () => {
    const dl=captureDownload();
    const {user}=renderPage(<MemoryHome/>);
    await user.click(screen.getByRole('button',{name:/Aktivität importieren/}));
    const input=document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input,jsonFile('memory.json',sample));
    expect(await screen.findByText('Datei gültig')).toBeTruthy();
    await user.click(screen.getByRole('button',{name:/Im Editor öffnen/}));
    expect(screen.getByDisplayValue('Wortschatz')).toBeTruthy();
    await user.click(screen.getByRole('button',{name:'Paare'}));
    expect(screen.getByDisplayValue('Haus')).toBeTruthy();
    await user.click(screen.getByRole('button',{name:'Prüfen'}));
    const review=screen.getByText(/Gemeinsam online spielen/).closest('.activity-memory-online') as HTMLElement;
    expect(within(review).getByRole('button',{name:/Online-Raum erstellen/})).toBeTruthy();
    await user.click(screen.getByRole('button',{name:'Aktivität herunterladen'}));
    expect(dl.names[0]).toMatch(/^memory_.*\.json$/);
    const exported=JSON.parse(await dl.text());
    expect(exported.content.pairs).toHaveLength(2);
    expect(exported.roomCode).toBeUndefined();
    await user.click(screen.getByRole('button',{name:'Allein üben'}));
    expect(screen.getByRole('button',{name:'Spiel starten'})).toBeTruthy();
  });
});
