/** Wave F portable content: activity files never contain learner/session state. */
export type ActivityType = 'sort' | 'sequence' | 'language-detective' | 'memory';
export type Locale = 'de' | 'en' | 'vi';
export type PlayMode = 'preview' | 'presentation' | 'independent';
/** `V` is the content-contract version; every type is version 1 except Language Detective, which also has version 2. */
export interface ActivityBase<K extends ActivityType, C, V extends 1 | 2 = 1> {
  format: 'learning-games.activity';
  schemaVersion: V;
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
  | 'format' | 'kind' | 'markup' | 'control' | 'json' | 'size' | 'review';
export interface Issue { path: string; code: ValidationCode }
export interface Result<T> { value?: T; issues: Issue[] }
export type Validator<T> = (raw: unknown) => Result<T>;

export const MAX_BYTES = 128 * 1024;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8}){0,3}$/;
// Control characters other than tab/LF/CR and unpaired UTF-16 surrogates never belong in teaching text.
const FORBIDDEN_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
// Whitespace, control and invisible format characters (zero-width space/joiner, BOM, soft hyphen, bidi marks) are not content.
const NO_VISIBLE_CONTENT = /^[\p{White_Space}\p{Cc}\p{Cf}]*$/u;
const TAG_START = /<\/?[a-z]/i;
const SCRIPT_URL = /javascript\s*:|data\s*:\s*text\/html/i;
/** Linear-time equivalent of /<\/?[a-z][\s\S]*?>/i, which is quadratic on input such as "<a<a<a…". */
function looksLikeMarkup(value: string) {
  const start = TAG_START.exec(value);
  return (start !== null && value.indexOf('>', start.index) !== -1) || SCRIPT_URL.test(value);
}

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
  if (length < min || length > max || NO_VISIBLE_CONTENT.test(value)) { issues.push({ path: location, code: 'length' }); return; }
  if (FORBIDDEN_CHARS.test(value)) { issues.push({ path: location, code: 'control' }); return; }
  // All authored text is rendered as React text, never HTML. Reject explicit markup as a second safeguard.
  if (looksLikeMarkup(value)) issues.push({ path: location, code: 'markup' });
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
  if (value === undefined) { issues.push({ path: location, code: 'required' }); return []; }
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
    // Blank placeholders are reported as missing text by each field rule, not as duplicates of each other.
    if (val.trim() === '') return;
    const key = insensitive ? val.trim().normalize('NFC').toLocaleLowerCase() : val;
    if (seen.has(key)) issues.push({ path: path + '[' + index + '].' + field, code: 'duplicate' });
    seen.add(key);
  });
}
/** `allowedVersions` is per activity type: everything accepts only version 1 except Language Detective (see DETECTIVE_V2_CONTRACT.md). */
export function envelope(raw: unknown, kind: ActivityType, issues: Issue[], allowedVersions: readonly number[] = [1]): raw is Record<string, unknown> {
  if (!record(raw, '', ['format', 'schemaVersion', 'activityType', 'id', 'title', 'targetLanguage', 'instructions', 'content'], issues)) return false;
  if (raw.format !== 'learning-games.activity') issues.push({ path: 'format', code: 'format' });
  if (typeof raw.schemaVersion !== 'number' || !allowedVersions.includes(raw.schemaVersion)) issues.push({ path: 'schemaVersion', code: 'version' });
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
