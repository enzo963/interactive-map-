import { useEffect, useMemo, useRef, useState } from 'react';
import HeritageCard from '../cards/HeritageCard';
import CardBack from '../cards/CardBack';
import FlipCard from '../cards/FlipCard';
import DeckPile from '../decks/DeckPile';
import SmartLink from '../common/SmartLink';
import { getDrawPools } from '../../utils/decks';
import { pickRandom } from '../../utils/random';
import { formatCount } from '../../utils/archiveStats';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import '../../styles/home.css';

const SHUFFLE_MS = 700;
const DEAL_DELAY_MS = 90;

/**
 * Draw a Card — deck → shuffle → card → flip → site.
 * Heritage discovery, not a game: no odds, no rewards, no scarcity.
 * Pools come from the collection system (utils/decks.js), so new thematic decks appear here automatically.
 */
export default function DrawCard({ sites }) {
  const [filterId, setFilterId] = useState('all');
  const [phase, setPhase] = useState('idle'); // idle | shuffling | revealed
  const [drawn, setDrawn] = useState(null);
  const [faceUp, setFaceUp] = useState(false);
  const reduced = usePrefersReducedMotion();
  const timers = useRef([]);
  const lastId = useRef(null);

  const pools = useMemo(() => getDrawPools(sites), [sites]);
  const active = pools.find((pool) => pool.id === filterId) ?? pools[0];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const draw = () => {
    if (phase === 'shuffling' || active.cards.length === 0) return;
    clearTimers();
    const next = pickRandom(active.cards, lastId.current);
    lastId.current = next.id;

    if (reduced) {
      setDrawn(next);
      setFaceUp(true);
      setPhase('revealed');
      return;
    }

    setFaceUp(false); // a previously drawn card turns back over
    setPhase('shuffling');
    later(() => setDrawn(next), SHUFFLE_MS); // dealt face-down
    later(() => {
      setFaceUp(true);
      setPhase('revealed');
    }, SHUFFLE_MS + DEAL_DELAY_MS);
  };

  const chooseFilter = (id) => {
    clearTimers();
    setFilterId(id);
    setPhase('idle');
    setFaceUp(false);
    setDrawn(null);
  };

  const announcement =
    phase === 'revealed' && drawn ? `Card drawn: ${drawn.name}. Archive number ${drawn.archiveNo}.` : '';

  return (
    <section className="hb-draw" id="draw" aria-labelledby="draw-title">
      <div className="hb-container hb-draw__grid">
        <div className="hb-draw__intro">
          <p className="hb-eyebrow">Not sure where to start?</p>
          <h2 id="draw-title" className="hb-draw__title">Draw a card</h2>
          <p className="hb-draw__lede">Discover a random heritage site from the archive.</p>

          <div className="hb-draw__filters" role="group" aria-label="Choose a deck to draw from">
            {pools.map((pool) => (
              <button
                type="button"
                key={pool.id}
                className="hb-chip"
                aria-pressed={pool.id === filterId}
                disabled={pool.cards.length === 0}
                onClick={() => chooseFilter(pool.id)}
              >
                {pool.label}
                <span className="hb-chip__count">{formatCount(pool.cards.length)}</span>
              </button>
            ))}
          </div>

          <div className="hb-draw__actions">
            <button
              type="button"
              className="hb-btn hb-btn--sand"
              onClick={draw}
              aria-disabled={phase === 'shuffling' || active.cards.length === 0}
            >
              {phase === 'revealed' ? 'Draw another card' : 'Draw a card'}
            </button>
            {phase === 'revealed' && drawn && (
              <SmartLink className="hb-link" href={drawn.href}>
                Open site record
              </SmartLink>
            )}
          </div>

          <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
        </div>

        <div className="hb-draw__table">
          <div className="hb-draw__spot hb-draw__spot--deck">
            <DeckPile
              variant={active.back}
              label={active.label}
              caption={`${active.cards.length} cards`}
              shuffling={phase === 'shuffling'}
            />
            <p className="hb-draw__tag">Deck</p>
          </div>

          <div className="hb-draw__spot hb-draw__spot--drawn">
            {drawn ? (
              <FlipCard
                flipped={faceUp}
                back={<CardBack variant={active.back} label={active.label} />}
                front={<HeritageCard site={drawn} headingLevel={3} showCta />}
              />
            ) : (
              <div className="hb-draw__empty" aria-hidden="true" />
            )}
            <p className="hb-draw__tag">Drawn card</p>
          </div>
        </div>
      </div>
    </section>
  );
}
