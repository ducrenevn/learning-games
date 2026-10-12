// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SortPage } from '../src/games/sort/SortPage';
import { chooseLocale, importActivity, playText, renderPage } from './helpers/dom';
import { sortFixture } from './helpers/fixtures';

/** Imports the fixture, opens a play mode and returns helpers. */
async function play(user: UserEvent, mode: 'Allein üben' | 'Präsentieren' | 'Vorschau' = 'Allein üben', mutate?: (a: ReturnType<typeof sortFixture>) => void) {
  const a = sortFixture(); mutate?.(a);
  await importActivity(user, a);
  await waitFor(() => expect((document.querySelector('input.field') as HTMLInputElement).value).toBe('artikel-sortieren'));
  await user.click(screen.getByRole('button', { name: mode }));
}
const card = (text: string) => screen.getByRole('button', { name: new RegExp('^' + text + '(?![a-zäöü])') });
const tray = (label: string) => screen.getByRole('button', { name: 'Hier ablegen: ' + label }) as HTMLButtonElement;
const choose = (text: string, label: string) => within(screen.getByRole('group', { name: new RegExp('^' + text + ': ') })).getByRole('button', { name: label });
const cardTexts = () => Array.from(document.querySelectorAll('.sort-card-choice strong')).map(e => e.textContent);
const answers = { Tisch: 'der', Lampe: 'die', Buch: 'das', Stuhl: 'der' } as const;
async function placeAll(user: UserEvent, wrong: string[] = []) {
  for (const [text, correct] of Object.entries(answers)) {
    const target = wrong.includes(text) ? (correct === 'das' ? 'die' : 'das') : correct;
    await user.click(card(text));
    await user.click(choose(text, target));
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
    await play(user, 'Allein üben', a => { a.content.items[0].explanation = 'GEHEIME-ERKLAERUNG'; });
    expect(document.querySelector('.activity-play')!.innerHTML).not.toContain('GEHEIME-ERKLAERUNG');
    expect(document.querySelector('.activity-play')!.innerHTML).not.toMatch(/data-(answer|correct|category)/i);
  });
});

