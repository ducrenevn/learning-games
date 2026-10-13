// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import { App, appRoutes } from '../src/app/App';
import { MemoryHome } from '../src/games/memory/MemoryHome';
import { fromMemoryPairs } from '../src/games/memory/activity';
import { saveRoomIdentity } from '../src/shared/classroom/identity';
import { chooseLocale, importActivity, renderPage } from './helpers/dom';

// The real memoryRpc client runs against a fake Supabase rpc, so argument names and the policy check are exercised.
const rpcMock = vi.hoisted(() => vi.fn());
vi.mock('../src/shared/lib/supabase', () => ({ getSupabase: () => ({ rpc: rpcMock }) }));

type Handler = (args: Record<string, unknown>) => unknown;
/** Serves each RPC by name. A handler that throws becomes a Supabase-style error response. */
function serve(handlers: Record<string, Handler>) {
  rpcMock.mockImplementation(async (name: string, args: Record<string, unknown>) => {
    const handler = handlers[name];
    if (!handler) return { data: null, error: { message: 'unexpected rpc ' + name } };
    try { return { data: handler(args), error: null }; }
    catch (e) { return { data: null, error: { message: (e as Error).message } }; }
  });
}
const callsTo = (name: string) => rpcMock.mock.calls.filter(([called]) => called === name);
const TOKEN = 'c'.repeat(64);

function roomState(overrides: Record<string, unknown> = {}) {
  return {
    roomCode: 'AB12CD', title: 'Wortschatz', status: 'lobby', revision: 1, isHost: false,
    myPlayerId: 'p1', players: [{ id: 'p1', name: 'Ann', score: 0 }], currentPlayerId: null,
    cards: [], phase: 'lobby', lastMatch: null, canFlip: false, expiresAt: '2026-10-14T00:00:00Z',
    roomLanguage: 'de', allowStudentLanguageChoice: false, ...overrides,
  };
}

function mountAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const user = userEvent.setup();
  return { user, router, ...render(<App router={router} />) };
}

beforeEach(() => {
  rpcMock.mockReset();
  sessionStorage.clear();
});
afterEach(() => cleanup());

