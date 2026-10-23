import '../../styles/heritage-card.css';

/**
 * A physical-feeling flip. `back` is the face-down side (usually <CardBack />),
 * `front` is the revealed face (usually <HeritageCard />).
 * The hidden face is `visibility: hidden` (mid-flip) so it leaves the tab order
 * and the accessibility tree.
 */
export default function FlipCard({ flipped, front, back }) {
  return (
    <div className={`hb-flip ${flipped ? 'is-flipped' : ''}`}>
      <div className="hb-flip__inner">
        <div className="hb-flip__face hb-flip__face--back">{back}</div>
        <div className="hb-flip__face hb-flip__face--front">{front}</div>
      </div>
    </div>
  );
}
