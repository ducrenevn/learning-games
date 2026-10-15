// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import { App, appRoutes } from '../src/app/App';
import { SortPage } from '../src/games/sort/SortPage';
import { saveSortRoomIdentity } from '../src/games/sort/online/identity';
import { importActivity, renderPage } from './helpers/dom';
import sortFixture from './fixtures/wave-f/corpus/valid/sort/01-artikel-im-alltag.json';

const rpcMock = vi.hoisted(() => vi.fn());
vi.mock('../src/shared/lib/supabase', () => ({ getSupabase: () => ({ rpc: rpcMock }) }));

type Handler = (args: Record<string, unknown>) => unknown;
function serve(handlers: Record<string, Handler>) {
  rpcMock.mockImplementation(async (name: string, args: Record<string, unknown>) => {
    const handler = handlers[name];
    if (!handler) return { data: null, error: { message: 'unexpected rpc ' + name } };
    try { return { data: handler(args), error: null }; }
    catch (e) { return { data: null, error: { message: (e as Error).message } }; }
  });
}

const itemHandle1 = '1'.repeat(32);
const itemHandle2 = '2'.repeat(32);
const itemHandle3 = '3'.repeat(32);
const catHandle1 = 'a'.repeat(32);
const catHandle2 = 'b'.repeat(32);
const catHandle3 = 'c'.repeat(32);

function mockStudentState(overrides: Record<string, unknown> = {}) {
  return {
    game: 'sort', mode: 'individual', roomRevision: 1, roomStatus: 'active',
    roomLanguage: 'de', allowStudentLanguageChoice: false, attemptRevision: 1,
    resultsRevealed: false,
    studentView: {
      categories: [
        { handle: catHandle1, label: 'der' },
        { handle: catHandle2, label: 'die' },
        { handle: catHandle3, label: 'das' },
      ],
      items: [
        { handle: itemHandle1, text: 'Tisch' },
        { handle: itemHandle2, text: 'Lampe' },
        { handle: itemHandle3, text: 'Fenster' },
      ],
    },
    placements: {} as Record<string, string>,
    submission: null as { status: 'submitted' | 'closed_unsubmitted'; submittedAt: string | null } | null,
    result: null as { score: { evaluator: string; correct: number; total: number; complete: boolean } | null; answerFeedback: Record<string, string> } | null,
    ...overrides,
  };
}

function mockHostState(overrides: Record<string, unknown> = {}) {
  return {
    game: 'sort', mode: 'individual', roomRevision: 1, roomStatus: 'lobby',
    roomLanguage: 'de', allowStudentLanguageChoice: false,
    resultsRevealed: false,
    hostView: {
      status: 'lobby',
      resultsRevealed: false,
      studentCount: 1,
      participants: [
        {
          participantId: 'student-1-uuid',
          displayName: 'Linh',
          role: 'student',
          status: 'active',
          completionStatus: 'in_progress',
        },
      ],
      answerReference: null,
    },
    ...overrides,
  };
}

function mountAt(path: string, state?: unknown) {
  const router = createMemoryRouter(appRoutes, {
    initialEntries: state !== undefined ? [{ pathname: path, state }] : [path],
  });
  const user = userEvent.setup();
  return { user, router, ...render(<App router={router} />) };
}

beforeEach(() => {
  rpcMock.mockReset();
  sessionStorage.clear();
});
afterEach(() => cleanup());

describe('Sort room creation: explicit teacher configuration', () => {
  it('opens room setup dialog and creates room with lg_v1_create', async () => {
    serve({
      lg_v1_create: args => {
        expect(args.p_game).toBe('sort');
        expect(args.p_mode).toBe('individual');
        expect(args.p_room_language).toBe('de');
        expect(args.p_allow_student_language_choice).toBe(false);
        return { roomCode: 'SORTROOM', roomRevision: 1, roomLanguage: 'de', allowStudentLanguageChoice: false, roomStatus: 'lobby' };
      },
    });

    const { user } = renderPage(<SortPage />);
    await importActivity(user, sortFixture);

    const createBtn = screen.getByRole('button', { name: /Online-Raum/i });
    await user.click(createBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();

    const confirmBtn = within(dialog).getByRole('button', { name: 'Raum erstellen' });
    await user.click(confirmBtn);

    await waitFor(() => {
      const stored = sessionStorage.getItem('learning-games:sort:SORTROOM');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.role).toBe('host');
      expect(parsed.roomCode).toBe('SORTROOM');
    });
  });

  it('prompts about unsaved edits before calling the create RPC', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    serve({ lg_v1_create: () => ({ roomCode: 'SORTROOM', roomRevision: 1 }) });

    const { user } = renderPage(<SortPage />);
    await importActivity(user, sortFixture);

    const titleInput = screen.getByLabelText(/Titel/i);
    await user.type(titleInput, ' bearbeitet');

    const openRoomBtn = screen.getByRole('button', { name: /Online-Raum/i });
    await user.click(openRoomBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();

    const confirmBtn = within(dialog).getByRole('button', { name: 'Raum erstellen' });
    await user.click(confirmBtn);

    // Cancel prompt was declined
    expect(confirmSpy).toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    confirmSpy.mockRestore();
  });
});

