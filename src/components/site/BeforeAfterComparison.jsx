import { useId, useState } from 'react';
import { normalizeComparisons } from '../../utils/comparisons';
import { resolveImage } from '../../utils/resolveImage';
import MediaAttribution from './MediaAttribution';
import { t } from '../../i18n';
import '../../styles/comparison.css';

function ComparisonView({ comparison }) {
  const id = useId();
  const [position, setPosition] = useState(50);
  const [sideBySide, setSideBySide] = useState(false);
  const [failed, setFailed] = useState({});
  const unavailable = Boolean(failed.before || failed.after);
  const split = sideBySide || unavailable;
  const describe = (side) => [side.label, side.date || t('Date not recorded'), side.kind ? t(side.kind === 'photograph' ? 'Photograph' : 'Reconstruction') : ''].filter(Boolean).join(' — ');
  return <section className={`hb-comparison${split ? ' hb-comparison--side-by-side' : ''}`} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{comparison.title}</h3>
    <p id={`${id}-perspective`}>{t('Images may show different perspectives and scales; the wipe does not imply exact alignment.')}</p>
    <div className="hb-comparison__labels">
      <p>{t('Before')}: {describe(comparison.before)}</p>
      <p>{t('After')}: {describe(comparison.after)}</p>
    </div>
    <div className="hb-comparison__canvas" style={{ '--comparison-position': `${position}%` }}>
      {['before', 'after'].map((key) => {
        const side = comparison[key];
        return <div key={key} className={`hb-comparison__image hb-comparison__image--${key}`}>
          {failed[key] ? <p role="status">{t('Image unavailable')}: {describe(side)}</p>
            : <img src={resolveImage(side.image)} alt={`${t(key === 'before' ? 'Before' : 'After')}: ${describe(side)}${side.image.alt ? ` — ${side.image.alt}` : ''}`}
              loading="lazy" decoding="async" onError={() => setFailed((old) => ({ ...old, [key]: true }))} />}
        </div>;
      })}
    </div>
    {!split && <div className="hb-comparison__range">
      <label htmlFor={`${id}-range`}>{t('Reveal before image')}</label>
      <input id={`${id}-range`} type="range" min="0" max="100" step="1" value={position}
        aria-describedby={`${id}-perspective`} aria-valuetext={t('{percent}% before image', { percent: position })}
        onChange={(event) => setPosition(Number(event.target.value))} />
    </div>}
    {!unavailable && <button type="button" className="hb-btn" onClick={() => setSideBySide((value) => !value)}>{t(sideBySide ? 'Wipe comparison' : 'Side by side')}</button>}
    {comparison.notes && <p>{comparison.notes}</p>}
    <div className="hb-comparison__credits">
      {['before', 'after'].map((key) => <div key={key}><h4>{describe(comparison[key])}</h4><MediaAttribution media={comparison[key].image} /></div>)}
    </div>
  </section>;
}

/** Defense in depth: callers cannot bypass image licensing/publication gates with a boolean. */
export default function BeforeAfterComparison({ comparison }) {
  if (comparison?.verified !== true) return null;
  const candidate = { verification_status: 'verified', ...comparison, before: { ...comparison.before, image: comparison.before?.image?.src }, after: { ...comparison.after, image: comparison.after?.image?.src } };
  const [safe] = normalizeComparisons({ id: comparison.siteId, status: 'approved', comparisons: [candidate] }, [comparison.before?.image, comparison.after?.image]);
  if (!safe) return null;
  return <ComparisonView key={`${safe.id}:${safe.before.image.src}:${safe.after.image.src}`} comparison={safe} />;
}
