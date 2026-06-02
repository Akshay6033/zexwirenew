import { Link, useLocation, useNavigate } from "react-router-dom";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import { useEffect, useState } from "react";

export default function PressReleasePreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    const d = location.state;
    if (!d || !d.title) {
      navigate("/admindashboard/press-release/create", { replace: true });
      return;
    }
    setData(d);
  }, [location.state, navigate]);

  if (!data) return null;

  return (
    <div className="container-fluid create-pr-legacy-page">
      <AdminPageBackHead title="Preview" onBack={() => navigate(-1)} />
      <div className="card m-b-30 form-body-border">
        <div className="card-body">
          <h5 className="mb-3">{data.title}</h5>
          <div className="preview-pr-html border rounded p-3 bg-white" dangerouslySetInnerHTML={{ __html: data.description || "" }} />
          <div className="mt-4 small text-muted">
            <div>Package id: {data.package}</div>
            <div>Show contact: {data.show_details_1}</div>
            {data.show_details_1 === 1 && (
              <div className="mt-2">
                <strong>{data.cname}</strong>
                <div>{data.cadd}</div>
                <div>{data.cper}</div>
                <div>{data.cmobile}</div>
                <div>{data.cemail}</div>
                <div>{data.cwebsite}</div>
              </div>
            )}
          </div>
          <Link to="/admindashboard/press-release/create" className="btn btn-primary mt-3">
            Back to form
          </Link>
        </div>
      </div>
    </div>
  );
}