describe('Sort room join flow', () => {
  it('validates 8-character uppercase room code and calls lg_v1_join', async () => {
    serve({
      lg_v1_join: args => {
        expect(args.p_room_code).toBe('ABCDEFGH');
        expect(args.p_display_name).toBe('Minh');
        return { roomCode: 'ABCDEFGH', participantId: 'p-1', roomRevision: 1, roomStatus: 'lobby' };
      },
    });

    const { user, router } = mountAt('/games/sort/join');

    const codeInput = screen.getByLabelText(/Raumcode/i);
    const nameInput = screen.getByLabelText(/Dein Name/i);

    // Test too-short code
    await user.type(codeInput, 'ABC');
    await user.type(nameInput, 'Minh');
    await user.click(screen.getByRole('button', { name: /Raum beitreten/i }));

    expect(screen.getByText(/Bitte gib einen 8-stelligen Raumcode ein/i)).toBeTruthy();

    // Type full 8 characters
    await user.clear(codeInput);
    await user.type(codeInput, 'abcdefgh'); // test auto-uppercase
    await user.click(screen.getByRole('button', { name: /Raum beitreten/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/games/sort/room/ABCDEFGH');
      const stored = sessionStorage.getItem('learning-games:sort:ABCDEFGH');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!).role).toBe('student');
    });
  });
});

