// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalMemory } from '../src/games/memory/LocalMemory';
import { MemoryBoard } from '../src/games/memory/components/MemoryBoard';
import { MemoryScoreboard } from '../src/games/memory/components/MemoryScoreboard';
import { MemoryHome } from '../src/games/memory/MemoryHome';
import { ownerMark } from '../src/games/memory/ownership';
import { parsePastedRows } from '../src/games/memory/MemoryEditor';
import { renderPage } from './helpers/dom';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const pairs = [{ left: 'Haus', right: 'house' }, { left: 'Tür', right: 'door' }, { left: 'Hund', right: 'dog' }];

/** Math.random() just below 1 keeps the Fisher–Yates order: cards 0+1 are pair one, 2+3 pair two. */
async function startLocal(names: string, locale: 'de' | 'en' | 'vi' = 'de', singlePlayer = false) {
  vi.spyOn(Math, 'random').mockReturnValue(0.999999);
  const user = userEvent.setup();
  render(<LocalMemory pairs={pairs} errors={[]} locale={locale} singlePlayer={singlePlayer} />);
  if (!singlePlayer) { const input = screen.getByRole('textbox'); await user.clear(input); await user.type(input, names); }
  await user.click(screen.getByRole('button', { name: /Spiel starten|Start game|Bắt đầu/ }));
  return user;
}
const cards = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.memory-card'));

describe('Memory local play: per-player ownership', () => {
  it('marks a found pair with the finder colour, shape and initial, and repeats it on the scoreboard', async () => {
    const user = await startLocal('Ann, Ben', 'en');
    await user.click(cards()[0]); await user.click(cards()[1]);
    for (const card of cards().slice(0, 2)) {
      expect(card.classList.contains('owned')).toBe(true);
      expect(card.getAttribute('aria-label')).toMatch(/ — found by Ann$/);
      expect(card.querySelector('.card-owner')?.textContent).toBe('● A');
      expect(card.style.getPropertyValue('--owner')).toBe('#1F6F8B');
    }
    const rows = Array.from(document.querySelectorAll('.score-row'));
    expect(rows[0].querySelector('.owner-badge')?.textContent).toBe('● A');
    expect(rows[1].querySelector('.owner-badge')?.textContent).toBe('▲ B');
    expect(cards()[2].classList.contains('owned')).toBe(false);
    expect(document.querySelector('.scoreboard h2')?.textContent).toBe("Ann's turn");
  });
  it('gives the second player their own colour and shape', async () => {
    const user = await startLocal('Ann, Ben', 'de');
    await user.click(cards()[0]); await user.click(cards()[2]); // mismatch hands the turn to Ben
    await vi.waitFor(() => expect(document.querySelector('.scoreboard h2')?.textContent).toBe('Ben ist an der Reihe'), { timeout: 4000 });
    await user.click(cards()[2]); await user.click(cards()[3]);
    expect(cards()[2].querySelector('.card-owner')?.textContent).toBe('▲ B');
    expect(cards()[3].getAttribute('aria-label')).toMatch(/gefunden von Ben$/);
  }, 10000);
  it('shows no ownership in a single-player game', async () => {
    const user = await startLocal('', 'de', true);
    await user.click(cards()[0]); await user.click(cards()[1]);
    expect(document.querySelector('.card-owner')).toBeNull();
    expect(document.querySelector('.owner-badge')).toBeNull();
  });
  it('localises the scoreboard and card labels instead of hard-coded German', async () => {
    await startLocal('Ann, Ben', 'vi');
    expect(document.querySelector('.scoreboard .eyebrow')?.textContent).toBe('LƯỢT HIỆN TẠI');
    expect(document.querySelector('.scoreboard h2')?.textContent).toBe('Đến lượt Ann');
    expect(cards()[0].getAttribute('aria-label')).toBe('Thẻ úp 1');
  });
  it('previews each player colour and shape on the setup screen', async () => {
    const user = userEvent.setup();
    render(<LocalMemory pairs={pairs} errors={[]} locale="de" />);
    const input = screen.getByRole('textbox');
    await user.clear(input); await user.type(input, 'Anna, Ben, Chi');
    const chips = within(screen.getByRole('list', { name: /Spielernamen/ })).getAllByRole('listitem');
    expect(chips.map(c => c.textContent)).toEqual(['● AAnna', '▲ BBen', '■ CChi']);
  });
  it('keeps six distinct shapes and colours', () => {
    const marks = [0, 1, 2, 3, 4, 5].map(i => ownerMark(i, 'x'));
    expect(new Set(marks.map(m => m.symbol)).size).toBe(6);
    expect(new Set(marks.map(m => m.color)).size).toBe(6);
    expect(ownerMark(6, 'ärger').initial).toBe('Ä');
  });
});

