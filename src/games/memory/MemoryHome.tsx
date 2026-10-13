import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityWorkspace, type OnlineSession } from '../../shared/activities/Workspace';
import { t as activityText } from '../../shared/activities/i18n';
import { LocalMemory } from './LocalMemory';
import { MemoryEditor } from './MemoryEditor';
import { MemoryPreview } from './MemoryPreview';
import { makeBlankMemory, toMemoryPairs, validateMemory, type MemoryActivity } from './activity';
import { createMemoryRoom } from './api/memoryRpc';
import { RoomSetupDialog } from './RoomSetupDialog';
import { saveRoomIdentity } from '../../shared/classroom/identity';
import { useLocale } from '../../shared/locale/LocaleProvider';
import type { PlayerProps } from '../../shared/activities/Workspace';

function MemoryPlayer({ activity, locale, mode }: PlayerProps<MemoryActivity>) {
  return <LocalMemory key={mode} pairs={toMemoryPairs(activity)} errors={[]} locale={locale}
    singlePlayer={mode === 'independent'} />;
}

interface PendingRoom { activity: MemoryActivity; opener: HTMLElement | null; session: OnlineSession }

export function MemoryHome() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [pending, setPending] = useState<PendingRoom | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  // Opening the dialog is not the room creation. Resolving at once keeps the Create Room button from showing "creating" behind the dialog.
  // The opener is read here, inside the click that started it, before the button is disabled.
  function openRoom(activity: MemoryActivity, session: OnlineSession): Promise<void> {
    if (!validateMemory(activity).issues.length && activity.content.pairs.length >= 2) {
      const active = document.activeElement;
      setPending({ activity, session, opener: active instanceof HTMLElement ? active : null });
    }
    return Promise.resolve();
  }
  function cancelRoom() {
    returnFocusTo.current = pending?.opener ?? null;
    setPending(null);
  }
  // Runs after the editor's inert state is removed, so focus can land on the Create Room button. Only cancel sets this;
  // a confirmed room navigates away and must not focus an element on the page it leaves.
  useEffect(() => {
    if (pending === null && returnFocusTo.current) {
      returnFocusTo.current.focus();
      returnFocusTo.current = null;
    }
  }, [pending]);
  // Resolves true only after a room was created and navigation authorized. A declined prompt or a failure keeps the dialog open.
  async function confirmRoom(allowStudentLanguageChoice: boolean): Promise<boolean> {
    if (!pending) return false;
    // The navigation after creation would discard unexported edits. Ask before any RPC, so a declined prompt creates no room.
    if (pending.session.unsaved && !window.confirm(activityText(locale, 'unsavedWarn'))) return false;
    // Only this explicit teacher confirmation calls the room RPC. No room code or token is serialized into the activity.
    const data = await createMemoryRoom(toMemoryPairs(pending.activity), locale, allowStudentLanguageChoice, pending.activity.title);
    saveRoomIdentity({ roomCode: data.roomCode, token: data.hostToken, role: 'host' });
    setPending(null);
    // The room now exists, so the guard must not ask a second time for the same work. Set only on this success path.
    pending.session.acknowledgeLeave();
    navigate('/games/memory/room/' + data.roomCode);
    return true;
  }

  // While the dialog is open the editor behind it is inert: no focus, clicks or screen-reader access.
  return <>
    <div inert={pending ? true : undefined}>
      <ActivityWorkspace kind="memory" makeBlank={makeBlankMemory} validate={validateMemory}
        Editor={MemoryEditor} Player={MemoryPlayer} Preview={MemoryPreview} onOnline={openRoom} joinHref="/games/memory/join"/>
    </div>
    {pending && <RoomSetupDialog locale={locale} onConfirm={confirmRoom} onCancel={cancelRoom} />}
  </>;
}
