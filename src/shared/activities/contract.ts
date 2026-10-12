/** Wave F portable content: activity files never contain learner/session state. */
export type ActivityType = 'sort' | 'sequence' | 'language-detective';
export type Locale = 'de' | 'en' | 'vi';
export type PlayMode = 'preview' | 'presentation' | 'independent';
export interface ActivityBase<K extends ActivityType, C> {
  format: 'learning-games.activity';
  schemaVersion: 1;
  activityType: K;
  id: string;
  title: string;
  targetLanguage: string;
  instructions: string;
  content: C;
}
export type ValidationCode =
  | 'object' | 'unknown' | 'required' | 'text' | 'length' | 'slug'
  | 'language' | 'count' | 'duplicate' | 'reference' | 'version'
  | 'format' | 'kind' | 'markup' | 'json' | 'size';
export interface Issue { path: string; code: ValidationCode }
export interface Result<T> { value?: T; issues: Issue[] }
export type Validator<T> = (raw: unknown) => Result<T>;

export const MAX_BYTES = 128 * 1024;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$/;

export function record(raw: unknown, path: string, allowed: readonly string[], issues: Issue[]): raw is Record<string, unknown> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    issues.push({ path, code: 'object' });
    return false;
  }
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) issues.push({ path: path ? path + '.' + key : key, code: 'unknown' });
  }
  return true;
}
export function textField(obj: Record<string, unknown>, key: string, path: string, min: number, max: number, issues: Issue[]) {
  const value = obj[key], location = path ? path + '.' + key : key;
  if (value === undefined) { issues.push({ path: location, code: 'required' }); return; }
  if (typeof value !== 'string') { issues.push({ path: location, code: 'text' }); return; }
  const length = Array.from(value).length;
  if (length < min || length > max || value.trim().length === 0) issues.push({ path: location, code: 'length' });
  // All authored text is rendered as React text, never HTML. Reject explicit markup as a second safeguard.
  if (/<\/?[a-z][\s\S]*?>/i.test(value) || /javascript\s*:/i.test(value) || /data\s*:\s*text\/html/i.test(value)) {
    issues.push({ path: location, code: 'markup' });
  }
}
export function optionalText(obj: Record<string, unknown>, key: string, path: string, max: number, issues: Issue[]) {
  if (Object.hasOwn(obj, key)) textField(obj, key, path, 1, max, issues);
}
export function slugField(obj: Record<string, unknown>, key: string, path: string, issues: Issue[]) {
  textField(obj, key, path, 1, 64, issues);
  if (typeof obj[key] === 'string' && !SLUG.test(obj[key])) issues.push({ path: path ? path + '.' + key : key, code: 'slug' });
}
export function arrayField(obj: Record<string, unknown>, key: string, path: string, min: number, max: number, issues: Issue[]): unknown[] {
  const value = obj[key], location = path ? path + '.' + key : key;
  if (!Array.isArray(value)) { issues.push({ path: location, code: 'count' }); return []; }
  if (value.length < min || value.length > max) issues.push({ path: location, code: 'count' });
  return value.slice(0, max + 1);
}
export function distinct(items: unknown[], field: string, path: string, issues: Issue[], insensitive = false) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return;
    const val = (item as Record<string, unknown>)[field];
    if (typeof val !== 'string') return;
    const key = insensitive ? val.trim().normalize('NFC').toLocaleLowerCase() : val;
    if (seen.has(key)) issues.push({ path: path + '[' + index + '].' + field, code: 'duplicate' });
    seen.add(key);
  });
}
export function envelope(raw: unknown, kind: ActivityType, issues: Issue[]): raw is Record<string, unknown> {
  if (!record(raw, '', ['format', 'schemaVersion', 'activityType', 'id', 'title', 'targetLanguage', 'instructions', 'content'], issues)) return false;
  if (raw.format !== 'learning-games.activity') issues.push({ path: 'format', code: 'format' });
  if (raw.schemaVersion !== 1) issues.push({ path: 'schemaVersion', code: 'version' });
  if (raw.activityType !== kind) issues.push({ path: 'activityType', code: 'kind' });
  slugField(raw, 'id', '', issues);
  textField(raw, 'title', '', 1, 120, issues);
  textField(raw, 'instructions', '', 1, 2000, issues);
  textField(raw, 'targetLanguage', '', 2, 40, issues);
  if (typeof raw.targetLanguage === 'string' && !LANGUAGE.test(raw.targetLanguage)) issues.push({ path: 'targetLanguage', code: 'language' });
  return true;
}
export function parseJson(text: string): Result<unknown> {
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES) return { issues: [{ path: 'file', code: 'size' }] };
  try { return { value: JSON.parse(text) as unknown, issues: [] }; }
  catch { return { issues: [{ path: 'file', code: 'json' }] }; }
}