describe('Memory shared components keep their online defaults', () => {
  it('renders the German labels and no owner badge without the optional props', () => {
    render(<MemoryBoard cards={[{ id: 1, visible: false, matched: false, value: null }, { id: 2, visible: true, matched: true, value: 'Haus' }]} canFlip onFlip={() => {}} />);
    expect(screen.getAllByRole('button', { name: /^Verdeckte Karte \d+$/ })[0]).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Haus' })).toBeTruthy();
    expect(document.querySelector('.card-owner')).toBeNull();
    cleanup();
    render(<MemoryScoreboard players={[{ id: 'a', name: 'Ann', score: 1 }]} activeId="a" myId="a" />);
    expect(screen.getByText('Du bist dran!')).toBeTruthy();
    expect(screen.getByText('AKTUELLER ZUG')).toBeTruthy();
    expect(document.querySelector('.owner-badge')).toBeNull();
  });
});

describe('Memory table editor', () => {
  it('parses spreadsheet (tab) and pipe lists, with an optional third column as group', () => {
    expect(parsePastedRows('Haus\thouse\nTür\tdoor\tNomen')).toEqual([{ left: 'Haus', right: 'house' }, { left: 'Tür', right: 'door', category: 'Nomen' }]);
    expect(parsePastedRows('a | b')).toEqual([{ left: 'a', right: 'b' }]);
    expect(parsePastedRows('just one value')).toBeNull();
  });
  async function create() {
    const { user } = renderPage(<MemoryHome />);
    await user.click(screen.getByRole('button', { name: /Selbst erstellen/ }));
    return user;
  }
  it('adds a row on Enter in the last Karte B cell and moves to the next row Karte A otherwise', async () => {
    const user = await create();
    expect(screen.getAllByLabelText(/^Karte A · /)).toHaveLength(2);
    await user.type(screen.getByLabelText('Karte B · 2'), 'x{Enter}');
    expect(screen.getAllByLabelText(/^Karte A · /)).toHaveLength(3);
    expect(document.activeElement).toBe(screen.getByLabelText('Karte A · 3'));
    await user.type(screen.getByLabelText('Karte B · 1'), '{Enter}');
    expect(document.activeElement).toBe(screen.getByLabelText('Karte A · 2'));
  });
  it('fills rows from pasted spreadsheet columns, appending rows as needed', async () => {
    const user = await create();
    await user.click(screen.getByLabelText('Karte A · 1'));
    await user.paste('Haus\thouse\nTür\tdoor\nHund\tdog');
    expect((screen.getByLabelText('Karte A · 3') as HTMLInputElement).value).toBe('Hund');
    expect((screen.getByLabelText('Karte B · 3') as HTMLInputElement).value).toBe('dog');
    expect(screen.getAllByLabelText(/^Karte A · /)).toHaveLength(3);
  });
  it('pastes one column into the column it was pasted into', async () => {
    const user = await create();
    await user.click(screen.getByLabelText('Karte B · 1'));
    await user.paste('house\ndoor');
    expect((screen.getByLabelText('Karte B · 1') as HTMLInputElement).value).toBe('house');
    expect((screen.getByLabelText('Karte B · 2') as HTMLInputElement).value).toBe('door');
    expect((screen.getByLabelText('Karte A · 1') as HTMLInputElement).value).toBe('');
  });
  it('stops at 16 pairs and says why', async () => {
    const user = await create();
    await user.click(screen.getByLabelText('Karte A · 1'));
    await user.paste(Array.from({ length: 20 }, (_, i) => 'w' + i + '\tx' + i).join('\n'));
    expect(screen.getAllByLabelText(/^Karte A · /)).toHaveLength(16);
    expect((screen.getByRole('button', { name: /Paar hinzufügen/ }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('reveals the optional group field on demand', async () => {
    const user = await create();
    expect(screen.queryByPlaceholderText('Gruppe')).toBeNull();
    await user.click(screen.getByRole('button', { name: /\+ Gruppe: Paare 1/ }));
    expect(screen.getByPlaceholderText('Gruppe')).toBeTruthy();
  });
});
