import { useMemo, useState } from 'react';
import CardGrid from '../components/common/CardGrid';
import DeckPile from '../components/decks/DeckPile';
import SmartLink from '../components/common/SmartLink';
import NotFound from './NotFound';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/I18nContext';
import { useNavigate } from '../router/RouterContext';
import { CARD_TYPES } from '../data/cardTypes';
import { getAllSites } from '../services/siteService';
import { getDeckById } from '../utils/decks';
import { formatCount } from '../utils/archiveStats';
import { deckThickness } from '../utils/groupDecks';
import { SORTS } from '../utils/filterSites';
import '../styles/pages.css';

/** `byName` compares the names the visitor reads, in the language's own alphabet order. */
const makeSortFns = (byName) => ({
  archive: (a, b) => a.archiveNo.localeCompare(b.archiveNo, undefined, { numeric: true }),
  name: byName,
  oldest: (a, b) => (b.ageYears ?? -1) - (a.ageYears ?? -1),
  newest: (a, b) => (a.ageYears ?? Infinity) - (b.ageYears ?? Infinity),
  type: (a, b) => b.cardType.tier - a.cardType.tier || byName(a, b),
});

/** /decks/:deckId — also used for /3d-archive via the `deckId` prop. */
export default function DeckPage({ params, deckId }) {
  const id = deckId ?? params.deckId;
  const sites = useMemo(() => getAllSites(), []);
  const deck = useMemo(() => getDeckById(sites, id), [sites, id]);
  const navigate = useNavigate();
  const { t, ls, ld, localize, cardsLabel, pageTitle } = useI18n();
  const [tier, setTier] = useState('all');
  const [sort, setSort] = useState('archive');

  const text = deck ? ld(deck) : null;
  useDocumentTitle(pageTitle(text ? text.title : t('nf.deckTitle')));

  const tiers = useMemo(
    () => (deck ? CARD_TYPES.map((type) => ({ type, label: localize.cardType(type), count: deck.sites.filter((s) => s.cardType.tier === type.tier).length })).filter((t) => t.count > 0) : []),
    [deck, localize],
  );
  const shown = useMemo(() => {
    if (!deck) return [];
    const base = tier === 'all' ? deck.sites : deck.sites.filter((s) => String(s.cardType.tier) === tier);
    const byName = (a, b) => localize.compare(ls(a).name, ls(b).name);
    return [...base].sort(makeSortFns(byName)[sort]);
  }, [deck, tier, sort, ls, localize]);

  if (!deck) return <NotFound title={t('nf.deckTitle')} message={t('nf.deckMessage')} />;

  const drawFromDeck = () => {
    if (deck.sites.length === 0) return;
    const pick = deck.sites[Math.floor(Math.random() * deck.sites.length)];
    navigate(pick.href);
  };

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <div className="hb-container">
        <nav className="hb-crumbs" aria-label={t('common.breadcrumb')}>
          <ol>
            <li><SmartLink href="/decks">{t('nav.decks')}</SmartLink></li>
            <li aria-current="page">{text.title}</li>
          </ol>
        </nav>

        <header className="hb-deckhead">
          <div className="hb-deckhead__deck" aria-hidden="true">
            <DeckPile variant={deck.back} label={deck.kind === 'governorate' ? text.name : text.title} thickness={deckThickness(deck.count)} />
          </div>
          <div className="hb-deckhead__text">
            <p className="hb-eyebrow">{deck.kind === 'governorate' ? t('deck.kindGov') : t('deck.kindSpecial')}</p>
            <h1 className="hb-pagehead__title">{text.title}</h1>
            <p className="hb-pagehead__lede">{text.blurb}</p>
            <p className="hb-deckhead__count">{cardsLabel(deck.count)}</p>
            {tiers.length > 0 && (
              <ul className="hb-deckhead__types" aria-label={t('deck.byType')}>
                {tiers.map(({ type, label, count }) => (
                  <li key={type.id}><span>{label.shortLabel}</span> <b>{formatCount(count)}</b></li>
                ))}
              </ul>
            )}
            {deck.count > 0 && (
              <button type="button" className="hb-btn hb-btn--ink" onClick={drawFromDeck}>{t('deck.draw')}</button>
            )}
          </div>
        </header>

        {deck.count > 0 ? (
          <section aria-labelledby="deck-cards">
            <div className="hb-explore__bar hb-explore__bar--ruled">
              <h2 id="deck-cards" className="hb-section-title hb-decks__title">{t('deck.cardsIn')}</h2>
              <label className="hb-sort">
                <span>{t('sort.label')}</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  {SORTS.map((s) => <option value={s.id} key={s.id}>{t(`sort.${s.id}`)}</option>)}
                </select>
              </label>
            </div>
            {tiers.length > 1 && (
              <div className="hb-chips hb-chips--row" role="group" aria-label={t('deck.filterType')}>
                <button type="button" className="hb-tag" aria-pressed={tier === 'all'} onClick={() => setTier('all')}>{t('deck.allTypes')}</button>
                {tiers.map(({ type, label }) => (
                  <button type="button" className="hb-tag" aria-pressed={tier === String(type.tier)} onClick={() => setTier(String(type.tier))} key={type.id}>
                    {label.shortLabel}
                  </button>
                ))}
              </div>
            )}
            <CardGrid key={`${tier}-${sort}`} sites={shown} />
          </section>
        ) : (
          <p className="hb-empty__title">{t('deck.empty')}</p>
        )}
      </div>
    </main>
  );
}
