// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { MemoryHome } from '../src/games/memory/MemoryHome';
import { fromMemoryPairs } from '../src/games/memory/activity';
import { importActivity, renderPage } from './helpers/dom';

// Real memoryRpc client over a fake Supabase rpc, so the create call and its arguments are the production ones.
const rpcMock = vi.hoisted(() => vi.fn());
vi.mock('../src/shared/lib/supabase', () => ({ getSupabase: () => ({ rpc: rpcMock }) }));

const ROOM_PATH = '/games/memory/room/ZZ99XY';
const createCalls = () => rpcMock.mock.calls.filter(([name]) => name === 'game_poc_memory_create_v2');

function serveCreate(reply: () => unknown) {
  rpcMock.mockImplementation(async () => {
    try { return { data: reply(), error: null }; }
    catch (e) { return { data: null, error: { message: (e as Error).message } }; }
  });
}

/** A teacher-edited activity: blank editor, then two rows typed by hand. Dirty by construction, never imported. */
async function editManually() {
  const page = renderPage(<MemoryHome />);
  await page.user.click(screen.getByRole('button', { name: /Selbst erstellen/ }));
  await page.user.type(screen.getByLabelText('Karte A · 1'), 'Haus');
  await page.user.type(screen.getByLabelText('Karte B · 1'), 'house');
  await page.user.type(screen.getByLabelText('Karte A · 2'), 'Tisch');
  await page.user.type(screen.getByLabelText('Karte B · 2'), 'table');
  return page;
}
const valueOf = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { rpcMock.mockReset(); });

describe('F5: unsaved editor work and room creation', () => {
  it('declining the unsaved-work prompt creates no room and keeps the editor', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user } = await editManually();
    await user.click(screen.getByRole('button', { name: /Online-Raum erstellen/ }));
    await user.click(screen.getByRole('button', { name: 'Raum erstellen' }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(createCalls()).toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(valueOf('Karte A · 1')).toBe('Haus');
    expect(valueOf('Karte B · 2')).toBe('table');
  });

  it('accepting once creates the room and navigates without a second prompt', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    serveCreate(() => ({ roomCode: 'ZZ99XY', hostToken: 'b'.repeat(64) }));
    const { user, router } = await editManually();
    await user.click(screen.getByRole('button', { name: /Online-Raum erstellen/ }));
    await user.click(screen.getByRole('button', { name: 'Raum erstellen' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(ROOM_PATH));
    expect(createCalls()).toHaveLength(1);
    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('a failed creation keeps the editor, keeps the guard, and does not navigate', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    serveCreate(() => { throw new Error('PostgREST: relation "hidden" does not exist'); });
    const { user, router } = await editManually();
    await user.click(screen.getByRole('button', { name: /Online-Raum erstellen/ }));
    await user.click(screen.getByRole('button', { name: 'Raum erstellen' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Raum konnte nicht erstellt werden.');
    expect(document.body.textContent).not.toMatch(/PostgREST|relation/);
    expect(router.state.location.pathname).toBe('/under-test');
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(valueOf('Karte A · 1')).toBe('Haus');

    // Close the dialog, then an unrelated navigation must still be guarded by the unsaved-work prompt.
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    confirm.mockReturnValue(false);
    await act(async () => { await router.navigate('/elsewhere'); });
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
    expect(router.state.location.pathname).toBe('/under-test');
  });

  it('unrelated navigation is still guarded: declined stays, accepted proceeds', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { router } = await editManually();

    await act(async () => { await router.navigate('/elsewhere'); });
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(router.state.location.pathname).toBe('/under-test');

    confirm.mockReturnValue(true);
    await act(async () => { await router.navigate('/elsewhere'); });
    await waitFor(() => expect(router.state.location.pathname).toBe('/elsewhere'));
    expect(createCalls()).toHaveLength(0);
  });

  it('an imported, unedited activity creates a room without any prompt (unchanged path)', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    serveCreate(() => ({ roomCode: 'ZZ99XY', hostToken: 'b'.repeat(64) }));
    const sample = fromMemoryPairs([{ left: 'Haus', right: 'house' }, { left: 'Tür', right: 'door' }], 'Wortschatz');
    const { user, router } = renderPage(<MemoryHome />);
    await importActivity(user, sample);
    await user.click(screen.getByRole('button', { name: /Online-Raum erstellen/ }));
    await user.click(screen.getByRole('button', { name: 'Raum erstellen' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(ROOM_PATH));
    expect(createCalls()).toHaveLength(1);
    expect(confirm).not.toHaveBeenCalled();
  });
});
