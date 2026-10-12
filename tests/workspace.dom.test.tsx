// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { SortPage } from '../src/games/sort/SortPage';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { sortFixture, sequenceFixture } from './helpers/fixtures';
import { captureDownload, chooseLocale, fileInput, jsonFile, openReview, renderPage } from './helpers/dom';

afterEach(() => vi.restoreAllMocks());
const button = (name: string | RegExp) => screen.getByRole('button', { name });
async function startImport(user: ReturnType<typeof renderPage>['user']) {
  await user.click(button(/Aktivität importieren/));
  return fileInput();
}
async function readyImport(user: ReturnType<typeof renderPage>['user'], data: unknown) {
  await startImport(user);
  await user.upload(fileInput(), jsonFile('activity.json', data));
  expect(await screen.findByText('Datei gültig')).toBeTruthy();
  await user.click(button('Im Editor öffnen'));
}

describe('Guided local activity import safety', () => {
  it('starts without errors or technical form fields', () => {
    renderPage(<SortPage />);
    expect(button(/Selbst erstellen/)).toBeTruthy();
    expect(button(/Aktivität importieren/)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByLabelText('Interne Aktivitäts-ID')).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
  it('rejects malformed JSON beside the file chooser without opening an editor', async () => {
    const { user } = renderPage(<SortPage />);
    await startImport(user);
    await user.upload(fileInput(), jsonFile('broken.json', '{broken'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Import fehlgeschlagen');
    expect(alert.textContent).toContain('ungültige JSON-Datei');
    expect(screen.queryByLabelText('Titel')).toBeNull();
    expect(document.querySelector('.activity-ux-import')?.contains(alert)).toBe(true);
  });
  it('rejects another game type without replacing activity state', async () => {
    const { user } = renderPage(<SortPage />);
    await startImport(user);
    await user.upload(fileInput(), jsonFile('wrong.json', sequenceFixture()));
    expect((await screen.findByRole('alert')).textContent).toContain('falscher Spieltyp');
    expect(screen.queryByRole('button', { name: 'Im Editor öffnen' })).toBeNull();
  });
  it('checks file size before calling File.text()', async () => {
    const { user } = renderPage(<SortPage />);
    await startImport(user);
    const huge = jsonFile('large.json', 'x');
    Object.defineProperty(huge, 'size', { value: 128 * 1024 + 1 });
    const read = vi.fn(async () => 'x');
    Object.defineProperty(huge, 'text', { value: read });
    await user.upload(fileInput(), huge);
    expect((await screen.findByRole('alert')).textContent).toContain('Datei zu groß');
    expect(read).not.toHaveBeenCalled();
  });
  it('rejects non-json extensions before reading', async () => {
    const { user } = renderPage(<SortPage />);
    await startImport(user);
    const wrong = jsonFile('activity.txt', sortFixture());
    Object.defineProperty(wrong, 'text', { value: vi.fn(async () => '') });
    fileInput().removeAttribute('accept');
    await user.upload(fileInput(), wrong);
    expect((await screen.findByRole('alert')).textContent).toContain('unbekanntes Dateiformat');
  });
  it('allows the same file to be retried after a failed selection', async () => {
    const { user } = renderPage(<SortPage />);
    await startImport(user);
    const bad = jsonFile('broken.json', '{broken');
    await user.upload(fileInput(), bad);
    await screen.findByRole('alert');
    expect(fileInput().value).toBe('');
    await user.upload(fileInput(), bad);
    expect((await screen.findByRole('alert')).textContent).toContain('ungültige JSON-Datei');
  });
  it('replaces a failed review with a valid file and requires explicit acceptance', async () => {
    const { user } = renderPage(<SortPage />);
    await startImport(user);
    await user.upload(fileInput(), jsonFile('broken.json', '{broken'));
    await screen.findByRole('alert');
    await user.upload(fileInput(), jsonFile('good.json', sortFixture()));
    expect(await screen.findByText('Datei gültig')).toBeTruthy();
    expect(screen.queryByLabelText('Titel')).toBeNull();
    await user.click(button('Im Editor öffnen'));
    expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Artikel sortieren');
  });
  it('caps extremely long error lists', async () => {
    const { user } = renderPage(<SortPage />);
    await startImport(user);
    const bad = sortFixture();
    bad.content.items = Array.from({ length: 30 }, (_, i) => ({ id: 'c' + i, text: 'Karte ' + i, categoryId: 'der', bogus: true })) as never;
    await user.upload(fileInput(), jsonFile('invalid.json', bad));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getAllByRole('listitem').length).toBeLessThanOrEqual(26);
  });
});

describe('Guided editor, review and local file ownership', () => {
  it('opens an imported draft in Details with unchanged title and target language', async () => {
    const { user } = renderPage(<SortPage />);
    await readyImport(user, sortFixture());
    expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Artikel sortieren');
    expect((screen.getByLabelText('Zielsprache') as HTMLInputElement).value).toBe('de');
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('exposes canonical export only at Review and preserves the original imported answer key', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await readyImport(user, sortFixture());
    expect(screen.queryByRole('button', { name: 'Aktivität herunterladen' })).toBeNull();
    await openReview(user);
    await user.click(button('Aktivität herunterladen'));
    expect(dl.names).toEqual(['sort_artikel-sortieren.json']);
    expect(JSON.parse(await dl.text())).toEqual(sortFixture());
  });
  it('warns before discarding edited content on return to the chooser', async () => {
    const { user } = renderPage(<SortPage />);
    await readyImport(user, sortFixture());
    await user.type(screen.getByLabelText('Titel'), ' neu');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(button(/Zur Auswahl/));
    expect(confirm).toHaveBeenCalledOnce();
    expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Artikel sortieren neu');
    confirm.mockReturnValue(true);
    await user.click(button(/Zur Auswahl/));
    expect(button(/Selbst erstellen/)).toBeTruthy();
  });
  it('protects an unfinished imported review on browser close', async () => {
    const { user } = renderPage(<SortPage />);
    await startImport(user);
    await user.upload(fileInput(), jsonFile('good.json', sortFixture()));
    await screen.findByText('Datei gültig');
    await waitFor(() => {
      const before = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(before);
      expect(before.defaultPrevented).toBe(true);
    });
  });
  it('shows validation only after attempting Continue and allows navigation to incomplete steps', async () => {
    const { user } = renderPage(<SequencePage />);
    await user.click(button(/Selbst erstellen/));
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(button('Weiter'));
    await user.click(button('Weiter'));
    expect(screen.getByRole('alert').textContent).toContain('Bitte ergänzen');
    await openReview(user);
    expect(document.querySelector('.activity-ux-review-status')?.textContent).toMatch(/Noch zu ergänzen/);
  });
  it('keeps authored text unchanged when DE → EN → VI is switched', async () => {
    const { user } = renderPage(<SortPage />);
    await readyImport(user, sortFixture());
    for (const locale of ['en', 'vi', 'de'] as const) {
      await chooseLocale(user, locale);
      expect((screen.getByDisplayValue('Artikel sortieren') as HTMLInputElement).value).toBe('Artikel sortieren');
      expect((screen.getByDisplayValue('Ordne die Nomen dem Artikel zu.') as HTMLTextAreaElement).value).toBe('Ordne die Nomen dem Artikel zu.');
      expect(document.documentElement.lang).toBe(locale);
    }
  });
  it('separates the activity Review from the play screen and has no authoring controls in play', async () => {
    const { user } = renderPage(<SortPage />);
    await readyImport(user, sortFixture());
    await openReview(user);
    await user.click(button('Allein üben'));
    expect(document.querySelector('.activity-ux-play')).not.toBeNull();
    expect(screen.queryByLabelText('Interne Aktivitäts-ID')).toBeNull();
    expect(document.querySelector('.activity-ux-back')?.textContent).toContain('Zum Editor');
  });
});
