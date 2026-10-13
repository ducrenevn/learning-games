// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SortPage } from '../src/games/sort/SortPage';
import { captureDownload, importActivity, renderPage } from './helpers/dom';
import { sortFixture } from './helpers/fixtures';

afterEach(() => vi.restoreAllMocks());
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement;
const bins = () => screen.getAllByRole('region').filter(r => r.classList.contains('sort-bin'));
const binOf = (name: string) => screen.getByRole('region', { name });
const cardsIn = (name: string) => within(binOf(name)).queryAllByRole('textbox', { name: /^Karte \d+$/ }).map(el => (el as HTMLInputElement).value);
async function create(user: UserEvent) { await user.click(button(/Selbst erstellen/)); }
async function loaded(user: UserEvent) {
  await importActivity(user, sortFixture());
  expect(field('Titel').value).toBe('Artikel sortieren');
}
async function expectBlocked(user: UserEvent, dl = captureDownload()) {
  await user.click(button('Herunterladen'));
  expect(dl.names).toHaveLength(0);
  expect(screen.getByRole('alert').textContent).toContain('Noch nicht spielbereit');
}
async function fillBlank(user: UserEvent) {
  await create(user);
  await user.type(field('Beschriftung 1'), 'Obst');
  await user.type(field('Beschriftung 2'), 'Gemüse');
  for (const [i, word] of ['Apfel', 'Birne', 'Karotte', 'Gurke'].entries()) await user.type(field('Karte ' + (i + 1)), word);
}

