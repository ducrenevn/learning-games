// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { chooseLocale, importActivity,  playText  , renderPage } from './helpers/dom';
import { detectiveCleanFixture, detectiveFixture } from './helpers/fixtures';

type Fixture = ReturnType<typeof detectiveFixture>;
async function play(user: UserEvent, mode: 'Ausprobieren' | 'Präsentieren' | 'Ausprobieren' = 'Ausprobieren', make: () => Fixture = detectiveFixture, mutate?: (a: Fixture) => void) {
  const a = make(); mutate?.(a);
  await importActivity(user, a);
  await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe(a.title));
  await user.click(screen.getByRole('button', { name: mode }));
}
const segment = (text: string) => screen.getByRole('button', { name: new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-zäöüß])') }) as HTMLButtonElement;
const pick = async (user: UserEvent, ...texts: string[]) => { for (const t of texts) await user.click(segment(t)); };
const check = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Prüfen' }));
const reveal = (user: UserEvent) => user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
const suggestionBox = (text: string) => screen.getByLabelText(new RegExp('^Korrektur für „' + text + '“')) as HTMLInputElement;
const answerKey = () => document.querySelector('section.activity-key')!;
const SECRETS = /habe(?!n)|Verb mit ich|Akkusativ|Achte auf Verbendung|→/;

describe('Language Detective play: answer secrecy', () => {
  it('shows no correction, explanation, summary or verdict before Check; verdicts only after Check; the key only after Reveal', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    expect(playText()).not.toMatch(SECRETS);
    expect(playText()).not.toMatch(/Ergebnis|Übersehen|Richtig markiert|Fälschlich/);
    await pick(user, 'haben', 'Film');
    expect(playText()).not.toMatch(SECRETS);
    await check(user);
    expect(playText()).toMatch(/Ergebnis/);
    expect(playText()).not.toMatch(SECRETS);                       // locations only; corrections wait for Reveal
    await reveal(user);
    expect(playText()).toContain('haben → habe');
    expect(playText()).toContain('Verb mit ich: habe.');
    expect(playText()).toContain('dem → den');
    expect(playText()).toContain('Akkusativ: den Film.');
    expect(playText()).toContain('Achte auf Verbendung und Kasus.');
  });
  it('does not expose the key through DOM attributes before Check', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, 'Ausprobieren', detectiveFixture, a => { a.content.issues[0].explanation = 'GEHEIM-ERKLAERUNG'; });
    const html = document.querySelector('.activity-play')!.innerHTML;
    expect(html).not.toContain('GEHEIM-ERKLAERUNG');
    expect(html).not.toMatch(/data-(issue|answer|correct)/i);
  });
  it('keeps missed locations hidden through Check and Retry, and only shows them after Reveal', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'Film');                                      // a wrong pick: no correct location is chosen
    await check(user);
    expect(document.querySelectorAll('.detective-segment.missed')).toHaveLength(0);
    expect(playText()).not.toMatch(/Übersehen|haben → habe|dem → den/);
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(playText()).not.toMatch(/Übersehen|→/);
    expect(document.querySelectorAll('.detective-segment.missed')).toHaveLength(0);
    await pick(user, 'haben');
    await check(user);
    expect(playText()).toContain('Noch nicht gefunden: 1');        // one error still missing: a count, not its location
    expect(playText()).not.toMatch(/Übersehen|dem → den/);
    expect(segment('dem').classList.contains('missed')).toBe(false);
    await reveal(user);
    expect(playText()).toContain('dem → den');
    expect(document.querySelectorAll('.detective-segment.missed')).toHaveLength(1);
  });
  it('keeps Check disabled, with a hint, until a segment is selected or "No errors" is chosen', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    const btn = screen.getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByText(/Textteile antippen oder/)).toBeTruthy();
    await pick(user, 'Ich');
    expect(btn.disabled).toBe(false);
    expect(screen.queryByText(/Textteile antippen oder/)).toBeNull();
    await pick(user, 'Ich');
    expect(btn.disabled).toBe(true);
    await user.click(screen.getByLabelText('Kein Fehler'));
    expect(btn.disabled).toBe(false);
  });
});

