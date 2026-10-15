import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import type { Locale } from '../../../shared/activities/contract';
import { DragArea } from '../../../shared/activities/dnd';
import { HintPopover } from '../../../shared/activities/HintPopover';
import { RoomShare } from '../../../shared/classroom/RoomShare';
import { isRoomLanguage } from '../../../shared/classroom/roomLanguagePolicy';
import { useRoomInterfaceLocale } from '../../../shared/classroom/useRoomInterfaceLocale';
import { LanguageFlags, useLocale } from '../../../shared/locale/LocaleProvider';
import { clearSortRoomIdentity, loadSortRoomIdentity } from './identity';
import { sortRoomError, sortRoomText } from './sortRoomCopy';
import type { HostSortState, SortItemCard, SortRoomIdentity, StudentSortState } from './types';
import { useSortRoom } from './useSortRoom';

const BANK = 'bank';
const binId = (handle: string) => 'bin:' + handle;

function dropTarget(overId: string | number | undefined, categoryHandles: readonly string[]): string | null | undefined {
  if (overId === BANK) return null;
  if (typeof overId !== 'string' || !overId.startsWith('bin:')) return undefined;
  const id = overId.slice(4);
  return categoryHandles.includes(id) ? id : undefined;
}

interface ChipProps {
  item: SortItemCard;
  open: boolean;
  disabled: boolean;
  checked: boolean;
  revealed: boolean;
  right: boolean;
  placedIn?: string;
  correctLabel: string;
  correctWord: string;
  wrongWord: string;
  categoryWord: string;
  register: (handle: string, el: HTMLButtonElement | null) => void;
  onChoose: () => void;
}

function SortChip(p: ChipProps) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: p.item.handle, disabled: p.disabled });
  return <li className="sort-chip-item">
    <button
      type="button"
      ref={el => { setNodeRef(el); p.register(p.item.handle, el); }}
      className={'sort-card-choice sort-chip' + (p.open ? ' selected' : '') + (isDragging ? ' dragging' : '') + (p.checked ? (p.right ? ' good' : ' bad') : '')}
      disabled={p.disabled}
      aria-pressed={p.open}
      {...listeners}
      onClick={p.onChoose}
    >
      <strong>{p.item.text}</strong>
      {p.placedIn && <span className="sr-only">, {p.categoryWord}: {p.placedIn}</span>}
      {p.checked && <span className="activity-status"><span aria-hidden="true">{p.right ? '✓' : '✗'}</span> {p.right ? p.correctWord : p.wrongWord}</span>}
      {p.revealed && !p.right && p.correctLabel && <span className="chip-fix small"><span aria-hidden="true">→</span> <span>{p.correctLabel}</span></span>}
    </button>
  </li>;
}

interface TargetProps {
  id: string;
  className: string;
  labelledBy: string;
  onBackgroundClick: (target: EventTarget) => void;
  children: ReactNode;
}

function DropSection({ id, className, labelledBy, onBackgroundClick, children }: TargetProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <section ref={setNodeRef} className={className + (isOver ? ' over' : '')} aria-labelledby={labelledBy} onClick={event => onBackgroundClick(event.target)}>{children}</section>;
}

function studentLocaleFrom(state: unknown): Locale | null {
  const value = (state as { studentLocale?: unknown } | null)?.studentLocale;
  return isRoomLanguage(value) ? value : null;
}

function NoAccess({ roomCode }: { roomCode: string }) {
  const { locale } = useLocale();
  return <main className="page panel padded">
    <LanguageFlags />
    <h1>{sortRoomText(locale, 'noAccessTitle')}</h1>
    <p>{sortRoomText(locale, 'noAccessHint')}</p>
    <Link className="button primary" to={'/games/sort/join' + (roomCode ? '?room=' + roomCode : '')}>
      {sortRoomText(locale, 'joinSubmit')}
    </Link>
  </main>;
}