describe('Memory room creation: explicit teacher configuration', () => {
  it('creates a one-language room in the selected interface language with the M3a v2 arguments', async () => {
    serve({ game_poc_memory_create_v2: () => ({ roomCode: 'ZZ99XY', hostToken: 'b'.repeat(64) }) });
    const sample = fromMemoryPairs([{ left: 'Haus', right: 'house' }, { left: 'Tür', right: 'door' }], 'Wortschatz');
    const { user } = renderPage(<MemoryHome />);
    await importActivity(user, sample);
    await user.click(screen.getByRole('button', { name: /Online-Raum erstellen/ }));
    expect(screen.getByRole('dialog', { name: 'Online-Raum erstellen' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Raum erstellen' }));

    expect(callsTo('game_poc_memory_create')).toHaveLength(0);
    expect(callsTo('game_poc_memory_create_v2')).toHaveLength(1);
    expect(callsTo('game_poc_memory_create_v2')[0][1]).toEqual({
      p_title: 'Wortschatz',
      p_pairs: [{ left: 'Haus', right: 'house' }, { left: 'Tür', right: 'door' }],
      p_language: 'de',
      p_allow_student_language_choice: false,
    });
    expect(JSON.parse(sessionStorage.getItem('learning-games:memory:ZZ99XY') ?? '{}').role).toBe('host');
  });

  it('sends the teacher-selected language and the student-choice setting', async () => {
    serve({ game_poc_memory_create_v2: () => ({ roomCode: 'ZZ99XY', hostToken: 'b'.repeat(64) }) });
    const sample = fromMemoryPairs([{ left: 'Haus', right: 'house' }, { left: 'Tür', right: 'door' }], 'Wortschatz');
    const { user } = renderPage(<MemoryHome />);
    await importActivity(user, sample);
    await chooseLocale(user, 'vi');
    await user.click(screen.getByRole('button', { name: 'Tạo phòng trực tuyến' }));
    await user.click(screen.getByRole('radio', { name: /Người tham gia tự chọn ngôn ngữ/ }));
    await user.click(screen.getByRole('button', { name: 'Tạo phòng' }));

    await waitFor(() => expect(callsTo('game_poc_memory_create_v2')).toHaveLength(1));
    expect(callsTo('game_poc_memory_create_v2')[0][1]).toMatchObject({
      p_language: 'vi', p_allow_student_language_choice: true,
    });
  });

  it('cancelling creates no room and leaves the editor content untouched', async () => {
    serve({ game_poc_memory_create_v2: () => ({ roomCode: 'ZZ99XY', hostToken: 'b'.repeat(64) }) });
    const sample = fromMemoryPairs([{ left: 'Haus', right: 'house' }, { left: 'Tür', right: 'door' }], 'Wortschatz');
    const { user } = renderPage(<MemoryHome />);
    await importActivity(user, sample);
    await user.click(screen.getByRole('button', { name: /Online-Raum erstellen/ }));
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(rpcMock).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Wortschatz')).toBeTruthy();
    expect(screen.getByDisplayValue('Haus')).toBeTruthy();
  });
});

describe('Memory room language policy on the student side', () => {
  it('forces the room language on a student who had selected German, with no override offered', async () => {
    serve({ game_poc_memory_state: () => roomState({ roomLanguage: 'vi', allowStudentLanguageChoice: false }) });
    saveRoomIdentity({ roomCode: 'AB12CD', token: TOKEN, role: 'student' });
    const { user, router } = mountAt('/games/memory/join');
    await user.click(screen.getByRole('button', { name: 'English' }));
    await user.click(screen.getByRole('button', { name: 'Deutsch' }));
    await act(async () => { await router.navigate('/games/memory/room/AB12CD'); });

    expect(await screen.findByRole('heading', { name: 'Đang đợi trò chơi bắt đầu …' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Deutsch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'English' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tiếng Việt' })).toBeNull();
    expect(screen.queryByRole('group', { name: /Ngôn ngữ|Sprache|Language/ })).toBeNull();
  });

  it('lets two participants keep different interface languages in one student-choice room', async () => {
    serve({ game_poc_memory_state: () => roomState({ roomLanguage: 'de', allowStudentLanguageChoice: true }) });
    const user = userEvent.setup();

    function mountParticipant(token: string) {
      saveRoomIdentity({ roomCode: 'AB12CD', token, role: 'student' });
      const container = document.body.appendChild(document.createElement('div'));
      const router = createMemoryRouter(appRoutes, { initialEntries: ['/games/memory/room/AB12CD'] });
      render(<App router={router} />, { container });
      return within(container);
    }
    const ann = mountParticipant('d'.repeat(64));
    expect(await ann.findByRole('heading', { name: 'Warten auf den Start …' })).toBeTruthy();
    const ben = mountParticipant('e'.repeat(64));
    expect(await ben.findByRole('heading', { name: 'Warten auf den Start …' })).toBeTruthy();

    await user.click(ann.getByRole('button', { name: 'English' }));
    await user.click(ben.getByRole('button', { name: 'Tiếng Việt' }));

    expect(await ann.findByRole('heading', { name: 'Waiting for the game to start …' })).toBeTruthy();
    expect(await ben.findByRole('heading', { name: 'Đang đợi trò chơi bắt đầu …' })).toBeTruthy();
  });

  it('does not undo a student choice when polling or a focus refresh returns the same room policy', async () => {
    serve({ game_poc_memory_state: () => roomState({ roomLanguage: 'de', allowStudentLanguageChoice: true }) });
    saveRoomIdentity({ roomCode: 'AB12CD', token: TOKEN, role: 'student' });
    const { user } = mountAt('/games/memory/room/AB12CD');
    expect(await screen.findByRole('heading', { name: 'Warten auf den Start …' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'Waiting for the game to start …' })).toBeTruthy();

    const before = callsTo('game_poc_memory_state').length;
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    await waitFor(() => expect(callsTo('game_poc_memory_state').length).toBeGreaterThan(before));
    expect(screen.getByRole('heading', { name: 'Waiting for the game to start …' })).toBeTruthy();
  });

  it.each([
    ['missing field', () => { const { allowStudentLanguageChoice: _omitted, ...rest } = roomState(); return rest; }],
    ['malformed language', () => roomState({ roomLanguage: 'xx' })],
    ['non-boolean choice', () => roomState({ allowStudentLanguageChoice: 'true' })],
  ])('fails visibly with a %s policy instead of falling back to browser language', async (_label, state) => {
    serve({ game_poc_memory_state: state });
    saveRoomIdentity({ roomCode: 'AB12CD', token: TOKEN, role: 'student' });
    mountAt('/games/memory/room/AB12CD');

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Die Spracheinstellung des Raums konnte nicht geladen werden.');
    expect(screen.getByRole('heading', { name: 'Verbinde mit Raum AB12CD …' })).toBeTruthy();
    expect(screen.queryByText('Teilnehmende (1)')).toBeNull();
  });
});

describe('Memory online room: localization and safe errors', () => {
  it.each([
    ['de', 'Raum beitreten', 'Warten auf den Start …', 'Mit der Gruppe teilen'],
    ['en', 'Join room', 'Waiting for the game to start …', 'Share with the group'],
    ['vi', 'Vào phòng', 'Đang đợi trò chơi bắt đầu …', 'Chia sẻ với nhóm'],
  ] as const)('shows the %s join, lobby and host share text', async (locale, joinTitle, waiting, shareTitle) => {
    serve({ game_poc_memory_state: () => roomState({ roomLanguage: locale, allowStudentLanguageChoice: false }) });
    saveRoomIdentity({ roomCode: 'AB12CD', token: TOKEN, role: 'student' });
    const { user, router } = mountAt('/games/memory/join');
    await chooseLocale(user, locale);
    expect(screen.getByRole('heading', { name: joinTitle })).toBeTruthy();

    await act(async () => { await router.navigate('/games/memory/room/AB12CD'); });
    expect(await screen.findByRole('heading', { name: waiting })).toBeTruthy();

    cleanup();
    saveRoomIdentity({ roomCode: 'AB12CD', token: 'f'.repeat(64), role: 'host' });
    mountAt('/games/memory/room/AB12CD');
    expect(await screen.findByRole('heading', { name: shareTitle })).toBeTruthy();
  });

  it('localizes join validation and never shows a raw backend message', async () => {
    serve({ game_poc_memory_join: () => { throw new Error('PostgREST: relation "private" does not exist'); } });
    const { user } = mountAt('/games/memory/join');
    await chooseLocale(user, 'en');
    await user.type(screen.getByRole('textbox', { name: 'Room code' }), 'AB');
    await user.type(screen.getByRole('textbox', { name: 'Your name' }), 'Ann');
    await user.click(screen.getByRole('button', { name: 'Join room' }));
    expect(await screen.findByText('Enter a six-character room code.')).toBeTruthy();
    expect(callsTo('game_poc_memory_join')).toHaveLength(0);

    await user.type(screen.getByRole('textbox', { name: 'Room code' }), 'CDEF');
    await user.click(screen.getByRole('button', { name: 'Join room' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Could not join the room.');
    expect(document.body.textContent).not.toMatch(/PostgREST|relation/);
  });

  it('maps a known room-unavailable response to its localized sentence', async () => {
    serve({ game_poc_memory_join: () => { throw new Error('Room unavailable or game already started.'); } });
    const { user } = mountAt('/games/memory/join?room=AB12CD');
    await chooseLocale(user, 'en');
    await user.type(screen.getByRole('textbox', { name: 'Your name' }), 'Ann');
    await user.click(screen.getByRole('button', { name: 'Join room' }));
    expect(await screen.findByText('Room unavailable or the game has already started.')).toBeTruthy();
  });
});

describe('Memory online room: gameplay regression', () => {
  it('flips only on the student\'s own turn, with the current revision', async () => {
    const activeFields = { status: 'active', phase: 'first', revision: 3, myPlayerId: 'p1', currentPlayerId: 'p1', canFlip: true };
    const cards = [1, 2, 3, 4].map(id => ({ id, visible: false, matched: false, value: null }));
    serve({
      game_poc_memory_state: () => roomState({ ...activeFields, cards }),
      game_poc_memory_flip: () => roomState({
        ...activeFields, revision: 4, phase: 'second',
        cards: cards.map(card => card.id === 1 ? { ...card, visible: true, value: 'Haus' } : card),
      }),
    });
    saveRoomIdentity({ roomCode: 'AB12CD', token: TOKEN, role: 'student' });
    const { user } = mountAt('/games/memory/room/AB12CD');
    await user.click(await screen.findByRole('button', { name: 'Verdeckte Karte 1' }));

    await waitFor(() => expect(callsTo('game_poc_memory_flip')).toHaveLength(1));
    expect(callsTo('game_poc_memory_flip')[0][1]).toMatchObject({ p_card_id: 1, p_expected_revision: 3, p_player_token: TOKEN });
  });

  it('does not flip when another player holds the turn', async () => {
    const otherTurn = roomState({
      status: 'active', phase: 'first', revision: 3, myPlayerId: 'p1', currentPlayerId: 'p2', canFlip: true,
      cards: [1, 2].map(id => ({ id, visible: false, matched: false, value: null })),
    });
    serve({ game_poc_memory_state: () => otherTurn });
    saveRoomIdentity({ roomCode: 'AB12CD', token: TOKEN, role: 'student' });
    const { user } = mountAt('/games/memory/room/AB12CD');
    await user.click(await screen.findByRole('button', { name: 'Verdeckte Karte 1' }));
    expect(callsTo('game_poc_memory_flip')).toHaveLength(0);
  });

  it('accepts a mutation response without policy fields, reusing the validated policy', async () => {
    const active = roomState({
      status: 'active', phase: 'first', revision: 3, myPlayerId: 'p1', currentPlayerId: 'p1', canFlip: true,
      roomLanguage: 'vi', allowStudentLanguageChoice: false,
      cards: [1, 2].map(id => ({ id, visible: false, matched: false, value: null })),
    });
    const { roomLanguage: _l, allowStudentLanguageChoice: _a, ...legacy } = active;
    serve({
      game_poc_memory_state: () => active,
      game_poc_memory_flip: () => ({ ...legacy, revision: 4, phase: 'second' }),
    });
    saveRoomIdentity({ roomCode: 'AB12CD', token: TOKEN, role: 'student' });
    const { user } = mountAt('/games/memory/room/AB12CD');
    await user.click(await screen.findByRole('button', { name: /Thẻ úp 1|Verdeckte Karte 1/ }));
    await waitFor(() => expect(callsTo('game_poc_memory_flip')).toHaveLength(1));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Đã tìm được: 0 / 1 cặp')).toBeTruthy();
  });

  it('shows the localized result, including a tie with scores', async () => {
    serve({ game_poc_memory_state: () => roomState({ status: 'finished', phase: 'finished', roomLanguage: 'en', players: [{ id: 'p1', name: 'Ann', score: 2 }, { id: 'p2', name: 'Ben', score: 2 }] }) });
    saveRoomIdentity({ roomCode: 'AB12CD', token: TOKEN, role: 'student' });
    mountAt('/games/memory/room/AB12CD');
    expect(await screen.findByRole('heading', { name: 'Game over!' })).toBeTruthy();
    expect(screen.getByText('Tie: Ann, Ben')).toBeTruthy();
    expect(screen.getAllByText('2 points')).toHaveLength(2);
  });
});
