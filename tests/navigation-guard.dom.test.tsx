// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { SortPage } from '../src/games/sort/SortPage';
import { importActivity, renderPage } from './helpers/dom';
import { sortFixture } from './helpers/fixtures';

afterEach(() => vi.restoreAllMocks());

/** Imports a Sort activity and returns the editor's title field, so each test starts from a known editor state. */
async function openEditor(user: Parameters<typeof importActivity>[0]) {
  await importActivity(user, sortFixture());
  await waitFor(() => expect(screen.getByLabelText('Titel')).toBeTruthy());
}
const logo = () => document.querySelector<HTMLElement>('a.wordmark')!;

describe('unsaved teacher work is protected from internal navigation', () => {
  it('asks once before the logo leaves unsaved work, and stays on the page when declined', async () => {
    const { user, router } = renderPage(<SortPage />);
    await openEditor(user);
    await user.type(screen.getByLabelText('Titel'), ' neu');                  // real edit: dirty
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(logo());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).not.toBe('/');
    expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toContain(' neu');
  });
  it('proceeds when the teacher confirms the discard', async () => {
    const { user, router } = renderPage(<SortPage />);
    await openEditor(user);
    await user.type(screen.getByLabelText('Titel'), ' neu');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(logo());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(router.state.location.pathname).toBe('/');
  });
  it('does not prompt for an unedited activity', async () => {
    const { user, router } = renderPage(<SortPage />);
    await openEditor(user);
    const confirm = vi.spyOn(window, 'confirm');
    await user.click(logo());
    expect(confirm).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe('/');
  });
  it('a confirmed "Back to choices" clears the draft, so the logo does not prompt again', async () => {
    const { user, router } = renderPage(<SortPage />);
    await openEditor(user);
    await user.type(screen.getByLabelText('Titel'), ' neu');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Zur Auswahl' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    await user.click(logo());
    expect(confirm).toHaveBeenCalledTimes(1);                                // no second dialog for the same work
    expect(router.state.location.pathname).toBe('/');
  });
});
