import { HISTORY_ERAS, getSiteHistoryEras } from '../../utils/history';
import { t } from '../../i18n';
import '../../styles/civilization-emblems.css';

// Original interface geometries, not reproductions or authenticated historical symbols.
// Shared frame, viewBox and stroke weight keep every use on the same visual grid.
const DRAWINGS = {
  neolithic: 'M20 10 30 20 20 30 10 20ZM20 16 24 20 20 24 16 20Z',
  assyrian: 'M10 15 20 10 30 15M10 21 20 16 30 21M10 27 20 22 30 27',
  babylonian: 'M10 29V22H15V16H20V11H25V22H30V29ZM10 29H30',
  hellenistic: 'M10 13H30M12 17V27M20 17V27M28 17V27M10 30H30',
  parthian: 'M10 29V20A10 10 0 0 1 30 20V29M15 29V21A5 5 0 0 1 25 21V29',
  sasanian: 'M20 10 25 15 30 20 25 25 20 30 15 25 10 20 15 15ZM20 10V30M10 20H30',
  islamic: 'M20 9 24 16 31 20 24 24 20 31 16 24 9 20 16 16ZM13 13H27V27H13Z',
  medieval: 'M12 29V18L20 10 28 18V29ZM17 29V21L20 18 23 21V29',
  ottoman: 'M9 29V21A5.5 5.5 0 0 1 20 21V29M20 29V21A5.5 5.5 0 0 1 31 21V29M14 12H26',
  'nineteenth-century': 'M11 11H29V29H11ZM15 16H25M15 21H25M15 26H25',
  british: 'M10 10H24V24H10ZM16 16H30V30H16Z',
  modern: 'M10 10H18V18H10ZM22 10H30V18H22ZM10 22H18V30H10ZM22 22H30V30H22Z',
  all: 'M11 12H24V29H11ZM16 8H29V25',
  unplaced: 'M12 14H28M12 20H23M12 26H18',
};

export default function CivilizationEmblem({ eraId, decorative = true }) {
  const id = Object.hasOwn(DRAWINGS, eraId) ? eraId : 'unplaced';
  const label = HISTORY_ERAS.find((era) => era.id === id)?.label || (id === 'all' ? 'All approved records' : 'Other or unrecorded periods');
  return <svg className="hb-civilization-emblem" data-era={id} viewBox="0 0 40 40" focusable="false"
    aria-hidden={decorative ? 'true' : undefined} role={decorative ? undefined : 'img'}
    aria-label={decorative ? undefined : t('{era} emblem', { era: t(label) })}>
    <path className="hb-civilization-emblem__frame" d="M8 3H32L37 8V32L32 37H8L3 32V8Z" />
    <path d={DRAWINGS[id]} />
  </svg>;
}

/** For compact contexts, the authored period text remains beside these decorative marks. */
export function PeriodEmblems({ site, period }) {
  const eras = getSiteHistoryEras(site || { period });
  if (!eras.length) return null;
  return <span className="hb-period-emblems" aria-hidden="true">
    {eras.map((era) => <CivilizationEmblem key={era.id} eraId={era.id} />)}
  </span>;
}
