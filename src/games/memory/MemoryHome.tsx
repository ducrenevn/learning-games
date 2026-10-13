import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityWorkspace } from '../../shared/activities/Workspace';
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

export function MemoryHome() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [pending, setPending] = useState<MemoryActivity | null>(null);

  // Opening the dialog is not the room creation. Resolving at once keeps the Create Room button from showing "creating" behind the dialog.
  function openRoom(activity: MemoryActivity): Promise<void> {
    if (!validateMemory(activity).issues.length && activity.content.pairs.length >= 2) setPending(activity);
    return Promise.resolve();
  }
  function cancelRoom() {
    setPending(null);
  }
  async function confirmRoom(allowStudentLanguageChoice: boolean) {
    if (!pending) return;
    // Only this explicit teacher confirmation calls the room RPC. No room code or token is serialized into the activity.
    const data = await createMemoryRoom(toMemoryPairs(pending), locale, allowStudentLanguageChoice, pending.title);
    saveRoomIdentity({ roomCode: data.roomCode, token: data.hostToken, role: 'host' });
    setPending(null);
    navigate('/games/memory/room/' + data.roomCode);
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
