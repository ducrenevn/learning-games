// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { DetectivePreview } from '../src/games/language-detective/DetectivePreview';
import { toDraft } from '../src/games/language-detective/draft';
import { detectiveFixture } from './helpers/fixtures';

describe('Language Detective import preview: the teacher sees the model answers, by colour role', () => {
  it('marks the wrong words in copper and gives only the replacements the green role', () => {
    const { container } = render(<DetectivePreview activity={toDraft(detectiveFixture() as never)} locale="de" />);
    expect(container.querySelectorAll('.rb-word.marked')).toHaveLength(2);
    const sources = Array.from(container.querySelectorAll('.rb-fixes li strong')).map(el => el.textContent);
    const replacements = Array.from(container.querySelectorAll('.rb-fixes .rb-fix-correct')).map(el => el.textContent);
    expect(sources).toEqual(['haben', 'dem']);
    expect(replacements).toEqual(['habe', 'den']);
    expect(container.querySelectorAll('.rb-fixes .rb-fix-correct')).toHaveLength(sources.length);
  });
  it('keeps every sentence in its own card, with an error-free sentence labelled as such', () => {
    const draft = toDraft(detectiveFixture() as never);
    draft.content.tasks.push({ id: 'task-2', segments: [{ id: 's1', text: 'Er' }, { id: 's2', text: 'geht' }], issues: [] });
    const { container } = render(<DetectivePreview activity={draft} locale="de" />);
    const cards = container.querySelectorAll('.rb-sentence');
    expect(cards).toHaveLength(2);
    expect(cards[1].querySelector('.rb-badge')!.textContent).toBe('Kein Fehler');
    expect(cards[1].querySelector('.rb-fix-correct')).toBeNull();
  });
});