describe('Language Detective play: identification scoring', () => {
  it('multiple issues: all found is solved; a partial hit, a miss and a false flag are reported by segment text', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben', 'Film');                               // one hit, one false flag, one miss ("dem")
    await check(user);
    expect(playText()).toContain('Ergebnis: Nicht richtig — 1 von 2 richtig');
    expect(playText()).toContain('Noch nicht gefunden: 1');        // the missed "dem" is counted, not named, before Reveal
    expect(playText()).not.toMatch(/Übersehen/);
    expect(playText()).toMatch(/Fälschlich markiert: Film/);
    expect(segment('haben').textContent).toContain('Richtig markiert');
    expect(segment('dem').textContent).not.toMatch(/Übersehen/);
    expect(segment('Film').textContent).toContain('Fälschlich markiert');
    expect(segment('Ich').textContent).not.toMatch(/markiert|Übersehen/);
    await reveal(user);
    expect(playText()).toMatch(/Übersehen: dem/);
    expect(segment('dem').textContent).toContain('Übersehen');
  });
  it('solves exactly when the flagged set equals the issue set', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'dem', 'haben');
    await check(user);
    expect(playText()).toContain('Ergebnis: richtig — 2 von 2 richtig');
    expect(playText()).not.toMatch(/Übersehen|Fälschlich/);
  });
  it('a clean passage needs an explicit "No errors"; flagging anything is wrong; no "0 of 0" wording', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, 'Ausprobieren', detectiveCleanFixture);
    await user.click(screen.getByLabelText('Kein Fehler'));
    await check(user);
    expect(playText()).toContain('Ergebnis: richtig');
    expect(playText()).not.toMatch(/0 von 0/);
    await reveal(user);
    expect(answerKey().textContent).toContain('Kein Fehler');
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    await pick(user, 'gesehen.');
    await check(user);
    expect(playText()).toContain('Ergebnis: Nicht richtig');
    expect(playText()).toMatch(/Fälschlich markiert: gesehen\./);
  });
  it('"No errors" on a passage that has errors is wrong and reveals every miss', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await user.click(screen.getByLabelText('Kein Fehler'));
    await check(user);
    expect(playText()).toContain('Ergebnis: Nicht richtig — 0 von 2 richtig');
    expect(playText()).toContain('Noch nicht gefunden: 2');          // a count only, never the locations
    expect(playText()).not.toMatch(/Übersehen/);
    await reveal(user);
    expect(playText()).toMatch(/Übersehen: haben, dem/);
  });
  it('selecting segments clears "No errors" and choosing "No errors" clears the selection', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    const none = screen.getByLabelText('Kein Fehler') as HTMLInputElement;
    await user.click(none);
    expect(none.checked).toBe(true);
    await pick(user, 'Ich');
    expect(none.checked).toBe(false);
    expect(segment('Ich').getAttribute('aria-pressed')).toBe('true');
    await user.click(none);
    expect(segment('Ich').getAttribute('aria-pressed')).toBe('false');
  });
  it('identifies segments by id, so two identical words are independent', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, 'Ausprobieren', detectiveFixture, a => {
      a.content.segments = ['Ich', 'ging', 'ging', 'nach', 'Hause'].map((text, i) => ({ id: 'w' + (i + 1), text }));
      a.content.issues = [{ segmentId: 'w3', correction: 'ging heim', explanation: 'x' }];
    });
    const twins = screen.getAllByRole('button', { name: /^ging/ });
    expect(twins).toHaveLength(2);
    await user.click(twins[1]);
    expect(twins[0].getAttribute('aria-pressed')).toBe('false');
    await check(user);
    expect(playText()).toContain('Ergebnis: richtig');
  });
});

