import type { ActivityType, Issue, Locale } from './contract';
import { issueText, t } from './i18n';
import { u } from './uxCopy';

/** Props an editor spreads onto an input so the shell can find, flag and focus it (`data-path` = validator path). */
export interface FieldAttrs { 'data-path': string; 'aria-invalid'?: true }
/** Same for a non-input region, e.g. a list that is too short (`aria-invalid` is not valid on a div). */
export interface RegionAttrs { 'data-path': string; 'data-invalid'?: true }

export function makeFieldHelpers(issues: readonly Issue[], showing: boolean) {
  const bad = new Set(issues.map(i => i.path));
  return {
    field: (path: string): FieldAttrs => showing && bad.has(path) ? { 'data-path': path, 'aria-invalid': true } : { 'data-path': path },
    region: (path: string): RegionAttrs => showing && bad.has(path) ? { 'data-path': path, 'data-invalid': true } : { 'data-path': path },
  };
}

const COLLECTIONS = /^content\.(categories|items|segments|issues|pairs)\[(\d+)\](?:\.([a-zA-Z]+))?$/;
/** Language Detective v2: content.tasks[i], .segments / .segments[j].text, .issues / .issues[k].correction … */
const TASK_PATH = /^content\.tasks\[(\d+)\](?:\.(segments|issues)(?:\[(\d+)\])?(?:\.(\w+))?)?$/;
/** Teacher-facing wording; raw schema paths only ever appear in import diagnostics. */
export function friendlyIssue(kind: ActivityType, issue: Issue, locale: Locale): string {
  const raw = issueText(issue, locale);
  const description = raw.startsWith(issue.path + ': ') ? raw.slice(issue.path.length + 2) : raw;
  const subjectOf = (collection: string) => collection === 'pairs' ? u(locale, 'pairOne')
    : collection === 'categories' ? t(locale, 'category')
    : collection === 'items' ? (kind === 'sort' ? t(locale, 'card') : t(locale, 'item'))
    : collection === 'tasks' ? u(locale, 'sentenceOne')
    : collection === 'segments' ? t(locale, 'segment') : t(locale, 'issue');
  const fieldOf = (field: string) => field === 'left' ? u(locale, 'leftCard') : field === 'right' ? u(locale, 'rightCard')
    : field === 'label' ? u(locale, 'nameLabel') : field === 'text' ? u(locale, 'textLabel')
    : field === 'categoryId' ? t(locale, 'category') : field === 'correction' ? t(locale, 'correction')
    : field === 'explanation' ? t(locale, 'issueExplanation') : field === 'segmentId' ? t(locale, 'issue')
    : field === 'category' ? t(locale, 'category') : null;
  const task = TASK_PATH.exec(issue.path);
  if (task) {
    const where = u(locale, 'sentenceOne') + ' ' + (Number(task[1]) + 1);
    const part = task[4] === 'correction' ? t(locale, 'correction') : task[4] === 'explanation' ? t(locale, 'issueExplanation')
      : task[2] === 'issues' ? t(locale, 'issue') : task[2] === 'segments' ? u(locale, 'passage') : null;
    return where + (part ? ' · ' + part : '') + ': ' + description;
  }
  const indexed = COLLECTIONS.exec(issue.path);
  if (indexed) {
    const label = indexed[3] ? fieldOf(indexed[3]) : null;
    return subjectOf(indexed[1]) + ' ' + (Number(indexed[2]) + 1) + (label ? ' · ' + label : '') + ': ' + description;
  }
  const whole = /^content\.(categories|items|segments|issues|pairs|tasks)$/.exec(issue.path);
  if (whole) {
    const plural = whole[1] === 'pairs' ? u(locale, 'pairs') : whole[1] === 'items' ? (kind === 'sort' ? u(locale, 'cards') : u(locale, 'steps'))
      : whole[1] === 'categories' ? u(locale, 'categories') : whole[1] === 'tasks' ? u(locale, 'sentences') : whole[1] === 'segments' ? u(locale, 'passage') : u(locale, 'errors');
    return plural + ': ' + description;
  }
  const label = issue.path === 'title' ? u(locale, 'title') : issue.path === 'instructions' ? u(locale, 'instructions')
    : issue.path === 'targetLanguage' ? u(locale, 'language') : issue.path === 'id' ? u(locale, 'activityId')
    : issue.path === 'content.prompt' ? t(locale, 'prompt') : issue.path === 'content.explanation' || issue.path === 'content.summary' ? t(locale, 'summary') : null;
  return (label ?? issue.path) + ': ' + description;
}
