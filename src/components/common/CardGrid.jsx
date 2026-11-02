import { useEffect, useRef, useState } from 'react';
import HeritageCard from '../cards/HeritageCard';
import '../../styles/pages.css';
import { t } from '../../i18n';

/**
 * Responsive grid of cards with "Show more" (scales to hundreds of records).
 * Give it a `key` that changes with the filters so the page size resets.
 */
export default function CardGrid({ sites, pageSize = 24, headingLevel = 3 }) {
  const [visible, setVisible] = useState(pageSize);
  const list = useRef(null);
  const nextFocus = useRef(null);
  const shown = sites.slice(0, visible);
  const remaining = sites.length - shown.length;
  useEffect(() => {
    if (nextFocus.current === null) return;
    list.current?.children[nextFocus.current]?.querySelector('a')?.focus();
    nextFocus.current = null;
  }, [visible]);

  return (
    <div>
      <ul className="hb-grid" ref={list}>
        {shown.map((site) => (
          <li key={site.id}>
            <HeritageCard site={site} headingLevel={headingLevel} showCta />
          </li>
        ))}
      </ul>
      {sites.length > 0 && (
        <div className="hb-grid__more">
          {remaining > 0 && <button type="button" className="hb-btn hb-btn--ink" onClick={() => {
            nextFocus.current = shown.length;
            setVisible((n) => n + pageSize);
          }}>
            {t('Show {n} more', { n: Math.min(pageSize, remaining) })}
          </button>}
          <p className="hb-grid__progress" role="status">
            {t('Showing {shown} of {total}', { shown: shown.length, total: sites.length })}
          </p>
        </div>
      )}
    </div>
  );
}
