// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SortPage } from '../src/games/sort/SortPage';
import { chooseLocale, importActivity, playText, renderPage } from './helpers/dom';
import { sortFixture } from './helpers/fixtures';

/** Imports the fixture, opens a play mode and returns helpers. */
async function play(user: UserEvent, mode: 'Ausprobieren' | 'Präsentieren' = 'Ausprobieren', mutate?: (a: ReturnType<typeof sortFixture>) => void) {
  const a = sortFixture(); mutate?.(a);
  await importActivity(user, a);
  await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Artikel sortieren'));
  await user.click(screen.getByRole('button', { name: mode }));
}
const chip = (text: string) => screen.getByRole('button', { name: new RegExp('^' + text + '(?![\\wäöü])') });
const drop = (label: string) => screen.getByRole('button', { name: 'Hier ablegen: ' + label }) as HTMLButtonElement;
const bin = (label: string) => screen.getByRole('region', { name: label });
const bank = () => screen.getByRole('region', { name: 'Noch zu sortieren' });
const bankTexts = () => within(bank()).queryAllByRole('listitem').map(li => li.querySelector('strong')!.textContent);
const cardTexts = () => Array.from(document.querySelectorAll('.sort-card-choice strong')).map(e => e.textContent);
const answers = { Tisch: 'der', Lampe: 'die', Buch: 'das', Stuhl: 'der' } as const;
async function placeCard(user: UserEvent, text: string, label: string) {
  await user.click(chip(text));
  await user.click(drop(label));
}
async function placeAll(user: UserEvent, wrong: string[] = []) {
  for (const [text, correct] of Object.entries(answers)) {
    const target = wrong.includes(text) ? (correct === 'das' ? 'die' : 'das') : correct;
    await placeCard(user, text, target);
  }
}

describe('Sort play: answer secrecy', () => {
  it('shows no category, explanation or verdict before Check, and no explanation before Reveal', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    expect(playText()).not.toMatch(/Maskulin|Feminin|Richtige Kategorie|Nicht richtig|Ergebnis/);
    expect(playText()).not.toContain('Lösungsschlüssel');
    await placeAll(user);
    expect(playText()).not.toMatch(/Maskulin|Feminin|Richtige Kategorie|Ergebnis/);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 4 von 4 richtig');
    expect(playText()).not.toMatch(/Maskulin|Feminin|Richtige Kategorie/); // explanations only after the explicit Reveal
    await user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
    expect(playText()).toContain('Maskulin: der Tisch.');
    expect(playText()).toContain('Richtige Kategorie: der');
  });
  it('does not expose the answer key through DOM attributes', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Ausprobieren', a => { a.content.items[0].explanation = 'GEHEIME-ERKLAERUNG'; });
    const html = document.querySelector('.activity-play')!.innerHTML;
    expect(html).not.toContain('GEHEIME-ERKLAERUNG');
    expect(html).not.toMatch(/data-(answer|correct|category)/i);
    // Nothing in the unsorted state names a card's real category, not even in a class or an id.
    expect(document.querySelector('.sort-bank')!.innerHTML).not.toMatch(/category-|categoryId/);
  });
});

