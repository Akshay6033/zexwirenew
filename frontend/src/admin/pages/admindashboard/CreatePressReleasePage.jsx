import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Select from "react-select";
import { Editor } from "@tinymce/tinymce-react";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { refreshEditorialCounts } from "../../utils/editorialCountsRefresh";
import AdminPageLoader from "../../components/AdminPageLoader";
import AdminPageBackHead from "../../components/AdminPageBackHead";

import "tinymce/tinymce";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/icons/default";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/image";
import "tinymce/plugins/table";
import "tinymce/plugins/code";
import "tinymce/plugins/preview";
import "tinymce/plugins/media";
import "tinymce/plugins/emoticons";
import "tinymce/plugins/emoticons/js/emojis";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/autolink";
import "tinymce/plugins/advlist";
import "tinymce/plugins/help";
import "tinymce/plugins/wordcount";
import "tinymce/plugins/insertdatetime";
import "tinymce/skins/ui/tinymce-5/skin.min.css";
import "tinymce/skins/ui/tinymce-5/content.min.css";
/* Do NOT import tinymce/skins/content/default/content.min.css — it contains a global
   `body { margin: 1rem }` that Vite bundles into the app CSS and breaks every page layout. */

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

/** Portal menu above TinyMCE / following labels (avoids overlap under fixed stacking). */
const CREATE_PR_USER_SELECT_STYLES = {
  menuPortal: (base) => ({ ...base, zIndex: 12050 })
};

