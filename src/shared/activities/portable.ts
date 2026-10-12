import { MAX_BYTES, parseJson, type ActivityType, type Result, type Validator } from './contract';
import { validateSort } from '../../games/sort/model';
import { validateSequence } from '../../games/sequence/model';
import { validateDetective } from '../../games/language-detective/model';
import { validateMemory } from '../../games/memory/activity';

export function validateImported(text: string, type: ActivityType): Result<unknown> {
  const parsed = parseJson(text);
  if (parsed.issues.length) return parsed;
  const validators: Record<ActivityType, Validator<unknown>> = {
    sort: validateSort,
    sequence: validateSequence,
    'language-detective': validateDetective,
    memory: validateMemory,
  };
  return validators[type](parsed.value);
}
export function serializeActivity<T>(activity: T, validate: Validator<T>): Result<string> {
  const checked = validate(activity);
  if (checked.issues.length || !checked.value) return { issues: checked.issues };
  const json = JSON.stringify(checked.value, null, 2) + '\n';
  if (new TextEncoder().encode(json).length > MAX_BYTES) return { issues: [{ path: 'file', code: 'size' }] };
  return { value: json, issues: [] };
}
export function downloadActivity(fileName: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