describe('Language Detective play: free-text corrections are never graded', () => {
  it('gives the identical verdict for the exact model correction, nonsense and an empty box', async () => {
    const verdicts: string[] = [];
    for (const typed of ['habe', 'xyzzy 🍎 ###', '']) {
      const { user, unmount } = renderPage(<DetectivePage />);
      await play(user);
      await pick(user, 'haben', 'dem');
      if (typed) { await user.type(suggestionBox('haben'), typed); await user.type(suggestionBox('dem'), typed); }
      await check(user);
      verdicts.push(playText().match(/Ergebnis: .*?\d von \d richtig/)![0]);
      unmount();
    }
    expect(new Set(verdicts).size).toBe(1);
    expect(verdicts[0]).toBe('Ergebnis: richtig — 2 von 2 richtig');
  });
  it('does not turn a wrong location right just because the typed text equals a model correction', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'Ich');
    await user.type(suggestionBox('Ich'), 'habe');
    await check(user);
    expect(playText()).toContain('Nicht richtig');
    expect(playText()).toContain('Noch nicht gefunden: 2');
    expect(playText()).not.toMatch(/Übersehen/);
    await reveal(user);
    expect(playText()).toMatch(/Übersehen: haben, dem/);
  });
  it('shows the learner text beside the teacher key only after Reveal, labelled as not graded, and never marks it right or wrong', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben', 'dem');
    await user.type(suggestionBox('haben'), 'zzhab');
    await user.type(suggestionBox('dem'), 'zzden');
    await check(user);
    expect(document.querySelector('div.activity-key')).toBeNull(); // both picks are right: nothing echoed or judged before Reveal
    await reveal(user);
    const entries = Array.from(document.querySelectorAll('.activity-key-entry')).map(e => e.textContent!);
    expect(entries[0]).toContain('haben → habe');
    expect(entries[0]).toContain('Eigener Korrekturvorschlag (nicht automatisch bewertet): zzhab');
    expect(entries[1]).toContain('Eigener Korrekturvorschlag (nicht automatisch bewertet): zzden');
    for (const e of entries) expect(e).not.toMatch(/richtig|falsch|✓|✗/i);
  });
  it('never shows a suggestion for a deselected or blank segment', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await user.type(suggestionBox('haben'), 'habe');
    await user.click(segment('haben'));                            // deselect: the typed text must not resurface in the key
    await pick(user, 'dem');
    await user.type(suggestionBox('dem'), 'x');
    await user.clear(suggestionBox('dem'));                        // blank is not a suggestion either
    await check(user);
    await reveal(user);
    expect(answerKey().textContent).not.toContain('Eigener Korrekturvorschlag');
  });
  it('keeps typed text while a segment is toggled before Check and shows it once in the key', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await user.type(suggestionBox('haben'), 'habe');
    await user.click(segment('haben')); await user.click(segment('haben'));
    expect(suggestionBox('haben').value).toBe('habe');
    await check(user); await reveal(user);
    expect(answerKey().textContent!.match(/Eigener Korrekturvorschlag/g)).toHaveLength(1);
  });
  it('caps a suggestion at 300 characters by code point', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await user.click(suggestionBox('haben'));
    await user.paste('🍎'.repeat(305));
    expect(Array.from(suggestionBox('haben').value)).toHaveLength(300);
  });
});

describe('Language Detective play: focus, retry and modes', () => {
  it('moves focus to the result after Check and to the answer key after Reveal', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await check(user);
    expect(document.activeElement?.getAttribute('role')).toBe('status');
    expect(document.activeElement?.textContent).toContain('Ergebnis');
    await reveal(user);
    expect(document.activeElement?.classList.contains('activity-key')).toBe(true);
    expect(document.activeElement?.textContent).toContain('Lösungsschlüssel');
  });
  it('retry clears selections, typed text, "No errors", verdicts and the key, and focuses the first segment', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await user.type(suggestionBox('haben'), 'habe');
    await check(user); await reveal(user);
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(playText()).not.toMatch(/Ergebnis|Lösungsschlüssel|→|Übersehen/);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(document.querySelectorAll('.detective-segment.selected')).toHaveLength(0);
    expect(document.activeElement).toBe(segment('Ich'));
    await pick(user, 'haben');
    expect(suggestionBox('haben').value).toBe('');                  // typed text is gone, not merely hidden
  });
  it('freezes selection after Check', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await check(user);
    expect(segment('haben').disabled).toBe(true);
    expect((screen.getByLabelText('Kein Fehler') as HTMLInputElement).disabled).toBe(true);
    expect(suggestionBox('haben').disabled).toBe(true);
  });
  it('Presentation mode has no typing boxes and a projected layout; Independent and Preview offer them', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, 'Präsentieren');
    expect(document.querySelector('main')!.classList.contains('activity-projected')).toBe(true);
    await pick(user, 'haben');
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    await check(user); await reveal(user);
    expect(playText()).not.toContain('Eigener Korrekturvorschlag');
    expect(playText()).toContain('haben → habe');
    for (const mode of ['Ausprobieren', 'Ausprobieren'] as const) {
      await user.click(within(document.querySelector('.activity-ux-play-top')!).getByRole('button', { name: 'Zum Editor' }));
  await user.click(screen.getByRole('button', { name: mode }));
      await pick(user, 'haben');
      expect(screen.getAllByRole('textbox')).toHaveLength(1);
    }
  });
});