describe('Sort canvas: the bins are the editor', () => {
  it('opens calm, with title, two bins holding two cards each, and no answer dropdown or navigator', async () => {
    const { user } = renderPage(<SortPage />);
    expect(screen.queryByRole('alert')).toBeNull();
    await create(user);
    expect(field('Titel')).toBeTruthy();
    expect(bins()).toHaveLength(2);
    expect(screen.getAllByRole('textbox', { name: /^Karte \d+$/ })).toHaveLength(4);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Weiter' })).toBeNull();
    expect(screen.queryByLabelText(/^Lösung/)).toBeNull();
    expect(document.querySelector('.activity-ux-navigation')).toBeNull();
  });
  it('requires category names before playing; the first missing field is named and focused', async () => {
    const { user } = renderPage(<SortPage />);
    await create(user);
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(button('Ausprobieren'));
    expect((await screen.findByRole('alert')).textContent).toContain('Noch nicht spielbereit');
    expect(document.activeElement).toBe(field('Beschriftung 1'));
    await user.type(field('Beschriftung 1'), 'Obst');
    await user.type(field('Beschriftung 2'), 'Gemüse');
    for (const [i, word] of ['Apfel', 'Birne', 'Karotte', 'Gurke'].entries()) await user.type(field('Karte ' + (i + 1)), word);
    await user.click(button('Ausprobieren'));
    expect(document.querySelector('.activity-ux-play')).toBeTruthy();
  });
  it('treats the bin a card sits in as its answer when exporting, with no session state', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await fillBlank(user);
    await user.click(button('Erklärung (optional): Karte 1'));
    await user.type(field('Erklärung (optional) · Karte 1'), 'Ein Apfel ist Obst.');
    await user.click(button('Herunterladen'));
    const exported = JSON.parse(await dl.text());
    expect(exported.activityType).toBe('sort');
    expect(exported.content.categories.map((c: { label: string }) => c.label)).toEqual(['Obst', 'Gemüse']);
    expect(exported.content.items.map((c: { categoryId: string }) => c.categoryId)).toEqual(['category-1', 'category-1', 'category-2', 'category-2']);
    expect(exported.content.items[0].explanation).toBe('Ein Apfel ist Obst.');
    expect(exported).not.toHaveProperty('roomCode');
    expect(exported).not.toHaveProperty('attempts');
  });
  it('reimports an exported file with unchanged teacher answer assignments, byte for byte', async () => {
    const dl = captureDownload();
    const first = renderPage(<SortPage />);
    await loaded(first.user);
    await first.user.click(button('Herunterladen'));
    const exportText = await dl.text();
    expect(JSON.parse(exportText)).toEqual(sortFixture());
    first.unmount();
    const second = renderPage(<SortPage />);
    await importActivity(second.user, JSON.parse(exportText));
    await second.user.click(button('Herunterladen'));
    expect(await dl.text()).toBe(exportText);
  });
  it('shows an imported activity as its real bins with the cards inside them', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    expect(cardsIn('der')).toEqual(['Tisch', 'Stuhl']);
    expect(cardsIn('die')).toEqual(['Lampe']);
    expect(cardsIn('das')).toEqual(['Buch']);
  });
  it('supports 2–5 categories and disables the add button at the maximum', async () => {
    const { user } = renderPage(<SortPage />);
    await create(user);
    expect(button('Entfernen: Kategorie 1').disabled).toBe(true);
    for (let i = 0; i < 3; i++) await user.click(button('Kategorie hinzufügen'));
    expect(button(/Kategorie hinzufügen/).disabled).toBe(true);
    expect(screen.getAllByRole('button', { name: /^Entfernen: Kategorie/ })).toHaveLength(5);
    expect(screen.getByText('Höchstens 5 Kategorien.')).toBeTruthy();
    await user.click(button('Entfernen: Kategorie 5'));
    expect(button('Kategorie hinzufügen').disabled).toBe(false);
  });
  it('focuses the new category title after adding a category', async () => {
    const { user } = renderPage(<SortPage />);
    await create(user);
    await user.click(button('Kategorie hinzufügen'));
    expect(document.activeElement).toBe(field('Beschriftung 3'));
  });
  it('supports 4–30 cards and disables adding at the maximum', async () => {
    const { user } = renderPage(<SortPage />);
    await create(user);
    expect(button('Entfernen: Karte 1').disabled).toBe(true);
    for (let i = 0; i < 26; i++) await user.click(button('Karte hinzufügen: Kategorie 1'));
    expect(button('Karte hinzufügen: Kategorie 1').disabled).toBe(true);
    expect(screen.getAllByRole('button', { name: /^Entfernen: Karte/ })).toHaveLength(30);
    await user.click(button('Entfernen: Karte 30'));
    expect(button('Karte hinzufügen: Kategorie 1').disabled).toBe(false);
  }, 60000);
  it('asks before removing a category that holds cards, and says where they go', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(button('Entfernen: Kategorie 1'));
    expect(confirm).toHaveBeenCalledOnce();
    expect(String(confirm.mock.calls[0][0])).toMatch(/„der“.*2 Karten.*„die“/);
    expect(bins()).toHaveLength(3);
    expect(cardsIn('der')).toEqual(['Tisch', 'Stuhl']);
    confirm.mockReturnValue(true);
    await user.click(button('Entfernen: Kategorie 1'));
    expect(bins()).toHaveLength(2);
    expect(cardsIn('die').sort()).toEqual(['Lampe', 'Stuhl', 'Tisch']);
    // No dangling answer is possible any more: the activity is still complete and downloadable.
    const dl = captureDownload();
    await user.click(button('Herunterladen'));
    expect(dl.names).toHaveLength(1);
  });
  it('removes an empty category without asking', async () => {
    const { user } = renderPage(<SortPage />);
    await create(user);
    await user.click(button('Kategorie hinzufügen'));
    const confirm = vi.spyOn(window, 'confirm');
    await user.click(button('Entfernen: Kategorie 3'));
    expect(confirm).not.toHaveBeenCalled();
    expect(bins()).toHaveLength(2);
  });
  it('rejects case-folded duplicate cards and unsafe HTML content', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.click(button('Karte hinzufügen: der'));
    await user.type(field('Karte 3'), ' tisch ');
    await expectBlocked(user);
    await user.clear(field('Karte 3'));
    await user.type(field('Karte 3'), '<img src=x>');
    await expectBlocked(user);
  });
  it('generates a fresh unique card ID after deleting a middle card', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await fillBlank(user);
    for (const label of ['E', 'F']) {
      await user.click(button('Karte hinzufügen: Obst'));
      await user.keyboard(label);
    }
    await user.click(button('Entfernen: Karte 3'));
    await user.click(button('Karte hinzufügen: Obst'));
    await user.keyboard('G');
    await user.click(button('Herunterladen'));
    const ids = JSON.parse(await dl.text()).content.items.map((x: { id: string }) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['card-1', 'card-2', 'card-6', 'card-5', 'card-3', 'card-4']);
  });
  it('removes optional explanation keys instead of exporting blank strings', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.clear(field('Erklärung (optional) · Karte 1'));
    await user.click(button('Herunterladen'));
    expect(JSON.parse(await dl.text()).content.items[0]).not.toHaveProperty('explanation');
  });
  it('retains unique button and field names for repeated cards', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    for (const prefix of ['Entfernen: Karte', 'Verschieben: Karte', 'Erklärung \\(optional\\): Karte']) {
      const names = screen.getAllByRole('button', { name: new RegExp('^' + prefix) }).map(b => b.getAttribute('aria-label'));
      expect(names).toHaveLength(4);
      expect(new Set(names).size).toBe(4);
    }
    expect(screen.queryAllByRole('combobox', { name: /^Lösung/ })).toHaveLength(0);
  });
  it('preserves keyboard focus after adding and removing a card', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.click(button('Karte hinzufügen: der'));
    expect(document.activeElement).toBe(field('Karte 3'));
    await user.click(button('Entfernen: Karte 3'));
    expect(document.activeElement).toBe(field('Karte 2'));
  });
  it('Enter adds a card in the same bin right below, and Backspace on an empty card removes it', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.click(field('Karte 1'));
    await user.keyboard('{Enter}');
    expect(cardsIn('der')).toEqual(['Tisch', '', 'Stuhl']);
    expect(document.activeElement).toBe(field('Karte 2'));
    await user.keyboard('{Backspace}');
    expect(cardsIn('der')).toEqual(['Tisch', 'Stuhl']);
    expect(document.activeElement).toBe(field('Karte 1'));
  });
  it('turns a pasted list into one card per line inside the bin it was pasted into', async () => {
    const { user } = renderPage(<SortPage />);
    await create(user);
    await user.click(field('Karte 3'));
    await user.paste('1. Apfel\n2. Birne\n- Kirsche');
    expect(cardsIn('Kategorie 1')).toEqual(['', '']);
    expect(within(binOf('Kategorie 2')).getAllByRole('textbox', { name: /^Karte \d+$/ }).map(i => (i as HTMLInputElement).value)).toEqual(['Apfel', 'Birne', 'Kirsche', '']);
  });
});

