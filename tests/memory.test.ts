import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateWinners,
  checkMatch,
  getColumns,
  hideCards,
  isDeckComplete,
  makeLocalDeck,
  matchCards,
  revealCard,
  shuffled,
  type LocalCard,
} from '../src/games/memory/engine/local';
import {
  normalizeRoomCode,
  parsePairs,
  validateForRoom,
} from '../src/games/memory/engine/pairs';
import {
  clearRoomIdentity,
  loadRoomIdentity,
  saveRoomIdentity,
} from '../src/shared/classroom/identity';
import { makeJoinUrl } from '../src/shared/classroom/RoomShare';

describe('Pair parsing and validation', () => {
  it('parses valid bilingual pairs with and without category', () => {
    const input = 'Haus | house | Substantive\n🙂 | freundlich\nAuto | car | Fahrzeuge';
    const result = parsePairs(input);
    expect(result.errors).toEqual([]);
    expect(result.pairs).toHaveLength(3);
    expect(result.pairs[0]).toEqual({ left: 'Haus', right: 'house', category: 'Substantive' });
    expect(result.pairs[1]).toEqual({ left: '🙂', right: 'freundlich', category: undefined });
    expect(result.pairs[2]).toEqual({ left: 'Auto', right: 'car', category: 'Fahrzeuge' });
  });

  it('handles German characters (Umlaute, ß) and emojis safely', () => {
    const input = 'groß | big | Adjektive\nÄpfel | apples\n🎨 | Malen | Hobbys';
    const result = parsePairs(input);
    expect(result.errors).toEqual([]);
    expect(result.pairs).toHaveLength(3);
    expect(result.pairs[0].left).toBe('groß');
    expect(result.pairs[1].left).toBe('Äpfel');
  });

  it('ignores empty lines and trims extraneous whitespace', () => {
    const input = '\n  Tisch   |   table   \r\n\n   Stuhl | chair   | Möbel  \n';
    const result = parsePairs(input);
    expect(result.errors).toEqual([]);
    expect(result.pairs).toHaveLength(2);
    expect(result.pairs[0]).toEqual({ left: 'Tisch', right: 'table', category: undefined });
    expect(result.pairs[1]).toEqual({ left: 'Stuhl', right: 'chair', category: 'Möbel' });
  });

  it('rejects lines with missing delimiters or too many delimiters', () => {
    const input = 'Haus\nAuto | car | vehicle | extra';
    const result = parsePairs(input);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('Zeile 1');
    expect(result.errors[1]).toContain('Zeile 2');
  });

  it('rejects cards exceeding 80 characters', () => {
    const longString = 'A'.repeat(81);
    const input = `${longString} | kurz`;
    const result = parsePairs(input);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Maximal 80 Zeichen');
  });

  it('validates pair counts for multiplayer rooms', () => {
    const single = parsePairs('A | B');
    expect(validateForRoom(single)).toBe('Für Online-Spiele sind 2 bis 16 Paare erforderlich.');

    const validTwo = parsePairs('A | B\nC | D');
    expect(validateForRoom(validTwo)).toBeNull();

    const seventeen = Array.from({ length: 17 }, (_, i) => `Word${i} | Trans${i}`).join('\n');
    expect(validateForRoom(parsePairs(seventeen))).toBe('Für Online-Spiele sind 2 bis 16 Paare erforderlich.');
  });
});

describe('Deck creation and column layout', () => {
  it('makes two cards per pair with matching pairId and unique IDs', () => {
    const pairs = [{ left: 'A', right: 'B' }, { left: 'C', right: 'D' }];
    const deck = makeLocalDeck(pairs, () => 0.5);
    expect(deck).toHaveLength(4);
    expect(deck.every(c => !c.visible && !c.matched)).toBe(true);

    const ids = deck.map(c => c.id);
    expect(new Set(ids).size).toBe(4);

    const pairIds = deck.map(c => c.pairId);
    expect(pairIds.filter(id => id === 0)).toHaveLength(2);
    expect(pairIds.filter(id => id === 1)).toHaveLength(2);
  });

  it('shuffles without mutating source array', () => {
    const source = [1, 2, 3, 4];
    const shuffledCopy = shuffled(source, () => 0.1);
    expect(source).toEqual([1, 2, 3, 4]);
    expect(shuffledCopy).toHaveLength(4);
  });

  it('calculates optimal column counts for various deck sizes', () => {
    expect(getColumns(4)).toBe(2);
    expect(getColumns(12)).toBe(4);
    expect(getColumns(20)).toBe(5);
    expect(getColumns(32)).toBe(8);
  });
});