describe('Language Detective play: locales and text', () => {
  it('translates the interface only; segments, corrections, explanations and summary stay as authored', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben', 'dem');
    await chooseLocale(user, 'vi');
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: /Hiện đáp án/ }));
    expect(playText()).toContain('Kết quả: đúng — 2 trên 2 đúng');
    expect(playText()).toContain('haben → habe');
    expect(playText()).toContain('Akkusativ: den Film.');
    await chooseLocale(user, 'en');
    expect(playText()).toContain('Result: correct — 2 of 2 correct');
    expect(playText()).toContain('Achte auf Verbendung und Kasus.');
    expect(playText()).toContain('Your proposed correction – not graded automatically');
  });
  it('renders markup-like text literally and tags authored text with the target language', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, 'Ausprobieren', detectiveFixture, a => { a.targetLanguage = 'vi'; a.content.segments[0].text = '5 < 6 & "x" 🍎'; });
    expect(segment('5 < 6 & "x" 🍎').querySelector('[lang="vi"]')).toBeTruthy();
    expect(document.querySelector('.activity-play .lead[lang="vi"]')).toBeTruthy();
    expect(document.querySelector('.activity-play img, .activity-play script')).toBeNull();
  });
  it('handles the maximum passage (80 segments, 12 issues) and keeps authored order', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, 'Ausprobieren', detectiveFixture, a => {
      a.content.segments = Array.from({ length: 80 }, (_, i) => ({ id: 's' + (i + 1), text: 'Wort' + (i + 1) }));
      a.content.issues = Array.from({ length: 12 }, (_, i) => ({ segmentId: 's' + (i * 6 + 1), correction: 'k' + i, explanation: 'e' + i }));
    });
    const texts = Array.from(document.querySelectorAll('.detective-segment')).map(b => b.textContent);
    expect(texts).toEqual(Array.from({ length: 80 }, (_, i) => 'Wort' + (i + 1)));
    for (let i = 0; i < 12; i++) await user.click(screen.getByRole('button', { name: new RegExp('^Wort' + (i * 6 + 1) + '$') }));
    await check(user);
    expect(playText()).toContain('Ergebnis: richtig — 12 von 12 richtig');
  }, 30000);
});

