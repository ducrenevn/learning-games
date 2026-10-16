import type { Locale } from '../shared/activities/contract';

export type GameMode = 'present' | 'try' | 'online';
export interface GameCatalogEntry {
  id: string;
  title: string;
  description: string;
  symbol: string;
  href: string;
  /** What a teacher can do with the game; shown as quiet chips on the home tile. */
  modes: readonly GameMode[];
  /** Interface-language variants. German above remains the canonical text. */
  translations: Record<Exclude<Locale, 'de'>, { title: string; description: string }>;
}
export const gameRegistry: GameCatalogEntry[] = [
  { id: 'memory', title: 'Memory', description: 'Passende Wortpaare aufdecken – für dich allein oder live im Raum.', symbol: '▦', href: '/games/memory', modes: ['present', 'try', 'online'],
    translations: {
      en: { title: 'Memory', description: 'Find matching word pairs – on your own or live with your class.' },
      vi: { title: 'Memory', description: 'Lật tìm các cặp từ khớp nhau – tự luyện tập hoặc chơi trực tiếp cùng cả lớp.' },
    } },
  { id: 'sort', title: 'Was passt wohin?', description: 'Wörter und Ausdrücke den passenden Gruppen zuordnen – allein oder im Unterricht.', symbol: '▤', href: '/games/sort', modes: ['present', 'try', 'online'],
    translations: {
      en: { title: 'Where Does It Go?', description: 'Sort words and phrases into the right groups – on your own or with your class.' },
      vi: { title: 'Thuộc nhóm nào?', description: 'Xếp từ và cụm từ vào đúng nhóm – tự luyện tập hoặc chơi cùng cả lớp.' },
    } },
  { id: 'sequence', title: 'Der Reihe nach', description: 'Sätze, Schritte und Abläufe in die richtige Reihenfolge bringen.', symbol: '☷', href: '/games/sequence', modes: ['present', 'try'],
    translations: {
      en: { title: 'Line It Up', description: 'Arrange sentences, steps, and daily routines in the right order.' },
      vi: { title: 'Xếp đúng thứ tự', description: 'Sắp xếp câu, các bước và trình tự theo đúng thứ tự.' },
    } },
  { id: 'language-detective', title: 'Auf Fehlersuche', description: 'Typische Fehler im Text aufspüren und gemeinsam besprechen.', symbol: '⌕', href: '/games/language-detective', modes: ['present', 'try'],
    translations: {
      en: { title: 'Spot the Mistake', description: 'Track down typical mistakes in sentences and explore the right phrasing.' },
      vi: { title: 'Truy tìm lỗi sai', description: 'Truy tìm lỗi sai trong câu và khám phá cách diễn đạt chính xác.' },
    } },
];
