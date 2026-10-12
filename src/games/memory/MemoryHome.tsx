import { useNavigate } from 'react-router-dom';
import { ActivityWorkspace } from '../../shared/activities/Workspace';
import { LocalMemory } from './LocalMemory';
import { MemoryEditor } from './MemoryEditor';
import { makeBlankMemory, toMemoryPairs, validateMemory, type MemoryActivity } from './activity';
import { createMemoryRoom } from './api/memoryRpc';
import { saveRoomIdentity } from '../../shared/classroom/identity';
import type { PlayerProps } from '../../shared/activities/Workspace';

function MemoryPlayer({ activity, locale, mode }: PlayerProps<MemoryActivity>) {
  return <LocalMemory key={mode} pairs={toMemoryPairs(activity)} errors={[]} locale={locale}
    singlePlayer={mode === 'independent'} />;
}
export function MemoryHome() {
  const navigate = useNavigate();
  async function openRoom(activity: MemoryActivity) {
    // Only an explicit teacher action calls this existing Memory RPC. No room/token is serialized.
    if (validateMemory(activity).issues.length || activity.content.pairs.length < 2) return;
    const data = await createMemoryRoom(toMemoryPairs(activity), activity.title);
    saveRoomIdentity({ roomCode: data.roomCode, token: data.hostToken, role: 'host' });
    navigate('/games/memory/room/' + data.roomCode);
  }
  return <ActivityWorkspace kind="memory" makeBlank={makeBlankMemory} validate={validateMemory}
    Editor={MemoryEditor} Player={MemoryPlayer} onOnline={openRoom} joinHref="/games/memory/join"/>;
}
