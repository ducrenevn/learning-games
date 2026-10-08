export interface GameCatalogEntry {
  id: string;
  title: string;
  description: string;
  symbol: string;
  href: string;
}

export const gameRegistry: GameCatalogEntry[] = [{
  id: 'memory',
  title: 'Memory-Spiel',
  description: 'Passende Paare finden – lokal oder gemeinsam im Online-Raum.',
  symbol: '▦',
  href: '/games/memory',
}];
