import { useId } from 'react';
import '../../styles/states.css';

/** Shared recovery presentation. Only genuine loading/errors interrupt live output. */
export default function StatePanel({ kind = 'empty', title, description, children, headingLevel = 2, compact = false }) {
  const id = useId();
  const Heading = `h${headingLevel}`;
  return (
    <section className={`hb-empty hb-state${compact ? ' hb-state--compact' : ''}`} data-state={kind}
      aria-labelledby={id}
      role={kind === 'loading' ? 'status' : kind === 'error' ? 'alert' : undefined}>
      <Heading id={id} className="hb-empty__title">{title}</Heading>
      {description && <p>{description}</p>}
      {children && <div className="hb-state__actions">{children}</div>}
    </section>
  );
}
