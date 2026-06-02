import AdminDataTable from "./AdminDataTable";

/** @deprecated Use AdminDataTable directly — kept for analytics sales tabs. */
export default function AnalyticsServerTable(props) {
  return <AdminDataTable embedded minSearchLength={3} {...props} />;
}
