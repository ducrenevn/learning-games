// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { chooseLocale, importActivity, playText, renderPage } from './helpers/dom';
import { detectiveCleanFixture, detectiveFixture } from './helpers/fixtures';

type Fixture = ReturnType<typeof detectiveFixture>;
async function play(user: UserEvent, mode: 'Allein üben' | 'Präsentieren' | 'Vorschau' = 'Allein üben', make: () => Fixture = detectiveFixture, mutate?: (a: Fixture) => void) {
  const a = make(); mutate?.(a);
  await importActivity(user, a);
  await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe(a.title));
  await user.click(screen.getByRole('button', { name: mode }));
}
const segment = (text: string) => screen.getByRole('button', { name: new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-zäöüß])') }) as HTMLButtonElement;
const pick = async (user: UserEvent, ...texts: string[]) => { for (const t of texts) await user.click(segment(t)); };
const check = (user: UserEvent) => user.click(screen.getByRole('button', { name: 'Prüfen' }));
const reveal = (user: UserEvent) => user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
const suggestionBox = (text: string) => screen.getByLabelText(new RegExp('^' + text + ' — Eigener Korrekturvorschlag')) as HTMLTextAreaElement;
const answerKey = () => document.querySelector('section.activity-key')!;
const review = () => document.querySelector('div.activity-key')!;
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
    await play(user, 'Allein üben', detectiveFixture, a => { a.content.issues[0].explanation = 'GEHEIM-ERKLAERUNG'; });
    const html = document.querySelector('.activity-play')!.innerHTML;
    expect(html).not.toContain('GEHEIM-ERKLAERUNG');
    expect(html).not.toMatch(/data-(issue|answer|correct)/i);
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
    await user.click(screen.getByLabelText('Keine Fehler'));
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
    expect(playText()).toMatch(/Übersehen: dem/);
    expect(playText()).toMatch(/Fälschlich markiert: Film/);
    expect(segment('haben').textContent).toContain('Richtig markiert');
    expect(segment('dem').textContent).toContain('Übersehen');
    expect(segment('Film').textContent).toContain('Fälschlich markiert');
    expect(segment('Ich').textContent).not.toMatch(/markiert|Übersehen/);
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
    await play(user, 'Allein üben', detectiveCleanFixture);
    await user.click(screen.getByLabelText('Keine Fehler'));
    await check(user);
    expect(playText()).toContain('Ergebnis: richtig');
    expect(playText()).not.toMatch(/0 von 0/);
    await reveal(user);
    expect(answerKey().textContent).toContain('Keine Fehler');
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    await pick(user, 'gesehen.');
    await check(user);
    expect(playText()).toContain('Ergebnis: Nicht richtig');
    expect(playText()).toMatch(/Fälschlich markiert: gesehen\./);
  });
  it('"No errors" on a passage that has errors is wrong and reveals every miss', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await user.click(screen.getByLabelText('Keine Fehler'));
    await check(user);
    expect(playText()).toContain('Ergebnis: Nicht richtig — 0 von 2 richtig');
    expect(playText()).toMatch(/Übersehen: haben, dem/);
  });
  it('selecting segments clears "No errors" and choosing "No errors" clears the selection', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    const none = screen.getByLabelText('Keine Fehler') as HTMLInputElement;
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
    await play(user, 'Allein üben', detectiveFixture, a => {
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
    expect(playText()).toMatch(/Übersehen: haben, dem/);
  });
  it('shows the learner text beside the teacher key only after Reveal, labelled as not graded, and never marks it right or wrong', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user);
    await pick(user, 'haben', 'dem');
    await user.type(suggestionBox('haben'), 'zzhab');
    await user.type(suggestionBox('dem'), 'zzden');
    await check(user);
    expect(review().textContent).not.toContain('zz');              // not echoed or judged in the review before Reveal
    expect(review().textContent).toContain('NICHT automatisch bewertet');
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
    expect((screen.getByLabelText('Keine Fehler') as HTMLInputElement).disabled).toBe(true);
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
    for (const mode of ['Allein üben', 'Vorschau'] as const) {
      await user.click(screen.getByRole('button', { name: 'Zum Editor' }));
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
    expect(playText()).toContain('Free text is NOT automatically graded');
  });
  it('renders markup-like text literally and tags authored text with the target language', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, 'Allein üben', detectiveFixture, a => { a.targetLanguage = 'vi'; a.content.segments[0].text = '5 < 6 & "x" 🍎'; });
    expect(segment('5 < 6 & "x" 🍎').querySelector('[lang="vi"]')).toBeTruthy();
    expect(document.querySelector('.activity-play .lead[lang="vi"]')).toBeTruthy();
    expect(document.querySelector('.activity-play img, .activity-play script')).toBeNull();
  });
  it('handles the maximum passage (80 segments, 12 issues) and keeps authored order', async () => {
    const { user } = renderPage(<DetectivePage />);
    await play(user, 'Allein üben', detectiveFixture, a => {
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
