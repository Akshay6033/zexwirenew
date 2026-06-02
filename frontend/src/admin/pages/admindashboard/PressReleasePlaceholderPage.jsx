import { Link, useParams } from "react-router-dom";
import AdminPageBackHead from "../../components/AdminPageBackHead";

const titles = {
  create: "Create Press Release",
  edit: "Edit Press Release",
  view: "View Press Release",
  history: "Press Release History"
};

export default function PressReleasePlaceholderPage({ mode }) {
  const { id } = useParams();
  const heading = titles[mode] || "Press Release";
  return (
    <div className="container-fluid manage-editorial-placeholder">
      <AdminPageBackHead title={heading} backTo="/admindashboard/manage_editorial" />
      <div className="admin-card p-4">
        <p className="text-muted mb-2">
          {mode === "create" && "Admin create-PR form (user, package, TinyMCE, gallery, company) will be wired here next."}
          {mode === "edit" && id && `PR id ${id}: full edit flow, status notes, and history table will mirror the legacy PHP screen.`}
          {mode === "view" && id && `PR id ${id}: read-only view will load from the API here.`}
          {mode === "history" && id && `PR id ${id}: status history (pending / published / action / reject) will load here from master_press_status.`}
        </p>
        <Link to="/admindashboard/manage_editorial" className="btn btn-primary rounded-pill">
          Back to Editorial Room
        </Link>
      </div>
    </div>
  );
}
