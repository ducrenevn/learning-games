import type { MemoryPair } from '../types';

export interface ParseResult { pairs: MemoryPair[]; errors: string[] }

export function parsePairs(text: string): ParseResult {
  const pairs: MemoryPair[] = [], errors: string[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const parts = line.trim().split('|').map(part => part.trim());
    if (parts.length < 2 || parts.length > 3 || !parts[0] || !parts[1]) {
      errors.push('Zeile ' + (index + 1) + ': Bitte LINKS | RECHTS | KATEGORIE verwenden.');
      return;
    }
    if (parts[0].length > 80 || parts[1].length > 80) {
      errors.push('Zeile ' + (index + 1) + ': Maximal 80 Zeichen pro Kartenseite.');
      return;
    }
    pairs.push({ left: parts[0], right: parts[1], category: parts[2] || undefined });
  });
  return { pairs, errors };
}

export function validateForRoom(result: ParseResult): string | null {
  if (result.errors.length) return result.errors[0];
  if (result.pairs.length < 2 || result.pairs.length > 16) return 'Für Online-Spiele sind 2 bis 16 Paare erforderlich.';
  return null;
}

export const examplePairs = [
  '🙂 | freundlich | Adjektive', '😂 | lustig | Adjektive',
  '🤫 | ruhig | Adjektive', '⚽ | sportlich | Adjektive',
  '🎨 | kreativ | Adjektive', '📚 | fleißig | Adjektive',
].join('\n');

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}
