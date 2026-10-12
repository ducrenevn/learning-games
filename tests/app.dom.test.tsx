// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach } from 'vitest';
import { App } from '../src/app/App';
import { gameRegistry } from '../src/games/registry';

afterEach(() => cleanup());
const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('catalog and routing', () => {
  it('lists Memory and the three Wave F games, each tile link with a unique accessible name', () => {
    renderAt('/');
    expect(gameRegistry.map(g => g.id)).toEqual(['memory', 'sort', 'sequence', 'language-detective']);
    const links = screen.getAllByRole('link', { name: /^Spiel öffnen/ });
    expect(links).toHaveLength(4);
    const names = links.map(l => l.getAttribute('aria-label') ?? l.textContent);
    expect(new Set(names).size).toBe(4);
    for (const game of gameRegistry) expect(names).toContain('Spiel öffnen: ' + game.title);
    expect(links.map(l => l.getAttribute('href'))).toEqual(gameRegistry.map(g => g.href));
  });
  it('every catalog entry opens a real page, not the "not found" fallback', () => {
    for (const game of gameRegistry) {
      const { unmount } = renderAt(game.href);
      expect(screen.queryByText('Seite nicht gefunden'), game.href).toBeNull();
      expect(screen.getByRole('heading', { level: 1 }), game.href).toBeTruthy();
      unmount();
    }
  });
  it('mounts Memory without the Wave F workspace and leaves <html lang> alone', () => {
    document.documentElement.lang = 'de';
    const { container } = renderAt('/games/memory');
    expect(container.querySelector('.activity-page')).toBeNull();
    expect(document.documentElement.lang).toBe('de');
  });
  it('shows the German 404 for an unknown route', () => {
    renderAt('/games/does-not-exist');
    expect(screen.getByText('Seite nicht gefunden')).toBeTruthy();
  });
});
