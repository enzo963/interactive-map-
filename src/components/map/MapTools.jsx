import { MAP_LAYERS } from '../../utils/mapLayers';
import { HISTORY_ERAS } from '../../utils/history';
import CivilizationEmblem from '../common/CivilizationEmblem';
import { t, tn } from '../../i18n';
import '../../styles/map-tools.css';

export default function MapTools({ options, counts, onChange }) {
  return <section className="hb-map-tools" aria-labelledby="map-tools-title">
    <h2 id="map-tools-title">{t('Map layers and exploration')}</h2>
    <div className="hb-map-tools__modes" role="group" aria-label={t('Map exploration mode')}>
      <button type="button" className="hb-tag" aria-pressed={!options.historical} onClick={() => onChange({ historical: false, era: '' })}>{t('Modern map')}</button>
      <button type="button" className="hb-tag" aria-pressed={options.historical} onClick={() => onChange({ historical: true })}>{t('Historical exploration')}</button>
    </div>
    {options.historical && <div className="hb-map-tools__history">
      <label>{t('Civilization or era')}
        <select value={options.era} onChange={(event) => onChange({ era: event.target.value })}>
          <option value="">{t('All approved records')}</option>
          {options.era && !HISTORY_ERAS.some((era) => era.id === options.era) && <option value={options.era}>{t('Unknown era')}</option>}
          {HISTORY_ERAS.map((era) => <option key={era.id} value={era.id}>{t(era.label)}</option>)}
        </select>
      </label>
      {options.era && <CivilizationEmblem eraId={options.era} />}
      <p>{t('Historical mode uses approved records on today’s basemap and recorded locations. It does not reconstruct ancient borders. Use the period filters for exact recorded labels.')}</p>
    </div>}
    <fieldset>
      <legend>{t('Optional heritage layers')}</legend>
      <p className="hb-map-tools__hint">{t('With no layers selected, all matching sites are shown. Selected layers combine; search, governorate and period filters still apply.')}</p>
      <div className="hb-map-tools__layers">
        {MAP_LAYERS.map((layer) => <label key={layer.id}>
          <input type="checkbox" value={layer.id} checked={options.layers.includes(layer.id)} onChange={() => onChange({ layers: options.layers.includes(layer.id) ? options.layers.filter((id) => id !== layer.id) : [...options.layers, layer.id] })} />
          <span>{t(layer.label)}</span><span className="hb-map-tools__count">{tn('{n} site', '{n} sites', counts[layer.id] || 0)}</span>
        </label>)}
      </div>
      <p className="hb-map-tools__hint">{t('UNESCO requires confirmed inscription; 3D requires a verified resource. Disappeared heritage uses the recorded lost/destroyed status. Missing locations remain in the results list.')}</p>
    </fieldset>
    <label className="hb-map-tools__cluster"><input type="checkbox" checked={options.clustered} onChange={() => onChange({ clustered: !options.clustered })} />{t('Group nearby markers')}</label>
    <p className="hb-map-tools__hint">{t('Activate a group to zoom in. Overlapping markers separate at the closest zoom; the results list is always available.')}</p>
    {(options.layers.length > 0 || options.historical || !options.clustered) && <button type="button" className="hb-btn" onClick={() => onChange({ layers: [], historical: false, era: '', clustered: true })}>{t('Reset map layers and mode')}</button>}
  </section>;
}
