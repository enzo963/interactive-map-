import { useState } from 'react';
import { getSiteShareUrl } from '../../utils/siteLinks';
import '../../styles/collections.css';
import { t } from '../../i18n';

export default function ShareSite({ site }) {
  const [message, setMessage] = useState('');
  const [manual, setManual] = useState(false);
  const url = getSiteShareUrl(site);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setMessage(t('Link copied.'));
      setManual(false);
    } catch {
      setManual(true);
      setMessage(t('Select and copy the link below.'));
    }
  };
  const share = async () => {
    setMessage('');
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: site.name, url });
      setMessage(t('Sharing opened.'));
    } catch (error) {
      if (error.name !== 'AbortError') await copy();
    }
  };
  return (
    <section className="hb-share" aria-label={t('Share this heritage site')}>
      <div className="hb-share__actions">
        <button type="button" className="hb-btn" onClick={share}>
          {t('Share site')}
        </button>
        <button type="button" className="hb-btn" onClick={copy}>
          {t('Copy link')}
        </button>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {manual && (
        <label className="hb-share__manual">
          {t('Site link')}
          <input
            ref={(node) => {
              if (node) {
                node.focus();
                node.select();
              }
            }}
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
          />
        </label>
      )}
    </section>
  );
}