function RoomLanguageBar({ locale }: { locale: Locale }) {
  return <div className="room-language-bar">
    <span className="muted small">{sortRoomText(locale, 'category')}</span>
    <LanguageFlags />
  </div>;
}

export function SortRoom() {
  const { roomCode = '' } = useParams();
  const location = useLocation();
  const identity = useMemo(() => loadSortRoomIdentity(roomCode), [roomCode]);
  if (!identity) return <NoAccess roomCode={roomCode} />;
  return <ActiveSortRoom key={identity.roomCode + identity.role} identity={identity} studentLocale={studentLocaleFrom(location.state)} />;
}

function ActiveSortRoom({ identity, studentLocale }: { identity: SortRoomIdentity; studentLocale: Locale | null }) {
  const { state, busy, error, refresh, send } = useSortRoom(identity);
  const locale = useRoomInterfaceLocale(state?.roomLanguage ?? null, state?.allowStudentLanguageChoice ?? null, studentLocale);
  const isHost = identity.role === 'host';
  const roomCode = identity.roomCode;
  const errorText = error ? sortRoomError(locale, error) : null;
  const languageControl = state?.allowStudentLanguageChoice ? <RoomLanguageBar locale={locale} /> : null;

  function leave() {
    clearSortRoomIdentity(roomCode);
    window.location.assign('/games/sort');
  }

  if (!state) {
    return <main className="page panel padded">
      <h1>{sortRoomText(locale, 'connecting', { code: roomCode })}</h1>
      {errorText && <p role="alert" className="error">{errorText}</p>}
      <button className="button secondary" onClick={() => void refresh()}>{sortRoomText(locale, 'retry')}</button>
    </main>;
  }

  if (isHost && state.role === 'host') {
    return <HostRoomView
      state={state}
      roomCode={roomCode}
      locale={locale}
      busy={busy}
      errorText={errorText}
      languageControl={languageControl}
      send={send}
      leave={leave}
    />;
  }

  if (!isHost && state.role === 'student') {
    return <StudentRoomView
      state={state}
      roomCode={roomCode}
      locale={locale}
      busy={busy}
      errorText={errorText}
      languageControl={languageControl}
      send={send}
      leave={leave}
    />;
  }

  return null;
}

interface HostViewProps {
  state: HostSortState;
  roomCode: string;
  locale: Locale;
  busy: boolean;
  errorText: string | null;
  languageControl: ReactNode;
  send: (kind: string, payload?: Record<string, unknown>) => Promise<boolean>;
  leave: () => void;
}

