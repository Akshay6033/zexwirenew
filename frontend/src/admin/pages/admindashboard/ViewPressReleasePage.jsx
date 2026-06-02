import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminDateTimeCell from "../../components/AdminDateTimeCell";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { refreshEditorialCounts } from "../../utils/editorialCountsRefresh";
import { legacyImagesDataUrl, toDatetimeLocalValue } from "../../utils/pressReleaseFormUtils";

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

function isValidWebsite(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return !!u.hostname;
  } catch {
    return false;
  }
}

const TINYMCE_INIT = {
  height: 480,
  menubar: "file edit view insert format tools table help",
  license_key: "gpl",
  branding: false,
  skin: false,
  content_css: false,
  plugins:
    "advlist autolink lists link image table code searchreplace fullscreen preview media emoticons help wordcount insertdatetime",
  toolbar:
    "undo redo | blocks | bold italic | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image table | preview media | forecolor backcolor emoticons insertdatetime | removeformat code",
  insertdatetime_formats: [
    "%B %d, %Y %I:%M:%S %p",
    "%B %d, %Y %I:%M %p",
    "%Y-%m-%d %H:%M:%S",
    "%m/%d/%Y %I:%M:%S %p",
    "%B %d, %Y",
    "%Y-%m-%d",
    "%H:%M:%S",
    "%I:%M:%S %p",
    "%D"
  ],
  resize: true,
  content_style: [
    "body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
    "font-size: 14px; line-height: 1.4; margin: 1rem; }",
    "table { border-collapse: collapse; }",
    "figure { display: table; margin: 1rem auto; }",
    "figure figcaption { color: #999; margin-top: .25rem; text-align: center; }",
    "hr { border-color: #ccc; border-style: solid; border-width: 1px 0 0 0; }",
    "code { background-color: #e8e8e8; border-radius: 3px; padding: .1rem .2rem; }",
    ".mce-content-body:not([dir=rtl]) blockquote { border-left: 2px solid #ccc; margin-left: 1.5rem; padding-left: 1rem; }",
    ".mce-content-body[dir=rtl] blockquote { border-right: 2px solid #ccc; margin-right: 1.5rem; padding-right: 1rem; }"
  ].join(" ")
};

