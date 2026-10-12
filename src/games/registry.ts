export interface GameCatalogEntry {
  id: string;
  title: string;
  description: string;
  symbol: string;
  href: string;
}
export const gameRegistry: GameCatalogEntry[] = [
  { id: 'memory', title: 'Memory-Spiel', description: 'Passende Paare finden – lokal oder gemeinsam im Online-Raum.', symbol: '▦', href: '/games/memory' },
  { id: 'sort', title: 'Sort', description: 'Karten in frei wählbare Kategorien sortieren – Präsentation oder Einzelübung.', symbol: '▤', href: '/games/sort' },
  { id: 'sequence', title: 'Sequence', description: 'Schritte und Sätze in eine feste Reihenfolge bringen.', symbol: '☷', href: '/games/sequence' },
  { id: 'language-detective', title: 'Language Detective', description: 'Fehler in Textteilen erkennen und Korrekturen gemeinsam besprechen.', symbol: '⌕', href: '/games/language-detective' },
];
