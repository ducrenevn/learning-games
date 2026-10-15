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
  { id: 'memory', title: 'Memory-Spiel', description: 'Passende Paare finden – lokal oder gemeinsam im Online-Raum.', symbol: '▦', href: '/games/memory', modes: ['present', 'try', 'online'],
    translations: {
      en: { title: 'Memory game', description: 'Find matching pairs – locally or together in an online room.' },
      vi: { title: 'Trò chơi Memory', description: 'Tìm các cặp thẻ khớp nhau – tại chỗ hoặc cùng chơi trong phòng trực tuyến.' },
    } },
  { id: 'sort', title: 'Sort', description: 'Karten in frei wählbare Kategorien sortieren – Präsentation, Einzelübung oder Online-Raum.', symbol: '▤', href: '/games/sort', modes: ['present', 'try', 'online'],
    translations: {
      en: { title: 'Sort', description: 'Sort cards into categories of your choice – for presenting, practising alone, or online room.' },
      vi: { title: 'Sort', description: 'Xếp thẻ vào các nhóm tự chọn – để trình chiếu, tự luyện tập hoặc phòng trực tuyến.' },
    } },
  { id: 'sequence', title: 'Sequence', description: 'Schritte und Sätze in eine feste Reihenfolge bringen.', symbol: '☷', href: '/games/sequence', modes: ['present', 'try'],
    translations: {
      en: { title: 'Sequence', description: 'Put steps and sentences into a fixed order.' },
      vi: { title: 'Sequence', description: 'Sắp xếp các bước và câu theo thứ tự cố định.' },
    } },
  { id: 'language-detective', title: 'Language Detective', description: 'Fehler in Textteilen erkennen und Korrekturen gemeinsam besprechen.', symbol: '⌕', href: '/games/language-detective', modes: ['present', 'try'],
    translations: {
      en: { title: 'Language Detective', description: 'Spot errors in sentences and discuss the corrections together.' },
      vi: { title: 'Language Detective', description: 'Tìm lỗi trong câu và cùng thảo luận cách sửa.' },
    } },
];
