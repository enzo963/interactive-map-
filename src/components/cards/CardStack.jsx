import HeritageCard from './HeritageCard';
import CardBack from './CardBack';
import { useI18n } from '../../i18n/I18nContext';
import '../../styles/heritage-card.css';

/**
 * Overlapping cards, like objects set down on an archive desk.
 * Positions and rotations live in CSS (data-slot), not inline styles.
 * Hover / focus-within gently separates the cards.
 *
 * Falls back to card backs if the dataset is empty, so the hero never breaks.
 */
export default function CardStack({ sites, label, max = 5 }) {
  const { t } = useI18n();
  const items = sites.slice(0, max);

  return (
    <div className="hb-stack" role="group" aria-label={label ?? t('hero.stackLabel')} data-count={items.length || 3}>
      {items.length > 0
        ? items.map((site, index) => (
            <div className="hb-stack__slot" data-slot={index} key={site.id}>
              <HeritageCard site={site} headingLevel={null} priority />
            </div>
          ))
        : ['geometric', 'arches', 'plain'].map((variant, index) => (
            <div className="hb-stack__slot" data-slot={index} key={variant}>
              <CardBack variant={variant} label={t('card.archive')} />
            </div>
          ))}
    </div>
  );
}
