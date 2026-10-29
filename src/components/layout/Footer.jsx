import SmartLink from '../common/SmartLink';
import { PRIMARY_NAV } from '../../data/navigation';
import { useI18n } from '../../i18n/I18nContext';
import '../../styles/layout.css';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="hb-footer">
      <div className="hb-container hb-footer__grid">
        <div className="hb-footer__about">
          <p className="hb-footer__name">{t('brand.name')}</p>
          <p className="hb-footer__text">{t('footer.about')}</p>
        </div>
        <nav aria-label={t('nav.footer')}>
          <ul className="hb-footer__list">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <SmartLink href={item.href}>{t(`nav.${item.id}`)}</SmartLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="hb-footer__note">{t('footer.note')}</p>
      </div>
    </footer>
  );
}
