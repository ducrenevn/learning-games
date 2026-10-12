// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SortPage } from '../src/games/sort/SortPage';
import { captureDownload, fileInput, importActivity, renderPage } from './helpers/dom';
import { sortFixture } from './helpers/fixtures';

afterEach(() => vi.restoreAllMocks());
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
async function fillBlank(user: UserEvent) {
  await user.type(input('Beschriftung 1'), 'Obst');
  await user.type(input('Beschriftung 2'), 'Gemüse');
  for (const [n, text] of [[1, 'Apfel'], [2, 'Birne'], [3, 'Karotte'], [4, 'Gurke']] as const) await user.type(input('Karte ' + n), text);
}
async function loaded(user: UserEvent) {
  await importActivity(user, sortFixture());
  await waitFor(() => expect(input('Titel').value).toBe('Artikel sortieren'));
}

describe('Sort authoring from a blank form', () => {
  it('is invalid until categories and cards have text, and then unlocks Preview, Present, Practice and Export', async () => {
    const { user } = renderPage(<SortPage />);
    expect(button('Vorschau').disabled).toBe(true);
    expect(button('JSON herunterladen').disabled).toBe(true);
    expect(document.querySelector('#activity-problems')!.textContent).toContain('content.categories[0].label');
    await fillBlank(user);
    expect(document.querySelector('#activity-problems')).toBeNull();
    for (const name of ['Vorschau', 'Präsentieren', 'Allein üben', 'JSON herunterladen']) expect(button(name).disabled, name).toBe(false);
  });
  it('exports exactly what was authored, in authored order, with no learner or session state', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await fillBlank(user);
    await user.selectOptions(screen.getByLabelText('Lösung (Karte 3)'), 'category-2');
    await user.selectOptions(screen.getByLabelText('Lösung (Karte 4)'), 'category-2');
    await user.type(screen.getByLabelText('Erklärung (optional) (Karte 1)'), 'Ein Apfel ist Obst.');
    await user.click(button('JSON herunterladen'));
    expect(dl.names).toEqual(['sort_new-sort-activity.json']);
    expect(JSON.parse(await dl.text())).toEqual({
      format: 'learning-games.activity', schemaVersion: 1, activityType: 'sort', id: 'new-sort-activity', title: 'Sort',
      targetLanguage: 'de', instructions: 'Ordne die Karten den passenden Kategorien zu.',
      content: {
        categories: [{ id: 'category-1', label: 'Obst' }, { id: 'category-2', label: 'Gemüse' }],
        items: [
          { id: 'card-1', text: 'Apfel', categoryId: 'category-1', explanation: 'Ein Apfel ist Obst.' },
          { id: 'card-2', text: 'Birne', categoryId: 'category-1' },
          { id: 'card-3', text: 'Karotte', categoryId: 'category-2' },
          { id: 'card-4', text: 'Gurke', categoryId: 'category-2' },
        ],
      },
    });
  });
  it('reimporting an exported authoring session reproduces identical content', async () => {
    const dl = captureDownload();
    const { user, unmount } = renderPage(<SortPage />);
    await loaded(user);
    await user.type(input('Titel'), ' 2');
    await user.click(button('JSON herunterladen'));
    const exported = await dl.text();
    unmount();
    const second = renderPage(<SortPage />);
    await importActivity(second.user, JSON.parse(exported));
    await waitFor(() => expect(input('Titel').value).toBe('Artikel sortieren 2'));
    await second.user.click(button('JSON herunterladen'));
    expect(await dl.text()).toBe(exported);
  });
});

