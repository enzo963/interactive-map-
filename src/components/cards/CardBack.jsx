import { useId } from 'react';
import '../../styles/heritage-card.css';

/**
 * Card backs.
 *
 * IMPORTANT: these are original decorative geometries, "inspired by" a
 * collection's character. They are NOT reproductions of archaeological
 * motifs and must never be presented as authentic historical symbols.
 * Variant names describe the visual logic, not a claim about origin.
 */
const VB_W = 200;
const VB_H = 296;
const CX = VB_W / 2;
const CY = VB_H / 2;
const stroke = { stroke: 'currentColor', fill: 'none' };

const Plain = ({ id }) => (
  <>
    <defs>
      <pattern id={`${id}-p`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="0.6" />
      </pattern>
    </defs>
    <rect width={VB_W} height={VB_H} fill={`url(#${id}-p)`} />
  </>
);

const Tile = ({ id }) => (
  <pattern id={`${id}-t`} width="20" height="20" patternUnits="userSpaceOnUse">
    <g {...stroke} strokeWidth="0.7">
      <rect x="2" y="2" width="16" height="16" />
      <path d="M10 2 18 10 10 18 2 10Z" />
      <rect x="7.5" y="7.5" width="5" height="5" />
    </g>
  </pattern>
);

const Geometric = ({ id }) => (
  <>
    <defs><Tile id={id} /></defs>
    <rect width={VB_W} height={VB_H} fill={`url(#${id}-t)`} />
  </>
);

const Arches = ({ id }) => (
  <>
    <defs>
      <pattern id={`${id}-a`} width="24" height="30" patternUnits="userSpaceOnUse">
        <g {...stroke} strokeWidth="0.8">
          <path d="M3 30V16a9 9 0 0 1 18 0v14" />
          <path d="M7 30V17a5 5 0 0 1 10 0v13" />
        </g>
      </pattern>
    </defs>
    <rect width={VB_W} height={VB_H} fill={`url(#${id}-a)`} />
  </>
);

const Citadel = () => {
  const rings = [24, 48, 72, 96, 120];
  const spokes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * Math.PI * 2) / 24;
    return [CX + 126 * Math.cos(angle), CY + 126 * Math.sin(angle)];
  });
  return (
    <g {...stroke} strokeWidth="0.7">
      {rings.map((r) => <circle key={r} cx={CX} cy={CY} r={r} />)}
      {spokes.map(([x, y], i) => <line key={i} x1={CX} y1={CY} x2={x} y2={y} />)}
    </g>
  );
};

const Formal = ({ id }) => (
  <>
    <defs>
      <pattern id={`${id}-g`} width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M10 0H0V10" {...stroke} strokeWidth="0.35" />
      </pattern>
    </defs>
    <rect width={VB_W} height={VB_H} fill={`url(#${id}-g)`} />
    <g {...stroke} strokeWidth="0.8">
      <rect x="16" y="16" width="168" height="264" />
      <rect x="22" y="22" width="156" height="252" />
      <circle cx={CX} cy={CY} r="62" />
      <circle cx={CX} cy={CY} r="54" />
      <path d={`M${CX} 22V86M${CX} 210V274M22 ${CY}H38M162 ${CY}H178`} />
    </g>
  </>
);

const Fragment = ({ id }) => (
  <>
    <defs><Tile id={id} /></defs>
    <g fill={`url(#${id}-t)`}>
      <polygon points="0,0 88,0 70,108 0,92" />
      <polygon points="100,0 200,0 200,68 122,118" />
      <polygon points="0,108 76,128 60,198 0,188" />
      <polygon points="138,134 200,92 200,208 150,190" />
      <polygon points="10,206 108,216 98,296 0,296" />
      <polygon points="122,216 200,226 200,296 132,296" />
    </g>
  </>
);

const Survey = ({ id }) => (
  <>
    <defs>
      <pattern id={`${id}-minor`} width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M10 0H0V10" {...stroke} strokeWidth="0.3" />
      </pattern>
      <pattern id={`${id}-major`} width="50" height="50" patternUnits="userSpaceOnUse">
        <path d="M50 0H0V50" {...stroke} strokeWidth="0.7" />
        <path d="M-4 0H4M0 -4V4" {...stroke} strokeWidth="0.9" />
      </pattern>
    </defs>
    <rect width={VB_W} height={VB_H} fill={`url(#${id}-minor)`} />
    <rect width={VB_W} height={VB_H} fill={`url(#${id}-major)`} />
  </>
);

const Wireframe = ({ id }) => (
  <>
    <defs>
      <pattern id={`${id}-iso`} width="20" height="11.547" patternUnits="userSpaceOnUse">
        <path d="M0 0 20 11.547M20 0 0 11.547" {...stroke} strokeWidth="0.35" />
      </pattern>
    </defs>
    <rect width={VB_W} height={VB_H} fill={`url(#${id}-iso)`} />
    <g {...stroke} strokeWidth="1" strokeLinejoin="round">
      <path d="M100 88 150 117V175L100 204 50 175V117Z" />
      <path d="M100 146 50 117M100 146 150 117M100 146V204" />
    </g>
  </>
);

const PATTERNS = {
  plain: Plain,
  geometric: Geometric,
  arches: Arches,
  citadel: Citadel,
  formal: Formal,
  fragment: Fragment,
  survey: Survey,
  wireframe: Wireframe,
};

/**
 * Props
 *  - variant  one of PATTERNS
 *  - label    short deck name shown on the plaque (e.g. "UNESCO")
 *  - caption  optional second line (e.g. "12 cards")
 */
export default function CardBack({ variant = 'plain', label, caption, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const Pattern = PATTERNS[variant] ?? Plain;

  return (
    <div className={`hb-cardback ${className}`.trim()} data-variant={variant}>
      <svg
        className="hb-cardback__art"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <Pattern id={uid} />
      </svg>
      <div className="hb-cardback__frame" aria-hidden="true" />
      {(label || caption) && (
        <div className="hb-cardback__plaque">
          {label && <span className="hb-cardback__label">{label}</span>}
          {caption && <span className="hb-cardback__caption">{caption}</span>}
        </div>
      )}
      <span className="hb-cardback__mark">Heritage Bridge</span>
    </div>
  );
}
