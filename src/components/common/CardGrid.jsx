import { useState } from 'react';
import HeritageCard from '../cards/HeritageCard';
import { useI18n } from '../../i18n/I18nContext';
import '../../styles/pages.css';

/**
 * Responsive grid of cards with "Show more" (scales to hundreds of records).
 * Give it a `key` that changes with the filters so the page size resets.
 */
export default function CardGrid({ sites, pageSize = 24, headingLevel = 3 }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(pageSize);
  const shown = sites.slice(0, visible);
  const remaining = sites.length - shown.length;

  return (
    <div>
      <ul className="hb-grid">
        {shown.map((site) => (
          <li key={site.id}>
            <HeritageCard site={site} headingLevel={headingLevel} showCta />
          </li>
        ))}
      </ul>
      {remaining > 0 && (
        <div className="hb-grid__more">
          <button type="button" className="hb-btn hb-btn--ink" onClick={() => setVisible((n) => n + pageSize)}>
            {t('grid.showMore', { n: Math.min(pageSize, remaining) })}
          </button>
          <p className="hb-grid__progress" role="status">
            {t('grid.progress', { shown: shown.length, total: sites.length })}
          </p>
        </div>
      )}
    </div>
  );
}