function isValidWebsite(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  try {
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function extractImageNamesFromHtml(html) {
  try {
    const d = document.createElement("div");
    d.innerHTML = html || "";
    const imgs = d.querySelectorAll("img");
    const names = [];
    imgs.forEach((img) => {
      const src = img.getAttribute("src") || "";
      const name = src.split("/").pop();
      if (name) names.push(name);
    });
    return names.length ? JSON.stringify(names) : "";
  } catch {
    return "";
  }
}

export default function CreatePressReleasePage() {
  const navigate = useNavigate();
  const [bootLoading, setBootLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState({ users: [], categories: [], countries: [] });

  const [userId, setUserId] = useState("");
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctx, setCtx] = useState(null);

  const [pId, setPId] = useState("");
  const [companyId, setCompanyId] = useState("0");
  const [galleryId, setGalleryId] = useState("");
  const [galleryDetail, setGalleryDetail] = useState(null);
  const [categoryValues, setCategoryValues] = useState([]);
  const [showDetails, setShowDetails] = useState("0");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [contactPerson, setContactPerson] = useState("");
  const [cname, setCname] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [countryId, setCountryId] = useState("0");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      setBootLoading(true);
      try {
        const res = await adminDashboardApi.getPressReleaseCreateData();
        if (res.data?.status) setBootstrap(res.data.data || { users: [], categories: [], countries: [] });
      } catch {
        toast.error("Could not load form data.");
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  const loadUserContext = useCallback(async (uid) => {
    const id = Number(uid);
    if (!id) {
      setCtx(null);
      return;
    }
    setCtxLoading(true);
    setCtx(null);
    setTitle("");
    setDescription("");
    setPId("");
    setCompanyId("0");
    setGalleryId("");
    setGalleryDetail(null);
    try {
      const res = await adminDashboardApi.getPressReleaseCreateData(id);
      if (!res.data?.status) {
        toast.error(res.data?.message || "Could not load user.");
        return;
      }
      const data = res.data.data;
      setCtx(data);

      const pkg = data?.allocatedPackages || [];
      const gal = data?.gallery || [];
      const comps = data?.companies || [];

      if (pkg.length > 0) {
        toast.success("Packages fetched successfully.");
        setPId(String(pkg[0].package_id));
      } else {
        setPId("");
        toast.error("No active packages with credits. User cannot submit PR until credits are added.");
      }

      if (gal.length > 0) {
        toast.success("Gallery fetched successfully.");
      }

      if (comps.length > 0) {
        toast.success("Company details fetched successfully.");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load user.");
    } finally {
      setCtxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setCtx(null);
      return;
    }
    loadUserContext(userId);
  }, [userId, loadUserContext]);

  const userOptions = useMemo(
    () =>
      (bootstrap.users || []).map((u) => ({
        value: String(u.id),
        label: `${(u.first_name || "").trim()} ${(u.last_name || "").trim()} (${u.email || ""})`.trim()
      })),
    [bootstrap.users]
  );

  const selectedUserOption = useMemo(
    () => userOptions.find((o) => o.value === userId) ?? null,
    [userOptions, userId]
  );

  const packageOptions = useMemo(() => {
    if (!ctx?.allocatedPackages?.length) return [];
    return ctx.allocatedPackages.map((r) => ({
      value: String(r.package_id),
      label: `${r.pname || "Package"} — ${r.usepr_limit ?? 0} credits`
    }));
  }, [ctx]);

  const companyOptions = useMemo(() => {
    const base = [{ value: "0", label: "Please Select Company" }];
    (ctx?.companies || []).forEach((c) => base.push({ value: String(c.id), label: c.cname }));
    return base;
  }, [ctx]);

  const categorySelectOptions = useMemo(
    () => (bootstrap.categories || []).map((c) => ({ value: c.id, label: c.category_name })),
    [bootstrap.categories]
  );

  const countryOptions = useMemo(
    () => [
      { value: "0", label: "" },
      ...(bootstrap.countries || []).map((c) => ({ value: String(c.id), label: c.country_name }))
    ],
    [bootstrap.countries]
  );

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
      const row = res.data?.data;
      if (row) {
        setCname(row.cname || "");
        setAddress(row.address || "");
        setContactPerson(row.contact_person || "");
        setMobile(row.mobile || "");
        setEmail(row.email || "");
        setWebsite(row.website || "");
        setStateVal(row.state || "");
        setCountryId(row.country ? String(row.country) : "0");
        toast.success("Company fetched successfully.");
      }
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
      if (res.data?.status) {
        setGalleryDetail(res.data.data);
        toast.success("Gallery details fetched successfully.");
      }
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
      toast.error("Enter city & state.");
      return false;
    }
    if (!Number(countryId) || countryId === "0") {
      toast.error("Select country.");
      return false;
    }
    return true;
  };

  const preview = () => {
    const pkg = pId;
    const show = Number(showDetails);
    let payload = {
      title,
      description,
      package: pkg,
      show_details_1: show
    };
    if (show === 1) {
      if (Number(companyId)) {
        payload = {
          ...payload,
          company: companyId,
          cname: cname || "—",
          cadd: address || "—",
          cper: contactPerson || "—",
          cmobile: mobile || "—",
          cemail: email || "—",
          cwebsite: website || "—"
        };
      } else {
        payload = {
          ...payload,
          company: "0",
          cname,
          cadd: address,
          cper: contactPerson,
          cmobile: mobile,
          cemail,
          cwebsite
        };
      }
    } else {
      payload = { ...payload, company: "N/A", cname: "N/A", cadd: "N/A", cper: "N/A", cmobile: "N/A", cemail: "N/A", cwebsite: "N/A" };
    }
    navigate("/admindashboard/press-release/preview", { state: payload });
  };

  const submit = async (status) => {
    const uid = Number(userId);
    const pid = Number(pId);
    if (!uid) {
      toast.error("Select user.");
      return;
    }
    if (!pid) {
      toast.error(packageOptions.length ? "Select package." : "No active package credits for this user.");
      return;
    }
    if (!packageOptions.some((o) => o.value === String(pid))) {
      toast.error("Selected package has no credits left. Choose another package or add credits.");
      return;
    }
    if (!title.trim()) {
      toast.error("Enter title.");
      return;
    }
    const bodyHtml = description || "";
    if (!bodyHtml.replace(/<[^>]+>/g, "").trim()) {
      toast.error("Enter press release body.");
      return;
    }
    if (!categoryValues.length) {
      toast.error("Select categories.");
      return;
    }
    if (!showDetails || showDetails === "0") {
      toast.error("Select Yes/No for contact details.");
      return;
    }
    if (!validateCompanyManual()) return;

    try {
      const chk = await adminDashboardApi.getPressReleaseCheckTitle(title.trim());
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
      const res = await adminDashboardApi.createPressRelease({
        user_id: uid,
        p_id: pid,
        company_id: Number(companyId) || 0,
        cat_ids: categoryValues.map((x) => x.value),
        title: title.trim(),
        description: bodyHtml,
        status,
        show_contact_details: Number(showDetails),
        created_press: "0",
        imageNames: imgs || "",
        cname: cname.trim(),
        address: address.trim(),
        contact_person: contactPerson.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        website: website.trim(),
        state: stateVal.trim(),
        country: Number(countryId) || 0,
        add_mult_images_id: []
      });
      if (!res.data?.status) {
        toast.error(res.data?.message || "Save failed.");
        return;
      }
      toast.success(res.data.message || "Saved.");
      refreshEditorialCounts();
      navigate("/admindashboard/manage_editorial");
    } catch (e) {
      toast.error(e.response?.data?.message || "Save failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (bootLoading) return <AdminPageLoader label="Loading create form…" />;

  return (
    <div className="container-fluid create-pr-legacy-page">
      <AdminPageBackHead title="Create Press Release" backTo="/admindashboard/manage_editorial" />

      <div className="row">
        <div className="col-lg-12 col-sm-12">
          <div className="card m-b-30 form-body-border">
            <div className="card-body form-body">
              <div className="create-pr-step-shell">
                <div className="create-pr-step-shell__head">
                  <h3 className="create-pr-step-shell__title">Press release — user &amp; content</h3>
                  <p className="create-pr-step-shell__lead">
                    Choose the customer account first. Packages, company, and gallery load after you select a user.
                  </p>
                </div>
                <div className="create-pr-step-shell__body">
                  <div className="create-pr-step-s1">
                    <div className="create-pr-step-s1__badge" aria-hidden="true">
                      1
                    </div>
                    <div className="create-pr-step-s1__text">
                      <div className="create-pr-step-s1__heading">Select User</div>
                      <p className="create-pr-step-s1__hint">
                        Search by name or email and choose the account this release belongs to.
                      </p>
                    </div>
                  </div>
                  <div className="form-group create-pr-user-field mb-0">
                    <label className="visually-hidden" htmlFor="create-pr-user">
                      Select User
                    </label>
                    <Select
                      inputId="create-pr-user"
                      instanceId="create-pr-user"
                      classNamePrefix="create-pr-user"
                      isMulti={false}
                      isClearable
                      isSearchable
                      menuPosition="fixed"
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      styles={CREATE_PR_USER_SELECT_STYLES}
                      options={userOptions}
                      value={selectedUserOption}
                      onChange={(opt) => setUserId(opt?.value ?? "")}
                      placeholder="Search and select user…"
                      noOptionsMessage={() => "No users match"}
                    />
                  </div>
                </div>
              </div>

              {ctxLoading && <AdminPageLoader label="Loading packages…" />}

              {userId && !ctxLoading && ctx && (
                <div className="create-pr-after-user">
                  <div className="form-group">
                    <label className="control-label" htmlFor="p_title">
                      Title of the release
                    </label>
                    <input
                      type="text"
                      className="form-control select-press1"
                      id="p_title"
                      name="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
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
                      init={{
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
                      }}
                    />
                  </div>

                  <div className="form-group press-release-img">
                    <label className="control-label">Insert Image &amp; Copy Image URL</label>
                    <div className="row g-2">
                      <div className="col-12">
                        <select
                          className="form-select gallery_pr"
                          id="gallerySelect"
                          value={galleryId}
                          onChange={(e) => onGalleryChange(e.target.value)}
                        >
                          <option value="">Select Gallery</option>
                          {(ctx?.gallery || []).map((g) => (
                            <option key={g.id} value={String(g.id)}>
                              {g.image_name || `Image #${g.id}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 selectedGallery">
                        {galleryDetail && (
                          <table className="table table-bordered mb-0 create-pr-gallery-table">
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
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="control-label" htmlFor="select2">
                      Package
                    </label>
                    <select
                      id="select2"
                      className="form-control select-press1"
                      value={pId}
                      onChange={(e) => setPId(e.target.value)}
                      required
                      disabled={ctxLoading || packageOptions.length === 0}
                    >
                      <option value="">
                        {packageOptions.length ? "Select any package" : "No packages with credits"}
                      </option>
                      {packageOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
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
                        <h6 className="text-bold">Sender Details / Company Details</h6>
                      </div>
                      <div className="form-group-flex">
                        <div className="form-group fg1">
                          <label className="control-label">Contact Person Name :-</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="John Smith"
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
                            placeholder="ZEXPRWIRE*"
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
                            placeholder="info@zexprwire.com*"
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
                            placeholder="1-545-XXX-XXXX"
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
                            placeholder="https://www.google.com"
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
                            placeholder="1A Lane ..."
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            disabled={Number(companyId) > 0}
                          />
                        </div>
                      </div>
                      <div className="form-group-flex">
                        <div className="form-group fg1">
                          <label className="control-label">City &amp; State (Both mandate) :-</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="California*"
                            value={stateVal}
                            onChange={(e) => setStateVal(e.target.value)}
                            disabled={Number(companyId) > 0}
                          />
                        </div>
                        <div className="form-group fg1">
                          <label className="control-label">Country</label>
                          <select
                            className="form-control"
                            id="country"
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
                      <label className="control-label">Select Categories</label>
                      <Select
                        inputId="limitedNumbSelect2"
                        instanceId="limitedNumbSelect2"
                        isMulti
                        options={categorySelectOptions}
                        value={categoryValues}
                        onChange={(v) => setCategoryValues(v?.slice(0, 10) || [])}
                        classNamePrefix="create-pr-cat"
                        placeholder="Please Select Categories"
                        closeMenuOnSelect={false}
                      />
                    </div>
                    <div className="form-group fg1">
                      <label className="control-label" htmlFor="showdetails">
                        Do you want to show contact details on Press Release?
                      </label>
                      <select
                        name="show_contact_details"
                        id="showdetails"
                        className="form-control"
                        value={showDetails}
                        onChange={(e) => setShowDetails(e.target.value)}
                      >
                        <option value="0">Do you want to show contact details on Press Release?</option>
                        <option value="1">Yes</option>
                        <option value="2">No</option>
                      </select>
                      <br />
                      <span id="show_message_yes_no" className="create-pr-disclaimer">
                        [ This means if you select &quot;NO&quot; then your contact details will not be visible in our newsroom, but it
                        will be syndicated and visible on other news Platforms ]
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="submit-btn1">
                      <button
                        type="button"
                        className="btn btn-primary press-btn"
                        style={{ height: 38 }}
                        disabled={submitting}
                        onClick={() => submit(2)}
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger press-btn"
                        style={{ height: 38 }}
                        disabled={submitting}
                        onClick={() => submit(1)}
                      >
                        Save Pending
                      </button>
                      <button type="button" className="btn btn-success press-btn" style={{ height: 38 }} onClick={preview}>
                        Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
