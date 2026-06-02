export default function NewsroomPagination({ pagination, onPageChange, loading }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, pages, hasPrev, hasNext } = pagination;

  return (
    <div className="newsroom-pagination">
      <button
        type="button"
        className="page-btn nav-btn"
        disabled={!hasPrev || loading}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`page-btn ${p === page ? "active" : ""}`}
          disabled={loading}
          onClick={() => onPageChange(p)}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="page-btn nav-btn"
        disabled={!hasNext || loading}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
