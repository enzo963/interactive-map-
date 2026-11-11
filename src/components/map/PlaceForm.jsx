import { useId, useMemo, useState } from 'react';

import { GOVERNORATE_NAMES } from '../../data/governorates';
import { t } from '../../i18n';

const DEFAULT_TYPES = ['Archaeological Site', 'Church', 'Mosque', 'Monastery', 'Shrine', 'Castle', 'Historic Building', 'Historic Market'];

const EMPTY = { name: '', governorate: 'Nineveh', category: '', period: '', description: '' };

const unique = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

function Field({ label, children, hint }) {
  const id = useId();
  return (
    <div className="hb-place__field">
      <label className="hb-search__label" htmlFor={id}>{label}</label>
      {children(id)}
      {hint && <span className="hb-place__hint">{hint}</span>}
    </div>
  );
}

/**
 * Dev-only editor. "New card" adds a hidden draft record to sites.json (status draft, no sources yet);
 * picking an existing card only sets its pin (latitude / longitude). The position comes from the map
 * (click or drag), or can be typed in.
 */
export default function PlaceForm({ sites, initialTarget = 'new', draft, onDraftChange, onCancel, onSaved }) {
  const [target, setTarget] = useState(initialTarget);
  const [fields, setFields] = useState(EMPTY);
  const [status, setStatus] = useState({ busy: false, error: '' });
  const listId = useId();

  const governorates = useMemo(() => unique([...Object.values(GOVERNORATE_NAMES), ...sites.map((s) => s.governorate)]), [sites]);
  const types = useMemo(() => unique([...DEFAULT_TYPES, ...sites.map((s) => s.siteType)]), [sites]);
  const existing = useMemo(
    () => [...sites].sort((a, b) => Number(Number.isFinite(a.latitude)) - Number(Number.isFinite(b.latitude)) || a.name.localeCompare(b.name)),
    [sites],
  );
  const isNew = target === 'new';
  const set = (key) => (event) => setFields((f) => ({ ...f, [key]: event.target.value }));

  const chooseTarget = (value) => {
    setTarget(value);
    const site = sites.find((s) => s.id === value);
    if (site && Number.isFinite(site.latitude)) onDraftChange({ lat: site.latitude, lng: site.longitude });
  };

  const setCoordinate = (key) => (event) => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    onDraftChange({ lat: draft?.lat ?? 36.34, lng: draft?.lng ?? 43.13, [key]: value });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (status.busy) return;
    if (!draft) { setStatus({ busy: false, error: t('Click the map to place the pin first.') }); return; }
    setStatus({ busy: true, error: '' });
    const position = { latitude: draft.lat, longitude: draft.lng };
    try {
      const response = await fetch(isNew ? '/api/sites' : `/api/sites/${encodeURIComponent(target)}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { ...fields, ...position } : position),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t('Save failed ({status})', { status: response.status }));
      onSaved(result);
    } catch (error) {
      setStatus({ busy: false, error: error.message });
    }
  };

  return (
    <form className="hb-place" onSubmit={submit}>
      <div className="hb-place__head">
        <h2 className="hb-place__title">{isNew ? t('Add a place') : t('Move a card')}</h2>
        <p className="hb-place__hint">{t('Saved to')} <code>src/data/sites.json</code> ({t('development only')}).</p>
      </div>

      <Field label={t('Card')}>
        {(id) => (
          <select id={id} className="hb-search__input" value={target} onChange={(e) => chooseTarget(e.target.value)}>
            <option value="new">+ {t('New card')}</option>
            {existing.map((site) => (
              <option value={site.id} key={site.id}>{site.name}{Number.isFinite(site.latitude) ? '' : ` (${t('no position yet')})`}</option>
            ))}
          </select>
        )}
      </Field>

      <div className="hb-place__coords">
        <Field label={t('Latitude')}>
          {(id) => <input id={id} className="hb-search__input" type="number" step="0.00001" min="-90" max="90" value={draft ? draft.lat.toFixed(5) : ''} onChange={setCoordinate('lat')} placeholder={t('Click the map')} />}
        </Field>
        <Field label={t('Longitude')}>
          {(id) => <input id={id} className="hb-search__input" type="number" step="0.00001" min="-180" max="180" value={draft ? draft.lng.toFixed(5) : ''} onChange={setCoordinate('lng')} placeholder={t('Click the map')} />}
        </Field>
      </div>

      {isNew && (
        <>
          <Field label={t('Name *')}>{(id) => <input id={id} className="hb-search__input" required value={fields.name} onChange={set('name')} placeholder={t('e.g. Clock Church')} />}</Field>
          <Field label={t('Governorate')}>
            {(id) => (
              <>
                <input id={id} className="hb-search__input" list={`${listId}-gov`} value={fields.governorate} onChange={set('governorate')} />
                <datalist id={`${listId}-gov`}>{governorates.map((g) => <option value={g} key={g} />)}</datalist>
              </>
            )}
          </Field>
          <Field label={t('Category')}>
            {(id) => (
              <>
                <input id={id} className="hb-search__input" list={`${listId}-type`} value={fields.category} onChange={set('category')} />
                <datalist id={`${listId}-type`}>{types.map((t) => <option value={t} key={t} />)}</datalist>
              </>
            )}
          </Field>
          <Field label={t('Period')}>{(id) => <input id={id} className="hb-search__input" value={fields.period} onChange={set('period')} placeholder={t('e.g. Ottoman')} />}</Field>
          <Field label={t('Description')} hint={t('Saved as a hidden draft. It appears once sites.json gives it a source and the other required card fields.')}>
            {(id) => <textarea id={id} className="hb-search__input hb-place__text" rows={3} value={fields.description} onChange={set('description')} />}
          </Field>
        </>
      )}

      {status.error && <p className="hb-place__error" role="alert">{status.error}</p>}
      <div className="hb-place__actions">
        <button type="submit" className="hb-btn hb-btn--ink" aria-disabled={status.busy}>{status.busy ? t('Saving…') : isNew ? t('Save card') : t('Save position')}</button>
        <button type="button" className="hb-btn hb-btn--sand" onClick={onCancel}>{t('Cancel')}</button>
      </div>
    </form>
  );
}
