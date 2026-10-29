import '../../styles/phase4.css';

/** Minimum number of rendered sections before the "On this page" list is worth showing. */
export const MIN_SECTIONS_FOR_NAV = 4;

/**
 * Built from the exact list of sections the page renders, so it can never link to a section
 * that is not there. Links are plain #hash anchors (native scrolling, honours scroll-padding).
 */
export default function SectionNav({ items }) {
  if (items.length < MIN_SECTIONS_FOR_NAV) return null;
  return (
    <nav className="hb-sectionnav" aria-label="On this page">
      <ol>
        {items.map((item) => (
          <li key={item.id}><a href={`#${item.id}`}>{item.title}</a></li>
        ))}
      </ol>
    </nav>
  );
}
