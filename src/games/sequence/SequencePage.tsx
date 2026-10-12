import { ActivityWorkspace } from '../../shared/activities/Workspace';
import { makeBlankSequence, validateSequence } from './model';
import { SequenceEditor } from './SequenceEditor';
import { SequencePlayer } from './SequencePlayer';
export function SequencePage() {
  return <ActivityWorkspace kind="sequence" makeBlank={makeBlankSequence} validate={validateSequence} Editor={SequenceEditor} Player={SequencePlayer}/>;
}
