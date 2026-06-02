function AdminPageLoader({ label = "Loading…" }) {
  return (
    <div className="admin-page-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="admin-page-loader-spinner" aria-hidden="true" />
      <span className="admin-page-loader-text">{label}</span>
    </div>
  );
}

export default AdminPageLoader;
