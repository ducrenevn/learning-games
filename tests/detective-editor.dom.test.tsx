// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { splitPassage, splitSentences } from '../src/games/language-detective/DetectiveEditor';
import { detectiveFixture } from './helpers/fixtures';
import { captureDownload, importActivity, renderPage } from './helpers/dom';

afterEach(() => vi.restoreAllMocks());
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement;
const sentence = (n: number) => screen.getByLabelText('Satz ' + n) as HTMLTextAreaElement;
const cards = () => document.querySelectorAll('.sent-card.edit');
const words = (n: number) => within(screen.getByRole('group', { name: 'Fehler markieren · Satz ' + n }));
async function create(user: UserEvent) { await user.click(button(/Selbst erstellen/)); }
async function loaded(user: UserEvent) { await importActivity(user, detectiveFixture()); expect(field('Titel').value).toBe('Finde den Fehler'); }
async function expectBlocked(user: UserEvent, dl = captureDownload()) {
  await user.click(button('Herunterladen'));
  expect(dl.names).toHaveLength(0);
  expect(screen.getByRole('alert').textContent).toContain('Noch nicht spielbereit');
}
async function fill(user: UserEvent, text = 'Ich haben heute Zeit.') {
  await create(user);
  await user.type(field('Aufgabe'), 'Finde Fehler.');
  await user.type(sentence(1), text);
}

