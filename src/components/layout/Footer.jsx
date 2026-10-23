import SmartLink from '../common/SmartLink';
import { PRIMARY_NAV } from '../../data/navigation';
import '../../styles/layout.css';

export default function Footer() {
  return (
    <footer className="hb-footer">
      <div className="hb-container hb-footer__grid">
        <div className="hb-footer__about">
          <p className="hb-footer__name">Heritage Bridge</p>
          <p className="hb-footer__text">
            A digital archive of heritage sites in Iraq, beginning with the north. Every site is a card;
            every card opens a record.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="hb-footer__list">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <SmartLink href={item.href}>{item.label}</SmartLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="hb-footer__note">
          Prototype. Records are subject to verification before publication.
        </p>
      </div>
    </footer>
  );
}
