// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { captureDownload, fileInput, importActivity, renderPage } from './helpers/dom';
import { sequenceFixture } from './helpers/fixtures';

afterEach(() => vi.restoreAllMocks());
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const stepTexts = () => Array.from(document.querySelectorAll<HTMLInputElement>('.activity-edit-row input.field')).map(i => i.value);
async function fillBlank(user: UserEvent) {
  await user.type(screen.getByLabelText('Aufgabe'), 'Ordne.');
  for (const [n, text] of [[1, 'Eins'], [2, 'Zwei'], [3, 'Drei']] as const) await user.type(input('Schritt ' + n), text);
}
async function loaded(user: UserEvent) {
  await importActivity(user, sequenceFixture());
  await waitFor(() => expect(input('Titel').value).toBe('Gespräch ordnen'));
}

describe('Sequence authoring', () => {
  it('is invalid until the prompt and every step have text', async () => {
    const { user } = renderPage(<SequencePage />);
    expect(button('JSON herunterladen').disabled).toBe(true);
    expect(document.querySelector('#activity-problems')!.textContent).toContain('content.prompt');
    await fillBlank(user);
    expect(document.querySelector('#activity-problems')).toBeNull();
    expect(button('JSON herunterladen').disabled).toBe(false);
  });
  it('explains that the order of the list is the answer key (not "Richtige Position")', async () => {
    renderPage(<SequencePage />);
    expect(screen.getByText(/Die Reihenfolge dieser Liste ist die richtige Lösung/)).toBeTruthy();
  });
  it('exports the authored order as the answer key, and move buttons change that key', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SequencePage />);
    await fillBlank(user);
    await user.click(button('Nach oben: Schritt 3'));          // Drei before Zwei
    await user.click(button('Nach unten: Schritt 1'));         // Eins after Drei
    expect(stepTexts()).toEqual(['Drei', 'Eins', 'Zwei']);
    await user.click(button('JSON herunterladen'));
    expect(JSON.parse(await dl.text()).content.items).toEqual([
      { id: 'step-3', text: 'Drei' }, { id: 'step-1', text: 'Eins' }, { id: 'step-2', text: 'Zwei' },
    ]);
  });
  it('keeps the reimported answer order identical byte for byte', async () => {
    const dl = captureDownload();
    const { user, unmount } = renderPage(<SequencePage />);
    await loaded(user);
    await user.click(button('Nach oben: Schritt 4'));
    await user.click(button('JSON herunterladen'));
    const first = await dl.text();
    unmount();
    const next = renderPage(<SequencePage />);
    await importActivity(next.user, JSON.parse(first));
    await waitFor(() => expect(input('Titel').value).toBe('Gespräch ordnen'));
    expect(stepTexts().slice(0, 4)).toEqual(['Guten Tag, Praxis Müller.', 'Ich möchte einen Termin.', 'Am Dienstag um zehn Uhr.', 'Wann haben Sie Zeit?']);
    await next.user.click(button('JSON herunterladen'));
    expect(await dl.text()).toBe(first);
  });
  it('enforces 3–20 steps by disabling Remove and Add at the boundaries', async () => {
    const { user } = renderPage(<SequencePage />);
    expect(button('Entfernen: Schritt 1').disabled).toBe(true);
    for (let i = 0; i < 17; i++) await user.click(button('Schritt hinzufügen'));
    expect(button('Schritt hinzufügen').disabled).toBe(true);
    expect(screen.getAllByRole('button', { name: /^Entfernen: Schritt/ }).length).toBe(20);
    await user.click(button('Entfernen: Schritt 20'));
    expect(button('Schritt hinzufügen').disabled).toBe(false);
  }, 30000);
  it('flags duplicate step texts case-insensitively and removes the explanation key when cleared', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SequencePage />);
    await loaded(user);
    await user.clear(input('Schritt 2'));
    await user.type(input('Schritt 2'), ' guten tag, praxis müller. ');
    expect(document.querySelector('#activity-problems')!.textContent).toMatch(/content\.items\[1\]\.text: doppelter Wert/);
    await user.clear(input('Schritt 2'));
    await user.type(input('Schritt 2'), 'Ich möchte einen Termin.');
    await user.clear(screen.getByLabelText('Erklärung (optional)'));
    await user.click(button('JSON herunterladen'));
    expect(JSON.parse(await dl.text()).content).not.toHaveProperty('explanation');
  });
  it('generates unique step ids after a middle step was removed', async () => {
    const dl = captureDownload();
    const { user } = renderPage(<SequencePage />);
    await fillBlank(user);
    await user.click(button('Schritt hinzufügen')); await user.type(input('Schritt 4'), 'Vier');   // step-4
    await user.click(button('Schritt hinzufügen')); await user.type(input('Schritt 5'), 'Fünf');   // step-5
    await user.click(button('Entfernen: Schritt 4'));                                              // 1,2,3,5
    await user.click(button('Schritt hinzufügen')); await user.type(input('Schritt 5'), 'Sechs');  // must be step-4
    await user.click(button('JSON herunterladen'));
    expect(JSON.parse(await dl.text()).content.items.map((i: { id: string }) => i.id)).toEqual(['step-1', 'step-2', 'step-3', 'step-5', 'step-4']);
  });
});

describe('Sequence editor keyboard focus and names', () => {
  it('keeps focus on the moved row, following it when its button disables at either end', async () => {
    const { user } = renderPage(<SequencePage />);
    await loaded(user);
    button('Nach oben: Schritt 3').focus();
    await user.keyboard('{Enter}');                                // Schritt 3 → row 2; focus stays on its Up
    expect(document.activeElement).toBe(button('Nach oben: Schritt 2'));
    await user.keyboard('{Enter}');                                // → row 1: Up disables, focus moves to its Down
    expect(button('Nach oben: Schritt 1').disabled).toBe(true);
    expect(document.activeElement).toBe(button('Nach unten: Schritt 1'));
    expect(stepTexts()[0]).toBe('Wann haben Sie Zeit?');
  });
  it('focuses the new step after Add and the Add button after Remove; import never moves focus', async () => {
    const { user } = renderPage(<SequencePage />);
    await loaded(user);
    expect(document.activeElement).toBe(fileInput());
    await user.click(button('Schritt hinzufügen'));
    expect(document.activeElement).toBe(input('Schritt 5'));
    await user.click(button('Entfernen: Schritt 5'));
    expect(document.activeElement).toBe(button('Schritt hinzufügen'));
  });
  it('announces editor moves and gives every repeated button a unique name', async () => {
    const { user } = renderPage(<SequencePage />);
    await loaded(user);
    await user.click(button('Nach unten: Schritt 1'));
    expect(document.querySelector('.activity-editor [role="status"].sr-only')!.textContent).toBe('Guten Tag, Praxis Müller.: jetzt Position 2 von 4.');
    const names = screen.getAllByRole('button').map(b => b.getAttribute('aria-label')).filter((n): n is string => !!n && /^(Nach|Entfernen)/.test(n));
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBe(12); // up, down and remove for each of the 4 steps
  });
});
