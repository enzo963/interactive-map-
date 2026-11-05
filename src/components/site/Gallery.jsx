import { useEffect, useRef, useState } from 'react';
import '../../styles/site-details.css';
import { t } from '../../i18n';
import ResponsiveImage from '../common/ResponsiveImage';

/** Image grid + lightbox built on the native <dialog> (focus trap, Esc, focus return come free). */
export default function Gallery({ images, renderAttribution }) {
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const closeRef = useRef(null);
  const galleryRef = useRef(null);
  const [index, setIndex] = useState(null);
  const [failed, setFailed] = useState(() => new Set());
  const [loaded, setLoaded] = useState(() => new Set());
  const unavailable = (src) => setFailed((previous) => new Set([...previous, src]));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    }
    if (index === null) {
      if (dialog.open) dialog.close();
      if (openerRef.current?.isConnected) {
        const target = !openerRef.current.disabled ? openerRef.current
          : galleryRef.current?.querySelector('button:not(:disabled)') ?? galleryRef.current;
        target?.focus();
      }
    }
  }, [index]);

  const step = (delta) => setIndex((i) => {
    if (i === null) return null;
    for (let offset = 1; offset <= images.length; offset += 1) {
      const next = (i + delta * offset + images.length) % images.length;
      if (!failed.has(images[next].src)) return next;
    }
    return null;
  });
  const current = index === null ? null : images[index];

  const onKeyDown = (event) => {
    if (index !== null && event.key === 'Tab') {
      const controls = [...dialogRef.current.querySelectorAll('a[href], button:not(:disabled), [tabindex="0"]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    if (index !== null && ['ArrowRight', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    }
  };

  return (
    <>
      <ul className="hb-gallery" ref={galleryRef} tabIndex={-1} aria-label={t('Site images')}>
        {images.map((image, i) => (
          <li key={image.src}>
            <button type="button" className="hb-gallery__item" onClick={(event) => { openerRef.current = event.currentTarget; setIndex(i); }} disabled={failed.has(image.src)} aria-label={failed.has(image.src) ? t('Image unavailable: {alt}', { alt: image.alt }) : t('Open image {n} of {total}: {alt}', { n: i + 1, total: images.length, alt: image.alt })}>
              {failed.has(image.src) ? <span className="hb-gallery__unavailable">{t('Image unavailable')}</span>
                : <ResponsiveImage image={image} alt={image.alt} role="thumb" onError={() => unavailable(image.src)} />}
            </button>
            {renderAttribution && <div className="hb-gallery__attribution">{renderAttribution(image)}</div>}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="hb-lightbox"
        aria-label={t('Image viewer')}
        onClose={() => setIndex(null)}
        onKeyDown={onKeyDown}
        onClick={(event) => event.target === event.currentTarget && setIndex(null)}
      >
        {current && (
          <figure className="hb-lightbox__figure">
            {failed.has(current.src)
              ? <div className="hb-gallery__unavailable" role="img" aria-label={t('Image unavailable: {alt}', { alt: current.alt })}>{t('Image unavailable')}</div>
              // Opened on request, so it loads at once in the gallery/full renditions.
              : <ResponsiveImage key={current.src} image={current} alt={current.alt} role="gallery" priority
                onLoad={() => setLoaded((previous) => new Set([...previous, current.src]))}
                onError={() => unavailable(current.src)} />}
            <figcaption>
              <div>{current.caption || current.alt}{renderAttribution && renderAttribution(current)}</div>
              <span className="hb-lightbox__count">{index + 1} / {images.length}</span>
            </figcaption>
          </figure>
        )}
        <p className="hb-lightbox__status" role="status" aria-live="polite" aria-atomic="true">
          {current && `${failed.has(current.src) ? `${t('Image unavailable.')} ` : !loaded.has(current.src) ? `${t('Loading image.')} ` : ''}${t('Image {n} of {total}: {alt}', { n: index + 1, total: images.length, alt: current.alt })}`}
        </p>
        <div className="hb-lightbox__controls">
          {images.length > 1 && <button type="button" onClick={() => step(-1)}>{t('Previous')}</button>}
          {images.length > 1 && <button type="button" onClick={() => step(1)}>{t('Next')}</button>}
          <button type="button" ref={closeRef} onClick={() => setIndex(null)}>{t('Close')}</button>
        </div>
      </dialog>
    </>
  );
}