describe('Sort play: bank and bins', () => {
  it('starts with every card in the bank, empty bins and a 0 of N progress', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    expect(bankTexts().sort()).toEqual(['Buch', 'Lampe', 'Stuhl', 'Tisch']);
    for (const label of ['der', 'die', 'das']) expect(within(bin(label)).queryAllByRole('listitem')).toHaveLength(0);
    expect(screen.getByText('0 von 4 sortiert')).toBeTruthy();
  });
  it('moves a placed card out of the bank into its bin without ever duplicating it, and returns focus to it', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await user.click(chip('Tisch'));
    expect(chip('Tisch').getAttribute('aria-pressed')).toBe('true');
    await user.click(drop('die'));
    expect(screen.getAllByRole('button', { name: /^Tisch/ })).toHaveLength(1);
    expect(within(bin('die')).getByText('Tisch')).toBeTruthy();
    expect(bankTexts()).not.toContain('Tisch');
    expect(bankTexts()).toHaveLength(3);
    expect(document.activeElement).toBe(chip('Tisch'));
    expect(chip('Tisch').getAttribute('aria-pressed')).toBe('false');
    expect(chip('Tisch').textContent).toContain('Kategorie: die'); // screen-reader context for a card inside a bin
    expect(screen.getByText('1 von 4 sortiert')).toBeTruthy();
  });
  it('keeps the category drop buttons inert until a card is selected', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    expect(drop('das').disabled).toBe(true);
    await user.click(chip('Buch'));
    expect(drop('das').disabled).toBe(false);
    expect(document.querySelectorAll('.sort-bin.armed')).toHaveLength(3);
    await user.click(drop('das'));
    expect(drop('das').disabled).toBe(true);
    expect(document.querySelectorAll('.sort-bin.armed')).toHaveLength(0);
  });
  it('lets a tap on the bin itself place the selected card', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await user.click(chip('Lampe'));
    await user.click(bin('die'));
    expect(within(bin('die')).getByText('Lampe')).toBeTruthy();
  });
  it('re-places a card in another bin, puts it back into the bank, and toggles selection off', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeCard(user, 'Lampe', 'der');
    await placeCard(user, 'Lampe', 'das');
    expect(within(bin('der')).queryByText('Lampe')).toBeNull();
    expect(within(bin('das')).getByText('Lampe')).toBeTruthy();
    await user.click(chip('Lampe'));
    await user.click(screen.getByRole('button', { name: 'Zurücknehmen' }));
    expect(within(bin('das')).queryByText('Lampe')).toBeNull();
    expect(bankTexts()).toContain('Lampe');
    expect(document.activeElement).toBe(chip('Lampe'));
    await user.click(chip('Lampe')); await user.click(chip('Lampe'));
    expect(chip('Lampe').getAttribute('aria-pressed')).toBe('false');
    expect(drop('der').disabled).toBe(true);
  });
  it('offers "return to bank" only for a selected card that is already placed', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await user.click(chip('Tisch'));
    expect(screen.queryByRole('button', { name: 'Zurücknehmen' })).toBeNull();
    await user.click(drop('der'));
    await user.click(chip('Tisch'));
    expect(screen.getByRole('button', { name: 'Zurücknehmen' })).toBeTruthy();
  });
  it('is fully operable with the keyboard alone: Enter selects, a digit or the drop button places, Escape cancels', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    chip('Stuhl').focus();
    await user.keyboard('{Enter}');
    expect(chip('Stuhl').getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Escape}');
    expect(chip('Stuhl').getAttribute('aria-pressed')).toBe('false');
    await user.keyboard('{Enter}');
    await user.keyboard('1');                                              // first category = der
    expect(within(bin('der')).getByText('Stuhl')).toBeTruthy();
    expect(document.activeElement).toBe(chip('Stuhl'));
    chip('Buch').focus();
    await user.keyboard('{Enter}');
    drop('das').focus();
    await user.keyboard(' ');
    expect(within(bin('das')).getByText('Buch')).toBeTruthy();
    expect(document.activeElement).toBe(chip('Buch'));
    chip('Lampe').focus();
    await user.keyboard('{Enter}');
    await user.keyboard('9');                                              // no ninth category: nothing happens
    expect(bankTexts()).toContain('Lampe');
  });
  it('announces selection and placement to screen readers through a polite live region', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    const live = () => document.querySelector('.activity-play [role="status"].sr-only')!;
    expect(live().getAttribute('aria-live')).toBe('polite');
    await user.click(chip('Tisch'));
    expect(live().textContent).toBe('Tisch: Kategorie wählen');
    await user.click(drop('der'));
    expect(live().textContent).toBe('Tisch wurde der Kategorie der zugeordnet.');
    await user.click(chip('Tisch'));
    await user.click(screen.getByRole('button', { name: 'Zurücknehmen' }));
    expect(live().textContent).toBe('Zuordnung von Tisch zurückgenommen.');
  });
  it('keeps the selection hint in a fixed element so the layout never jumps while selecting', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Ausprobieren', a => { a.content.items[0].text = 'Sehr langer Kartentext '.repeat(8).trim(); });
    const hint = () => document.querySelector('.sort-hint')!.textContent;
    const before = hint();
    await user.click(screen.getAllByRole('button', { name: /^Sehr langer/ })[0]);
    expect(hint()).toBe(before);
  });
  it('says when the bank is empty and shows full progress', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user);
    expect(bankTexts()).toEqual([]);
    expect(within(bank()).getByText(/Alle Karten sind sortiert/)).toBeTruthy();
    expect(screen.getByText('4 von 4 sortiert')).toBeTruthy();
  });
  it('explains drag and tap-to-place in an accessible information popover next to the bank title', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    const info = within(bank()).getByRole('button', { name: 'Bedienungshinweis' });
    expect(info.getAttribute('aria-expanded')).toBe('false');
    expect(within(bank()).queryByRole('note')).toBeNull();
    await user.click(info);
    expect(info.getAttribute('aria-expanded')).toBe('true');
    expect(within(bank()).getByRole('note').textContent).toMatch(/antippen/);
    expect(info.getAttribute('aria-controls')).toBe(within(bank()).getByRole('note').id);
    // Opening the hint never places a card.
    await user.keyboard('{Escape}');
    expect(within(bank()).queryByRole('note')).toBeNull();
    expect(info.getAttribute('aria-expanded')).toBe('false');
    await user.click(info);
    await user.click(document.body);
    expect(within(bank()).queryByRole('note')).toBeNull();
  });
});

