import AdminBackButton from "./AdminBackButton";

export default function AdminPageBackHead({ title, backTo, onBack, className = "" }) {
  return (
    <div className={`page-head d-flex justify-content-between align-items-center mb-3 ${className}`.trim()}>
      <h4 className="mt-2 mb-2">{title}</h4>
      <AdminBackButton to={backTo} onClick={onBack} />
    </div>
  );
}
