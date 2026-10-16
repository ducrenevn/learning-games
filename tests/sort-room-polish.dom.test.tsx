// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';
import { App, appRoutes } from '../src/app/App';
import { saveSortRoomIdentity } from '../src/games/sort/online/identity';

const rpcMock = vi.hoisted(() => vi.fn());
vi.mock('../src/shared/lib/supabase', () => ({ getSupabase: () => ({ rpc: rpcMock }) }));

const roomCode = 'ROOMPOLI';
const token = 'c'.repeat(64);
const catHandle1 = 'a'.repeat(32);
const catHandle2 = 'b'.repeat(32);
const itemHandle1 = '1'.repeat(32);
const itemHandle2 = '2'.repeat(32);

function studentState(allowStudentLanguageChoice: boolean, roomLanguage: string) {
  return {
    game: 'sort', mode: 'individual', roomRevision: 1, roomStatus: 'active',
    roomLanguage, allowStudentLanguageChoice, attemptRevision: 1, resultsRevealed: false,
    studentView: {
      categories: [{ handle: catHandle1, label: 'der' }, { handle: catHandle2, label: 'die' }],
      items: [{ handle: itemHandle1, text: 'Tisch' }, { handle: itemHandle2, text: 'Lampe' }],
    },
    placements: {}, submission: null, result: null,
  };
}

function hostState(roomStatus: 'lobby' | 'active' | 'review' | 'finished') {
  const revealed = roomStatus === 'finished';
  const scored = roomStatus === 'review' || roomStatus === 'finished';
  return {
    game: 'sort', mode: 'individual', roomRevision: 1, roomStatus,
    roomLanguage: 'de', allowStudentLanguageChoice: false, resultsRevealed: revealed,
    hostView: {
      status: roomStatus, resultsRevealed: revealed, studentCount: 1,
      participants: [{
        participantId: 'student-1', displayName: 'Linh', role: 'student', status: 'active',
        completionStatus: scored ? 'submitted' : 'in_progress',
        ...(scored ? { score: { evaluator: 'scoreSort', correct: 2, total: 2, complete: true } } : {}),
      }],
      answerReference: scored ? { [itemHandle1]: catHandle1, [itemHandle2]: catHandle2 } : null,
    },
  };
}

function serve(state: unknown) {
  rpcMock.mockImplementation(async (name: string) => (
    name === 'lg_v1_state' ? { data: state, error: null } : { data: null, error: { message: 'unexpected rpc ' + name } }
  ));
}

function mountAt(path: string, state?: unknown) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: state !== undefined ? [{ pathname: path, state }] : [path],
  });
  return render(<App router={router} />);
}

beforeEach(() => {
  rpcMock.mockReset();
  sessionStorage.clear();
});
afterEach(() => cleanup());

describe('Sort room language selector label', () => {
  it.each([
    ['de', 'Sprache'],
    ['en', 'Language'],
    ['vi', 'Ngôn ngữ'],
  ] as const)('labels the choice in %s, not with the category word', async (studentLocale, label) => {
    saveSortRoomIdentity({ roomCode, token, role: 'student' });
    serve(studentState(true, 'de'));
    mountAt('/games/sort/room/' + roomCode, { studentLocale });

    await waitFor(() => expect(screen.getByText('Tisch')).toBeTruthy());
    const bar = document.querySelector('.room-language-bar');
    expect(bar?.querySelector('span')?.textContent).toBe(label);
    expect(bar?.textContent).not.toMatch(/Kategorie|Category|Nhóm/);
    // The accessible flag group is unchanged.
    expect(screen.getByRole('group', { name: /Sprache|Language|Ngôn ngữ/ })).toBeTruthy();
  });
});

describe('Sort teacher action groups', () => {
  it.each([
    ['lobby', 'Runde starten'],
    ['active', 'Abgabe schließen'],
    ['review', 'Ergebnisse zeigen'],
    ['finished', null],
  ] as const)('keeps the %s actions in one spaced group, with leave last', async (roomStatus, primary) => {
    saveSortRoomIdentity({ roomCode, token, role: 'host' });
    serve(hostState(roomStatus));
    mountAt('/games/sort/room/' + roomCode);

    const leave = await screen.findByRole('button', { name: 'Raum verlassen' });
    const group = leave.closest('.action-group');
    expect(group).not.toBeNull();
    const buttons = Array.from(group!.querySelectorAll('button'));
    expect(buttons[buttons.length - 1]).toBe(leave);
    if (primary) {
      expect(buttons[0].textContent).toBe(primary);
      expect(buttons[0].className).toContain('stretch');
      expect(buttons).toHaveLength(2);
    } else {
      expect(buttons).toHaveLength(1);
    }
    expect(leave.className).toContain('subtle');
    expect(leave.className).not.toContain('stretch');
  });
});
