import '../../styles/phase4.css';

/**
 * Boundary map: renders VERIFIED governorate geometry (see data/geo/iraqGovernorates.js).
 * Only mounted when utils/governorateGeometry.js returns data, so it is dormant today.
 * Selection, counts and statistics come from the parent, never from the geometry.
 *
 * Keyboard: each governorate is a button (Tab to move, Enter/Space to select).
 * Hover and focus preview a governorate in the side panel via `onPreview`.
 */
export default function GovernorateMap({ geometry, statsByKey, selectedKey, onSelect, onPreview }) {
  return (
    <figure className="hb-geomap">
      <svg className="hb-geomap__svg" viewBox={geometry.viewBox} role="group" aria-label="Map of Iraq by governorate">
        {geometry.features.map((feature) => {
          const entry = statsByKey.get(feature.key);
          const count = entry?.count ?? 0;
          return (
            <path
              key={feature.key}
              d={feature.d}
              className="hb-geomap__area"
              role="button"
              tabIndex={0}
              aria-pressed={selectedKey === feature.key}
              aria-label={`${entry?.name ?? feature.name}, ${count} ${count === 1 ? 'card' : 'cards'}`}
              data-represented={count > 0}
              data-selected={selectedKey === feature.key}
              onClick={() => onSelect(feature.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(feature.key);
                }
              }}
              onMouseEnter={() => onPreview(feature.key)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(feature.key)}
              onBlur={() => onPreview(null)}
            />
          );
        })}
      </svg>
      <figcaption className="hb-map__caption">
        Boundaries: {geometry.attribution.name}
        {geometry.attribution.url && (
          <> (<a href={geometry.attribution.url} target="_blank" rel="noopener noreferrer">source<span className="sr-only"> (opens in a new tab)</span></a>)</>
        )}
        . Licence: {geometry.attribution.license}. Shaded areas have cards in the archive.
      </figcaption>
    </figure>
  );
}
