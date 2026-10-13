// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { renderPage, jsonFile, captureDownload, chooseLocale } from './helpers/dom';
import { MemoryHome } from '../src/games/memory/MemoryHome';
import { fromMemoryPairs } from '../src/games/memory/activity';

afterEach(() => {cleanup();vi.restoreAllMocks();});
const sample = fromMemoryPairs([{left:'Haus',right:'house'},{left:'Tür',right:'door'}], 'Wortschatz');

describe('Memory unified entry without hosted writes', () => {
  it('shows create/import plus existing join route, and switches interface language', async () => {
    const {user} = renderPage(<MemoryHome/>);
    expect(screen.getByRole('button',{name:/Selbst erstellen/})).toBeTruthy();
    expect(screen.getByRole('button',{name:/Aktivität importieren/})).toBeTruthy();
    const join = screen.getByRole('link',{name:/Raum beitreten/});
    expect(join.getAttribute('href')).toBe('/games/memory/join');
    expect(join.classList.contains('card-link')).toBe(true);
    await chooseLocale(user, 'en');
    expect(screen.getByRole('button',{name:/Create activity/})).toBeTruthy();
    expect(screen.getByRole('link',{name:/Join game/})).toBeTruthy();
  });
  it('imports teacher content, offers local play and online room, and exports Memory JSON', async () => {
    const dl=captureDownload();
    const {user}=renderPage(<MemoryHome/>);
    await user.click(screen.getByRole('button',{name:/Aktivität importieren/}));
    const input=document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input,jsonFile('memory.json',sample));
    expect(await screen.findByText('Datei gültig')).toBeTruthy();
    await user.click(screen.getByRole('button',{name:/Im Editor öffnen/}));
    expect(screen.getByDisplayValue('Wortschatz')).toBeTruthy();
    expect(screen.getByDisplayValue('Haus')).toBeTruthy();
    // Creating an online room is a separate, explicit action next to the two play buttons.
    expect(screen.getByRole('button',{name:/Online-Raum erstellen/})).toBeTruthy();
    await user.click(screen.getByRole('button',{name:'Herunterladen'}));
    expect(dl.names[0]).toMatch(/^memory_.*\.json$/);
    const exported=JSON.parse(await dl.text());
    expect(exported.content.pairs).toHaveLength(2);
    expect(exported.roomCode).toBeUndefined();
    await user.click(screen.getByRole('button',{name:'Ausprobieren'}));
    expect(screen.getByRole('button',{name:'Spiel starten'})).toBeTruthy();
  });
});
