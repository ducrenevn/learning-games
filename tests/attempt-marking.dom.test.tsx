// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { renderPage } from './helpers/dom';

afterEach(() => vi.restoreAllMocks());
const button = (name: string | RegExp) => screen.getByRole('button', { name }) as HTMLButtonElement;
const field = (name: string | RegExp) => screen.getByLabelText(name) as HTMLInputElement;
const sentence = (n: number) => screen.getByLabelText('Satz ' + n) as HTMLTextAreaElement;

describe('Problems are marked red only after an attempt, and only the ones that existed then', () => {
  it('a sentence added after a blocked attempt is not red until the next attempt', async () => {
    const { user } = renderPage(<DetectivePage />);
    await user.click(button(/Selbst erstellen/));
    expect(field('Aufgabe').getAttribute('aria-invalid')).toBeNull();      // no red before any attempt
    await user.click(button('Herunterladen'));                              // blocked: prompt and first sentence are missing
    expect(field('Aufgabe').getAttribute('aria-invalid')).toBe('true');
    await user.click(button(/Satz hinzufügen/));
    expect(sentence(2).getAttribute('aria-invalid')).toBeNull();           // new, unattempted: neutral
    expect(screen.getByRole('alert').textContent).toMatch(/Noch nicht spielbereit/);
    await user.click(button('Herunterladen'));                              // the next attempt marks it
    expect(sentence(2).getAttribute('aria-invalid')).toBe('true');
  });
});
