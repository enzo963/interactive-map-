import { useNavigate } from '../../router/RouterContext';

/**
 * Internal links navigate without a page reload. External links, new-tab clicks,
 * modified clicks (ctrl/cmd/shift) and "#hash" links keep normal browser behaviour.
 */
export default function SmartLink({ href, children, onClick, target, ...rest }) {
  const navigate = useNavigate();

  const handleClick = (event) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target && target !== '_self') return;
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    event.preventDefault();
    navigate(href);
  };

  return (
    <a href={href} target={target} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
