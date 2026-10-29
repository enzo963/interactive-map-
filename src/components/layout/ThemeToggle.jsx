import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../theme/ThemeContext';

const Icon = ({ children }) => (
  <svg className="hb-theme__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</g>
  </svg>
);

/** The icon shows what the button will switch to; the label says it in words. */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const label = t(theme === 'dark' ? 'tools.toLight' : 'tools.toDark');

  return (
    <button type="button" className="hb-theme" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? (
        <Icon>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
        </Icon>
      ) : (
        <Icon>
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
        </Icon>
      )}
    </button>
  );
}
