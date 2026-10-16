// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { matchesModel } from '../src/games/language-detective/engine';
import { importActivity, playText, renderPage } from './helpers/dom';
import { detectiveCleanFixture, detectiveFixture } from './helpers/fixtures';

type Fixture = ReturnType<typeof detectiveFixture>;
async function play(user: UserEvent, make: () => Fixture = detectiveFixture) {
  const a = make();
  await importActivity(user, a);
  await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe(a.title));
  await user.click(screen.getByRole('button', { name: 'Ausprobieren' }));
}
const segment = (text: string) => screen.getByRole('button', { name: new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-zäöüß])') }) as HTMLButtonElement;
const pick = async (user: UserEvent, ...texts: string[]) => { for (const t of texts) await user.click(segment(t)); };
const check = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Prüfen' }));
const reveal = (user: UserEvent) => user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
const suggestionBox = (text: string) => screen.getByLabelText(new RegExp('^Korrektur für „' + text + '“')) as HTMLInputElement;
const noneLabel = () => document.querySelector('label.detective-none') as HTMLLabelElement;
const legend = () => document.querySelector('.detective-legend')?.textContent ?? '';
const SECRETS = /habe(?!n)|Verb mit ich|Akkusativ|Achte auf Verbendung|→/;

describe('matchesModel: feedback only, case significant, spacing ignored', () => {
  it('accepts the exact model answer and ignores surrounding and repeated spaces', () => {
    expect(matchesModel('habe', 'habe')).toBe(true);
    expect(matchesModel('  habe ', 'habe')).toBe(true);
    expect(matchesModel('der   Gast', 'der Gast')).toBe(true);
  });
  it('keeps capitalisation significant and rejects anything else, including an empty box', () => {
    expect(matchesModel('Habe', 'habe')).toBe(false);
    expect(matchesModel('habe.', 'habe')).toBe(false);
    expect(matchesModel('', 'habe')).toBe(false);
  });
});

describe('Language Detective feedback: correction inputs after Check', () => {
  it('marks a matching correction green, a different one grey, and keeps both texts as typed', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben', 'dem');
    await user.type(suggestionBox('haben'), 'habe');                 // matches the model
    await user.type(suggestionBox('dem'), 'Den');                    // differs: case is significant
    expect(suggestionBox('haben').className).toBe('detective-fix');  // before Check: neutral, no verdict yet
    await check(user);
    expect(suggestionBox('haben').classList.contains('fix-match')).toBe(true);
    expect(suggestionBox('dem').classList.contains('fix-differs')).toBe(true);
    expect(suggestionBox('dem').value).toBe('Den');
    expect(suggestionBox('haben').getAttribute('aria-describedby')).toBeTruthy();
    expect(playText()).not.toMatch(SECRETS);                         // the model answer stays hidden before Reveal
  });
  it('marks an empty correction as incomplete after Check, never as a match', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben', 'dem');
    await user.type(suggestionBox('haben'), 'habe');
    await check(user);
    expect(suggestionBox('dem').classList.contains('fix-empty')).toBe(true);
    expect(suggestionBox('dem').classList.contains('fix-match')).toBe(false);
    expect(suggestionBox('dem').getAttribute('aria-describedby')).toBeTruthy();
  });
  it('leaves a correction for a false pick neutral, because there is no model answer for it', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'Film');
    await user.type(suggestionBox('Film'), 'x');
    await check(user);
    expect(suggestionBox('Film').className).toBe('detective-fix');
    expect(suggestionBox('Film').hasAttribute('aria-describedby')).toBe(false);
  });
  it('shows the caption as a comparison, not a check, once Check has run', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    expect(document.querySelector('.detective-corrected-caption')!.textContent).toBe('Deine Korrektur · nicht automatisch geprüft');
    await check(user);
    expect(document.querySelector('.detective-corrected-caption')!.textContent).toBe('Deine Korrektur · Vergleich mit der Musterkorrektur, keine Bewertung');
  });
});

describe('Language Detective feedback: word cards after Check and Reveal', () => {
  it('marks a false pick with a dotted copper frame, a ✗ glyph, and its status named in the legend, not inside the word', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'Film');
    await check(user);
    expect(segment('Film').classList.contains('extra')).toBe(true);
    expect(segment('Film').querySelector('.detective-mark')!.textContent).toBe('✗');
    expect(segment('Film').querySelector('.detective-mark')!.getAttribute('aria-hidden')).toBe('true');
    expect(segment('Film').textContent).toContain('Kein Fehler hier');   // accessible status, visually hidden
    expect(legend()).toContain('Kein Fehler hier');
    expect(legend()).not.toContain('Übersehen');                        // a missed error is not named before Reveal
  });
  it('shows a missed error after Reveal as copper with a dashed frame and !, never as green', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await check(user);
    await reveal(user);
    expect(segment('dem').classList.contains('missed')).toBe(true);
    expect(segment('dem').querySelector('.detective-mark')!.textContent).toBe('!');
    expect(segment('dem').classList.contains('hit')).toBe(false);
    expect(segment('dem').classList.contains('selected')).toBe(false);
    expect(legend()).toContain('Übersehen');
  });
  it('keeps a correctly picked error copper with no glyph, before and after Check', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    expect(segment('haben').querySelector('.detective-mark')).toBeNull();
    await check(user);
    expect(segment('haben').classList.contains('hit')).toBe(true);
    expect(segment('haben').querySelector('.detective-mark')).toBeNull();
  });
});

describe('Language Detective feedback: "Kein Fehler" and the answer panels', () => {
  it('colours a correct "Kein Fehler" green and a wrong one copper, only after Check', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, detectiveCleanFixture);
    await user.click(screen.getByLabelText('Kein Fehler'));
    expect(noneLabel().classList.contains('good')).toBe(false);
    await check(user);
    expect(noneLabel().classList.contains('good')).toBe(true);
  });
  it('colours a wrong "Kein Fehler" copper and shows a ✗ in its mark', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await user.click(screen.getByLabelText('Kein Fehler'));
    await check(user);
    expect(noneLabel().classList.contains('bad')).toBe(true);
    expect(noneLabel().querySelector('.detective-none-mark')!.textContent).toBe('✗');
  });
  it('replaces the error-free panel with one compact confirmation after Reveal', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, detectiveCleanFixture);
    await user.click(screen.getByLabelText('Kein Fehler'));
    await check(user);
    await reveal(user);
    const key = document.querySelector('section.activity-key')!;
    expect(key.classList.contains('compact')).toBe(true);
    expect(key.querySelector('.key-clear p')!.textContent).toBe('Kein Fehler');
    expect(key.querySelector('h3')!.classList.contains('sr-only')).toBe(true);
  });
  it('shows the teacher model correction in green inside the key after Reveal, with no compact class for a sentence with errors', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben', 'dem');
    await check(user);
    await reveal(user);
    expect(document.querySelector('section.activity-key')!.classList.contains('compact')).toBe(false);
    const models = Array.from(document.querySelectorAll('.key-model')).map(e => e.textContent);
    expect(models).toEqual(['habe', 'den']);
  });
  it('removes the Reveal button once the solutions are shown, instead of leaving a disabled one', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await check(user);
    expect(screen.getByRole('button', { name: /Lösung & Erklärung/ })).toBeTruthy();
    await reveal(user);
    expect(screen.queryByRole('button', { name: /Lösung & Erklärung/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeTruthy();
  });
});
