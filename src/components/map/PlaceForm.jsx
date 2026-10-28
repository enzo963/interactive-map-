import { useId, useMemo, useState } from 'react';

const DEFAULT_GOVERNORATES = ['Nineveh', 'Duhok', 'Erbil', 'Kirkuk', 'Salah al-Din', 'Sulaymaniyah', 'Baghdad', 'Anbar', 'Diyala'];
const DEFAULT_TYPES = ['Archaeological Site', 'Church', 'Mosque', 'Monastery', 'Shrine', 'Castle', 'Historic Building', 'Historic Market'];

const EMPTY = {
  name: '', governorate: 'Nineveh', city: '', site_type: '', historical_period: '',
  civilization: '', estimated_year: '', short_description: '', heritage_status: 'existing',
};

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
 * Dev-only editor. "New card" adds a record to sites.json; picking an existing card
 * only moves its pin (latitude / longitude). The position comes from the map (click or drag),
 * or can be typed in.
 */
export default function PlaceForm({ sites, initialTarget = 'new', draft, onDraftChange, onCancel, onSaved }) {
  const [target, setTarget] = useState(initialTarget);
  const [fields, setFields] = useState(EMPTY);
  const [status, setStatus] = useState({ busy: false, error: '' });
  const listId = useId();

  const governorates = useMemo(() => unique([...DEFAULT_GOVERNORATES, ...sites.map((s) => s.governorate)]), [sites]);
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
    if (!draft) { setStatus({ busy: false, error: 'Click the map to place the pin first.' }); return; }
    setStatus({ busy: true, error: '' });
    const position = { latitude: draft.lat, longitude: draft.lng };
    try {
      const response = await fetch(isNew ? '/api/sites' : `/api/sites/${encodeURIComponent(target)}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { ...fields, ...position } : position),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Save failed (${response.status})`);
      onSaved(result);
    } catch (error) {
      setStatus({ busy: false, error: error.message });
    }
  };

  return (
    <form className="hb-place" onSubmit={submit}>
      <div className="hb-place__head">
        <h2 className="hb-place__title">{isNew ? 'Add a place' : 'Move a card'}</h2>
        <p className="hb-place__hint">Saved to <code>src/data/sites.json</code> (development only).</p>
      </div>

      <Field label="Card">
        {(id) => (
          <select id={id} className="hb-search__input" value={target} onChange={(e) => chooseTarget(e.target.value)}>
            <option value="new">+ New card</option>
            {existing.map((site) => (
              <option value={site.id} key={site.id}>{site.name}{Number.isFinite(site.latitude) ? '' : ' (no position yet)'}</option>
            ))}
          </select>
        )}
      </Field>

      <div className="hb-place__coords">
        <Field label="Latitude">
          {(id) => <input id={id} className="hb-search__input" type="number" step="0.00001" min="-90" max="90" value={draft ? draft.lat.toFixed(5) : ''} onChange={setCoordinate('lat')} placeholder="Click the map" />}
        </Field>
        <Field label="Longitude">
          {(id) => <input id={id} className="hb-search__input" type="number" step="0.00001" min="-180" max="180" value={draft ? draft.lng.toFixed(5) : ''} onChange={setCoordinate('lng')} placeholder="Click the map" />}
        </Field>
      </div>

      {isNew && (
        <>
          <Field label="Name *">{(id) => <input id={id} className="hb-search__input" required value={fields.name} onChange={set('name')} placeholder="e.g. Clock Church" />}</Field>
          <div className="hb-place__coords">
            <Field label="Governorate">
              {(id) => (
                <>
                  <input id={id} className="hb-search__input" list={`${listId}-gov`} value={fields.governorate} onChange={set('governorate')} />
                  <datalist id={`${listId}-gov`}>{governorates.map((g) => <option value={g} key={g} />)}</datalist>
                </>
              )}
            </Field>
            <Field label="City">{(id) => <input id={id} className="hb-search__input" value={fields.city} onChange={set('city')} placeholder="e.g. Mosul" />}</Field>
          </div>
          <Field label="Site type">
            {(id) => (
              <>
                <input id={id} className="hb-search__input" list={`${listId}-type`} value={fields.site_type} onChange={set('site_type')} />
                <datalist id={`${listId}-type`}>{types.map((t) => <option value={t} key={t} />)}</datalist>
              </>
            )}
          </Field>
          <div className="hb-place__coords">
            <Field label="Period">{(id) => <input id={id} className="hb-search__input" value={fields.historical_period} onChange={set('historical_period')} placeholder="e.g. Ottoman" />}</Field>
            <Field label="Year" hint="Negative = BC. Sets the card type.">
              {(id) => <input id={id} className="hb-search__input" type="number" step="1" value={fields.estimated_year} onChange={set('estimated_year')} placeholder="e.g. 1870" />}
            </Field>
          </div>
          <Field label="Civilization">{(id) => <input id={id} className="hb-search__input" value={fields.civilization} onChange={set('civilization')} />}</Field>
          <Field label="Status">
            {(id) => (
              <select id={id} className="hb-search__input" value={fields.heritage_status} onChange={set('heritage_status')}>
                <option value="existing">Existing</option>
                <option value="damaged">Damaged</option>
                <option value="restored">Restored</option>
                <option value="destroyed">Destroyed (Lost Heritage)</option>
              </select>
            )}
          </Field>
          <Field label="Short description">
            {(id) => <textarea id={id} className="hb-search__input hb-place__text" rows={3} value={fields.short_description} onChange={set('short_description')} />}
          </Field>
        </>
      )}

      {status.error && <p className="hb-place__error" role="alert">{status.error}</p>}
      <div className="hb-place__actions">
        <button type="submit" className="hb-btn hb-btn--ink" aria-disabled={status.busy}>{status.busy ? 'Saving…' : isNew ? 'Save card' : 'Save position'}</button>
        <button type="button" className="hb-btn hb-btn--sand" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
