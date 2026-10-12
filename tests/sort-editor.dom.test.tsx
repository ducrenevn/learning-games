// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SortPage } from '../src/games/sort/SortPage';
import { captureDownload, importActivity,   renderPage } from './helpers/dom';
import { sortFixture } from './helpers/fixtures';

afterEach(() => vi.restoreAllMocks());
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement;
async function create(user: UserEvent) { await user.click(button(/Selbst erstellen/)); }
async function expectBlocked(user:UserEvent, dl=captureDownload()){
  await user.click(button('Herunterladen'));
  expect(dl.names).toHaveLength(0);
  expect(screen.getByRole('alert').textContent).toContain('Noch nicht spielbereit');
}
async function loaded(user: UserEvent) {
  await importActivity(user, sortFixture());
  expect(field('Titel').value).toBe('Artikel sortieren');
}
async function fillBlank(user: UserEvent) {
  await create(user);
  await user.type(field('Beschriftung 1'), 'Obst');
  await user.type(field('Beschriftung 2'), 'Gemüse');
  for (const [i, word] of ['Apfel', 'Birne', 'Karotte', 'Gurke'].entries()) {
    await user.type(field('Karte ' + (i + 1)), word);
    if (i >= 2) await user.selectOptions(screen.getByLabelText(new RegExp('Lösung.*Karte ' + (i + 1))), 'category-2');
  }
}

describe('Sort guided teacher authoring', () => {
  it('opens calm, with title, categories and cards on one page and no error list', async () => {
    const { user } = renderPage(<SortPage />);
    expect(screen.queryByRole('alert')).toBeNull();
    await create(user);
    expect(field('Titel')).toBeTruthy();
    expect(field('Beschriftung 1')).toBeTruthy();
    expect(field('Karte 1')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Weiter' })).toBeNull();
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
  it('exports authored categories, item answers and explanations, but no session state', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await fillBlank(user);
    const optional = document.querySelector('.activity-ux-optional')!;
    await user.click(optional.querySelector('summary')!);
    await user.type(optional.querySelector('input')!, 'Ein Apfel ist Obst.');
    await user.click(button('Herunterladen'));
    const exported = JSON.parse(await dl.text());
    expect(exported.activityType).toBe('sort');
    expect(exported.content.categories.map((c: {label:string}) => c.label)).toEqual(['Obst','Gemüse']);
    expect(exported.content.items.map((c: {categoryId:string}) => c.categoryId)).toEqual(['category-1','category-1','category-2','category-2']);
    expect(exported.content.items[0].explanation).toBe('Ein Apfel ist Obst.');
    expect(exported).not.toHaveProperty('roomCode');
    expect(exported).not.toHaveProperty('attempts');
  });
  it('reimports an exported file with unchanged teacher answer assignments', async () => {
    const dl = captureDownload();
    const first = renderPage(<SortPage />);
    await loaded(first.user);
    await (first.user);
    await first.user.click(button('Herunterladen'));
    const exportText = await dl.text();
    first.unmount();
    const second = renderPage(<SortPage />);
    await importActivity(second.user, JSON.parse(exportText));
    await (second.user);
    await second.user.click(button('Herunterladen'));
    expect(await dl.text()).toBe(exportText);
  });
  it('supports 2–5 categories and disables the button at the maximum', async () => {
    const { user } = renderPage(<SortPage />);
    await create(user);
    expect(button('Entfernen: Kategorie 1').disabled).toBe(true);
    for(let i=0;i<3;i++) await user.click(button('Kategorie hinzufügen'));
    expect(button('Kategorie hinzufügen').disabled).toBe(true);
    expect(screen.getAllByRole('button', {name:/^Entfernen: Kategorie/})).toHaveLength(5);
    await user.click(button('Entfernen: Kategorie 5'));
    expect(button('Kategorie hinzufügen').disabled).toBe(false);
  });
  it('supports 4–30 cards and retains stable ordering', async () => {
    const { user } = renderPage(<SortPage />);
    await create(user);    expect(button('Entfernen: Karte 1').disabled).toBe(true);
    for(let i=0;i<26;i++) await user.click(button('Karte hinzufügen'));
    expect(button('Karte hinzufügen').disabled).toBe(true);
    expect(screen.getAllByRole('button', {name:/^Entfernen: Karte/})).toHaveLength(30);
    await user.click(button('Entfernen: Karte 30'));
    expect(button('Karte hinzufügen').disabled).toBe(false);
  },30000);
  it('does not silently reassign cards when a referenced category is deleted', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.click(button('Entfernen: Kategorie 1'));
    const select = screen.getByLabelText(/Lösung.*Karte 1/) as HTMLSelectElement;
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(within(select).getByText('⚠ der')).toBeTruthy();
    await expectBlocked(user);
  });
  it('rejects case-folded duplicate cards and unsafe HTML content', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);
    await user.click(button('Karte hinzufügen'));
    await user.type(field('Karte 5'), ' tisch ');
    await expectBlocked(user);
    await user.clear(field('Karte 5'));
    await user.type(field('Karte 5'), '<img src=x>');
    await expectBlocked(user);
  });
  it('generates a new unique card ID after deleting a middle row', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await fillBlank(user);
    for (const label of ['E','F']) {
      await user.click(button('Karte hinzufügen'));
      await user.type(field('Karte ' + (label==='E'?5:6)), label);
    }
    await user.click(button('Entfernen: Karte 5'));
    await user.click(button('Karte hinzufügen'));
    await user.type(field('Karte 6'), 'G');
    await user.click(button('Herunterladen'));
    expect(JSON.parse(await dl.text()).content.items.map((x: {id:string})=>x.id)).toEqual(['card-1','card-2','card-3','card-4','card-6','card-5']);
  });
  it('removes optional explanation keys instead of exporting blank strings', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SortPage />);
    await loaded(user);    const optional = document.querySelector('.activity-ux-optional')!;
    await user.click(optional.querySelector('summary')!);
    await user.clear(optional.querySelector('input')!);
    await user.click(button('Herunterladen'));
    expect(JSON.parse(await dl.text()).content.items[0]).not.toHaveProperty('explanation');
  });
  it('retains unique button and field names for repeated card rows', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);    const names = screen.getAllByRole('button', {name:/^Entfernen: Karte/}).map(b=>b.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
    expect(screen.getAllByRole('combobox',{name:/^Lösung/})).toHaveLength(4);
  });
  it('preserves keyboard focus after adding and removing a card', async () => {
    const { user } = renderPage(<SortPage />);
    await loaded(user);    await user.click(button('Karte hinzufügen'));
    expect(document.activeElement).toBe(field('Karte 5'));
    await user.click(button('Entfernen: Karte 5'));
    expect(document.activeElement).toBe(button('Karte hinzufügen'));
  });
});
