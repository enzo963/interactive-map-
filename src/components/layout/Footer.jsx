import SmartLink from '../common/SmartLink';
import { PRIMARY_NAV, PROJECT_NAV } from '../../data/navigation';
import '../../styles/layout.css';
import { t } from '../../i18n';

export default function Footer() {
  return (
    <footer className="hb-footer">
      <div className="hb-container hb-footer__grid">
        <div className="hb-footer__about">
          <SmartLink href="/" className="hb-footer__name">{t('History in Cards')}</SmartLink>
          <p className="hb-footer__text">
            {t('A growing digital archive of heritage sites in northern and central Iraq. Every site is a card; every card opens a record.')}
          </p>
        </div>
        <nav aria-label={t('Explore the archive')}>
          <h2 className="hb-footer__heading">{t('Explore')}</h2>
          <ul className="hb-footer__list">
            {[{ label: 'Home', href: '/' }, ...PRIMARY_NAV].map((item) => (
              <li key={item.href}>
                <SmartLink href={item.href}>{t(item.label)}</SmartLink>
              </li>
            ))}
            <li><SmartLink href="/collections">{t('Curated collections')}</SmartLink></li>
          </ul>
        </nav>
        <nav aria-label={t('About the project')}>
          <h2 className="hb-footer__heading">{t('Project')}</h2>
          <ul className="hb-footer__list">
            {[...PROJECT_NAV, { label: 'Our Documentation', href: '/decks/our-work' }].map((item) => (
              <li key={item.href}><SmartLink href={item.href}>{t(item.label)}</SmartLink></li>
            ))}
          </ul>
        </nav>
        <p className="hb-footer__note">
          {t('Built from reviewed sources. Coverage is growing and records remain open to correction.')}
          {' '}<SmartLink href="/methodology">{t('Read our methodology')}</SmartLink>.
        </p>
      </div>
    </footer>
  );
}