function HostRoomView({ state, roomCode, locale, busy, errorText, languageControl, send, leave }: HostViewProps) {
  const view = state.hostView;
  const students = view.participants.filter(p => p.role === 'student');
  const submittedCount = students.filter(p => p.completionStatus === 'submitted').length;
  const isRevealed = view.answerReference !== null;

  if (state.roomStatus === 'lobby') {
    return <main className="page">
      {languageControl}
      <div className="intro">
        <div className="eyebrow">{sortRoomText(locale, 'eyebrow')}</div>
        <h1>{sortRoomText(locale, 'lobbyHost')}</h1>
        <p className="lead">{sortRoomText(locale, 'roomLabel')} <strong className="room-code">{roomCode}</strong></p>
      </div>
      <div className="setup-grid">
        <section className="panel padded">
          <h2>{sortRoomText(locale, 'participants', { n: students.length })}</h2>
          <div className="score-list">
            {students.map(p => (
              <div className="score-row" key={p.participantId}>
                <span>{p.displayName}</span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => void send('room.remove_participant', { participantId: p.participantId })}
                >
                  {sortRoomText(locale, 'removeStudent')}
                </button>
              </div>
            ))}
          </div>
          {!students.length && <p className="muted">{sortRoomText(locale, 'noPlayers')}</p>}
          <button
            className="button primary stretch"
            disabled={!students.length || busy}
            onClick={() => void send('room.start')}
          >
            {sortRoomText(locale, 'startGame')}
          </button>
          <button className="button subtle" onClick={leave}>{sortRoomText(locale, 'leaveRoom')}</button>
          {errorText && <p role="alert" className="error">{errorText}</p>}
        </section>
        <RoomShare roomCode={roomCode} locale={locale} joinPath="/games/sort/join" />
      </div>
    </main>;
  }

  if (state.roomStatus === 'active') {
    return <main className="page">
      {languageControl}
      <div className="intro">
        <div className="eyebrow">{sortRoomText(locale, 'eyebrow')}</div>
        <h1>{sortRoomText(locale, 'activityActiveTitle')}</h1>
        <p className="lead">{sortRoomText(locale, 'roomLabel')} <strong className="room-code">{roomCode}</strong></p>
        <p className="muted">{sortRoomText(locale, 'classSummary', { submitted: submittedCount, total: students.length })}</p>
      </div>
      <section className="panel padded" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2>{sortRoomText(locale, 'participants', { n: students.length })}</h2>
        <div className="score-list">
          {students.map(p => (
            <div className="score-row" key={p.participantId}>
              <span>{p.displayName}</span>
              <span className={'badge ' + (p.completionStatus === 'submitted' ? 'badge-good' : '')}>
                {p.completionStatus === 'submitted'
                  ? sortRoomText(locale, 'statusSubmitted')
                  : sortRoomText(locale, 'statusInProgress')}
              </span>
            </div>
          ))}
        </div>
        <button
          className="button primary stretch"
          disabled={busy}
          onClick={() => void send('room.close')}
        >
          {sortRoomText(locale, 'closeActivity')}
        </button>
        <button className="button subtle" onClick={leave}>{sortRoomText(locale, 'leaveRoom')}</button>
        {errorText && <p role="alert" className="error">{errorText}</p>}
      </section>
    </main>;
  }

  if (state.roomStatus === 'review') {
    return <main className="page">
      {languageControl}
      <div className="intro">
        <div className="eyebrow">{sortRoomText(locale, 'eyebrow')}</div>
        <h1>{sortRoomText(locale, 'activityReviewTitle')}</h1>
        <p className="lead">{sortRoomText(locale, 'roomLabel')} <strong className="room-code">{roomCode}</strong></p>
        <p className="muted">{sortRoomText(locale, 'classSummary', { submitted: submittedCount, total: students.length })}</p>
      </div>
      <section className="panel padded" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2>{sortRoomText(locale, 'participants', { n: students.length })}</h2>
        <div className="score-list">
          {students.map(p => (
            <div className="score-row" key={p.participantId}>
              <span>{p.displayName}</span>
              <span>
                {isRevealed && p.score
                  ? `${p.score.correct} / ${p.score.total}`
                  : (p.completionStatus === 'submitted'
                    ? sortRoomText(locale, 'statusSubmitted')
                    : sortRoomText(locale, 'statusClosedUnsubmitted'))}
              </span>
            </div>
          ))}
        </div>
        {!isRevealed ? (
          <button
            className="button primary stretch"
            disabled={busy}
            onClick={() => void send('room.reveal')}
          >
            {sortRoomText(locale, 'revealResults')}
          </button>
        ) : (
          <button
            className="button primary stretch"
            disabled={busy}
            onClick={() => void send('room.finish')}
          >
            {sortRoomText(locale, 'finishActivity')}
          </button>
        )}
        <button className="button subtle" onClick={leave}>{sortRoomText(locale, 'leaveRoom')}</button>
        {errorText && <p role="alert" className="error">{errorText}</p>}
      </section>
    </main>;
  }

  return <main className="page">
    {languageControl}
    <div className="intro">
      <div className="eyebrow">{sortRoomText(locale, 'eyebrow')}</div>
      <h1>{sortRoomText(locale, 'activityFinishedTitle')}</h1>
      <p className="lead">{sortRoomText(locale, 'roomLabel')} <strong className="room-code">{roomCode}</strong></p>
    </div>
    <section className="panel padded" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2>{sortRoomText(locale, 'resultsTitle')}</h2>
      <div className="score-list">
        {students.map(p => (
          <div className="score-row" key={p.participantId}>
            <span>{p.displayName}</span>
            <strong>{p.score ? `${p.score.correct} / ${p.score.total}` : '-'}</strong>
          </div>
        ))}
      </div>
      <button className="button subtle" onClick={leave}>{sortRoomText(locale, 'leaveRoom')}</button>
    </section>
  </main>;
}