describe('Sort play: check, retry and reveal', () => {
  it('disables Check until every card is placed and explains why', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    const check = screen.getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);
    expect(screen.getByText('Noch nicht alle Karten zugeordnet.')).toBeTruthy();
    await placeAll(user);
    expect(check.disabled).toBe(false);
    expect(screen.queryByText('Noch nicht alle Karten zugeordnet.')).toBeNull();
  });
  it('marks each card right or wrong with text, freezes placements and moves focus to the result', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user, ['Buch']);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 3 von 4 richtig');
    expect(document.activeElement?.textContent).toContain('Ergebnis: 3 von 4 richtig');
    expect(document.activeElement?.getAttribute('role')).toBe('status');
    const statuses = Array.from(document.querySelectorAll('.activity-status')).map(e => e.textContent?.replace(/^[✓✗]\s*/, ''));
    expect(statuses.filter(s => s === 'richtig').length).toBe(3);
    expect(statuses.filter(s => s === 'Nicht richtig').length).toBe(1);
    expect((chip('Tisch') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Zurücknehmen' })).toBeNull();
    expect(chip('Buch').classList.contains('bad')).toBe(true);
    expect(chip('Tisch').classList.contains('good')).toBe(true);
  });
  it('after Reveal shows one answer panel (wrong cards first) and the correct bin on each wrong card', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user, ['Buch']);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
    expect(document.querySelectorAll('.activity-key')).toHaveLength(1);
    const entries = Array.from(document.querySelectorAll('.sort-key-list li')).map(li => li.querySelector('strong')!.textContent);
    expect(entries[0]).toBe('Buch');
    expect(entries.sort()).toEqual(['Buch', 'Lampe', 'Stuhl', 'Tisch']);
    expect(chip('Buch').querySelector('.chip-fix')!.textContent).toContain('das');
    expect(chip('Tisch').querySelector('.chip-fix')).toBeNull();
  });
  it('retry clears placements, verdicts and the revealed key, and focuses the first card', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user, ['Tisch']);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
    expect(playText()).toContain('Richtige Kategorie');
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(playText()).not.toMatch(/Richtige Kategorie|Ergebnis|Maskulin/);
    expect(bankTexts().sort()).toEqual(['Buch', 'Lampe', 'Stuhl', 'Tisch']);
    expect(document.activeElement?.classList.contains('sort-card-choice')).toBe(true);
    expect((screen.getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('moves focus to the answer panel so the key is read next', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
    expect(document.activeElement?.classList.contains('activity-key')).toBe(true);
    expect(document.activeElement?.textContent).toMatch(/Richtige Kategorie/);
  });
});

