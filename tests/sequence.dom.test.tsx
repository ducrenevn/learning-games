// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { chooseLocale, importActivity,   playText  , renderPage } from './helpers/dom';
import { sequenceFixture } from './helpers/fixtures';

const authored = sequenceFixture().content.items.map(i => i.text);
async function play(user: UserEvent, mode: 'Ausprobieren' | 'Präsentieren' | 'Ausprobieren' = 'Ausprobieren', mutate?: (a: ReturnType<typeof sequenceFixture>) => void) {
  const a = sequenceFixture(); mutate?.(a);
  await importActivity(user, a);
  await waitFor(() => expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Gespräch ordnen'));
  await user.click(screen.getByRole('button', { name: mode }));
}
const rows = () => Array.from(document.querySelectorAll('.sequence-card')) as HTMLElement[];
const order = () => rows().map(r => r.querySelector('.sequence-card-copy span')!.textContent!);
const down = (text: string) => screen.getByRole('button', { name: 'Nach unten: ' + text }) as HTMLButtonElement;
const up = (text: string) => screen.getByRole('button', { name: 'Nach oben: ' + text }) as HTMLButtonElement;
const live = () => document.querySelector('.activity-play [role="status"].sr-only')!;
/** Reorders through the real Move Up buttons until the list equals `target`. */
async function arrange(user: UserEvent, target: string[]) {
  for (let pos = 0; pos < target.length; pos++) {
    while (order().indexOf(target[pos]) > pos) await user.click(up(target[pos]));
  }
  expect(order()).toEqual(target);
}

describe('Sequence play: secrecy and shuffle', () => {
  it('shows no verdict, key or explanation before Check, and the explanation only after Reveal', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    expect(playText()).not.toMatch(/Ergebnis|Lösungsschlüssel|Begrüßung, Anliegen|Nicht richtig/);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toMatch(/Ergebnis: \d von 4 richtig/);
    expect(playText()).not.toMatch(/Lösungsschlüssel|Begrüßung, Anliegen/);
    await user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
    expect(playText()).toContain('Lösungsschlüssel');
    expect(playText()).toContain('Begrüßung, Anliegen, Terminfrage, Antwort.');
    const key = Array.from(document.querySelectorAll('.activity-key li')).map(li => li.textContent);
    expect(key).toEqual(authored);
  });
  it('never starts in the solved order, however often the game is retried', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    for (let i = 0; i < 25; i++) {
      expect(order(), 'restart ' + i).not.toEqual(authored);
      expect([...order()].sort()).toEqual([...authored].sort());
      await user.click(screen.getByRole('button', { name: 'Prüfen' }));
      await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    }
  }, 30000);
});

describe('Sequence play: moving cards', () => {
  it('moves a card one place with Up/Down and disables the buttons at both ends', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    const before = order();
    expect(rows()[0].querySelector<HTMLButtonElement>('[aria-label^="Nach oben"]')!.disabled).toBe(true);
    expect(rows()[3].querySelector<HTMLButtonElement>('[aria-label^="Nach unten"]')!.disabled).toBe(true);
    await user.click(down(before[0]));
    expect(order()).toEqual([before[1], before[0], before[2], before[3]]);
    await user.click(up(before[0]));
    expect(order()).toEqual(before);
  });
  it('keeps keyboard focus on the moved card while it travels all the way down and back up', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    await arrange(user, authored);
    down(authored[0]).focus();
    for (let i = 0; i < 2; i++) {
      await user.keyboard('{Enter}');
      expect(document.activeElement, 'down step ' + i).toBe(down(authored[0]));
    }
    await user.keyboard('{Enter}');                  // third press: the card reaches the bottom, its Down button disables
    expect(order()[3]).toBe(authored[0]);
    expect(down(authored[0]).disabled).toBe(true);
    expect(document.activeElement).toBe(up(authored[0])); // focus follows the card to its still-enabled Up button
    for (let i = 0; i < 2; i++) {
      await user.keyboard('{Enter}');
      expect(document.activeElement, 'up step ' + i).toBe(up(authored[0]));
    }
    await user.keyboard('{Enter}');                  // reaches the top, Up disables
    expect(order()[0]).toBe(authored[0]);
    expect(up(authored[0]).disabled).toBe(true);
    expect(document.activeElement).toBe(down(authored[0]));
  });
  it('announces each move with the new position through a polite live region', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    expect(live().getAttribute('aria-live')).toBe('polite');
    const before = order();
    await user.click(down(before[1]));
    expect(live().textContent).toBe(before[1] + ': jetzt Position 3 von 4.');
    await user.click(up(before[1]));
    expect(live().textContent).toBe(before[1] + ': jetzt Position 2 von 4.');
  });
});

