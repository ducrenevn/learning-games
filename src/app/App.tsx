import type { ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Home } from './Home';
import { MemoryHome } from '../games/memory/MemoryHome';
import { MemoryJoin } from '../games/memory/MemoryJoin';
import { MemoryRoom } from '../games/memory/MemoryRoom';
import { SortPage } from '../games/sort/SortPage';
import { SequencePage } from '../games/sequence/SequencePage';
import { DetectivePage } from '../games/language-detective/DetectivePage';
import { LanguageFlags, LocaleProvider, useLocale } from '../shared/locale/LocaleProvider';

const NOTE = { de: 'Gemeinsam spielen und lernen', en: 'Play and learn together', vi: 'Cùng chơi và học' } as const;
/** The online room pages are still German-only; a switcher there would promise a translation that does not exist. */
const hasLocalisedPage = (path: string) => !/^\/games\/memory\/(join|room)(\/|$)/.test(path);

/** The single app bar: wordmark, tagline and the global interface-language toggle. Shared by the app and by DOM tests. */
export function AppShell({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const { pathname } = useLocation();
  return <div className="app-shell">
    <header className="app-header">
      <Link to="/" className="wordmark">◈ Learning Games</Link>
      <span className="header-note">{NOTE[locale]}</span>
      {hasLocalisedPage(pathname) && <LanguageFlags />}
    </header>
    {children}
  </div>;
}

export function App() {
  return <LocaleProvider><AppShell>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/games/memory" element={<MemoryHome />} />
      <Route path="/games/memory/join" element={<MemoryJoin />} />
      <Route path="/games/memory/room/:roomCode" element={<MemoryRoom />} />
      <Route path="/games/sort" element={<SortPage />} />
      <Route path="/games/sequence" element={<SequencePage />} />
      <Route path="/games/language-detective" element={<DetectivePage />} />
      <Route path="*" element={<main className="page"><h1>Seite nicht gefunden</h1><Link to="/">Zur Startseite</Link></main>} />
    </Routes>
  </AppShell></LocaleProvider>;
}
