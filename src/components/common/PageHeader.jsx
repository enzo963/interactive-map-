import '../../styles/pages.css';

/** Title block shared by the inner pages. Renders the page's single <h1>. */
export default function PageHeader({ eyebrow, title, lede, children }) {
  return (
    <header className="hb-pagehead">
      <div className="hb-container">
        {eyebrow && <p className="hb-eyebrow">{eyebrow}</p>}
        <h1 className="hb-pagehead__title">{title}</h1>
        {lede && <p className="hb-pagehead__lede">{lede}</p>}
        {children}
      </div>
    </header>
  );
}
