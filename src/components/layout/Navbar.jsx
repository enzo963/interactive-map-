import { useEffect, useRef, useState } from 'react';
import SmartLink from '../common/SmartLink';
import SearchAutocomplete from '../common/SearchAutocomplete';
import { useLocation, useNavigate } from '../../router/RouterContext';
import { PRIMARY_NAV, PROJECT_NAV } from '../../data/navigation';
import { t } from '../../i18n';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
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
  const location = useLocation();
  const pathname = location.pathname.replace(/\/+$/, '') || '/';
  const locationKey = `${location.pathname}${location.search}${location.hash}`;
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [menuLocation, setMenuLocation] = useState(locationKey);
  // Reset only menu state on navigation; preserve the search field and its focus.
  if (menuLocation !== locationKey) {
    setMenuLocation(locationKey);
    setOpen(false);
  }
  const menuToggle = useRef(null);
  const projectMenu = useRef(null);
  const projectCurrent = PROJECT_NAV.some((item) => item.href === pathname);
  const isCurrent = (href) => {
    const aliases = { '/decks/unesco': '/unesco', '/decks/3d': '/3d-archive', '/decks/lost': '/disappeared-heritage' };
    const here = aliases[pathname] ?? (pathname.startsWith('/sites/') ? '/explore' : pathname);
    if (href === '/civilizations' && here.startsWith('/civilizations/')) return true;
    return here === href || (href === '/decks' && here.startsWith('/decks/'));
  };

  useEffect(() => {
    if (projectMenu.current) projectMenu.current.open = false;
  }, [locationKey]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (projectMenu.current?.open) {
        event.preventDefault();
        projectMenu.current.open = false;
        projectMenu.current.querySelector('summary')?.focus();
      } else if (open) {
        event.preventDefault();
        setOpen(false);
        menuToggle.current?.focus();
      }
    };
    const onPointer = (event) => {
      if (projectMenu.current && !projectMenu.current.contains(event.target)) projectMenu.current.open = false;
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const closeOnLink = (event) => {
    if (event.target.closest('a')) {
      setOpen(false);
      if (projectMenu.current) projectMenu.current.open = false;
    }
  };

  return (
    <header className={`hb-header ${open ? 'is-open' : ''}`.trim()}>
      <a className="hb-skip" href="#main">
        {t('Skip to content')}
      </a>
      <div className="hb-container hb-header__bar">
        <SmartLink href="/" className="hb-brand">
          <BrandMark />
          <span className="hb-brand__name">History in Cards</span>
        </SmartLink>

        <button
          type="button"
          ref={menuToggle}
          className="hb-header__toggle"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={() => {
            setOpen((value) => !value);
            if (projectMenu.current) projectMenu.current.open = false;
          }}
        >
          {open ? t('Close') : t('Menu')}
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
          <SearchAutocomplete
            id="global-heritage-search"
            name="q"
            type="search"
            value={query}
            onChange={setQuery}
            placeholder={t('Find a heritage site')}
            enterKeyHint="search"
          />
          <button type="submit">{t('Search')}</button>
        </form>
        <nav id="primary-nav" className="hb-nav" aria-label={t('Primary')} onClick={closeOnLink}>
          <ul className="hb-nav__list">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <SmartLink
                  className="hb-nav__link"
                  href={item.href}
                  aria-current={isCurrent(item.href) ? 'page' : undefined}
                >
                  {t(item.label)}
                </SmartLink>
              </li>
            ))}
          </ul>
          <details className="hb-project-menu" ref={projectMenu}>
            <summary className="hb-nav__link" data-current={projectCurrent ? 'true' : undefined}>{t('Project')}</summary>
            <ul className="hb-project-menu__list">
              {PROJECT_NAV.map((item) => (
                <li key={item.href}>
                  <SmartLink href={item.href} aria-current={isCurrent(item.href) ? 'page' : undefined}>
                    {t(item.label)}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </details>
          <SmartLink href="/#draw" className="hb-btn hb-btn--ink hb-nav__cta">
            {t('Draw a Card')}
          </SmartLink>
        </nav>
      </div>
    </header>
  );
}
