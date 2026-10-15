import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityWorkspace, type OnlineSession } from '../../shared/activities/Workspace';
import { t as activityText } from '../../shared/activities/i18n';
import { makeBlankSort, validateSort, type SortActivity } from './model';
import { SortEditor } from './SortEditor';
import { SortPlayer } from './SortPlayer';
import { SortPreview } from './SortPreview';
import { createSortRoom, freshCapability } from './online/sortRpc';
import { saveSortRoomIdentity } from './online/identity';
import { RoomSetupDialog } from '../memory/RoomSetupDialog';
import { useLocale } from '../../shared/locale/LocaleProvider';

interface PendingRoom {
  activity: SortActivity;
  opener: HTMLElement | null;
  session: OnlineSession;
}

export function SortPage() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [pending, setPending] = useState<PendingRoom | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const hostTokenRef = useRef<string | null>(null);

  function openRoom(activity: SortActivity, session: OnlineSession): Promise<void> {
    if (!validateSort(activity).issues.length) {
      const active = document.activeElement;
      hostTokenRef.current = freshCapability();
      setPending({ activity, session, opener: active instanceof HTMLElement ? active : null });
    }
    return Promise.resolve();
  }

  function cancelRoom() {
    returnFocusTo.current = pending?.opener ?? null;
    hostTokenRef.current = null;
    setPending(null);
  }

  useEffect(() => {
    if (pending === null && returnFocusTo.current) {
      returnFocusTo.current.focus();
      returnFocusTo.current = null;
    }
  }, [pending]);

  async function confirmRoom(allowStudentLanguageChoice: boolean): Promise<boolean> {
    if (!pending) return false;
    if (pending.session.unsaved && !window.confirm(activityText(locale, 'unsavedWarn'))) return false;
    if (!hostTokenRef.current) hostTokenRef.current = freshCapability();
    const token = hostTokenRef.current;
    const data = await createSortRoom(pending.activity, locale, allowStudentLanguageChoice, token);
    saveSortRoomIdentity({ roomCode: data.roomCode, token, role: 'host' });
    setPending(null);
    hostTokenRef.current = null;
    pending.session.acknowledgeLeave();
    navigate('/games/sort/room/' + data.roomCode);
    return true;
  }

  return <>
    <div inert={pending ? true : undefined}>
      <ActivityWorkspace
        kind="sort"
        makeBlank={makeBlankSort}
        validate={validateSort}
        Editor={SortEditor}
        Player={SortPlayer}
        Preview={SortPreview}
        onOnline={openRoom}
        joinHref="/games/sort/join"
      />
    </div>
    {pending && <RoomSetupDialog locale={locale} onConfirm={confirmRoom} onCancel={cancelRoom} />}
  </>;
}