describe('Language Detective play: several sentences (v2)', () => {
  type V2 = { title: string; content: { tasks: { segments: { id: string; text: string }[]; issues: { segmentId: string; correction: string; explanation: string }[] }[]; summary?: string } };
  const v2 = (): V2 & Record<string, unknown> => JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/wave-f/corpus/valid/language-detective/06-drei-kurze-saetze.json'), 'utf8'));
  async function playV2(user: UserEvent, mode: 'Ausprobieren' | 'Präsentieren' = 'Ausprobieren', mutate?: (a: ReturnType<typeof v2>) => void) {
    const a = v2(); mutate?.(a);
    await importActivity(user, a);
    await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe(a.title));
    await user.click(screen.getByRole('button', { name: mode }));
  }
  const card = (n: number) => document.querySelectorAll('.sent-card')[n - 1] as HTMLElement;
  const chip = (n: number, text: string) => within(card(n)).getByRole('button', { name: new RegExp('^' + text + '(?![a-zäöüß])') });
  const none = (n: number) => card(n).querySelector('input[type="checkbox"]') as HTMLInputElement;
  const checkBtn = () => screen.getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement;

  it('stacks one card per sentence, each with its own words and its own "no errors" choice', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user);
    expect(document.querySelectorAll('.sent-card')).toHaveLength(3);
    expect([1, 2, 3].map(n => card(n).querySelector('header b')!.textContent)).toEqual(['Satz 1', 'Satz 2', 'Satz 3']);
    expect(screen.getByRole('group', { name: 'Textteile · Satz 2' })).toBeTruthy();
    expect(within(card(3)).getAllByRole('button')).toHaveLength(6);
    expect(playText().split('Lies jeden Satz einzeln.').length - 1).toBe(1);
  });
  it('keeps Check disabled until every sentence is answered, and counts the open ones', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user);
    expect(checkBtn().disabled).toBe(true);
    expect(screen.getByText('Offene Sätze: 3.')).toBeTruthy();
    await user.click(chip(1, 'Gäste'));
    expect(screen.getByText('Offene Sätze: 2.')).toBeTruthy();
    await user.click(none(2));
    expect(screen.getByText('Offene Sätze: 1.')).toBeTruthy();
    await user.click(chip(3, 'habe'));
    expect(checkBtn().disabled).toBe(false);
    expect(screen.queryByText(/Offene Sätze/)).toBeNull();
  });
  it('treats each sentence independently: identical segment ids and identical words never leak between sentences', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user, 'Ausprobieren', a => { a.content.tasks[1].segments[1].text = 'Gäste'; });
    await user.click(chip(1, 'Gäste'));
    expect(chip(1, 'Gäste').getAttribute('aria-pressed')).toBe('true');
    expect(chip(2, 'Gäste').getAttribute('aria-pressed')).toBe('false');
    await user.click(none(1));
    expect(chip(1, 'Gäste').getAttribute('aria-pressed')).toBe('false');
    await user.click(chip(2, 'Gäste'));
    expect(none(2).checked).toBe(false);
    expect(none(1).checked).toBe(true);
  });
  it('scores per sentence: a badge on each card and an aggregate of sentences and errors found', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user);
    await user.click(chip(1, 'Gäste'));          // right
    await user.click(none(2));                   // right (no error in sentence 2)
    await user.click(chip(3, 'ins'));            // wrong word; the real error "habe" is missed
    await check(user);
    expect(playText()).toContain('Ergebnis: 2 von 3 Sätzen richtig');
    expect(playText()).toContain('1 von 2 Fehlern gefunden');
    expect(card(1).querySelector('.sent-badge')!.textContent).toContain('Richtig');
    expect(card(2).querySelector('.sent-badge')!.textContent).toContain('Richtig');
    expect(card(3).querySelector('.sent-badge')!.textContent).toContain('Nicht ganz');
    const review=(n: number, label: string) => Array.from(card(n).querySelectorAll('p')).find(p => p.textContent!.includes(label))?.textContent ?? '';
    expect(review(3, 'Fälschlich markiert')).toMatch(/ins/);
    expect(review(3, 'Noch nicht gefunden: 1')).toBe('Noch nicht gefunden: 1');
    expect(review(3, 'Übersehen')).toBe('');                       // the missed word "habe" is not named before Reveal
    expect(chip(3, 'habe').classList.contains('missed')).toBe(false);
    expect(card(1).textContent).not.toMatch(/Übersehen|Fälschlich|Noch nicht/);
    expect(document.activeElement?.textContent).toContain('Sätzen richtig');
    await reveal(user);
    expect(review(3, 'Übersehen')).toMatch(/habe/);
    expect(chip(3, 'habe').classList.contains('missed')).toBe(true);
  });
  it('shows no review or disclaimer box for an error-free sentence after Check', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user);
    await user.click(none(2));                                     // correct for sentence 2: no errors there
    await user.click(chip(1, 'Gäste'));
    await user.click(chip(3, 'habe'));
    await check(user);
    expect(card(2).querySelector('div.activity-key')).toBeNull();
    expect(card(2).querySelector('.sent-badge')!.textContent).toContain('Richtig');
    expect(playText()).not.toContain('NICHT automatisch bewertet');
    expect(document.querySelector('div.activity-key')).toBeNull(); // every sentence is right: no review at all
  });
  it('keeps every correction, explanation and the summary hidden until Reveal, then shows each inside its own card', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user);
    expect(playText()).not.toMatch(/Singular: der Gast|mit „sein“|Achte auf Singular|→/);
    await user.click(chip(1, 'Gäste')); await user.click(none(2)); await user.click(chip(3, 'habe'));
    await check(user);
    expect(playText()).not.toMatch(/Singular: der Gast|mit „sein“|Achte auf Singular|→/);
    await reveal(user);
    expect(within(card(1)).getByText('Gäste → Gast')).toBeTruthy();
    expect(within(card(1)).getByText('Nach „der“ steht der Singular: der Gast.')).toBeTruthy();
    expect(within(card(2)).getByText('Kein Fehler', { selector: 'p' })).toBeTruthy();
    expect(within(card(3)).getByText('habe → bin')).toBeTruthy();
    expect(within(card(1)).queryByText(/mit „sein“/)).toBeNull();
    expect(playText()).toContain('Achte auf Singular und Plural und auf das Hilfsverb im Perfekt.');
    expect(document.activeElement?.classList.contains('activity-key')).toBe(true);
    expect(card(1).contains(document.activeElement)).toBe(true);
  });
  it('retry clears every sentence, verdict and key', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user);
    await user.click(chip(1, 'Gäste')); await user.click(none(2)); await user.click(none(3));
    await check(user); await reveal(user);
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(playText()).not.toMatch(/Ergebnis|→|Nicht ganz/);
    expect(document.querySelectorAll('.sent-card .activity-key')).toHaveLength(0);
    expect([1, 2, 3].every(n => !none(n).checked)).toBe(true);
    expect(chip(1, 'Gäste').getAttribute('aria-pressed')).toBe('false');
    expect(checkBtn().disabled).toBe(true);
  });
  it('offers typed suggestions per sentence when trying, but none when presenting', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user);
    await user.click(chip(1, 'Gäste'));
    expect(within(card(1)).getByLabelText(/^Korrektur für „Gäste“/)).toBeTruthy();
    expect(within(card(2)).queryByRole('textbox')).toBeNull();
    await user.click(within(document.querySelector('.activity-ux-play-top')!).getByRole('button', { name: 'Zum Editor' }));
    await user.click(screen.getByRole('button', { name: 'Präsentieren' }));
    await user.click(chip(1, 'Gäste'));
    expect(document.querySelectorAll('.activity-play input.detective-fix')).toHaveLength(0);
    expect(document.querySelector('main')!.classList.contains('activity-projected')).toBe(true);
  });
  it('translates the interface only: sentence labels, badges and aggregates in Vietnamese; authored text unchanged', async () => {
    const { user } = renderPage(<DetectivePage />);
    await playV2(user);
    await chooseLocale(user, 'vi');
    expect(card(1).querySelector('header b')!.textContent).toBe('Câu 1');
    await user.click(chip(1, 'Gäste')); await user.click(none(2)); await user.click(none(3));
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    expect(playText()).toContain('Kết quả: đúng 2/3 câu');
    expect(card(1).textContent).toContain('Gäste');
    expect(card(3).querySelector('.sent-badge')!.textContent).toContain('Chưa đúng');
  });
  it('a v1 file still plays as one plain passage, with no sentence chrome', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    expect(document.querySelector('.sent-card')!.classList.contains('single')).toBe(true);
    expect(document.querySelector('.sent-card header')).toBeNull();
  });
});