interface StudentViewProps {
  state: StudentSortState;
  roomCode: string;
  locale: Locale;
  busy: boolean;
  errorText: string | null;
  languageControl: ReactNode;
  send: (kind: string, payload?: Record<string, unknown>) => Promise<boolean>;
  leave: () => void;
}

function StudentRoomView({ state, roomCode, locale, busy, errorText, languageControl, send, leave }: StudentViewProps) {
  const uid = useId();
  const items = state.studentView.items;
  const categories = state.studentView.categories;
  const categoryHandles = categories.map(c => c.handle);
  const byHandle = useMemo(() => new Map(items.map(item => [item.handle, item])), [items]);

  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const cardButtons = useRef(new Map<string, HTMLButtonElement>());
  const refocus = useRef<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const isSubmitted = state.submission !== null;
  const isRevealed = state.result !== null;
  const isClosed = state.roomStatus !== 'lobby' && state.roomStatus !== 'active';
  const isReadOnly = isSubmitted || isClosed;

  const placements = state.placements;
  const inBank = items.filter(item => !placements[item.handle]);
  const placedCount = items.length - inBank.length;
  const allPlaced = inBank.length === 0;

  const selectedItem = selected ? byHandle.get(selected) ?? null : null;
  const selectedPlaced = !!selectedItem && !!placements[selectedItem.handle];
  const armed = !!selectedItem && !isReadOnly;

  const labelOf = (handle: string | undefined) => categories.find(c => c.handle === handle)?.label ?? '';

  useEffect(() => {
    if (!refocus.current) return;
    cardButtons.current.get(refocus.current)?.focus({ preventScroll: true });
    refocus.current = null;
  });

  function choose(handle: string) {
    if (isReadOnly) return;
    const next = selected === handle ? null : handle;
    setSelected(next);
    setNotice(next ? sortRoomText(locale, 'category') + ': ' + byHandle.get(next)!.text : '');
  }

  function placeItem(item: SortItemCard, categoryHandle: string | null) {
    if (isReadOnly) return;
    void send('sort.place', { itemHandle: item.handle, categoryHandle });
    setNotice(categoryHandle === null ? item.text : `${item.text} → ${labelOf(categoryHandle)}`);
    setSelected(null);
    refocus.current = item.handle;
  }

  const place = (categoryHandle: string | null) => {
    if (selectedItem) placeItem(selectedItem, categoryHandle);
  };

  function dropped(event: DragEndEvent) {
    setDragging(null);
    const item = byHandle.get(String(event.active.id));
    const target = dropTarget(event.over?.id, categoryHandles);
    if (!item || target === undefined || target === (placements[item.handle] ?? null)) return;
    placeItem(item, target);
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!armed || (event.target as HTMLElement).tagName === 'INPUT') return;
    if (event.key === 'Escape') { setSelected(null); setNotice(''); return; }
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= categories.length) {
      event.preventDefault();
      place(categories[digit - 1].handle);
    }
  }

  const backgroundClick = (target: EventTarget, categoryHandle: string | null) => {
    if (!armed || (target as HTMLElement).closest('button, .hint-popover')) return;
    place(categoryHandle);
  };

  const chip = (item: SortItemCard, placedIn?: string) => {
    const isRight = isRevealed && state.result?.answerFeedback[item.handle] === placements[item.handle];
    const correctCatHandle = isRevealed ? state.result?.answerFeedback[item.handle] : undefined;
    const correctLabel = correctCatHandle ? labelOf(correctCatHandle) : '';

    return <SortChip
      key={item.handle}
      item={item}
      open={selected === item.handle && !isReadOnly}
      disabled={isReadOnly}
      checked={isRevealed}
      revealed={isRevealed}
      right={isRight}
      placedIn={placedIn}
      correctLabel={correctLabel}
      correctWord={sortRoomText(locale, 'correct')}
      wrongWord={sortRoomText(locale, 'wrong')}
      categoryWord={sortRoomText(locale, 'category')}
      register={(h, el) => { if (el) cardButtons.current.set(h, el); else cardButtons.current.delete(h); }}
      onChoose={() => choose(item.handle)}
    />;
  };

  const draggedItem = dragging ? byHandle.get(dragging) : undefined;

  if (state.roomStatus === 'lobby') {
    return <main className="page panel padded" style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center' }}>
      {languageControl}
      <div className="eyebrow">{sortRoomText(locale, 'eyebrow')}</div>
      <h1>{sortRoomText(locale, 'lobbyStudent')}</h1>
      <p className="lead">{sortRoomText(locale, 'roomLabel')} <strong className="room-code">{roomCode}</strong></p>
      <p className="muted">{sortRoomText(locale, 'teacherStarts')}</p>
      <button className="button subtle" onClick={leave}>{sortRoomText(locale, 'leaveRoom')}</button>
    </main>;
  }

  return <DragArea
    onStart={event => { setDragging(String(event.active.id)); setSelected(null); setNotice(''); }}
    onEnd={dropped}
    onCancel={() => setDragging(null)}
    overlay={draggedItem ? <div className="sort-chip drag-ghost"><strong>{draggedItem.text}</strong></div> : null}
  >
    <main className="page activity-ux-page">
      {languageControl}
      <header className="activity-ux-head">
        <div className="activity-ux-heading">
          <div className="eyebrow">{sortRoomText(locale, 'eyebrow')} · {sortRoomText(locale, 'roomLabel')} {roomCode}</div>
          <h1>{sortRoomText(locale, 'eyebrow')}</h1>
        </div>
      </header>

      {errorText && <p role="alert" className="error">{errorText}</p>}

      {isRevealed && state.result && (
        <section className="panel padded" style={{ marginBottom: 16, textAlign: 'center' }}>
          <h2>{sortRoomText(locale, 'resultsTitle')}</h2>
          <p className="lead">
            <strong>
              {sortRoomText(locale, 'scoreSummary', {
                correct: state.result.score?.correct ?? 0,
                total: state.result.score?.total ?? items.length,
              })}
            </strong>
          </p>
        </section>
      )}

      {!isRevealed && isSubmitted && (
        <div className="feedback" style={{ position: 'static', margin: '0 auto 16px', maxWidth: 600 }}>
          {sortRoomText(locale, 'submittedWait')}
        </div>
      )}

      {!isRevealed && !isSubmitted && isClosed && (
        <div className="feedback feedback-wrong" style={{ position: 'static', margin: '0 auto 16px', maxWidth: 600 }}>
          {sortRoomText(locale, 'closedWait')}
        </div>
      )}

      <div className="activity-board sort-board" ref={boardRef} onKeyDown={keyDown}>
        {!isReadOnly && <p className="muted sort-hint">{sortRoomText(locale, 'dragHint')}</p>}
        <p className="sr-only" role="status" aria-live="polite">{notice}</p>

        <div className="sort-progress">
          <span>{sortRoomText(locale, 'sortedCount', { n: placedCount, total: items.length })}</span>
          <span className="sort-progress-bar" aria-hidden="true">
            <i style={{ width: (items.length ? (placedCount / items.length) * 100 : 0) + '%' }} />
          </span>
        </div>

        <div className="sort-layout">
          <div className="sort-bins">
            {categories.map((cat, index) => (
              <DropSection
                key={cat.handle}
                id={binId(cat.handle)}
                className={'sort-bin' + (armed || dragging ? ' armed' : '')}
                labelledBy={uid + cat.handle}
                onBackgroundClick={target => backgroundClick(target, cat.handle)}
              >
                <header>
                  <h3 id={uid + cat.handle}>{cat.label}</h3>
                  <span className="rb-count" aria-hidden="true">
                    {items.filter(i => placements[i.handle] === cat.handle).length}
                  </span>
                </header>
                <ul className="sort-bin-chips">
                  {items.filter(i => placements[i.handle] === cat.handle).map(i => chip(i, cat.label))}
                </ul>
                <button
                  type="button"
                  className="sort-drop"
                  disabled={!armed}
                  aria-label={sortRoomText(locale, 'category') + ': ' + cat.label}
                  aria-keyshortcuts={String(index + 1)}
                  onClick={() => place(cat.handle)}
                >
                  {sortRoomText(locale, 'category')}
                </button>
              </DropSection>
            ))}
          </div>

          <DropSection
            id={BANK}
            className={'sort-bank' + ((armed && selectedPlaced) || dragging ? ' armed' : '')}
            labelledBy={uid + 'bank'}
            onBackgroundClick={target => backgroundClick(target, null)}
          >
            <header>
              <h3 id={uid + 'bank'}>{sortRoomText(locale, 'bankTitle')}</h3>
              <span className="rb-count" aria-hidden="true">{inBank.length}</span>
              <HintPopover label={sortRoomText(locale, 'bankTitle')}>
                {sortRoomText(locale, 'dragHint')}
              </HintPopover>
            </header>
            <ul className="sort-bank-chips">{inBank.map(i => chip(i))}</ul>
            {inBank.length === 0 && !isReadOnly && (
              <p className="muted small sort-bank-done">{sortRoomText(locale, 'bankDone')}</p>
            )}
            {armed && selectedPlaced && (
              <button
                type="button"
                className="button subtle sort-return"
                onClick={() => place(null)}
              >
                {sortRoomText(locale, 'returnToBank')}
              </button>
            )}
          </DropSection>
        </div>

        {!isReadOnly && (
          <div className="row activity-controls">
            <button
              type="button"
              className="button primary"
              disabled={!allPlaced || busy}
              onClick={() => void send('sort.submit')}
            >
              {busy ? sortRoomText(locale, 'submitting') : sortRoomText(locale, 'submitAnswers')}
            </button>
            <button className="button subtle" onClick={leave}>{sortRoomText(locale, 'leaveRoom')}</button>
          </div>
        )}

        {!allPlaced && !isReadOnly && (
          <p className="muted small">{sortRoomText(locale, 'allPlacedPrompt')}</p>
        )}

        {isReadOnly && (
          <div className="row activity-controls">
            <button className="button subtle" onClick={leave}>{sortRoomText(locale, 'leaveRoom')}</button>
          </div>
        )}

        {isRevealed && (
          <div className="activity-key" tabIndex={-1} role="region" aria-labelledby={uid + 'key'}>
            <h3 id={uid + 'key'}>{sortRoomText(locale, 'answerKey')}</h3>
            <ul className="sort-key-list">
              {items.map(item => {
                const correctHandle = state.result?.answerFeedback[item.handle];
                const cat = categories.find(c => c.handle === correctHandle);
                return <li key={item.handle}>
                  <strong>{item.text}</strong> — {sortRoomText(locale, 'categoryCorrect')}: <span>{cat?.label}</span>
                </li>;
              })}
            </ul>
          </div>
        )}
      </div>
    </main>
  </DragArea>;
}
