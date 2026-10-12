import { ActivityWorkspace } from '../../shared/activities/Workspace';
import { makeBlankDetective, validateDetective } from './model';
import { DetectiveEditor } from './DetectiveEditor';
import { DetectivePlayer } from './DetectivePlayer';
export function DetectivePage() {
  return <ActivityWorkspace kind="language-detective" makeBlank={makeBlankDetective} validate={validateDetective} Editor={DetectiveEditor} Player={DetectivePlayer}/>;
}
