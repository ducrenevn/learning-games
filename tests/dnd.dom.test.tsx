// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { SortPage } from '../src/games/sort/SortPage';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { dropTarget } from '../src/games/sort/SortPlayer';
import { importActivity, renderPage } from './helpers/dom';
import { sequenceFixture, sortFixture } from './helpers/fixtures';

async function play(user: UserEvent, data: unknown) {
  await importActivity(user, data);
  await waitFor(() => expect(screen.getByLabelText('Titel')).toBeTruthy());
  await user.click(screen.getByRole('button', { name: 'Ausprobieren' }));
}

describe('drag-and-drop is a pointer enhancement, not a requirement', () => {
  it('maps drop targets to categories, the bank, or nothing', () => {
    const ids = ['der', 'die'];
    expect(dropTarget('bin:die', ids)).toBe('die');
    expect(dropTarget('bank', ids)).toBeNull();
    expect(dropTarget('bin:nope', ids)).toBeUndefined();
    expect(dropTarget('card-1', ids)).toBeUndefined();
    expect(dropTarget(undefined, ids)).toBeUndefined();
  });
  it('adds no dnd-kit roles, instructions or live regions to the Sort player (keyboard/screen-reader path is unchanged)', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, sortFixture());
    const html = document.querySelector('.activity-play')!.innerHTML;
    expect(html).not.toMatch(/aria-roledescription|aria-describedby="DndDescribedBy|draggable/i);
    expect(document.querySelectorAll('.sort-chip[role]')).toHaveLength(0);
    expect(document.querySelector('[id^="DndLiveRegion"]')?.textContent ?? '').toBe('');
  });
  it('names dragging in the information popover next to tap-to-place', async () => {
    const { user } = renderPage(<SortPage />);
    await play(user, sortFixture());
    await user.click(screen.getByRole('button', { name: 'Bedienungshinweis' }));
    const note = screen.getByRole('note').textContent!;
    expect(note).toMatch(/antippen/);
    expect(note).toMatch(/ziehen/);
  });
  it('shows a pointer-only grip on every Sequence row that is not a tab stop or a button', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user, sequenceFixture());
    const grips = document.querySelectorAll('.sequence-card .seq-grip');
    expect(grips).toHaveLength(4);
    for (const grip of grips) {
      expect(grip.getAttribute('aria-hidden')).toBe('true');
      expect(grip.tagName).toBe('SPAN');
      expect(grip.hasAttribute('tabindex')).toBe(false);
    }
    // The labelled up/down buttons remain the complete keyboard path.
    expect(screen.getAllByRole('button', { name: /^Nach (oben|unten):/ })).toHaveLength(8);
  });
  it('removes the Sequence grips once the order is checked (nothing can move any more)', async () => {
    const { user } = renderPage(<SequencePage />);
    await play(user, sequenceFixture());
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(document.querySelectorAll('.sequence-card .seq-grip')).toHaveLength(0);
  });
  it('offers grips in both authoring canvases without adding tab stops', async () => {
    const seq = renderPage(<SequencePage />);
    await importActivity(seq.user, sequenceFixture());
    expect(document.querySelectorAll('.seq-edit .seq-grip')).toHaveLength(4);
    seq.unmount();
    const sort = renderPage(<SortPage />);
    await importActivity(sort.user, sortFixture());
    expect(document.querySelectorAll('.card-edit .seq-grip')).toHaveLength(4);
    expect(within(document.querySelector('.sort-author')!).queryAllByRole('button', { name: /ziehen|drag/i })).toHaveLength(0);
  });
});
