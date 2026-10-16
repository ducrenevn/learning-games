// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HintPopover } from '../src/shared/activities/HintPopover';

interface Box { top: number; bottom: number; left: number; right: number; width: number; height: number }
const box = (top: number, left: number, width: number, height: number): Box => ({ top, bottom: top + height, left, right: left + width, width, height });

/** jsdom has no layout, so the icon, the note and the viewport are given explicit geometry. */
function mockLayout(icon: Box, viewport = { width: 390, height: 844 }) {
  Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: viewport.width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewport.height });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('hint-trigger')) return icon as DOMRect;
    if (this.classList.contains('hint-body')) return box(0, 0, 300, 69) as DOMRect;
    return box(0, 0, 0, 0) as DOMRect;
  });
}

async function openNote(icon: Box, viewport?: { width: number; height: number }) {
  mockLayout(icon, viewport);
  const user = userEvent.setup();
  render(<HintPopover label="Bedienungshinweis">Karten antippen oder in das passende Feld ziehen.</HintPopover>);
  await user.click(screen.getByRole('button', { name: 'Bedienungshinweis' }));
  const note = await screen.findByRole('note');
  await waitFor(() => expect(note.style.visibility).not.toBe('hidden'));
  return { user, note };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('HintPopover placement', () => {
  it('opens above the icon, right-aligned to it, with a gap', async () => {
    const { note } = await openNote(box(300, 330, 40, 40));
    expect(note.dataset.placement).toBe('above');
    expect(note.style.top).toBe('223px'); // 300 - 8 gap - 69 note height
    expect(note.style.left).toBe('70px'); // icon right 370 - note width 300
  });

  it('flips below the icon when there is no room above', async () => {
    const { note } = await openNote(box(40, 330, 40, 40));
    expect(note.dataset.placement).toBe('below');
    expect(note.style.top).toBe('88px'); // icon bottom 80 + 8 gap
  });

  it('stays inside the viewport on a narrow screen, on both edges', async () => {
    const left = await openNote(box(300, 0, 40, 40), { width: 360, height: 740 });
    expect(left.note.style.left).toBe('10px');
    cleanup();
    const right = await openNote(box(300, 320, 40, 40), { width: 360, height: 740 });
    expect(right.note.style.left).toBe('50px'); // 360 - 300 - 10 edge margin
  });

  it('closes on an outside tap and reopens on the icon', async () => {
    const { user } = await openNote(box(300, 330, 40, 40));
    await user.click(document.body);
    expect(screen.queryByRole('note')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Bedienungshinweis' }));
    expect(await screen.findByRole('note')).toBeTruthy();
  });
});
