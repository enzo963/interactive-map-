import { useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import DeckTile from '../components/decks/DeckTile';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useI18n } from '../i18n/I18nContext';
import { getAllSites } from '../services/siteService';
import { getGovernorateDecks, getSpecialDecks } from '../utils/decks';
import '../styles/pages.css';

export default function Decks() {
  const { t, pageTitle } = useI18n();
  useDocumentTitle(pageTitle(t('title.decks')));
  const sites = useMemo(() => getAllSites(), []);
  const governorates = useMemo(() => getGovernorateDecks(sites), [sites]);
  const special = useMemo(() => getSpecialDecks(sites), [sites]);

  return (
    <main id="main" tabIndex={-1} className="hb-page">
      <PageHeader
        eyebrow={t('decks.eyebrow')}
        title={t('decks.title')}
        lede={t('decks.lede')}
      />
      <div className="hb-container hb-decks">
        <section aria-labelledby="decks-gov">
          <h2 id="decks-gov" className="hb-section-title hb-decks__title">{t('govs.title')}</h2>
          <ul className="hb-tiles">{governorates.map((deck) => <DeckTile deck={deck} key={deck.id} />)}</ul>
        </section>
        <section aria-labelledby="decks-special">
          <h2 id="decks-special" className="hb-section-title hb-decks__title">{t('sdecks.title')}</h2>
          <ul className="hb-tiles">{special.map((deck) => <DeckTile deck={deck} key={deck.id} />)}</ul>
        </section>
      </div>
    </main>
  );
}