describe('Sort room host controls', () => {
  const roomCode = 'ROOMHOST';
  const token = 'a'.repeat(64);

  it('shows participants in lobby and starts activity with room.start', async () => {
    saveSortRoomIdentity({ roomCode, token, role: 'host' });

    let currentState = mockHostState();
    serve({
      lg_v1_state: () => currentState,
      lg_v1_command: (args) => {
        expect(args.p_kind).toBe('room.start');
        currentState = mockHostState({
          roomStatus: 'active',
          hostView: { ...currentState.hostView, status: 'active' },
        });
        return { roomRevision: 2, status: 'ok' };
      },
    });

    const { user } = mountAt('/games/sort/room/' + roomCode);

    await waitFor(() => {
      expect(screen.getByText('Linh')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Aktivität starten/i })).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /Aktivität starten/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sortieren beenden/i })).toBeTruthy();
    });
  });

  it('allows teacher to close, reveal, and finish activity', async () => {
    saveSortRoomIdentity({ roomCode, token, role: 'host' });

    let currentState = mockHostState({
      roomStatus: 'active',
      hostView: {
        status: 'active',
        studentCount: 1,
        participants: [
          {
            participantId: 'student-1',
            displayName: 'Linh',
            role: 'student',
            status: 'active',
            completionStatus: 'submitted',
          },
        ],
        answerReference: null,
      },
    });

    serve({
      lg_v1_state: () => currentState,
      lg_v1_command: (args) => {
        if (args.p_kind === 'room.close') {
          // Real SQL contract: on close, status is 'review', answerReference IS populated, but resultsRevealed is FALSE
          currentState = mockHostState({
            roomRevision: 2,
            roomStatus: 'review',
            resultsRevealed: false,
            hostView: {
              ...currentState.hostView,
              status: 'review',
              resultsRevealed: false,
              answerReference: { [itemHandle1]: catHandle1 },
              participants: [
                {
                  ...currentState.hostView.participants[0],
                  score: { evaluator: 'scoreSort', correct: 3, total: 3, complete: true },
                },
              ],
            },
          });
          return { roomRevision: 2, status: 'ok' };
        }
        if (args.p_kind === 'room.reveal') {
          // Real SQL contract: reveal sets revealed_at, exposing resultsRevealed: true
          currentState = mockHostState({
            roomRevision: 3,
            roomStatus: 'review',
            resultsRevealed: true,
            hostView: {
              ...currentState.hostView,
              status: 'review',
              resultsRevealed: true,
              answerReference: { [itemHandle1]: catHandle1 },
              participants: [
                {
                  ...currentState.hostView.participants[0],
                  score: { evaluator: 'scoreSort', correct: 3, total: 3, complete: true },
                },
              ],
            },
          });
          return { roomRevision: 3, status: 'ok' };
        }
        if (args.p_kind === 'room.finish') {
          // Real SQL contract: finish BEFORE reveal raises ROOM_CLOSED
          if (!currentState.resultsRevealed) {
            throw new Error('ROOM_CLOSED');
          }
          currentState = mockHostState({
            roomRevision: 4,
            roomStatus: 'finished',
            resultsRevealed: true,
            hostView: {
              ...currentState.hostView,
              status: 'finished',
              resultsRevealed: true,
            },
          });
          return { roomRevision: 4, status: 'ok' };
        }
        throw new Error('unknown command ' + args.p_kind);
      },
    });

    const { user, unmount } = mountAt('/games/sort/room/' + roomCode);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sortieren beenden/i })).toBeTruthy();
    });

    // 1. Close: enters review phase
    await user.click(screen.getByRole('button', { name: /Sortieren beenden/i }));

    // In real SQL, answerReference is present, but resultsRevealed is FALSE.
    // Teacher MUST see "Ergebnisse freigeben" (Reveal results), and MUST NOT see "Aktivität abschließen" (Finish).
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ergebnisse freigeben/i })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Aktivität abschließen/i })).toBeNull();
    });

    // 2. Simulate teacher refresh/reconnection during unrevealed review
    unmount();
    const { user: userAfterRefresh1, unmount: unmount2 } = mountAt('/games/sort/room/' + roomCode);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Ergebnisse freigeben/i })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /Aktivität abschließen/i })).toBeNull();
    });

    // 3. Reveal: teacher clicks "Ergebnisse freigeben"
    await userAfterRefresh1.click(screen.getByRole('button', { name: /Ergebnisse freigeben/i }));

    // Now resultsRevealed is TRUE: teacher sees "Aktivität abschließen" and the score
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Aktivität abschließen/i })).toBeTruthy();
      expect(screen.getByText('3 / 3')).toBeTruthy();
    });

    // 4. Simulate teacher refresh/reconnection during revealed review
    unmount2();
    const { user: userAfterRefresh2 } = mountAt('/games/sort/room/' + roomCode);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Aktivität abschließen/i })).toBeTruthy();
      expect(screen.getByText('3 / 3')).toBeTruthy();
    });

    // 5. Finish activity
    await userAfterRefresh2.click(screen.getByRole('button', { name: /Aktivität abschließen/i }));

    await waitFor(() => {
      expect(screen.getByText(/Aktivität abgeschlossen/i)).toBeTruthy();
    });
  });
});

