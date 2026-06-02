import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { toast } from "react-toastify";
import AdminPageBackHead from "../../components/AdminPageBackHead";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminDateTimeCell from "../../components/AdminDateTimeCell";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { refreshEditorialCounts } from "../../utils/editorialCountsRefresh";
import { setEditorialSkipMarkViewed } from "../../utils/editorialSkipMarkViewed";
import {
  extractImageNamesFromHtml,
  legacyImagesDataUrl,
  toDatetimeLocalValue
} from "../../utils/pressReleaseFormUtils";

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

export default function EditPressReleasePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const pressId = Number(id);
  const returnTo = location.state?.returnTo || "/admindashboard/manage_editorial";

  const [bootLoading, setBootLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
  const [cityVal, setCityVal] = useState("");
  const [countryId, setCountryId] = useState("0");
  const [showDetails, setShowDetails] = useState("0");
  const [releaseDate, setReleaseDate] = useState("");
  const [galleryId, setGalleryId] = useState("");
  const [galleryDetail, setGalleryDetail] = useState(null);

  const [showStatusPanel, setShowStatusPanel] = useState(false);
  const [armedStatus, setArmedStatus] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusDatetime, setStatusDatetime] = useState("");
  const [hidePublish, setHidePublish] = useState(false);
  const [hidePending, setHidePending] = useState(false);
  const [showActionRequiredBtn, setShowActionRequiredBtn] = useState(false);

  const editorial = payload?.editorial;
  const adminUser = useMemo(() => JSON.parse(localStorage.getItem("adminUser") || "{}"), []);

  const applyCompanyFields = useCallback((row, locked) => {
    if (!row) return;
    setCname(row.cname || "");
    setAddress(row.address || "");
    setContactPerson(row.contact_person || "");
    setMobile(row.mobile || "");
    setEmail(row.email || "");
    setWebsite(row.website || "");
    setStateVal(row.state || "");
    setCityVal(row.city || "");
    setCountryId(row.country ? String(row.country) : "0");
    if (locked) {
      /* readonly when existing company selected — handled via disabled={Number(companyId) > 0} */
    }
  }, []);

  const loadEditData = useCallback(async () => {
    if (!pressId) return;
    setBootLoading(true);
    try {
      const res = await adminDashboardApi.getPressReleaseEditData(pressId);
      if (!res.data?.status) {
        toast.error(res.data?.message || "Could not load press release.");
        navigate(returnTo);
        return;
      }
      const data = res.data.data;
      setPayload(data);
      const ed = data.editorial;
      setTitle(ed.title || "");
      setDescription(ed.description || "");
      setShowDetails(String(ed.show_contact_details ?? "0"));
      setReleaseDate(toDatetimeLocalValue(ed.date));
      const cid = Number(ed.company) || 0;
      setCompanyId(cid ? String(cid) : "0");
      if (data.company_detail) {
        applyCompanyFields(data.company_detail, !!cid);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load press release.");
      navigate(returnTo);
    } finally {
      setBootLoading(false);
    }
  }, [pressId, navigate, applyCompanyFields]);

  useEffect(() => {
    loadEditData();
  }, [loadEditData]);

  const companyOptions = useMemo(() => {
    const base = [{ value: "0", label: "Please Select Company" }];
    (payload?.companies || []).forEach((c) => base.push({ value: String(c.id), label: c.cname }));
    return base;
  }, [payload]);

  const countryOptions = useMemo(
    () => [
      { value: "0", label: "Please select any country" },
      ...(payload?.countries || []).map((c) => ({ value: String(c.id), label: c.country_name }))
    ],
    [payload]
  );

  const filenames = payload?.filenames || [];
  const uploadImages = payload?.upload_images || [];
  const history = payload?.press_rel_history || [];

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
      setCityVal("");
      setCountryId("0");
      return;
    }
    try {
      const res = await adminDashboardApi.postPressReleaseAutofillCompany(cid);
      if (res.data?.data) applyCompanyFields(res.data.data, true);
    } catch {
      toast.error("Could not load company details.");
    }
  };

  const onGalleryChange = async (gid) => {
    setGalleryId(gid);
    setGalleryDetail(null);
    if (!gid) return;
    try {
      const res = await adminDashboardApi.getPressReleaseGalleryDetail(gid);
      if (res.data?.status) setGalleryDetail(res.data.data);
    } catch {
      toast.error("Could not load gallery image.");
    }
  };

  const copyGalleryUrl = () => {
    if (!galleryDetail?.image_path) return;
    navigator.clipboard.writeText(galleryDetail.image_path).then(
      () => toast.success("Copied!"),
      () => toast.error("Copy failed")
    );
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
      toast.error("Enter state.");
      return false;
    }
    if (!cityVal.trim()) {
      toast.error("Enter city.");
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
    if (status === 2) {
      setHidePending(true);
    } else if (status === 1) {
      setHidePublish(true);
    } else if (status === 5) {
      setHidePublish(true);
      setHidePending(true);
    } else if (status === 3) {
      setHidePublish(true);
      setHidePending(true);
    }
  };

  const onActionRequiredRadio = () => {
    setHidePublish(true);
    setHidePending(true);
    setShowActionRequiredBtn(true);
    setArmedStatus(3);
    setShowStatusPanel(true);
  };

  const preview = () => {
    const show = Number(showDetails);
    let previewPayload = { title, description, package: String(editorial?.p_id || ""), show_details_1: show };
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
    if (status !== 0 && (!statusNote.trim() || !statusDatetime.trim())) {
      toast.error("Enter status note and date/time.");
      return;
    }

    try {
      const chk = await adminDashboardApi.getPressReleaseCheckTitle(title.trim(), pressId);
      if (!chk.data?.available) {
        toast.error("Title already exists. Use a new title.");
        return;
      }
    } catch {
      /* continue */
    }

    const imgs = extractImageNamesFromHtml(bodyHtml);
    const imgList = imgs ? JSON.parse(imgs) : [];
    if (imgList.length > 5) {
      toast.error("Please upload only five or fewer images in the body.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminDashboardApi.updatePressRelease(pressId, {
        user_id: editorial.user_id,
        packageid: editorial.p_id,
        company_id: Number(companyId) || 0,
        title: title.trim(),
        description: bodyHtml,
        status,
        show_contact_details: Number(showDetails),
        datetime: releaseDate.replace("T", " "),
        status_note: statusNote.trim(),
        status_datetime: statusDatetime.replace("T", " "),
        created_press: adminUser.id || 0,
        imageNames: imgs || "",
        cname: cname.trim(),
        address: address.trim(),
        contact_person: contactPerson.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        website: website.trim(),
        state: stateVal.trim(),
        city: cityVal.trim(),
        country: Number(countryId) || 0,
        add_mult_images_id: []
      });
      if (!res.data?.status) {
        toast.error(res.data?.message || "Update failed.");
        return;
      }
      toast.success(res.data.message || "Press release updated.");
      refreshEditorialCounts();
      const destByStatus = {
        1: { path: "/admindashboard/manage_editorial?tab=pending", tab: "pending" },
        2: { path: "/admindashboard/manage_editorial?tab=published", tab: "published" },
        3: { path: "/admindashboard/manage_editorial?tab=action", tab: "action" },
        5: { path: "/admindashboard/manage_editorial?tab=rejected", tab: "rejected" }
      };
      const dest = destByStatus[status];
      if (dest) setEditorialSkipMarkViewed(dest.tab);
      navigate(dest?.path || returnTo);
    } catch (e) {
      toast.error(e.response?.data?.message || "Update failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (bootLoading) return <AdminPageLoader label="Loading press release…" />;
  if (!editorial) return null;

  const historyTitle =
    editorial.title?.length > 30 ? `${editorial.title.slice(0, 30)}…` : editorial.title;
  const isRejected = Number(editorial.status) === 5;
  const showPublish = !isRejected && Number(editorial.paid_pr) !== 0 && !hidePublish;

  return (
    <div className="container-fluid edit-pr-legacy-page create-pr-legacy-page">
      <AdminPageBackHead title="Edit Press Release" backTo={returnTo} />

      <div className="row">
        <div className="col-lg-12 col-sm-12">
          <div className="card m-b-30 form-body-border">
            <div className="card-body form-body table-responsive">
              <div className="edit-pr-badges mb-3">
                <span className="edit-pr-badge">Username: {editorial.username || "—"}</span>
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
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group press-body">
                <label className="control-label" htmlFor="summernote2">
                  Press Release body
                </label>
                <Editor
                  id="summernote2"
                  textareaName="description"
                  value={description}
                  onEditorChange={(_c, ed) => setDescription(ed.getContent())}
                  init={TINYMCE_INIT}
                />
              </div>

              <div className="form-group press-release-img">
                <label className="control-label">Insert Image &amp; Copy Image URL</label>
                <p className="mb-2">
                  {filenames.length > 0 ? (
                    <strong className="text-success">
                      {filenames.length} Image Uploaded ✓
                    </strong>
                  ) : (
                    <strong className="text-danger">0 Image Uploaded ✗</strong>
                  )}
                </p>
                {filenames.length > 0 && (
                  <table className="table table-bordered mb-3">
                    <thead>
                      <tr>
                        <th>Image Name</th>
                        <th>Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filenames.map((name) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td>
                            <img src={legacyImagesDataUrl(name)} alt="" width={70} height={70} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <select
                  className="form-select gallery_pr mb-2"
                  id="gallerySelect"
                  value={galleryId}
                  onChange={(e) => onGalleryChange(e.target.value)}
                >
                  <option value="">Select Gallery</option>
                  {(payload?.gallery || []).map((g) => (
                    <option key={g.id} value={String(g.id)}>
                      {g.image_name || `Image #${g.id}`}
                    </option>
                  ))}
                </select>
                <div className="selectedGallery">
                  {galleryDetail && (
                    <table className="table table-bordered create-pr-gallery-table">
                      <thead>
                        <tr>
                          <th>Image Name</th>
                          <th>Image</th>
                          <th>URL</th>
                          <th>Size</th>
                          <th>Copy</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>{galleryDetail.image_name}</td>
                          <td>
                            <img src={galleryDetail.image_path} alt="" width={70} height={70} />
                          </td>
                          <td className="small text-break">{galleryDetail.image_path}</td>
                          <td>{galleryDetail.image_size || "—"}</td>
                          <td>
                            <button type="button" className="btn btn-primary btn-sm" onClick={copyGalleryUrl}>
                              Copy Url
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
                {uploadImages.length > 0 && (
                  <table className="table table-bordered mt-3">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Image URL</th>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="form-group">
                <label className="control-label">Package</label>
                <input type="text" className="form-control" value={editorial.pname || ""} disabled readOnly />
              </div>

              <div className="card m-b-30 form-body-border">
                <div className="card-body form-body1">
                  <div className="form-group">
                    <label className="control-label" htmlFor="p_company">
                      Select Company
                    </label>
                    <select
                      className="form-control select-press1"
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
                        disabled={Number(companyId) > 0}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label">Company Name :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cname}
                        onChange={(e) => setCname(e.target.value)}
                        disabled={Number(companyId) > 0}
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
                        disabled={Number(companyId) > 0}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label">Phone :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        disabled={Number(companyId) > 0}
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
                        disabled={Number(companyId) > 0}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label">Company Address :-</label>
                      <input
                        type="text"
                        className="form-control"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={Number(companyId) > 0}
                      />
                    </div>
                  </div>
                  <div className="form-group-flex">
                    <div className="form-group fg1">
                      <label className="control-label">State</label>
                      <input
                        type="text"
                        className="form-control"
                        value={stateVal}
                        onChange={(e) => setStateVal(e.target.value)}
                        disabled={Number(companyId) > 0}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={cityVal}
                        onChange={(e) => setCityVal(e.target.value)}
                        disabled={Number(companyId) > 0}
                      />
                    </div>
                  </div>
                  <div className="form-group-flex">
                    <div className="form-group fg1">
                      <label className="control-label">Country</label>
                      <select
                        className="form-control"
                        value={countryId}
                        onChange={(e) => setCountryId(e.target.value)}
                        disabled={Number(companyId) > 0}
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
                  <label className="control-label">Select date &amp; time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                  />
                </div>
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

              <div className="form-group">
                <label className="d-flex align-items-center gap-2">
                  <input type="radio" name="actionrequired" onChange={onActionRequiredRadio} />
                  <span>Action Required</span>
                </label>
              </div>

              {showStatusPanel && (
                <div className="card m-b-30 edit-pr-status-note-card" id="pending_note">
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
                  {showPublish && (
                    <button
                      type="button"
                      className="btn btn-primary press-btn"
                      disabled={submitting}
                      onClick={() => armAction(2)}
                    >
                      Publish
                    </button>
                  )}
                  {!hidePending && (
                    <button
                      type="button"
                      className="btn btn-danger press-btn"
                      disabled={submitting}
                      onClick={() => armAction(1)}
                    >
                      Save Pending
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger press-btn"
                    disabled={submitting}
                    onClick={() => armAction(5)}
                  >
                    Reject
                  </button>
                  {showActionRequiredBtn && (
                    <button
                      type="button"
                      className="btn btn-warning press-btn"
                      disabled={submitting}
                      onClick={() => armAction(3)}
                    >
                      Action Required
                    </button>
                  )}
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
