// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { SortPage } from '../src/games/sort/SortPage';
import { SequencePage } from '../src/games/sequence/SequencePage';
import { DetectivePage } from '../src/games/language-detective/DetectivePage';
import { chooseLocale, importActivity, renderPage } from './helpers/dom';
import { detectiveFixture, sequenceFixture, sortFixture } from './helpers/fixtures';

const pages = [
  { name: 'sort', Page: SortPage, data: sortFixture, authored: 'Artikel sortieren' },
  { name: 'sequence', Page: SequencePage, data: sequenceFixture, authored: 'Gespräch ordnen' },
  { name: 'language-detective', Page: DetectivePage, data: detectiveFixture, authored: 'Finde den Fehler' },
] as const;

describe('Wave F pages render in a DOM and keep authored text invariant across interface locales', () => {
  for (const { name, Page, data, authored } of pages) {
    it(name + ': imports a valid file, previews it, and never translates authored content', async () => {
      const { user } = renderPage(<Page />);
      await importActivity(user, data());
      await waitFor(() => expect((screen.getByDisplayValue(authored) as HTMLInputElement).value).toBe(authored));
      for (const [locale, preview] of [['de', 'Vorschau'], ['en', 'Preview'], ['vi', 'Xem thử']] as const) {
        await chooseLocale(user, locale);
        await user.click(screen.getByRole('button', { name: preview }));
        expect(screen.getByRole('heading', { level: 2, name: authored })).toBeTruthy();
        await user.click(screen.getAllByRole('button').find(b => /Zum Editor|Back to editor|Quay lại chỉnh sửa/.test(b.textContent ?? ''))!);
      }
    });
  }
});
