import HeritageCard from './HeritageCard';
import CardBack from './CardBack';
import '../../styles/heritage-card.css';

/**
 * Overlapping cards, like objects set down on an archive desk.
 * Positions and rotations live in CSS (data-slot), not inline styles.
 * Hover / focus-within gently separates the cards.
 *
 * Falls back to card backs if the dataset is empty, so the hero never breaks.
 */
export default function CardStack({ sites, label = 'Selected heritage cards', max = 5 }) {
  const items = sites.slice(0, max);

  return (
    <div className="hb-stack" role="group" aria-label={label} data-count={items.length || 3}>
      {items.length > 0
        ? items.map((site, index) => (
            <div className="hb-stack__slot" data-slot={index} key={site.id}>
              <HeritageCard site={site} headingLevel={null} priority />
            </div>
          ))
        : ['geometric', 'arches', 'plain'].map((variant, index) => (
            <div className="hb-stack__slot" data-slot={index} key={variant}>
              <CardBack variant={variant} label="Archive" />
            </div>
          ))}
    </div>
  );
}
