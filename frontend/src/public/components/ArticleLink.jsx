import { Link } from "react-router-dom";

/** Opens press release in a new tab (legacy: target="_blank" rel="nofollow"). */
export default function ArticleLink({ url, children, className }) {
  return (
    <Link
      to={`/newsroom/${url}`}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={className}
    >
      {children}
    </Link>
  );
}
