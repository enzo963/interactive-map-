/**
 * Single choke-point for internal links.
 * Plain <a> works everywhere. If the project uses react-router, swap the body for:
 *
 *   import { Link } from 'react-router-dom';
 *   export default function SmartLink({ href, ...rest }) { return <Link to={href} {...rest} />; }
 */
export default function SmartLink({ href, children, ...rest }) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
