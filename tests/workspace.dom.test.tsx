// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { SortPage } from '../src/games/sort/SortPage';
import { validateSort } from '../src/games/sort/model';
import { serializeActivity } from '../src/shared/activities/portable';
import { chooseLocale, fileInput, importActivity, jsonFile, renderPage } from './helpers/dom';
import { sequenceFixture, sortFixture } from './helpers/fixtures';

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;
afterEach(() => vi.restoreAllMocks());

describe('import failures', () => {
  it('shows only the file problems, near the top, and leaves the current draft untouched', async () => {
    const { user } = renderPage(<SortPage />);
    const idBefore = field(/Aktivitäts-ID/).value;
    await user.upload(fileInput(), jsonFile('bad.json', '{broken'));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Import fehlgeschlagen');
    expect(alert.textContent).toContain('file: ungültige JSON-Datei');
    // none of the blank template's own validation problems may leak into the import error
    expect(alert.textContent).not.toMatch(/content\./);
    expect(field(/Aktivitäts-ID/).value).toBe(idBefore);
    // the alert is reachable without scrolling past the whole editor
    const authoring = document.querySelector('.activity-authoring')!;
    expect(alert.compareDocumentPosition(authoring) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('reports a file from another game with a clear kind error', async () => {
    const { user } = renderPage(<SortPage />);
    await importActivity(user, sequenceFixture());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('activityType: falscher Spieltyp');
  });
  it('reports oversize files by size before reading them', async () => {
    const { user } = renderPage(<SortPage />);
    const huge = new File(['x'], 'huge.json', { type: 'application/json' });
    Object.defineProperty(huge, 'size', { value: 128 * 1024 + 1 });
    const text = vi.fn(async () => 'x');
    Object.defineProperty(huge, 'text', { value: text });
    await user.upload(fileInput(), huge);
    expect((await screen.findByRole('alert')).textContent).toContain('Datei zu groß');
    expect(text).not.toHaveBeenCalled();
  });
  it('resets the file input after every outcome so the same file can be chosen again', async () => {
    const { user } = renderPage(<SortPage />);
    await user.upload(fileInput(), jsonFile('bad.json', '{broken'));
    await screen.findByRole('alert');
    expect(fileInput().value).toBe('');
    await importActivity(user, sortFixture());
    await waitFor(() => expect(field(/Titel/).value).toBe('Artikel sortieren'));
    expect(fileInput().value).toBe('');
    // cancelled overwrite confirmation must also reset the input
    await user.type(field(/Titel/), '!');
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await importActivity(user, sortFixture());
    expect(fileInput().value).toBe('');
  });
  it('caps a very long problem list instead of rendering hundreds of rows', async () => {
    const { user } = renderPage(<SortPage />);
    const a = sortFixture();
    a.content.items = Array.from({ length: 30 }, (_, i) => ({ id: 'c' + i, text: 'Karte ' + i, categoryId: 'der', bogus: 1 })) as never;
    await importActivity(user, a);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getAllByRole('listitem').length).toBeLessThanOrEqual(26);
    expect(alert.textContent).toMatch(/und \d+ weitere/);
  });
});

describe('unsaved-edit protection', () => {
  it('asks before an import replaces unsaved edits and keeps them when declined', async () => {
    const { user } = renderPage(<SortPage />);
    await importActivity(user, sortFixture());
    await waitFor(() => expect(field(/Titel/).value).toBe('Artikel sortieren'));
    await user.type(field(/Titel/), ' geändert');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const other = sortFixture(); other.title = 'Anderes Thema';
    await importActivity(user, other);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(field(/Titel/).value).toBe('Artikel sortieren geändert');
    confirm.mockReturnValue(true);
    await importActivity(user, other);
    await waitFor(() => expect(field(/Titel/).value).toBe('Anderes Thema'));
  });
  it('re-asks when the teacher edits while a slow file is still being read', async () => {
    const { user } = renderPage(<SortPage />);
    await importActivity(user, sortFixture());
    await waitFor(() => expect(field(/Titel/).value).toBe('Artikel sortieren'));
    // Not dirty yet (fresh import) → no confirmation at the start of the second import.
    let release!: (text: string) => void;
    const slow = jsonFile('slow.json', '');
    Object.defineProperty(slow, 'text', { value: () => new Promise<string>(resolve => { release = resolve; }) });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.upload(fileInput(), slow);
    expect(confirm).not.toHaveBeenCalled();
    await user.type(field(/Titel/), ' mitten im Lesen');
    const other = sortFixture(); other.title = 'Ersatz';
    release(JSON.stringify(other));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(field(/Titel/).value).toBe('Artikel sortieren mitten im Lesen');
  });
  it('applies a slow import and returns to the editor when the teacher only switched views meanwhile', async () => {
    const { user } = renderPage(<SortPage />);
    await importActivity(user, sortFixture());
    await waitFor(() => expect(field(/Titel/).value).toBe('Artikel sortieren'));
    let release!: (text: string) => void;
    const slow = jsonFile('slow.json', '');
    Object.defineProperty(slow, 'text', { value: () => new Promise<string>(resolve => { release = resolve; }) });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.upload(fileInput(), slow);
    await user.click(screen.getByRole('button', { name: 'Vorschau' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Artikel sortieren' })).toBeTruthy();
    const other = sortFixture(); other.title = 'Nach dem Lesen';
    release(JSON.stringify(other));
    // no unsaved edits exist, so nothing can be lost and no confirmation is needed
    await waitFor(() => expect(field(/Titel/).value).toBe('Nach dem Lesen'));
    expect(confirm).not.toHaveBeenCalled();
  });
  it('registers a beforeunload guard only while there are unexported edits', async () => {
    const { user } = renderPage(<SortPage />);
    const probe = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    expect(probe()).toBe(false);
    await user.type(field(/Titel/), 'x');
    expect(probe()).toBe(true);
  });
  it('exports a canonical file under <type>_<id>.json and then clears the unsaved marker', async () => {
    const blobs: Blob[] = [], names: string[] = [];
    URL.createObjectURL = (blob: Blob | MediaSource) => { blobs.push(blob as Blob); return 'blob:test'; };
    URL.revokeObjectURL = () => {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
    const { user } = renderPage(<SortPage />);
    await importActivity(user, sortFixture());
    await waitFor(() => expect(field(/Titel/).value).toBe('Artikel sortieren'));
    await user.type(field(/Titel/), '!');
    expect(screen.getByText('Nicht exportierte Änderungen')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'JSON herunterladen' }));
    expect(names).toEqual(['sort_artikel-sortieren.json']);
    const expected = sortFixture(); expected.title = 'Artikel sortieren!';
    expect(await blobs[0].text()).toBe(serializeActivity(expected, validateSort).value);
    expect(screen.getByText('Datei zum Export bereit')).toBeTruthy();
  });
});

describe('New form', () => {
  it('resets to a blank invalid template, asking first when there are unexported edits', async () => {
    const { user } = renderPage(<SortPage />);
    await importActivity(user, sortFixture());
    await waitFor(() => expect(field(/Titel/).value).toBe('Artikel sortieren'));
    // freshly imported: nothing to lose, so no confirmation
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.type(field(/Titel/), '!');
    await user.click(screen.getByRole('button', { name: 'Neu' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(field(/Titel/).value).toBe('Artikel sortieren!');          // declined: draft kept
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Neu' }));
    expect(field(/Titel/).value).toBe('Sort');
    expect(screen.getByText('Datei zum Export bereit')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Vorschau' }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Neu' }));  // clean again: no further prompt
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});

describe('mode navigation', () => {
  it('disables Preview, Present and Practice while the draft is invalid and offers the problem list', async () => {
    const { user } = renderPage(<SortPage />);
    for (const name of ['Vorschau', 'Präsentieren', 'Allein üben']) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled, name).toBe(true);
    }
    await user.click(screen.getByRole('button', { name: /Probleme anzeigen \(\d+\)/ }));
    expect(document.activeElement?.id).toBe('activity-problems');
  });
  it('marks the active mode with aria-current', async () => {
    const { user } = renderPage(<SortPage />);
    await importActivity(user, sortFixture());
    await waitFor(() => expect(field(/Titel/).value).toBe('Artikel sortieren'));
    const nav = screen.getByRole('navigation', { name: 'Modus' });
    const current = () => within(nav).getAllByRole('button').filter(b => b.getAttribute('aria-current') === 'true').map(b => b.textContent);
    expect(current()).toEqual(['Bearbeiten']);
    for (const name of ['Vorschau', 'Präsentieren', 'Allein üben']) {
      await user.click(within(nav).getByRole('button', { name }));
      expect(current()).toEqual([name]);
    }
    await user.click(within(nav).getByRole('button', { name: 'Bearbeiten' }));
    expect(current()).toEqual(['Bearbeiten']);
  });
});

describe('language handling', () => {
  let original: string;
  beforeEach(() => { original = document.documentElement.lang; document.documentElement.lang = 'de'; });
  afterEach(() => { document.documentElement.lang = original; });
  it('sets <html lang> to the interface locale and restores it when the page unmounts', async () => {
    const { user, unmount } = renderPage(<SortPage />);
    expect(document.documentElement.lang).toBe('de');
    await chooseLocale(user, 'vi');
    expect(document.documentElement.lang).toBe('vi');
    await chooseLocale(user, 'en');
    expect(document.documentElement.lang).toBe('en');
    unmount();
    expect(document.documentElement.lang).toBe('de');
  });
  it('marks authored title and instructions with the activity target language, not the interface language', async () => {
    const { user } = renderPage(<SortPage />);
    const a = sortFixture(); a.targetLanguage = 'fr';
    await importActivity(user, a);
    await waitFor(() => expect(field(/Titel/).value).toBe('Artikel sortieren'));
    await chooseLocale(user, 'en');
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    const heading = screen.getByRole('heading', { level: 2, name: 'Artikel sortieren' });
    expect(heading.getAttribute('lang')).toBe('fr');
    expect(screen.getByText('Ordne die Nomen dem Artikel zu.').getAttribute('lang')).toBe('fr');
  });
});

// jsdom has no layout, so only the semantics are asserted here; real touch-target sizes are checked in the browser report.
describe('accessibility semantics', () => {
  it('labels the file input and keeps the back link out of the way of unsaved edits', async () => {
    const { user } = renderPage(<SortPage />);
    expect(fileInput().getAttribute('aria-label')).toBe('Datei auswählen');
    await user.type(field(/Titel/), 'x');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const link = screen.getByRole('link', { name: /Learning Games/ });
    const proceeded = fireEvent.click(link);
    expect(confirm).toHaveBeenCalled();
    expect(proceeded).toBe(false); // navigation was cancelled
  });
});