export default function ViewPressReleasePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pressId = Number(id);

  const [bootLoading, setBootLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePanelOpen, setImagePanelOpen] = useState(false);
  const [uploadImages, setUploadImages] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("0");
  const [contactPerson, setContactPerson] = useState("");
  const [cname, setCname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [countryId, setCountryId] = useState("0");
  const [showDetails, setShowDetails] = useState("0");
  const [releaseDate, setReleaseDate] = useState("");

  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [armedStatus, setArmedStatus] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusDatetime, setStatusDatetime] = useState("");
  const [hideEditPublish, setHideEditPublish] = useState(false);

  const adminUser = useMemo(() => JSON.parse(localStorage.getItem("adminUser") || "{}"), []);
  const editorial = payload?.editorial;
  const history = payload?.press_rel_history || [];

  const applyCompanyFields = useCallback((row) => {
    if (!row) return;
    setCname(row.cname || "");
    setAddress(row.address || "");
    setContactPerson(row.contact_person || "");
    setMobile(row.mobile || "");
    setEmail(row.email || "");
    setWebsite(row.website || "");
    setStateVal(row.state || "");
    setCountryId(row.country ? String(row.country) : "0");
  }, []);

  const loadViewData = useCallback(async () => {
    if (!pressId) return;
    setBootLoading(true);
    try {
      const res = await adminDashboardApi.getPressReleaseViewData(pressId);
      if (!res.data?.status) {
        toast.error(res.data?.message || "Could not load press release.");
        navigate("/admindashboard/manage_editorial");
        return;
      }
      const data = res.data.data;
      setPayload(data);
      setUploadImages(data.upload_images || []);
      const ed = data.editorial;
      setTitle(ed.title || "");
      setDescription(ed.description || "");
      setShowDetails(String(ed.show_contact_details ?? "0"));
      setReleaseDate(toDatetimeLocalValue(ed.date));
      const cid = Number(ed.company) || 0;
      setCompanyId(cid ? String(cid) : "0");
      if (data.company_detail) applyCompanyFields(data.company_detail);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load press release.");
      navigate("/admindashboard/manage_editorial");
    } finally {
      setBootLoading(false);
    }
  }, [pressId, navigate, applyCompanyFields]);

  useEffect(() => {
    loadViewData();
  }, [loadViewData]);

  const companyOptions = useMemo(() => {
    const uid = editorial?.user_id;
    const base = [{ value: "0", label: "Please Select Company" }];
    (payload?.companies || []).forEach((c) => {
      if (String(c.created_by) === String(uid) || String(c.id) === companyId) {
        base.push({ value: String(c.id), label: c.cname });
      }
    });
    return base;
  }, [payload, editorial, companyId]);

  const countryOptions = useMemo(
    () => [
      { value: "0", label: "Please select any country" },
      ...(payload?.countries || []).map((c) => ({ value: String(c.id), label: c.country_name }))
    ],
    [payload]
  );

  const companyLocked = Number(companyId) > 0;

  const onCompanyChange = async (val) => {
    setCompanyId(val);
    const cid = Number(val);
    if (!cid) {
      setContactPerson("");
      setCname("");
      setEmail("");
      setMobile("");
      setWebsite("");
      setAddress("");
      setStateVal("");
      setCountryId("0");
      return;
    }
    try {
      const res = await adminDashboardApi.postPressReleaseAutofillCompany(cid);
      if (res.data?.data) applyCompanyFields(res.data.data);
    } catch {
      toast.error("Could not load company details.");
    }
  };

  const validateCompanyManual = () => {
    if (Number(companyId) !== 0) return true;
    if (!cname.trim()) {
      toast.error("Enter company name or pick an existing company.");
      return false;
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Enter a valid email.");
      return false;
    }
    if (!isValidWebsite(website.trim())) {
      toast.error("Enter a valid website URL (http/https).");
      return false;
    }
    if (!stateVal.trim()) {
      toast.error("Enter city & state.");
      return false;
    }
    if (!Number(countryId) || countryId === "0") {
      toast.error("Select country.");
      return false;
    }
    return true;
  };

  const armAction = (status) => {
    if (showStatusPanel && armedStatus === status) {
      submitWithStatus(status);
      return;
    }
    setArmedStatus(status);
    setShowStatusPanel(true);
    if (status === 1) setHideEditPublish(true);
  };

  const preview = () => {
    const show = Number(showDetails);
    let previewPayload = {
      title,
      description,
      package: String(editorial?.p_id || ""),
      show_details_1: show
    };
    if (show === 1) {
      previewPayload = {
        ...previewPayload,
        company: Number(companyId) ? companyId : "0",
        cname: cname || "—",
        cadd: address || "—",
        cper: contactPerson || "—",
        cmobile: mobile || "—",
        cemail: email || "—",
        cwebsite: website || "—"
      };
    } else {
      previewPayload = {
        ...previewPayload,
        company: "N/A",
        cname: "N/A",
        cadd: "N/A",
        cper: "N/A",
        cmobile: "N/A",
        cemail: "N/A",
        cwebsite: "N/A"
      };
    }
    navigate("/admindashboard/press-release/preview", { state: previewPayload });
  };

  const submitWithStatus = async (status) => {
    if (!title.trim()) {
      toast.error("Enter title.");
      return;
    }
    const bodyHtml = description || "";
    if (!bodyHtml.replace(/<[^>]+>/g, "").trim()) {
      toast.error("Enter press release body.");
      return;
    }
    if (!releaseDate.trim()) {
      toast.error("Enter date & time.");
      return;
    }
    if (!showDetails || showDetails === "0") {
      toast.error("Select Yes/No for contact details.");
      return;
    }
    if (!validateCompanyManual()) return;
    if (!statusNote.trim() || !statusDatetime.trim()) {
      toast.error("Enter status note and date/time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminDashboardApi.updatePressReleaseAfterPublished(pressId, {
        user_id: editorial.user_id,
        company_id: Number(companyId) || 0,
        title: title.trim(),
        description: bodyHtml,
        status,
        show_contact_details: Number(showDetails),
        datetime: releaseDate.replace("T", " "),
        status_note: statusNote.trim(),
        status_datetime: statusDatetime.replace("T", " "),
        created_press: adminUser.id || 0,
        cname: cname.trim(),
        address: address.trim(),
        contact_person: contactPerson.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        website: website.trim(),
        state: stateVal.trim(),
        country: Number(countryId) || 0
      });
      if (!res.data?.status) {
        toast.error(res.data?.message || "Update failed.");
        return;
      }
      toast.success(res.data.message || "Press release updated.");
      refreshEditorialCounts();
      navigate("/admindashboard/manage_editorial");
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyImageUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Copied!"),
      () => toast.error("Copy failed")
    );
  };

  if (bootLoading) return <AdminPageLoader label="Loading press release…" />;
  if (!editorial) return null;

  const historyTitle =
    editorial.title?.length > 30 ? `${editorial.title.slice(0, 30)}…` : editorial.title;
  const showEditPublish = Number(editorial.status) === 2 && !hideEditPublish;
  const uploadCount = uploadImages.length;

  return (
    <div className="container-fluid view-pr-legacy-page edit-pr-legacy-page create-pr-legacy-page">
      <AdminPageBackHead title="View Press Release" backTo="/admindashboard/manage_editorial" />

      <div className="row">
        <div className="col-lg-12 col-sm-12">
          <div className="card m-b-30 form-body-border">
            <div className="card-body form-body table-responsive">
              <div className="edit-pr-badges mb-3">
                <span className="edit-pr-badge">Username :- {editorial.username || "—"}</span>
                <span className="edit-pr-badge">Status: {editorial.status_label}</span>
              </div>

              <div className="form-group">
                <label className="control-label" htmlFor="e_title">
                  Title of the release
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="e_title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group press-body">
                <label className="control-label" htmlFor="summernoteview">
                  Press Release body
                </label>
                <Editor
                  id="summernoteview"
                  textareaName="description"
                  value={description}
                  onEditorChange={(_c, ed) => setDescription(ed.getContent())}
                  init={TINYMCE_INIT}
                />
              </div>

              <div className="form-group press-release-img">
                <label className="control-label">Insert Image &amp; Copy Image URL</label>
                <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                  <button
                    type="button"
                    className="btn btn-primary insert-img-btn"
                    title="Add New Image"
                    onClick={() => setImagePanelOpen(true)}
                  >
                    <span className="insert-img-btn__icon" aria-hidden="true">
                      🖼
                    </span>
                  </button>
                  {uploadCount > 0 ? (
                    <strong className="text-success">
                      {uploadCount} Image Uploaded ✓
                    </strong>
                  ) : (
                    <strong className="text-danger">0 Image Uploaded ✗</strong>
                  )}
                </div>

                {imagePanelOpen && (
                  <div className="image_add_url card m-b-30">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0">Add Image &amp; Copy URL</h5>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setImagePanelOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                      <p className="text-muted small mb-2">
                        Image upload from the new admin API is not wired yet. Use the legacy dashboard to add images,
                        or attach images in the editor body.
                      </p>
                      <label className="control-label text-danger small">
                        JPEG &amp; JPG only. Max 2MB per image (legacy rule).
                      </label>
                      <input type="file" className="form-control mt-2" accept="image/jpeg,image/jpg" disabled />
                    </div>
                    {uploadImages.length > 0 && (
                      <table className="table table-bordered mb-0">
                        <thead>
                          <tr>
                            <th>Image</th>
                            <th>Image URL</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadImages.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <img
                                  src={row.image_path || legacyImagesDataUrl(row.image_name)}
                                  alt=""
                                  width={150}
                                  height={100}
                                />
                              </td>
                              <td className="small text-break">{row.image_path}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm me-1"
                                  onClick={() => toast.info("Delete image: use legacy admin or upcoming API.")}
                                >
                                  Delete Image
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() => copyImageUrl(row.image_path)}
                                >
                                  Copy Url
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              <div className="card m-b-30 form-body-border">
                <div className="card-body form-body1">
                  <div className="form-group">
                    <label className="control-label" htmlFor="p_company">
                      Select Company
                    </label>
                    <select
                      className="form-control"
                      id="p_company"
                      value={companyId}
                      onChange={(e) => onCompanyChange(e.target.value)}
                    >
                      {companyOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <h6 className="text-center create-pr-or">
                      <b>OR</b>
                    </h6>
                    <h6>Sender Details / Company Details</h6>
                  </div>
                  <div className="form-group-flex">
                    <div className="form-group fg1">
                      <label className="control-label">Contact Person Name :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        readOnly={companyLocked}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label">Company Name :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cname}
                        onChange={(e) => setCname(e.target.value)}
                        readOnly={companyLocked}
                      />
                    </div>
                  </div>
                  <div className="form-group-flex">
                    <div className="form-group fg1">
                      <label className="control-label">Email :-</label>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        readOnly={companyLocked}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label">Phone :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        readOnly={companyLocked}
                      />
                    </div>
                  </div>
                  <div className="form-group-flex">
                    <div className="form-group fg1">
                      <label className="control-label">Company Website :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        readOnly={companyLocked}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label">Company Address :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        readOnly={companyLocked}
                      />
                    </div>
                  </div>
                  <div className="form-group-flex">
                    <div className="form-group fg1">
                      <label className="control-label">City &amp; State (Both mandate) :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={stateVal}
                        onChange={(e) => setStateVal(e.target.value)}
                        readOnly={companyLocked}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label">Country</label>
                      <select
                        className="form-control"
                        value={countryId}
                        onChange={(e) => setCountryId(e.target.value)}
                        disabled={companyLocked}
                      >
                        {countryOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group-flex">
                <div className="form-group fg1">
                  <label className="control-label" htmlFor="showdetails">
                    Do you want to show contact details on Press Release?
                  </label>
                  <select
                    id="showdetails"
                    className="form-control"
                    value={showDetails}
                    onChange={(e) => setShowDetails(e.target.value)}
                  >
                    <option value="0">Do you want to show contact details on Press Release?</option>
                    <option value="1">Yes</option>
                    <option value="2">No</option>
                  </select>
                  <span className="create-pr-disclaimer d-block mt-2">
                    [ This means if you select &quot;NO&quot; then your contact details will not be visible in our
                    newsroom, but it will be syndicated and visible on other news Platforms ]
                  </span>
                </div>
                <div className="form-group fg1">
                  <label className="control-label">Select date &amp; time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="control-label">See note written by customer.</label>
                <textarea
                  className="form-control"
                  readOnly
                  value={editorial.add_note || ""}
                  placeholder="Didn't add note"
                  rows={3}
                />
              </div>

              {showStatusPanel && (
                <div className="card m-b-30 edit-pr-status-note-card">
                  <div className="card-body">
                    <div className="form-group">
                      <label className="control-label text-primary fw-bold">Note for status</label>
                      <textarea
                        className="form-control"
                        placeholder="Enter Note"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="form-group mb-0">
                      <label className="control-label text-primary fw-bold">Date for status</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={statusDatetime}
                        onChange={(e) => setStatusDatetime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <div className="submit-btn1">
                  {showEditPublish && (
                    <button
                      type="button"
                      className="btn btn-primary press-btn"
                      disabled={submitting}
                      onClick={() => armAction(2)}
                    >
                      Edit &amp; Publish
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger press-btn"
                    disabled={submitting}
                    onClick={() => armAction(1)}
                  >
                    Back to pending
                  </button>
                  <button type="button" className="btn btn-success press-btn" onClick={preview}>
                    Preview
                  </button>
                </div>
              </div>
            </div>

            <div className="row prhistory_show mx-0 mb-3">
              <div className="col-md-12">
                <h5 className="press_heading">Press Release History :- {historyTitle}</h5>
                <div className="table-responsive">
                  <table className="table table-bordered table-bg1">
                    <thead>
                      <tr>
                        <th>PR Status</th>
                        <th>Status Note</th>
                        <th>Status Date</th>
                        <th>
                          who&apos;s did
                          <br />
                          action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-muted">
                            No data available in table
                          </td>
                        </tr>
                      ) : (
                        history.map((row, idx) => (
                          <tr key={`${row.status_datetime}-${idx}`}>
                            <td>{row.status_label}</td>
                            <td>{row.status_note || "—"}</td>
                            <td>
                              <AdminDateTimeCell value={row.status_datetime} />
                            </td>
                            <td>{row.username}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
