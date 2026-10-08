import type { PublicCard } from '../types';
import { getColumns } from '../engine/local';

interface Props {
  cards: PublicCard[];
  canFlip: boolean;
  onFlip: (id: number) => void;
  notice?: string | null;
  wrong?: boolean;
}
export function MemoryBoard({ cards, canFlip, onFlip, notice, wrong }: Props) {
  const cols = getColumns(cards.length);
  return <div className="board-panel">
    {notice && <div role="status" className={'feedback ' + (wrong ? 'feedback-wrong' : '')}>{notice}</div>}
    <div className="memory-grid" style={{ gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))' }}>
      {cards.map(card => {
        const shown = card.visible || card.matched;
        const emoji = !!card.value && /\p{Extended_Pictographic}/u.test(card.value) && card.value.length <= 8;
        return <button
          key={card.id} type="button"
          className={'memory-card ' + (shown ? 'revealed ' : '') + (card.matched ? 'matched' : '')}
          aria-label={shown ? card.value || 'Aufgedeckte Karte' : 'Verdeckte Karte'}
          disabled={!canFlip || shown}
          onClick={() => onFlip(card.id)}>
          <span className="card-inner">
            <span className="card-face card-back"><span className="card-mark" /></span>
            <span className="card-face card-front"><span className={emoji ? 'card-emoji' : 'card-word'}>{shown ? card.value : ''}</span></span>
          </span>
        </button>;
      })}
    </div>
  </div>;
}
