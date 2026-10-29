import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import '../../styles/site-details.css';

/** Image grid + lightbox built on the native <dialog> (focus trap, Esc, focus return come free). */
export default function Gallery({ images, name }) {
  const { t } = useI18n();
  const altOf = (image, i) => (image.autoAlt ? t('gallery.alt', { name, i: i + 1 }) : image.alt);
  const dialogRef = useRef(null);
  const [index, setIndex] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  const step = (delta) => setIndex((i) => (i + delta + images.length) % images.length);
  const current = index === null ? null : images[index];

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') step(1);
    if (event.key === 'ArrowLeft') step(-1);
  };

  return (
    <>
      <ul className="hb-gallery">
        {images.map((image, i) => (
          <li key={image.src}>
            <button type="button" className="hb-gallery__item" onClick={() => setIndex(i)} aria-label={t('gallery.open', { i: i + 1, n: images.length, alt: altOf(image, i) })}>
              <img src={image.src} alt="" loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="hb-lightbox"
        aria-label={t('gallery.viewer')}
        onClose={() => setIndex(null)}
        onKeyDown={onKeyDown}
        onClick={(event) => event.target === event.currentTarget && setIndex(null)}
      >
        {current && (
          <figure className="hb-lightbox__figure">
            <img src={current.src} alt={altOf(current, index)} />
            <figcaption>
              {current.caption || altOf(current, index)}
              <span className="hb-lightbox__count">{index + 1} / {images.length}</span>
            </figcaption>
          </figure>
        )}
        <div className="hb-lightbox__controls">
          {images.length > 1 && <button type="button" onClick={() => step(-1)}>{t('gallery.prev')}</button>}
          {images.length > 1 && <button type="button" onClick={() => step(1)}>{t('gallery.next')}</button>}
          <button type="button" onClick={() => setIndex(null)}>{t('common.close')}</button>
        </div>
      </dialog>
    </>
  );
}
