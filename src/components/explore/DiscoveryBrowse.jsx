import SmartLink from '../common/SmartLink';
import { HERITAGE_CATEGORIES } from '../../utils/heritageCategories';
import { EMPTY_FILTERS, getFacets, serializeFilters } from '../../utils/filterSites';
import { t, tn } from '../../i18n';

export default function DiscoveryBrowse({ sites }) {
  const facets = getFacets(sites, EMPTY_FILTERS);
  const href = (patch) => `/explore?${serializeFilters({ ...EMPTY_FILTERS, ...patch })}`;
  return (
    <section className="hb-discovery hb-container" aria-label={t('Explore heritage collections')}>
      <div>
        <h2>{t('Explore by heritage category')}</h2>
        <p>{t('Browse places by their recorded site type. A place may belong to more than one category.')}</p>
        <div className="hb-discovery__categories">
          {HERITAGE_CATEGORIES.filter((c) => facets.themes.find((f) => f.id === c.id)?.count > 0).map((c) => (
            <SmartLink className="hb-discovery__category" href={href({ themes: [c.id] })} key={c.id}>
              <strong>{t(c.label)}</strong>
              <span>{t(c.description)}</span>
              <small>{tn('{n} site', '{n} sites', facets.themes.find((f) => f.id === c.id).count)} →</small>
            </SmartLink>
          ))}
        </div>
      </div>
      <details className="hb-discovery__periods">
        <summary>{t('Explore by period or civilization')}</summary>
        <p>{t('Choose a period recorded in the archive. Missing dates stay unassigned.')}</p>
        <ul>
          {facets.periods.map((p) => (
            <li key={p.id}>
              <SmartLink className="hb-tag" href={href({ periods: [p.id] })}>
                {p.label} <span>{p.count}</span>
              </SmartLink>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
