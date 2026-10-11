import { Link, Route, Routes } from 'react-router-dom';
import { Home } from './Home';
import { MemoryHome } from '../games/memory/MemoryHome';
import { MemoryJoin } from '../games/memory/MemoryJoin';
import { MemoryRoom } from '../games/memory/MemoryRoom';
import { LanguageSwitcher, useLanguage } from '../shared/i18n';

export function App() {
  const {t}=useLanguage();
  return <div className="app-shell">
    <header className="app-header"><Link to="/" className="wordmark">◈ Learning Games</Link><div className="header-controls"><span className="header-note">{t('tagline')}</span><LanguageSwitcher /></div></header>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/games/memory" element={<MemoryHome />} />
      <Route path="/games/memory/join" element={<MemoryJoin />} />
      <Route path="/games/memory/room/:roomCode" element={<MemoryRoom />} />
      <Route path="*" element={<main className="page"><h1>{t('notFound')}</h1><Link to="/">{t('home')}</Link></main>} />
    </Routes>
  </div>;
}
