// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { captureDownload, fileInput, importActivity, renderPage } from './helpers/dom';
import { detectiveFixture } from './helpers/fixtures';

afterEach(() => vi.restoreAllMocks());
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const problems = () => document.querySelector('#activity-problems')?.textContent ?? '';
async function fillBlank(user: UserEvent, words = ['Ich', 'habe', 'heute', 'Zeit.']) {
  await user.type(screen.getByLabelText('Aufgabe'), 'Finde Fehler.');
  for (let i = 0; i < words.length; i++) await user.type(input('Textteil ' + (i + 1)), words[i]);
}
async function loaded(user: UserEvent) {
  await importActivity(user, detectiveFixture());
  await waitFor(() => expect(input('Titel').value).toBe('Finde den Fehler'));
}
const flag = (n: number) => screen.getByRole('checkbox', { name: new RegExp('^Fehler\\s*\\(Textteil ' + n + '\\)') }) as HTMLInputElement;

describe('Language Detective authoring', () => {
  it('a passage with no flagged issues is valid and exports an explicit empty issues array', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<DetectivePage />);
    expect(button('JSON herunterladen').disabled).toBe(true);
    expect(problems()).toContain('content.prompt');
    await fillBlank(user);
    expect(problems()).toBe('');
    await user.click(button('JSON herunterladen'));
    const exported = JSON.parse(await dl.text());
    expect(exported.content.issues).toEqual([]);
    expect(exported.content).not.toHaveProperty('summary');
    expect(exported.content.segments.map((s: { text: string }) => s.text)).toEqual(['Ich', 'habe', 'heute', 'Zeit.']);
  });
  it('flagging a segment requires a model correction and an explanation, and labels the explanation as required', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<DetectivePage />);
    await fillBlank(user, ['Ich', 'haben', 'heute', 'Zeit.']);
    await user.click(flag(2));
    expect(problems()).toContain('content.issues[0].correction');
    expect(problems()).toContain('content.issues[0].explanation');
    expect(button('JSON herunterladen').disabled).toBe(true);
    expect(screen.queryByLabelText(/^Erklärung \(optional\)\s*\(Textteil 2\)/)).toBeNull();   // required, so never labelled optional
    await user.type(screen.getByLabelText(/^Musterkorrektur\s*\(Textteil 2\)/), 'habe');
    await user.type(screen.getByLabelText(/^Erklärung\s*\(Textteil 2\)/), 'Verb mit ich.');
    expect(problems()).toBe('');
    await user.click(button('JSON herunterladen'));
    expect(JSON.parse(await dl.text()).content.issues).toEqual([{ segmentId: 'segment-2', correction: 'habe', explanation: 'Verb mit ich.' }]);
  });
  it('unflagging, or removing a flagged segment, never leaves a dangling reference', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);                                             // issues on s2 (Textteil 2) and s4 (Textteil 4)
    await user.click(flag(4));                                      // unflag
    expect(screen.queryByLabelText(/^Musterkorrektur\s*\(Textteil 4\)/)).toBeNull();
    await user.click(button('Entfernen: Textteil 2'));              // delete the flagged segment
    expect(problems()).toBe('');
    await user.click(button('JSON herunterladen'));
    const content = JSON.parse(await dl.text()).content;
    expect(content.issues).toEqual([]);
    expect(content.segments.map((s: { id: string }) => s.id)).toEqual(['s1', 's3', 's4', 's5', 's6']);
  });
  it('moving segments keeps every issue attached to its own segment', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    await user.click(button('Nach oben: Textteil 2'));              // "haben" moves before "Ich"
    expect(input('Textteil 1').value).toBe('haben');
    expect((screen.getByLabelText(/^Musterkorrektur\s*\(Textteil 1\)/) as HTMLInputElement).value).toBe('habe');
    await user.click(button('JSON herunterladen'));
    const content = JSON.parse(await dl.text()).content;
    expect(content.segments.slice(0, 2)).toEqual([{ id: 's2', text: 'haben' }, { id: 's1', text: 'Ich' }]);
    expect(content.issues.map((i: { segmentId: string }) => i.segmentId)).toEqual(['s2', 's4']);
  });
  it('allows at most 12 issues, disabling further flags and saying why', async () => {
    const { user } = renderPage(<DetectivePage />);
    await importActivity(user, (() => {
      const a = detectiveFixture();
      a.content.segments = Array.from({ length: 14 }, (_, i) => ({ id: 's' + (i + 1), text: 'W' + (i + 1) }));
      a.content.issues = Array.from({ length: 12 }, (_, i) => ({ segmentId: 's' + (i + 1), correction: 'c', explanation: 'e' }));
      return a;
    })());
    await waitFor(() => expect(input('Titel').value).toBe('Finde den Fehler'));
    expect(flag(13).disabled).toBe(true);
    expect(flag(14).disabled).toBe(true);
    expect(flag(1).disabled).toBe(false);
    expect(screen.getByText('Höchstens 12 Fehler können markiert werden.')).toBeTruthy();
    await user.click(flag(1));
    expect(flag(13).disabled).toBe(false);
    expect(screen.queryByText('Höchstens 12 Fehler können markiert werden.')).toBeNull();
  });
  it('keeps 4–80 segments, accepts repeated segment text, and issues unique ids after a middle removal', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<DetectivePage />);
    expect(button('Entfernen: Textteil 1').disabled).toBe(true);
    for (let i = 0; i < 76; i++) await user.click(button('Textteil hinzufügen'));
    expect(button('Textteil hinzufügen').disabled).toBe(true);
    await user.click(button('Entfernen: Textteil 80'));
    await user.click(button('Entfernen: Textteil 5'));              // remove segment-5
    await user.click(button('Textteil hinzufügen'));                // must be a fresh id, not a clash with segment-79 etc.
    await user.type(screen.getByLabelText('Aufgabe'), 'x');
    // identical text is allowed for segments (only ids must be unique): give every segment the same word
    for (let i = 1; i <= 79; i++) fireEvent.change(input('Textteil ' + i), { target: { value: 'der' } });
    await user.click(button('JSON herunterladen'));
    const ids: string[] = JSON.parse(await dl.text()).content.segments.map((s: { id: string }) => s.id);
    expect(ids).toHaveLength(79);
    expect(new Set(ids).size).toBe(79);
  }, 120000);
  it('removes the summary key when cleared and reimports byte-identically', async () => {
    const dl = captureDownload();
    const { user, unmount } = renderPage(<DetectivePage />);
    await loaded(user);
    await user.click(button('JSON herunterladen'));
    const first = await dl.text();
    unmount();
    const next = renderPage(<DetectivePage />);
    await importActivity(next.user, JSON.parse(first));
    await waitFor(() => expect(input('Titel').value).toBe('Finde den Fehler'));
    await next.user.click(button('JSON herunterladen'));
    expect(await dl.text()).toBe(first);
    await next.user.clear(screen.getByLabelText('Zusammenfassung (optional)'));
    await next.user.click(button('JSON herunterladen'));
    expect(JSON.parse(await dl.text()).content).not.toHaveProperty('summary');
  });
  it('rejects markup in model corrections and explanations while typing', async () => {
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    await user.clear(screen.getByLabelText(/^Musterkorrektur\s*\(Textteil 2\)/));
    await user.type(screen.getByLabelText(/^Musterkorrektur\s*\(Textteil 2\)/), '<img src=x>');
    expect(problems()).toContain('content.issues[0].correction: HTML/Skripte sind nicht erlaubt');
  });
});