describe('Local gameplay engine helpers', () => {
  const sampleDeck: LocalCard[] = [
    { id: 1, pairId: 0, value: 'A', visible: false, matched: false },
    { id: 2, pairId: 0, value: 'B', visible: false, matched: false },
    { id: 3, pairId: 1, value: 'C', visible: false, matched: false },
    { id: 4, pairId: 1, value: 'D', visible: false, matched: false },
  ];

  it('checks matching pairIds correctly', () => {
    expect(checkMatch(sampleDeck[0], sampleDeck[1])).toBe(true);
    expect(checkMatch(sampleDeck[0], sampleDeck[2])).toBe(false);
  });

  it('reveals specified card without mutating others', () => {
    const revealed = revealCard(sampleDeck, 1);
    expect(revealed[0].visible).toBe(true);
    expect(revealed[1].visible).toBe(false);
  });

  it('hides specified cards on mismatch', () => {
    const bothRevealed = sampleDeck.map(c => ({ ...c, visible: true }));
    const afterHide = hideCards(bothRevealed, [1, 3]);
    expect(afterHide.find(c => c.id === 1)?.visible).toBe(false);
    expect(afterHide.find(c => c.id === 3)?.visible).toBe(false);
    expect(afterHide.find(c => c.id === 2)?.visible).toBe(true);
  });

  it('marks matched pair as permanently matched and visible', () => {
    const matched = matchCards(sampleDeck, [1, 2]);
    expect(matched[0].matched).toBe(true);
    expect(matched[0].visible).toBe(true);
    expect(matched[1].matched).toBe(true);
    expect(matched[1].visible).toBe(true);
    expect(matched[2].matched).toBe(false);
  });

  it('detects game completion accurately', () => {
    expect(isDeckComplete(sampleDeck)).toBe(false);
    const completedDeck = sampleDeck.map(c => ({ ...c, matched: true, visible: true }));
    expect(isDeckComplete(completedDeck)).toBe(true);
    expect(isDeckComplete([])).toBe(false);
  });

  it('calculates winners and handles ties', () => {
    const solo = [{ name: 'Player 1', score: 6 }];
    expect(calculateWinners(solo)).toEqual({ winners: ['Player 1'], isTie: false, bestScore: 6 });

    const win = [{ name: 'Alice', score: 4 }, { name: 'Bob', score: 2 }];
    expect(calculateWinners(win)).toEqual({ winners: ['Alice'], isTie: false, bestScore: 4 });

    const tie = [{ name: 'Alice', score: 3 }, { name: 'Bob', score: 3 }];
    expect(calculateWinners(tie)).toEqual({ winners: ['Alice', 'Bob'], isTie: true, bestScore: 3 });

    expect(calculateWinners([])).toEqual({ winners: [], isTie: false, bestScore: 0 });
  });
});

describe('Classroom sharing and room identity', () => {
  it('normalizes room codes by removing internal/surrounding whitespace and uppercasing', () => {
    expect(normalizeRoomCode('  a1 b2 c3  ')).toBe('A1B2C3');
    expect(normalizeRoomCode('x9y8z7')).toBe('X9Y8Z7');
  });

  it('generates join links containing room code without leaking secret tokens', () => {
    const url = makeJoinUrl('AB12CD', 'https://learning-games.example.com');
    expect(url).toBe('https://learning-games.example.com/games/memory/join?room=AB12CD');
    expect(url).not.toContain('token');
  });

  describe('Session storage identity persistence', () => {
    const mockStorage: Record<string, string> = {};

    beforeEach(() => {
      Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
      globalThis.sessionStorage = {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => { mockStorage[k] = String(v); },
        removeItem: (k: string) => { delete mockStorage[k]; },
        clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
        key: (i: number) => Object.keys(mockStorage)[i] ?? null,
        length: Object.keys(mockStorage).length,
      } as Storage;
    });

    const valid64Token = 'a'.repeat(64);

    it('saves and loads valid room identity', () => {
      saveRoomIdentity({ roomCode: 'ROOM01', token: valid64Token, role: 'host' });
      const loaded = loadRoomIdentity('ROOM01');
      expect(loaded).toEqual({ roomCode: 'ROOM01', token: valid64Token, role: 'host' });
    });

    it('rejects invalid or tampered tokens', () => {
      saveRoomIdentity({ roomCode: 'ROOM02', token: 'too-short', role: 'student' });
      expect(loadRoomIdentity('ROOM02')).toBeNull();
    });

    it('clears room identity correctly', () => {
      saveRoomIdentity({ roomCode: 'ROOM03', token: valid64Token, role: 'student' });
      expect(loadRoomIdentity('ROOM03')).not.toBeNull();
      clearRoomIdentity('ROOM03');
      expect(loadRoomIdentity('ROOM03')).toBeNull();
    });
  });
});
