export interface MemoryPair { left: string; right: string; category?: string }
export interface PublicCard { id: number; visible: boolean; matched: boolean; value: string | null }
export interface Player { id: string; name: string; score: number }
export type GameStatus = 'lobby' | 'active' | 'finished';
export type GamePhase = 'lobby' | 'first' | 'second' | 'resolve' | 'finished';
export interface MemoryRoomState {
  roomCode: string;
  title: string;
  status: GameStatus;
  revision: number;
  isHost: boolean;
  myPlayerId: string | null;
  players: Player[];
  currentPlayerId: string | null;
  cards: PublicCard[];
  phase: GamePhase;
  lastMatch: boolean | null;
  canFlip: boolean;
  expiresAt: string;
}
export type RoomRole = 'host' | 'student';
export interface RoomIdentity { roomCode: string; token: string; role: RoomRole }
