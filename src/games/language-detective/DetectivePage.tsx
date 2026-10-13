import { ActivityWorkspace } from '../../shared/activities/Workspace';
import { fromDraft, makeBlankDraft, toDraft, validateDraft } from './draft';
import { DetectiveEditor } from './DetectiveEditor';
import { DetectivePlayer } from './DetectivePlayer';
import { DetectivePreview } from './DetectivePreview';
/** The editor works on stacked sentences; files are read (v1 or v2) into that model and written in the lowest sufficient version. */
export function DetectivePage() {
  return <ActivityWorkspace kind="language-detective" makeBlank={makeBlankDraft} validate={validateDraft} Editor={DetectiveEditor} Player={DetectivePlayer}
    Preview={DetectivePreview} fromFile={toDraft} toFile={fromDraft}/>;
}