describe('Language Detective play: the corrected sentence line', () => {
  const originalWords = () => Array.from(document.querySelectorAll('.detective-segments:not(.corrected) .detective-segment > span:first-child')).map(s => s.textContent!);
  const correctedLine = () => Array.from(document.querySelectorAll('.detective-segments.corrected > *')).map(el => el.tagName === 'INPUT' ? '_' : el.textContent!);
  it('appears only once words are picked, copies unpicked words unchanged, and leaves each picked position empty', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    expect(document.querySelector('.detective-corrected')).toBeNull();          // nothing picked: the sentence is not duplicated
    await pick(user, 'haben', 'dem');
    const words = originalWords();
    const expected = words.map(w => (w === 'haben' || w === 'dem') ? '_' : w);
    expect(correctedLine()).toEqual(expected);
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.detective-fix'));
    expect(inputs.map(i => i.value)).toEqual(['', '']);                          // never prefilled with the model answer
    expect(inputs[0].getAttribute('aria-label')).toBe('Korrektur für „haben“');
    expect(playText()).not.toMatch(SECRETS);                                     // no model answer appears in the line
  });
  it('keeps a typed correction when its word is deselected and picked again, and drops the line for "Kein Fehler"', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    await user.type(suggestionBox('haben'), 'hab');
    await user.click(segment('haben'));                                          // deselect: the line goes
    expect(document.querySelector('.detective-corrected')).toBeNull();
    await user.click(segment('haben'));                                          // reselect: the text is still there
    expect(suggestionBox('haben').value).toBe('hab');
    await user.click(screen.getByLabelText('Kein Fehler'));                      // "Kein Fehler" clears picks and the line
    expect(document.querySelector('.detective-corrected')).toBeNull();
    expect(document.querySelectorAll('.detective-segment.selected')).toHaveLength(0);
  });
  it('marks picked words red before Check, not green', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben');
    expect(segment('haben').classList.contains('selected')).toBe(true);
    expect(segment('haben').classList.contains('hit')).toBe(false);
  });
  it('keeps the "Kein Fehler" pill a native checkbox, toggled by keyboard and pointer', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    const box = screen.getByLabelText('Kein Fehler') as HTMLInputElement;
    expect(box.type).toBe('checkbox');
    box.focus();
    await user.keyboard(' ');
    expect(box.checked).toBe(true);
    await user.click(screen.getByText('Kein Fehler', { selector: 'span' }));
    expect(box.checked).toBe(false);
  });
});