describe('Sort room student interactions', () => {
  const roomCode = 'ROOMSTUD';
  const token = 'b'.repeat(64);

  it('renders interactive sort board, saves placements via sort.place, and submits with sort.submit', async () => {
    saveSortRoomIdentity({ roomCode, token, role: 'student' });

    let currentState = mockStudentState();
    serve({
      lg_v1_state: () => currentState,
      lg_v1_command: (args) => {
        if (args.p_kind === 'sort.place') {
          const payload = args.p_payload as { itemHandle: string; categoryHandle: string | null };
          const nextPlacements = { ...currentState.placements };
          if (payload.categoryHandle === null) delete nextPlacements[payload.itemHandle];
          else nextPlacements[payload.itemHandle] = payload.categoryHandle;
          currentState = {
            ...currentState,
            attemptRevision: currentState.attemptRevision + 1,
            placements: nextPlacements,
          };
          return { roomRevision: 1, attemptRevision: currentState.attemptRevision, status: 'ok' };
        }
        if (args.p_kind === 'sort.submit') {
          currentState = {
            ...currentState,
            attemptRevision: currentState.attemptRevision + 1,
            submission: { status: 'submitted', submittedAt: '2026-10-15T00:00:00Z' },
          };
          return { roomRevision: 2, attemptRevision: currentState.attemptRevision, status: 'submitted' };
        }
        throw new Error('unknown command');
      },
    });

    const { user } = mountAt('/games/sort/room/' + roomCode);

    await waitFor(() => {
      expect(screen.getByText('Tisch')).toBeTruthy();
      expect(screen.getByText('Lampe')).toBeTruthy();
      expect(screen.getByText('Fenster')).toBeTruthy();
    });

    const submitBtn = screen.getByRole('button', { name: /Antworten abgeben/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    // Place Tisch into der (catHandle1)
    await user.click(screen.getByText('Tisch'));
    const derCategory = screen.getByRole('button', { name: /Kategorie: der/i });
    await user.click(derCategory);

    // Place Lampe into die (catHandle2)
    await user.click(screen.getByText('Lampe'));
    const dieCategory = screen.getByRole('button', { name: /Kategorie: die/i });
    await user.click(dieCategory);

    // Place Fenster into das (catHandle3)
    await user.click(screen.getByText('Fenster'));
    const dasCategory = screen.getByRole('button', { name: /Kategorie: das/i });
    await user.click(dasCategory);

    await waitFor(() => {
      expect(submitBtn.disabled).toBe(false);
    });

    // Submit
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Abgegeben! Bitte warten/i)).toBeTruthy();
    });
  });

  it('displays student own feedback and score after teacher reveal', async () => {
    saveSortRoomIdentity({ roomCode, token, role: 'student' });

    const revealedState = mockStudentState({
      roomStatus: 'review',
      placements: {
        [itemHandle1]: catHandle1, // right
        [itemHandle2]: catHandle1, // wrong (placed in der instead of die)
        [itemHandle3]: catHandle3, // right
      },
      submission: { status: 'submitted', submittedAt: '2026-10-15T00:00:00Z' },
      result: {
        score: { evaluator: 'scoreSort', correct: 2, total: 3, complete: true },
        answerFeedback: {
          [itemHandle1]: catHandle1,
          [itemHandle2]: catHandle2,
          [itemHandle3]: catHandle3,
        },
      },
    });

    serve({ lg_v1_state: () => revealedState });

    mountAt('/games/sort/room/' + roomCode);

    await waitFor(() => {
      expect(screen.getByText(/Ergebnis: 2 von 3 richtig/i)).toBeTruthy();
      expect(screen.getByRole('heading', { name: /Musterlösung/i })).toBeTruthy();
      // "die" appears in category bins and in the correction fix
      expect(screen.getAllByText('die').length).toBeGreaterThan(1);
    });
  });
});

describe('Sort room language policy and layout', () => {
  const roomCode = 'ROOMLANG';
  const token = 'c'.repeat(64);

  it('hides global flag toggle on Sort room route', async () => {
    saveSortRoomIdentity({ roomCode, token, role: 'student' });
    serve({ lg_v1_state: () => mockStudentState({ roomLanguage: 'de', allowStudentLanguageChoice: false }) });

    mountAt('/games/sort/room/' + roomCode);

    await waitFor(() => {
      expect(screen.getByText('Tisch')).toBeTruthy();
      // The header language switcher must not be present on room route
      const flags = screen.queryByLabelText('Sprache');
      expect(flags).toBeNull();
    });
  });

  it('carries student-chosen language into student-choice room', async () => {
    saveSortRoomIdentity({ roomCode, token, role: 'student' });
    serve({ lg_v1_state: () => mockStudentState({ roomLanguage: 'de', allowStudentLanguageChoice: true }) });

    // Joined with Vietnamese chosen locale
    mountAt('/games/sort/room/' + roomCode, { studentLocale: 'vi' });

    await waitFor(() => {
      // Vietnamese interface copy
      expect(screen.getByRole('button', { name: /Nộp bài/i })).toBeTruthy();
      expect(screen.getByText(/Rời phòng/i)).toBeTruthy();
    });
  });

  it('forces room language in single-language rooms even if student carried another locale', async () => {
    saveSortRoomIdentity({ roomCode, token, role: 'student' });
    serve({ lg_v1_state: () => mockStudentState({ roomLanguage: 'en', allowStudentLanguageChoice: false }) });

    // Joined with Vietnamese chosen locale, but room forces English
    mountAt('/games/sort/room/' + roomCode, { studentLocale: 'vi' });

    await waitFor(() => {
      // English interface copy
      expect(screen.getByRole('button', { name: /Submit answers/i })).toBeTruthy();
      expect(screen.getByText(/Leave room/i)).toBeTruthy();
    });
  });
});

