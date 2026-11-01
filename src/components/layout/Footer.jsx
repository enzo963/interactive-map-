import SmartLink from '../common/SmartLink';
import { PRIMARY_NAV, PROJECT_NAV } from '../../data/navigation';
import '../../styles/layout.css';

export default function Footer() {
  return (
    <footer className="hb-footer">
      <div className="hb-container hb-footer__grid">
        <div className="hb-footer__about">
          <SmartLink href="/" className="hb-footer__name">History in Cards</SmartLink>
          <p className="hb-footer__text">
            A growing digital archive of heritage sites in northern and central Iraq. Every site is a card;
            every card opens a record.
          </p>
        </div>
        <nav aria-label="Explore the archive">
          <h2 className="hb-footer__heading">Explore</h2>
          <ul className="hb-footer__list">
            {[{ label: 'Home', href: '/' }, ...PRIMARY_NAV].map((item) => (
              <li key={item.href}>
                <SmartLink href={item.href}>{item.label}</SmartLink>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="About the project">
          <h2 className="hb-footer__heading">Project</h2>
          <ul className="hb-footer__list">
            {[...PROJECT_NAV, { label: 'Our Documentation', href: '/decks/our-work' }].map((item) => (
              <li key={item.href}><SmartLink href={item.href}>{item.label}</SmartLink></li>
            ))}
          </ul>
        </nav>
        <p className="hb-footer__note">
          Built from reviewed sources. Coverage is growing and records remain open to correction.
          {' '}<SmartLink href="/methodology">Read our methodology</SmartLink>.
        </p>
      </div>
    </footer>
  );
}