describe('Sort editor limits and integrity', () => {
  it('keeps 2–5 categories and 4–30 cards by disabling the controls at the boundaries', async () => {
    const { user } = renderPage(<SortPage />);
    expect(button('Entfernen: Kategorie 1').disabled).toBe(true);
    expect(button('Entfernen: Karte 1').disabled).toBe(true);
    for (let i = 0; i < 3; i++) await user.click(button('Kategorie hinzufügen'));
    expect(button('Kategorie hinzufügen').disabled).toBe(true);
    expect(screen.getAllByRole('button', { name: /^Entfernen: Kategorie/ }).length).toBe(5);
    for (let i = 0; i < 26; i++) await user.click(button('Karte hinzufügen'));
    expect(button('Karte hinzufügen').disabled).toBe(true);
    expect(screen.getAllByRole('button', { name: /^Entfernen: Karte/ }).length).toBe(30);
    await user.click(button('Entfernen: Karte 30'));
    expect(button('Karte hinzufügen').disabled).toBe(false);
  }, 30000);
  it('gives every repeated Remove button and answer/explanation field a unique accessible name', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    const names = screen.getAllByRole('button', { name: /^Entfernen:/ }).map(b => b.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
    // jsdom trims the sr-only suffix's leading space when computing names; browsers keep it, hence \s*
    expect(screen.getAllByRole('combobox', { name: /^Lösung\s*\(Karte \d\)$/ }).length).toBe(4);
    expect(screen.getAllByLabelText(/^Erklärung \(optional\)\s*\(Karte \d\)$/).length).toBe(4);
  });
  it('flags cards whose category was removed instead of silently reassigning them', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.click(button('Entfernen: Kategorie 1')); // "der" is referenced by Tisch and Stuhl
    const select = screen.getByLabelText('Lösung (Karte 1)') as HTMLSelectElement;
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(within(select).getByText('⚠ der')).toBeTruthy();
    expect(document.querySelector('#activity-problems')!.textContent).toContain('content.items[0].categoryId: unbekannte Referenz');
    expect(button('Vorschau').disabled).toBe(true);
    await user.selectOptions(select, 'die');
    await user.selectOptions(screen.getByLabelText('Lösung (Karte 4)'), 'die');
    expect(document.querySelector('#activity-problems')).toBeNull();
    expect(button('Vorschau').disabled).toBe(false);
  });
  it('generates unique ids even after a row in the middle was removed', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await fillBlank(user);                                  // card-1 … card-4
    await user.click(button('Karte hinzufügen')); await user.type(input('Karte 5'), 'E');   // card-5
    await user.click(button('Karte hinzufügen')); await user.type(input('Karte 6'), 'F');   // card-6
    await user.click(button('Entfernen: Karte 5'));                                           // ids: 1,2,3,4,6
    await user.click(button('Karte hinzufügen')); await user.type(input('Karte 6'), 'G');   // must be card-5, not a clash with card-6
    await user.click(button('JSON herunterladen'));
    const ids = JSON.parse(await dl.text()).content.items.map((i: { id: string }) => i.id);
    expect(ids).toEqual(['card-1', 'card-2', 'card-3', 'card-4', 'card-6', 'card-5']);
  });
  it('flags case/whitespace-insensitive duplicate cards and markup as the teacher types', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.click(button('Karte hinzufügen'));
    await user.type(input('Karte 5'), ' tisch ');
    expect(document.querySelector('#activity-problems')!.textContent).toMatch(/content\.items\[4\]\.text: doppelter Wert/);
    await user.clear(input('Karte 5'));
    await user.type(input('Karte 5'), '<b>fett</b>');
    expect(document.querySelector('#activity-problems')!.textContent).toMatch(/content\.items\[4\]\.text: HTML\/Skripte sind nicht erlaubt/);
  });
  it('removes the explanation key entirely when the field is cleared', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.clear(screen.getByLabelText('Erklärung (optional) (Karte 1)'));
    await user.click(button('JSON herunterladen'));
    const exported = JSON.parse(await dl.text());
    expect(exported.content.items[0]).toEqual({ id: 'tisch', text: 'Tisch', categoryId: 'der' });
  });
});

describe('Sort editor keyboard focus', () => {
  it('focuses the new row after Add and the Add button after Remove, but never on import', async () => {
    const { user } = renderPage(<SortPage />);
    expect(document.activeElement).toBe(document.body);
    await loaded(user);
    expect(document.activeElement).toBe(fileInput());            // focus stays on the chooser; import must not move it into the form
    await user.click(button('Karte hinzufügen'));
    expect(document.activeElement).toBe(input('Karte 5'));
    await user.click(button('Entfernen: Karte 5'));
    expect(document.activeElement).toBe(button('Karte hinzufügen'));
    await user.click(button('Kategorie hinzufügen'));
    expect(document.activeElement).toBe(input('Beschriftung 4'));
    await user.click(button('Entfernen: Kategorie 4'));
    expect(document.activeElement).toBe(button('Kategorie hinzufügen'));
  });
});