describe('Sort canvas: moving a card between bins', () => {
  it('uses select-and-move, like the player: pick a card, then a bin', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    expect(screen.queryByRole('button', { name: /^Hierhin verschieben/ })).toBeNull();
    await user.click(button('Verschieben: Karte 1'));
    expect(button('Verschieben: Karte 1').getAttribute('aria-pressed')).toBe('true');
    expect(button('Hierhin verschieben: der').disabled).toBe(true);
    await user.click(button('Hierhin verschieben: die'));
    expect(cardsIn('der')).toEqual(['Stuhl']);
    expect(cardsIn('die').sort()).toEqual(['Lampe', 'Tisch']);
    expect(screen.queryByRole('button', { name: /^Hierhin verschieben/ })).toBeNull();
    expect(document.querySelector('.activity-editor [role="status"].sr-only')?.textContent).toBe('Tisch wurde der Kategorie die zugeordnet.');
    await user.click(button('Herunterladen'));
    const tisch = JSON.parse(await dl.text()).content.items.find((i: { text: string }) => i.text === 'Tisch');
    expect(tisch.categoryId).toBe('die');
  });
  it('cancels a move with Escape or by pressing the same button again', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.click(button('Verschieben: Karte 1'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: /^Hierhin verschieben/ })).toBeNull();
    await user.click(button('Verschieben: Karte 1'));
    await user.click(button('Verschieben: Karte 1'));
    expect(screen.queryByRole('button', { name: /^Hierhin verschieben/ })).toBeNull();
    expect(cardsIn('der')).toEqual(['Tisch', 'Stuhl']);
  });
});
