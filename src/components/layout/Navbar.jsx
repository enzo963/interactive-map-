import { useEffect, useRef, useState } from 'react';
import SmartLink from '../common/SmartLink';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { useI18n } from '../../i18n/I18nContext';
import { useLocation, useNavigate } from '../../router/RouterContext';
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

const NAV_LINKS = [
  { label: 'Map', href: '/map' },
  { label: 'Cards', href: '/explore' },
  { label: 'DocH Project', href: '/our-work' },
  { label: 'About us', href: '/about' },
];

export default function Navbar({ query, setQuery }) {
  const { t } = useI18n();
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const isHome = pathname === '/';
  const locationKey = `${location.pathname}${location.search}${location.hash}`;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuLocation, setMenuLocation] = useState(locationKey);
  // Reset only menu state on navigation; preserve the search field and its focus.
  if (menuLocation !== locationKey) {
    setMenuLocation(locationKey);
    setOpen(false);
  }
  const menuToggle = useRef(null);
  const currentPage = pathname.startsWith('/sites/') || pathname.startsWith('/decks/') ||
    ['/decks', '/unesco', '/3d-archive'].includes(pathname) ? '/explore' : pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
      menuToggle.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`hb-header${open ? ' is-open' : ''}`}>
      <a className="hb-skip" href="#main">
        {t('common.skip')}
      </a>
      <div className="hb-container hb-header__bar">
        <SmartLink href="/" className="hb-brand" onClick={() => setOpen(false)}>
          <BrandMark />
          <span className="hb-brand__name">{t('brand.name')}</span>
        </SmartLink>

        <button
          type="button"
          ref={menuToggle}
          className="hb-header__toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? t('common.close') : t('nav.menu')}
        </button>

        <div className="hb-tools">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <form
          className="hb-global-search"
          role="search"
          aria-label={t('Global heritage search')}
          onSubmit={(event) => {
            event.preventDefault();
            const q = query.trim();
            navigate(`/explore${q ? `?${new URLSearchParams({ q })}` : ''}`);
            setOpen(false);
          }}
        >
          <label className="sr-only" htmlFor="global-heritage-search">
            {t('Search heritage by name or alternative name')}
          </label>
          <input
            id="global-heritage-search"
            name="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isHome ? t('Name, place or period') : t('Find a heritage site')}
            enterKeyHint="search"
          />
          <button type="submit" className="hb-global-search__icon" aria-label={t('Search')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="5.5" />
              <path d="m15 15 4 4" />
            </svg>
          </button>
        </form>

        <nav id="primary-nav" className="hb-nav" aria-label={t('nav.primary')}>
          <ul className="hb-nav__list">
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <SmartLink
                  className="hb-nav__link"
                  href={item.href}
                  aria-current={currentPage === item.href ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {t(item.label)}
                </SmartLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}