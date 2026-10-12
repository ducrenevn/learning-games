import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { gameRegistry, type GameMode } from '../games/registry';
import { useLocale } from '../shared/locale/LocaleProvider';

const copy = {
  de: { eyebrow: 'SPIELERISCH LERNEN', lead: 'Kurze Spiele für Unterricht, Gruppen und eigene Übung.', open: 'Spiel öffnen',
    modes: { present: 'Präsentieren', try: 'Ausprobieren', online: 'Online-Raum' } },
  en: { eyebrow: 'PLAYFUL LEARNING', lead: 'Short games for lessons, groups and self-study.', open: 'Open game',
    modes: { present: 'Present', try: 'Try it', online: 'Online room' } },
  vi: { eyebrow: 'HỌC QUA TRÒ CHƠI', lead: 'Trò chơi ngắn cho lớp học, nhóm và tự luyện tập.', open: 'Mở trò chơi',
    modes: { present: 'Trình chiếu', try: 'Dùng thử', online: 'Phòng trực tuyến' } },
} as const satisfies Record<string, { eyebrow: string; lead: string; open: string; modes: Record<GameMode, string> }>;

export function Home() {
  const { locale } = useLocale();
  const c = copy[locale];
  return <main className="page home-page">
    <div className="eyebrow">{c.eyebrow}</div>
    <h1>Learning Games</h1>
    <p className="lead">{c.lead}</p>
    <div className="catalog-grid">{gameRegistry.map(game => {
      const text = locale === 'de' ? game : game.translations[locale];
      return <Link className="card-link game-tile" key={game.id} to={game.href} aria-label={c.open + ': ' + text.title}>
        <div className="tile-icon" aria-hidden="true">{game.symbol}</div>
        <h2>{text.title}</h2>
        <p>{text.description}</p>
        <ul className="mode-chips" aria-hidden="true">{game.modes.map(mode => <li key={mode}>{c.modes[mode]}</li>)}</ul>
        <ArrowRight className="card-link-arrow" aria-hidden="true" />
      </Link>;
    })}</div>
  </main>;
}
