// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';
import { App, appRoutes } from '../src/app/App';
import { loadSortRoomIdentity, saveSortRoomIdentity } from '../src/games/sort/online/identity';
import { sortRoomText } from '../src/games/sort/online/sortRoomCopy';

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
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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

describe('Sort host leave confirmation', () => {
  it.each(['lobby', 'active', 'review'] as const)('preserves the %s session and its controls when cancelled', async roomStatus => {
    const identity = { roomCode, token, role: 'host' as const };
    saveSortRoomIdentity(identity);
    serve(hostState(roomStatus));
    mountAt('/games/sort/room/' + roomCode);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const leave = await screen.findByRole('button', { name: 'Raum verlassen' });
    const before = sessionStorage.getItem('learning-games:sort:' + roomCode);
    const controls = leave.closest('.action-group')!.textContent;
    rpcMock.mockClear();

    fireEvent.click(leave);

    expect(confirm).toHaveBeenCalledExactlyOnceWith(sortRoomText('de', 'leaveHostWarning'));
    expect(loadSortRoomIdentity(roomCode)).toEqual(identity);
    expect(sessionStorage.getItem('learning-games:sort:' + roomCode)).toBe(before);
    expect(leave.isConnected).toBe(true);
    expect(leave.closest('.action-group')!.textContent).toBe(controls);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each([
    ['de', 'Raum verlassen', 'Du verlierst die Kontrolle'],
    ['en', 'Leave room', 'You will lose control'],
    ['vi', 'Rời phòng', 'Bạn sẽ mất quyền điều khiển'],
  ] as const)('discards the host credential only after confirmation in %s', async (locale, label, warning) => {
    saveSortRoomIdentity({ roomCode, token, role: 'host' });
    serve({ ...hostState('active'), roomLanguage: locale });
    mountAt('/games/sort/room/' + roomCode);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    // jsdom reports the existing full-page navigation as unsupported.
    const leave = await screen.findByRole('button', { name: label });
    rpcMock.mockClear();

    fireEvent.click(leave);

    expect(confirm).toHaveBeenCalledExactlyOnceWith(sortRoomText(locale, 'leaveHostWarning'));
    expect(confirm.mock.calls[0][0]).toContain(warning);
    expect(loadSortRoomIdentity(roomCode)).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it.each(['host', 'student'] as const)('preserves the existing exit for a finished host or an active student (%s)', async role => {
    saveSortRoomIdentity({ roomCode, token, role });
    serve(role === 'host' ? hostState('finished') : studentState(false, 'de'));
    mountAt('/games/sort/room/' + roomCode);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Raum verlassen' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(loadSortRoomIdentity(roomCode)).toBeNull();
  });
});