describe('Language Detective editor keyboard focus and names', () => {
  it('focuses the new segment after Add and the Add button after Remove; import never moves focus', async () => {
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    expect(document.activeElement).toBe(fileInput());
    await user.click(button('Textteil hinzufügen'));
    expect(document.activeElement).toBe(input('Textteil 7'));
    await user.click(button('Entfernen: Textteil 7'));
    expect(document.activeElement).toBe(button('Textteil hinzufügen'));
  });
  it('keeps focus on the moved segment and announces its new position', async () => {
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    button('Nach oben: Textteil 3').focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(button('Nach oben: Textteil 2'));
    expect(document.querySelector('.activity-editor [role="status"].sr-only')!.textContent).toBe('gestern: jetzt Position 2 von 6.');
    await user.keyboard('{Enter}');                                  // reaches the top: Up disables, focus follows to Down
    expect(button('Nach oben: Textteil 1').disabled).toBe(true);
    expect(document.activeElement).toBe(button('Nach unten: Textteil 1'));
  });
  it('gives each repeated control a unique accessible name', async () => {
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    const names = screen.getAllByRole('button').map(b => b.getAttribute('aria-label')).filter((n): n is string => !!n && /^(Nach|Entfernen)/.test(n));
    expect(names).toHaveLength(18);
    expect(new Set(names).size).toBe(18);
    const boxes = screen.getAllByRole('checkbox').map(c => c.getAttribute('aria-label') ?? c.closest('label')!.textContent);
    expect(new Set(boxes).size).toBe(boxes.length);
  });
  it('lists segments in authored order', async () => {
    const { user } = renderPage(<DetectivePage />);
    await loaded(user);
    expect([1, 2, 3, 4, 5, 6].map(n => input('Textteil ' + n).value)).toEqual(['Ich', 'haben', 'gestern', 'dem', 'Film', 'gesehen.']);
  });
});
