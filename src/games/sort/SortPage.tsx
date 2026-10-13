import { ActivityWorkspace } from '../../shared/activities/Workspace';
import { makeBlankSort, validateSort } from './model';
import { SortEditor } from './SortEditor';
import { SortPlayer } from './SortPlayer';
import { SortPreview } from './SortPreview';

export function SortPage() {
  return <ActivityWorkspace kind="sort" makeBlank={makeBlankSort} validate={validateSort} Editor={SortEditor} Player={SortPlayer} Preview={SortPreview}/>;
}