describe('Sequence play: check, retry and reveal', () => {
  it('scores exact positions, marks rows with text, freezes the order and focuses the result', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    await arrange(user, [authored[1], authored[0], authored[2], authored[3]]);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 2 von 4 richtig');
    expect(document.activeElement?.getAttribute('role')).toBe('status');
    expect(document.activeElement?.textContent).toContain('Ergebnis: 2 von 4 richtig');
    const marks = Array.from(document.querySelectorAll('.activity-status')).map(e => e.textContent?.replace(/^[✓✗]\s*/, ''));
    expect(marks).toEqual(['Nicht richtig', 'Nicht richtig', 'richtig', 'richtig']);
    expect(screen.getAllByRole('button').filter(b => /^Nach (oben|unten)/.test(b.getAttribute('aria-label') ?? '')).every(b => (b as HTMLButtonElement).disabled)).toBe(true);
  });
  it('reports a perfect order as 4 of 4', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    await arrange(user, authored);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('Ergebnis: 4 von 4 richtig');
  });
  it('retry reshuffles, removes verdicts and the key, and focuses the first control', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(screen.getByRole('button', { name: /Lösung & Erklärung/ }));
    expect(document.activeElement?.classList.contains('activity-key')).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(playText()).not.toMatch(/Ergebnis|Lösungsschlüssel|richtig/);
    expect(order()).not.toEqual(authored);
    expect(document.activeElement?.tagName).toBe('BUTTON');
    expect((document.activeElement as HTMLButtonElement).disabled).toBe(false);
    expect(document.querySelector('.activity-play')!.contains(document.activeElement)).toBe(true);
    expect(rows().some(r => r.contains(document.activeElement))).toBe(true);
  });
  it('does not alter the authored answer order held by the editor', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    await arrange(user, [...authored].reverse());
    await user.click(within(document.querySelector('.activity-ux-play-top')!).getByRole('button', { name: 'Zum Editor' }));
    expect([1, 2, 3, 4].map(n => (screen.getByLabelText('Schritt ' + n) as HTMLInputElement).value)).toEqual(authored);
  });
});

describe('Sequence play: modes, locales and text', () => {
  it('plays the same in Presentation and Independent modes; Presentation adds the projected layout class', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user, 'Präsentieren');
    expect(document.querySelector('main')!.classList.contains('activity-projected')).toBe(true);
    await arrange(user, authored);
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(playText()).toContain('4 von 4 richtig');
    await user.click(within(document.querySelector('.activity-ux-play-top')!).getByRole('button', { name: 'Zum Editor' }));
    await user.click(screen.getByRole('button', { name: 'Ausprobieren' }));
    expect(document.querySelector('main')!.classList.contains('activity-projected')).toBe(false);
  });
  it('translates only the interface; prompt, cards and explanation stay as authored', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user);
    await chooseLocale(user, 'vi');
    expect(screen.getByRole('button', { name: 'Kiểm tra' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    await user.click(screen.getByRole('button', { name: /Hiện đáp án/ }));
    expect(playText()).toContain('Đáp án');
    expect(playText()).toContain('Begrüßung, Anliegen, Terminfrage, Antwort.');
    expect(playText()).toContain('Ordne ein Telefongespräch beim Arzt.');
    expect([...order()].sort()).toEqual([...authored].sort());
    await chooseLocale(user, 'en');
    expect(playText()).toContain('Answer key');
    expect(playText()).toContain('Guten Tag, Praxis Müller.');
  });
  it('renders markup-like text literally, marks authored text with the target language and labels buttons with the card text', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user, 'Ausprobieren', a => { a.targetLanguage = 'vi'; a.content.items[0].text = 'x < y & "z" 🍎'; });
    expect(order()).toContain('x < y & "z" 🍎');
    expect(document.querySelector('.activity-play .lead[lang="vi"]')).toBeTruthy();
    expect(rows().every(r => r.querySelector('.sequence-card-copy span')!.getAttribute('lang') === 'vi')).toBe(true);
    expect(down('x < y & "z" 🍎')).toBeTruthy(); // the card's own text names its move buttons
    expect(document.querySelector('.activity-play img, .activity-play script')).toBeNull();
  });
  it('supports the minimum (3) and maximum (20) card counts', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user, 'Ausprobieren', a => { a.content.items.pop(); });
    expect(rows().length).toBe(3);
    await user.click(within(document.querySelector('.activity-ux-play-top')!).getByRole('button', { name: 'Zum Editor' }));
    await importActivity(user, (() => { const a = sequenceFixture(); a.content.items = Array.from({ length: 20 }, (_, i) => ({ id: 's' + i, text: 'Schritt Nummer ' + (i + 1) })); return a; })());
    await waitFor(() => expect((screen.getByLabelText('Schritt 20') as HTMLInputElement).value).toBe('Schritt Nummer 20'));
    await user.click(screen.getByRole('button', { name: 'Ausprobieren' }));
    expect(rows().length).toBe(20);
    expect(within(document.querySelector('.activity-play')!).getAllByRole('listitem').length).toBe(20);
  }, 30000);
});
