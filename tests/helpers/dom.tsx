import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, vi } from 'vitest';
import type { ReactElement } from 'react';

afterEach(() => cleanup());

export type Locale = 'de' | 'en' | 'vi';
export function renderPage(ui: ReactElement) {
  const user = userEvent.setup();
  const view = render(<MemoryRouter>{ui}</MemoryRouter>);
  return { user, ...view };
}
export function jsonFile(name: string, data: unknown): File {
  return new File([typeof data === 'string' ? data : JSON.stringify(data)], name, { type: 'application/json' });
}
export function fileInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('input[type="file"]')!;
}
/** Imports `data` through the real file input. Resolves after the async file read has been flushed. */
/** Opens the actual guided file-first import flow and accepts the validated teacher activity. */
export async function importActivity(user: UserEvent, data: unknown, name = 'activity.json') {
  // Return from detached play and/or editor to the entry, preserving all real leave guards.
  for (let tries = 0; tries < 3 && !document.querySelector('input[type="file"]'); tries++) {
    const importButton = screen.queryByRole('button', {name: /Aktivität importieren|Import activity|Nhập hoạt động/});
    if (importButton) { await user.click(importButton); break; }
    const back = document.querySelector<HTMLButtonElement>('.activity-ux-back');
    if (!back) throw new Error('Unable to reach the activity import entry');
    await user.click(back);
  }
  const input = fileInput();
  if (!input) throw new Error('The import file picker was not mounted. Navigate to Import activity.');
  await user.upload(input, jsonFile(name, data));
  const accept = await screen.findByRole('button', {name: /Im Editor öffnen|Open in editor|Mở trong trình chỉnh sửa/});
  await user.click(accept);
}
/** The reviewed flow exposes game modes only on the Review step. */
export async function openReview(user: UserEvent) {
  const nav = document.querySelector<HTMLElement>('.activity-ux-navigation');
  if (!nav) throw new Error('Guided editor navigation not mounted');
  const steps = within(nav).getAllByRole('button');
  await user.click(steps[steps.length - 1]);
}
/** Select an authored content step through the same real step navigator the teacher uses. */
export async function openAuthorStep(user: UserEvent, step: number) {
  const nav = document.querySelector<HTMLElement>('.activity-ux-navigation');
  if (!nav) throw new Error('Guided editor navigation not mounted');
  const steps = within(nav).getAllByRole('button');
  if (!steps[step]) throw new Error('No guided editor step ' + step);
  await user.click(steps[step]);
}
export async function chooseLocale(user: UserEvent, locale: Locale) {
  await user.selectOptions(document.querySelector('select')!, locale);
}
/** Captures the JSON file the Download action would save instead of touching the browser's download machinery. */
export function captureDownload() {
  const blobs: Blob[] = [], names: string[] = [];
  URL.createObjectURL = (blob: Blob | MediaSource) => { blobs.push(blob as Blob); return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { names.push(this.download); });
  return { names, text: async (n = blobs.length - 1) => blobs[n].text() };
}
/** Text of every element inside the play area, for answer-secrecy assertions. */
export function playText(): string {
  return document.querySelector('.activity-play')?.textContent ?? '';
}
export { screen };
