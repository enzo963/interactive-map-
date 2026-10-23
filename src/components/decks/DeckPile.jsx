import CardBack from '../cards/CardBack';
import '../../styles/decks.css';

/**
 * A deck: the top card back plus visible card edges for thickness.
 * Reused by the Draw section now, and by Governorate / Special decks in Phase 2.
 */
export default function DeckPile({ variant = 'plain', label, caption, thickness = 4, shuffling = false }) {
  const edges = Array.from({ length: thickness }, (_, i) => thickness - i); // deepest first

  return (
    <div className={`hb-deck ${shuffling ? 'is-shuffling' : ''}`.trim()}>
      {edges.map((depth) => (
        <span className="hb-deck__edge" data-depth={depth} key={depth} aria-hidden="true" />
      ))}
      <div className="hb-deck__top">
        <CardBack variant={variant} label={label} caption={caption} />
      </div>
    </div>
  );
}
