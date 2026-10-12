import { cleanup, render, screen } from '@testing-library/react';
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
export async function importActivity(user: UserEvent, data: unknown, name = 'activity.json') {
  await user.upload(fileInput(), jsonFile(name, data));
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