describe('Sort play: shuffle, modes, sizes and text', () => {
  it('never mutates the authored content shown in the editor', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user);
    await user.click(within(document.querySelector('.activity-ux-play-top')!).getByRole('button', { name: 'Zum Editor' }));
    // Card numbers follow the bins on screen: der (Tisch, Stuhl), die (Lampe), das (Buch).
    const authored = [1, 2, 3, 4].map(n => (screen.getByLabelText('Karte ' + n) as HTMLInputElement).value);
    expect(authored).toEqual(['Tisch', 'Stuhl', 'Lampe', 'Buch']);
    expect(cardTexts()).toEqual([]);
  });
  it('plays identically in Presentation and Try modes; Presentation adds the projected layout class', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Präsentieren');
    expect(document.querySelector('main')!.classList.contains('activity-projected')).toBe(true);
    await placeAll(user);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 4 von 4 richtig');
    await user.click(within(document.querySelector('.activity-ux-play-top')!).getByRole('button', { name: 'Zum Editor' }));
    await user.click(screen.getByRole('button', { name: 'Ausprobieren' }));
    expect(document.querySelector('main')!.classList.contains('activity-projected')).toBe(false);
    expect(cardTexts().sort()).toEqual(['Buch', 'Lampe', 'Stuhl', 'Tisch']);
  });
  it('translates the interface but never the authored cards, categories or explanations', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user);
    await chooseLocale(user, 'vi');
    expect(screen.getByText('Đã xếp 4/4')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: /Hiện đáp án/ }));
    expect(playText()).toContain('Kết quả: 4 trên 4 đúng');
    expect(playText()).toContain('Nhóm đúng: der');
    expect(playText()).toContain('Maskulin: der Tisch.');
    await chooseLocale(user, 'en');
    expect(playText()).toContain('Result: 4 of 4 correct');
    expect(playText()).toContain('Maskulin: der Tisch.');
    expect(cardTexts().sort()).toEqual(['Buch', 'Lampe', 'Stuhl', 'Tisch']);
  });
  it('renders markup-like and Unicode card text literally and tags it with the target language', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Ausprobieren', a => { a.targetLanguage = 'vi'; a.content.items[0].text = '5 < 6 & Ä 🍎 Ô'; });
    const literal = Array.from(document.querySelectorAll('.sort-card-choice strong')).find(e => e.textContent === '5 < 6 & Ä 🍎 Ô')!;
    expect(literal).toBeTruthy();
    expect(literal.getAttribute('lang')).toBe('vi');
    expect(document.querySelector('.activity-play img, .activity-play script')).toBeNull();
  });
  it('lets prototype-like card ids ("constructor") be placed and scored without crashing', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Ausprobieren', a => { a.content.items[0].id = 'constructor'; });
    await placeAll(user);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 4 von 4 richtig');
  });
  it('handles the maximum: 5 categories and 30 cards, all reachable and placeable with one key each', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Ausprobieren', a => {
      a.content.categories = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, label: 'Kat ' + id }));
      a.content.items = Array.from({ length: 30 }, (_, i) => ({ id: 'w' + i, text: 'Wort ' + i, categoryId: 'abcde'[i % 5] }));
    });
    expect(bankTexts()).toHaveLength(30);
    expect(document.querySelectorAll('.sort-bin')).toHaveLength(5);
    for (let i = 0; i < 30; i++) {
      await user.click(chip('Wort ' + i));
      await user.keyboard(String((i % 5) + 1));
    }
    expect(bankTexts()).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 30 von 30 richtig');
  }, 60000);
});