describe('Sort play: placing cards', () => {
  it('places via the inline category group next to the card and returns focus to the card', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    expect(screen.queryByRole('group', { name: /Kategorie wählen/ })).toBeNull();
    await user.click(card('Tisch'));
    expect(card('Tisch').getAttribute('aria-pressed')).toBe('true');
    // the group is the very next focusable stop after the selected card, not at the far end of the page
    const group = screen.getByRole('group', { name: /^Tisch: Kategorie wählen/ });
    expect(card('Tisch').parentElement!.contains(group)).toBe(true);
    await user.click(within(group).getByRole('button', { name: 'die' }));
    expect(document.activeElement).toBe(card('Tisch'));
    expect(card('Tisch').getAttribute('aria-pressed')).toBe('false');
    expect(card('Tisch').textContent).toContain('Kategorie: die');
    expect(screen.queryByRole('group', { name: /Kategorie wählen/ })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'die' })).getByText('Tisch')).toBeTruthy();
  });
  it('places via the tray button too, and trays are inert until a card is selected', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    expect(tray('das').disabled).toBe(true);
    await user.click(card('Buch'));
    expect(tray('das').disabled).toBe(false);
    await user.click(tray('das'));
    expect(document.activeElement).toBe(card('Buch'));
    expect(within(screen.getByRole('region', { name: 'das' })).getByText('Buch')).toBeTruthy();
    expect(tray('das').disabled).toBe(true);
  });
  it('re-places a card in another category, clears it, and toggles selection off', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await user.click(card('Lampe')); await user.click(choose('Lampe', 'der'));
    await user.click(card('Lampe')); await user.click(choose('Lampe', 'das'));
    expect(within(screen.getByRole('region', { name: 'der' })).queryByText('Lampe')).toBeNull();
    expect(within(screen.getByRole('region', { name: 'das' })).getByText('Lampe')).toBeTruthy();
    await user.click(card('Lampe')); await user.click(screen.getByRole('button', { name: 'Zurücknehmen' }));
    expect(document.activeElement).toBe(card('Lampe'));
    expect(card('Lampe').textContent).toContain('Nicht zugeordnet');
    await user.click(card('Lampe')); await user.click(card('Lampe'));
    expect(screen.queryByRole('group', { name: /Kategorie wählen/ })).toBeNull();
  });
  it('is fully operable with the keyboard alone', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    card('Stuhl').focus();
    await user.keyboard('{Enter}');                                     // select
    await user.tab();                                                   // first inline category button
    expect(document.activeElement).toBe(within(screen.getByRole('group', { name: /^Stuhl:/ })).getByRole('button', { name: 'der' }));
    await user.keyboard(' ');                                           // place with Space
    expect(document.activeElement).toBe(card('Stuhl'));
    expect(card('Stuhl').textContent).toContain('Kategorie: der');
  });
  it('announces selection and placement to screen readers through a polite live region', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    const live = () => document.querySelector('.activity-play [role="status"].sr-only')!;
    expect(live().getAttribute('aria-live')).toBe('polite');
    await user.click(card('Tisch'));
    expect(live().textContent).toBe('Tisch: Kategorie wählen');
    await user.click(choose('Tisch', 'der'));
    expect(live().textContent).toBe('Tisch wurde der Kategorie der zugeordnet.');
  });
  it('keeps the selection hint in a fixed-height element so the layout never jumps while selecting', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Allein üben', a => { a.content.items[0].text = 'Sehr langer Kartentext '.repeat(8).trim(); });
    const hint = () => document.querySelector('.sort-hint')!.textContent;
    const before = hint();
    await user.click(screen.getAllByRole('button', { name: /^Sehr langer/ })[0]);
    expect(hint()).toBe(before);
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
    expect((card('Tisch') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Zurücknehmen' })).toBeNull();
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
    for (const text of Object.keys(answers)) expect(card(text).textContent).toContain('Nicht zugeordnet');
    expect(document.activeElement?.classList.contains('sort-card-choice')).toBe(true);
    expect((screen.getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('moves focus to the first revealed answer so the key is read next', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
    expect(document.activeElement?.classList.contains('activity-key')).toBe(true);
    expect(document.activeElement?.textContent).toMatch(/Richtige Kategorie/);
  });
});

describe('Sort play: shuffle, modes and text', () => {
  it('never mutates the authored order shown in the editor', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user);
    await user.click(screen.getByRole('button', { name: 'Zum Editor' }));
    const authored = [1, 2, 3, 4].map(n => (screen.getByLabelText('Karte ' + n) as HTMLInputElement).value);
    expect(authored).toEqual(['Tisch', 'Lampe', 'Buch', 'Stuhl']);
    expect(cardTexts()).toEqual([]);
  });
  it('plays identically in Presentation and Independent modes; Presentation adds the projected layout class', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Präsentieren');
    expect(document.querySelector('main')!.classList.contains('activity-projected')).toBe(true);
    await placeAll(user);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 4 von 4 richtig');
    await user.click(screen.getByRole('button', { name: 'Zum Editor' }));
    await user.click(screen.getByRole('button', { name: 'Allein üben' }));
    expect(document.querySelector('main')!.classList.contains('activity-projected')).toBe(false);
    expect(cardTexts().sort()).toEqual(['Buch', 'Lampe', 'Stuhl', 'Tisch']);
  });
  it('translates the interface but never the authored cards, categories or explanations', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user);
    await placeAll(user);
    await chooseLocale(user, 'vi');
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
    await play(user, 'Allein üben', a => { a.targetLanguage = 'vi'; a.content.items[0].text = '5 < 6 & Ä 🍎 Ô'; });
    const literal = Array.from(document.querySelectorAll('.sort-card-choice strong')).find(e => e.textContent === '5 < 6 & Ä 🍎 Ô')!;
    expect(literal).toBeTruthy();
    expect(literal.getAttribute('lang')).toBe('vi');
    expect(document.querySelector('.activity-play img, .activity-play script')).toBeNull();
  });
  it('lets prototype-like card ids ("constructor") be placed and scored without crashing', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, 'Allein üben', a => { a.content.items[0].id = 'constructor'; });
    await placeAll(user);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 4 von 4 richtig');
  });
});
