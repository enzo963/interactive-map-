import { useEffect, useState } from 'react';
import SmartLink from '../common/SmartLink';
import { useLocation } from '../../router/RouterContext';
import { PRIMARY_NAV } from '../../data/navigation';
import '../../styles/layout.css';

function BrandMark() {
  return (
    <svg className="hb-brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <rect x="4" y="7" width="12" height="18" transform="rotate(-8 10 16)" />
        <rect x="16" y="7" width="12" height="18" transform="rotate(7 22 16)" />
        <path d="M10 25c3 3 9 3 12 0" />
      </g>
    </svg>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isCurrent = (href) => {
    const here = pathname.startsWith('/sites/') ? '/explore' : pathname; // a site belongs to Explore
    return here === href || here.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const closeOnLink = (event) => {
    if (event.target.closest('a')) setOpen(false);
  };

  return (
    <header className={`hb-header ${open ? 'is-open' : ''}`.trim()}>
      <a className="hb-skip" href="#main">Skip to content</a>
      <div className="hb-container hb-header__bar">
        <SmartLink href="/" className="hb-brand">
          <BrandMark />
          <span className="hb-brand__name">Heritage Bridge</span>
        </SmartLink>

        <button
          type="button"
          className="hb-header__toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <nav id="primary-nav" className="hb-nav" aria-label="Primary" onClick={closeOnLink}>
          <ul className="hb-nav__list">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <SmartLink
                  className="hb-nav__link"
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </SmartLink>
              </li>
            ))}
          </ul>
          <SmartLink href="/#draw" className="hb-btn hb-btn--ink hb-nav__cta">
            Draw a Card
          </SmartLink>
        </nav>
      </div>
    </header>
  );
}