describe('Language Detective canvas: one sentence card', () => {
  it('opens as one empty sentence card without asking for numbered segments, and without an error list', async () => {
    const { user } = renderPage(<DetectivePage />);
    expect(screen.queryByRole('alert')).toBeNull();
    await create(user);
    expect(cards()).toHaveLength(1);
    expect(sentence(1).value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/Textteil/)).toBeNull();
    expect(splitPassage('Ich   haben\theute Zeit.')).toEqual(['Ich', 'haben', 'heute', 'Zeit.']);
  });
  it('accepts zero marks (an error-free sentence) and exports a v1 file when it fits v1', async () => {
    const dl = captureDownload(); const { user } = renderPage(<DetectivePage />);
    await fill(user, 'Ich habe heute Zeit.');
    await user.click(button('Herunterladen'));
    const data = JSON.parse(await dl.text());
    expect(data.schemaVersion).toBe(1);
    expect(data.content.issues).toEqual([]);
    expect(data.content.segments.map((s: { text: string }) => s.text)).toEqual(['Ich', 'habe', 'heute', 'Zeit.']);
    expect(screen.queryByText(/erweitertes Format/)).toBeNull();
  });
  it('writes the extended format, and says so, for a three-word sentence that v1 cannot hold', async () => {
    const dl = captureDownload(); const { user } = renderPage(<DetectivePage />);
    await fill(user, 'Ich habe Zeit.');
    expect(screen.getByRole('note').textContent).toMatch(/erweitertes Format.*ältere App-Versionen/);
    await user.click(button('Herunterladen'));
    const data = JSON.parse(await dl.text());
    expect(data.schemaVersion).toBe(2);
    expect(data.content.tasks).toHaveLength(1);
    expect(data.content.tasks[0].segments.map((s: { text: string }) => s.text)).toEqual(['Ich', 'habe', 'Zeit.']);
    expect(data.content).not.toHaveProperty('segments');
  });
  it('requires a model correction and an explanation for each marked word', async () => {
    const dl = captureDownload(); const { user } = renderPage(<DetectivePage />);
    await fill(user);
    await user.click(words(1).getByRole('button', { name: 'haben' }));
    await expectBlocked(user, dl);
    expect(screen.getByRole('alert').textContent).toMatch(/Satz 1 · Musterkorrektur/);
    expect(document.activeElement).toBe(field(/^Musterkorrektur · Satz 1 · haben/));
    await user.type(field(/^Musterkorrektur/), 'habe');
    await user.type(field(/^Erklärung · Satz 1/), 'Verb mit ich.');
    await user.click(button('Herunterladen'));
    expect(JSON.parse(await dl.text()).content.issues).toEqual([{ segmentId: 'segment-2', correction: 'habe', explanation: 'Verb mit ich.' }]);
  });
  it('removes a mark together with its fields, leaving no dangling private answer', async () => {
    const dl = captureDownload(); const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    expect(screen.getAllByLabelText(/^Musterkorrektur/)).toHaveLength(2);
    await user.click(words(1).getByRole('button', { name: 'haben' }));
    expect(screen.getAllByLabelText(/^Musterkorrektur/)).toHaveLength(1);
    await user.click(button('Fehler entfernen: Satz 1 · dem'));
    expect(screen.queryAllByLabelText(/^Musterkorrektur/)).toHaveLength(0);
    await user.click(button('Herunterladen'));
    expect(JSON.parse(await dl.text()).content.issues).toEqual([]);
  });
  it('holds a mark when its word is edited, and attaches it only when the teacher picks the word', async () => {
    const dl = captureDownload(); const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    fireEvent.change(sentence(1), { target: { value: 'Ich haben heute dem Film gesehen.' } });   // "gestern" -> "heute": not marked, nothing moves
    expect(screen.getAllByLabelText(/^Musterkorrektur/)).toHaveLength(2);
    expect(screen.queryByRole('note')).toBeNull();
    fireEvent.change(sentence(1), { target: { value: 'Ich habn heute dem Film gesehen.' } });     // a typo changes the word: the mark is held, not guessed
    expect(screen.getAllByLabelText(/^Musterkorrektur/)).toHaveLength(1);
    expect(screen.getByRole('note').textContent).toContain('1 Markierung zur Prüfung verschoben');
    const review = screen.getByRole('group', { name: /^Zu prüfen/ });
    expect(review.textContent).toContain('haben → habe');
    await expectBlocked(user, dl);                                  // export waits for a decision
    await user.selectOptions(within(review).getByRole('combobox'), screen.getByRole('option', { name: '2. habn' }));
    await user.click(within(review).getByRole('button', { name: 'Zuordnen' }));
    expect(screen.queryByRole('group', { name: /^Zu prüfen/ })).toBeNull();
    expect(screen.getAllByLabelText(/^Musterkorrektur/)).toHaveLength(2);
    await user.click(button('Herunterladen'));
    const data = JSON.parse(await dl.text());
    const habn = data.content.segments.find((s: { text: string }) => s.text === 'habn');
    expect(data.content.issues.find((i: { correction: string }) => i.correction === 'habe').segmentId).toBe(habn.id);
  });
  it('never attaches a held mark to a changed word on its own, even when the new word looks similar', async () => {
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    fireEvent.change(sentence(1), { target: { value: 'Ich habt heute dem Film gesehen.' } });
    expect(screen.getByRole('group', { name: /^Zu prüfen/ }).textContent).toContain('haben → habe');
    expect(screen.getAllByLabelText(/^Musterkorrektur/)).toHaveLength(1);
  });
  it('discards a held mark only on an explicit click, and then the export is allowed again', async () => {
    const dl = captureDownload(); const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    fireEvent.change(sentence(1), { target: { value: 'Ich sind heute dem Film gesehen.' } });
    const review = screen.getByRole('group', { name: /^Zu prüfen/ });
    await user.click(within(review).getByRole('button', { name: 'Verwerfen' }));
    expect(screen.queryByRole('group', { name: /^Zu prüfen/ })).toBeNull();
    await user.click(button('Herunterladen'));
    const data = JSON.parse(await dl.text());
    // Only the mark that stayed on "dem" is exported; the discarded one is gone for good.
    expect(data.content.issues.map((i: { correction: string }) => i.correction)).toEqual(['den']);
  });
  it('keeps the typed text (including a trailing space) while the words are derived from it', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.type(sentence(1), 'Ich habe ');
    expect(sentence(1).value).toBe('Ich habe ');
    expect(words(1).getAllByRole('button')).toHaveLength(2);
  });
  it('supports the 12-marks-per-sentence limit and disables further marking', async () => {
    const { user } = renderPage(<DetectivePage />);
    const a = detectiveFixture();
    a.content.segments = Array.from({ length: 14 }, (_, i) => ({ id: 's' + (i + 1), text: 'Wort' + (i + 1) }));
    a.content.issues = Array.from({ length: 12 }, (_, i) => ({ segmentId: 's' + (i + 1), correction: 'C' + (i + 1), explanation: 'Grund' + (i + 1) }));
    await importActivity(user, a);
    expect((words(1).getByRole('button', { name: 'Wort13' }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(words(1).getByRole('button', { name: 'Wort1' }));
    expect((words(1).getByRole('button', { name: 'Wort13' }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('flags an over-long sentence instead of blocking the paste, and names the sentence', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.type(field('Aufgabe'), 'Finde Fehler.');
    await user.click(sentence(1));
    await user.paste('Wort '.repeat(85).trim());
    expect(document.querySelector('.word-count')!.classList.contains('warn')).toBe(true);
    expect(document.querySelector('.word-count')!.textContent).toBe('85 / 80 Wörter');
    await user.click(button('Ausprobieren'));
    expect(screen.getByRole('alert').textContent).toMatch(/Satz 1 · Text/);
    expect(sentence(1).maxLength).toBe(4000);
  });
  it('re-exports an imported v1 file byte for byte as v1, with all marks attached to their ids', async () => {
    const dl = captureDownload(); const first = renderPage(<DetectivePage />);
    await loaded(first.user);
    await first.user.click(button('Herunterladen'));
    const json = await dl.text(); first.unmount();
    expect(json).toBe(JSON.stringify(detectiveFixture(), null, 2) + '\n');
    expect(JSON.parse(json).schemaVersion).toBe(1);
    const second = renderPage(<DetectivePage />);
    await importActivity(second.user, JSON.parse(json));
    await second.user.click(button('Herunterladen'));
    expect(await dl.text()).toBe(json);
  });
  it('rejects unsafe markup in a teacher correction', async () => {
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    const box = screen.getAllByLabelText(/^Musterkorrektur/)[0];
    await user.clear(box);
    await user.type(box, '<img src=x>');
    await expectBlocked(user);
  });
  it('shows the sentence editor and its word chips together, with unique accessible chips', async () => {
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    const chips = words(1).getAllByRole('button');
    expect(chips).toHaveLength(6);
    expect(new Set(chips.map(b => b.textContent)).size).toBe(6);
    expect(sentence(1).value).toBe('Ich haben gestern dem Film gesehen.');
  });
});

describe('Language Detective canvas: several sentences', () => {
  it('Enter adds a sentence below and focuses it; marks and corrections belong to their own sentence', async () => {
    const dl = captureDownload(); const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.type(field('Aufgabe'), 'Finde in jedem Satz den Fehler.');
    await user.type(sentence(1), 'Der Gäste kommt.');
    await user.keyboard('{Enter}');
    expect(cards()).toHaveLength(2);
    expect(document.activeElement).toBe(sentence(2));
    await user.type(sentence(2), 'Die Gäste bleiben.');
    await user.click(words(1).getByRole('button', { name: 'Gäste' }));
    expect(words(2).getByRole('button', { name: 'Gäste' }).getAttribute('aria-pressed')).toBe('false');
    await user.type(field(/^Musterkorrektur · Satz 1/), 'Gast');
    await user.type(field(/^Erklärung · Satz 1/), 'Singular.');
    await user.click(button('Herunterladen'));
    const data = JSON.parse(await dl.text());
    expect(data.schemaVersion).toBe(2);
    expect(data.content.tasks.map((t: { id: string }) => t.id)).toEqual(['task-1', 'task-2']);
    expect(data.content.tasks[0].issues).toEqual([{ segmentId: 'segment-2', correction: 'Gast', explanation: 'Singular.' }]);
    expect(data.content.tasks[1].issues).toEqual([]);
    expect(data.content.tasks[1].segments[0].id).toBe('segment-1');   // segment ids are scoped to their sentence
  });
  it('shows the "extended format" note for a multi-sentence activity', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.type(sentence(1), 'Ich habe Zeit.');
    await user.keyboard('{Enter}');
    await user.type(sentence(2), 'Wir haben Zeit.');
    expect(screen.getByRole('note').textContent).toMatch(/erweitertes Format/);
  });
  it('Backspace on an empty sentence removes it, but the last sentence stays', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.type(sentence(1), 'Ich habe Zeit.');
    await user.keyboard('{Enter}');
    expect(cards()).toHaveLength(2);
    await user.keyboard('{Backspace}');
    expect(cards()).toHaveLength(1);
    expect(document.activeElement).toBe(sentence(1));
    await user.clear(sentence(1));
    await user.keyboard('{Backspace}');
    expect(cards()).toHaveLength(1);
  });
  it('turns a pasted multi-line list into one sentence card per line', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.click(sentence(1));
    await user.paste('1. Der Gast kommt.\n2. Wir bleiben hier.\nIst das richtig?');
    expect(cards()).toHaveLength(3);
    expect([1, 2, 3].map(n => sentence(n).value)).toEqual(['Der Gast kommt.', 'Wir bleiben hier.', 'Ist das richtig?']);
  });
  it('proposes sentences from a pasted paragraph and replaces the empty first card', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.click(screen.getByText('Mehrere Sätze einfügen'));
    await user.click(screen.getByLabelText('Mehrere Sätze einfügen'));
    await user.paste('Der Gast kommt. Wir bleiben hier! Ist das richtig?');
    expect(screen.getByText('3 Sätze erkannt')).toBeTruthy();
    await user.click(button('Als Sätze übernehmen'));
    expect(cards()).toHaveLength(3);
    expect(sentence(2).value).toBe('Wir bleiben hier!');
    expect(splitSentences('z. b. nichts')).toEqual(['z. b. nichts']);
    expect(splitSentences('Eins.\nZwei. Drei')).toEqual(['Eins.', 'Zwei.', 'Drei']);
  });
  it('allows at most 10 sentences and says so', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    for (let i = 0; i < 9; i++) await user.click(button('Satz hinzufügen'));
    expect(cards()).toHaveLength(10);
    expect(button('Satz hinzufügen').disabled).toBe(true);
    expect(screen.getByText('Höchstens 10 Sätze.')).toBeTruthy();
  });
  it('moves and removes sentences with labelled buttons, keeping focus and announcing the move', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.type(sentence(1), 'Eins eins.');
    await user.click(button('Satz hinzufügen'));
    await user.type(sentence(2), 'Zwei zwei.');
    await user.click(button('Satz nach oben: Satz 2'));
    expect(sentence(1).value).toBe('Zwei zwei.');
    expect(document.querySelector('.activity-editor [role="status"].sr-only')!.textContent).toContain('jetzt Position 1 von 2');
    expect(document.activeElement).toBe(button('Satz nach unten: Satz 1'));
    await user.click(button('Entfernen: Satz 2'));
    expect(cards()).toHaveLength(1);
    expect(button('Entfernen: Satz 1').disabled).toBe(true);
  });
  it('explains problems by sentence: the first missing field is focused and named', async () => {
    const { user } = renderPage(<DetectivePage />);
    await create(user);
    await user.click(button('Ausprobieren'));
    expect(screen.getByRole('alert').textContent).toMatch(/Aufgabe/);
    expect(document.activeElement).toBe(field('Aufgabe'));
    await user.type(field('Aufgabe'), 'Finde Fehler.');
    await user.click(button('Ausprobieren'));
    expect(screen.getByRole('alert').textContent).toMatch(/Satz 1 · Text/);
    expect(document.activeElement).toBe(sentence(1));
  });
});
