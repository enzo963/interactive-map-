import { useEffect, useRef, useState } from 'react';
import '../../styles/site-details.css';

/** Image grid + lightbox built on the native <dialog> (focus trap, Esc, focus return come free). */
export default function Gallery({ images, renderAttribution }) {
  const dialogRef = useRef(null);
  const [index, setIndex] = useState(null);
  const [failed, setFailed] = useState(() => new Set());
  const unavailable = (src) => setFailed((previous) => new Set([...previous, src]));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
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
    if (index !== null && ['ArrowRight', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    }
  };

  return (
    <>
      <ul className="hb-gallery">
        {images.map((image, i) => (
          <li key={image.src}>
            <button type="button" className="hb-gallery__item" onClick={() => setIndex(i)} disabled={failed.has(image.src)} aria-label={failed.has(image.src) ? `Image unavailable: ${image.alt}` : `Open image ${i + 1} of ${images.length}: ${image.alt}`}>
              {failed.has(image.src) ? <span className="hb-gallery__unavailable">Image unavailable</span>
                : <img src={image.src} alt={image.alt} loading="lazy" decoding="async" onError={() => unavailable(image.src)} />}
            </button>
            {renderAttribution && <div className="hb-gallery__attribution">{renderAttribution(image)}</div>}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="hb-lightbox"
        aria-label="Image viewer"
        onClose={() => setIndex(null)}
        onKeyDown={onKeyDown}
        onClick={(event) => event.target === event.currentTarget && setIndex(null)}
      >
        {current && (
          <figure className="hb-lightbox__figure">
            {failed.has(current.src)
              ? <div className="hb-gallery__unavailable" role="img" aria-label={`Image unavailable: ${current.alt}`}>Image unavailable</div>
              : <img key={current.src} src={current.src} alt={current.alt} onError={() => unavailable(current.src)} />}
            <figcaption>
              <div>{current.caption || current.alt}{renderAttribution && renderAttribution(current)}</div>
              <span className="hb-lightbox__count">{index + 1} / {images.length}</span>
            </figcaption>
          </figure>
        )}
        <div className="hb-lightbox__controls">
          {images.length > 1 && <button type="button" onClick={() => step(-1)}>Previous</button>}
          {images.length > 1 && <button type="button" onClick={() => step(1)}>Next</button>}
          <button type="button" onClick={() => setIndex(null)}>Close</button>
        </div>
      </dialog>
    </>
  );
}
