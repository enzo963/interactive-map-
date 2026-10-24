import { useEffect, useRef, useState } from 'react';
import '../../styles/site-details.css';

/** Image grid + lightbox built on the native <dialog> (focus trap, Esc, focus return come free). */
export default function Gallery({ images }) {
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
            <button type="button" className="hb-gallery__item" onClick={() => setIndex(i)} aria-label={`Open image ${i + 1} of ${images.length}: ${image.alt}`}>
              <img src={image.src} alt="" loading="lazy" decoding="async" />
            </button>
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
            <img src={current.src} alt={current.alt} />
            <figcaption>
              {current.caption || current.alt}
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
