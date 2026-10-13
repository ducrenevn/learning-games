import type { CSSProperties } from 'react';
import type { PublicCard } from '../types';
import { boardColumns } from '../boardLayout';
import type { OwnerMark } from '../ownership';

export interface BoardLabels { hidden: string; revealed: string; foundBy: (name: string) => string }
const GERMAN_LABELS: BoardLabels = { hidden: 'Verdeckte Karte', revealed: 'Aufgedeckte Karte', foundBy: name => 'gefunden von ' + name };
interface Props {
  cards: PublicCard[];
  canFlip: boolean;
  onFlip: (id: number) => void;
  notice?: string | null;
  wrong?: boolean;
  /** Local play only: who found each matched card (by card id). Online rooms omit it and render exactly as before. */
  owners?: Readonly<Record<number, OwnerMark>>;
  labels?: BoardLabels;
}
export function MemoryBoard({ cards, canFlip, onFlip, notice, wrong, owners, labels = GERMAN_LABELS }: Props) {
  const { desktop, phone } = boardColumns(cards.length);
  return <div className="board-panel">
    {notice && <div role="status" className={'feedback ' + (wrong ? 'feedback-wrong' : '')}>{notice}</div>}
    <div className="memory-grid" style={{ '--cols': desktop, '--cols-phone': phone } as CSSProperties}>
      {cards.map(card => {
        const shown = card.visible || card.matched;
        const emoji = !!card.value && /\p{Extended_Pictographic}/u.test(card.value) && card.value.length <= 8;
        const owner = card.matched ? owners?.[card.id] : undefined;
        const name = shown ? (card.value || labels.revealed) : labels.hidden;
        return <button
          key={card.id} type="button"
          className={'memory-card ' + (shown ? 'revealed ' : '') + (card.matched ? 'matched' : '') + (owner ? ' owned' : '')}
          style={owner ? { '--owner': owner.color } as CSSProperties : undefined}
          aria-label={owner ? name + ' — ' + labels.foundBy(owner.name) : name}
          disabled={!canFlip || shown}
          onClick={() => onFlip(card.id)}>
          <span className="card-inner">
            <span className="card-face card-back"><span className="card-mark" /></span>
            <span className="card-face card-front">
              <span className={emoji ? 'card-emoji' : 'card-word'}>{shown ? card.value : ''}</span>
              {owner && <span className="card-owner" aria-hidden="true">{owner.symbol} {owner.initial}</span>}
            </span>
          </span>
        </button>;
      })}
    </div>
  </div>;
}
