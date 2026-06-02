import { useEffect, useRef, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import { adminDashboardApi } from "../../services/adminDashboardApi";
import { useConfirm } from "../../context/ConfirmContext";
import { useSearchParams } from "react-router-dom";

const BADGE_OPTIONS = ["None", "Most Popular", "Best Value", "New"];
const BADGE_SELECT_OPTIONS = BADGE_OPTIONS.map((value) => ({ value, label: value }));
const SEQUENCER_SCOPES = [
  { key: "global", label: "Global (Online All)" },
  { key: "online", label: "Online Package" },
  { key: "offline", label: "Offline Package" },
  { key: "reseller", label: "Reseller Package" },
  { key: "crypto", label: "Crypto Package" },
  { key: "indian", label: "Indian PR Package" },
  { key: "white_label", label: "White Label PR Package" }
];

function reorder(list, startIndex, endIndex) {
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

function PricingSequencerPage() {
  const [searchParams] = useSearchParams();
  const { confirm } = useConfirm();
  const [items, setItems] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragScrollRafRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState({ banner_image: "", banner_alt: "", banner_link: "" });
  const [initialBanner, setInitialBanner] = useState({ banner_image: "", banner_alt: "", banner_link: "" });
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [removeBanner, setRemoveBanner] = useState(false);
  const [scope, setScope] = useState(() => {
    const fromUrl = String(searchParams.get("scope") || "").trim().toLowerCase();
    const allowed = new Set(SEQUENCER_SCOPES.map((s) => s.key));
    return allowed.has(fromUrl) ? fromUrl : "global";
  });

  const load = async () => {
    const seqRes = await adminDashboardApi.getPricingSequencer({ scope });
    setItems(seqRes.data?.data || []);
    if (scope === "global") {
      const bannerRes = await adminDashboardApi.getPricingBanner();
      const row = bannerRes.data?.data || { banner_image: "", banner_alt: "", banner_link: "" };
      setBanner(row);
      setInitialBanner(row);
      setBannerPreview(row.banner_image ? `http://localhost:5000${row.banner_image}` : "");
      return;
    }
    setBanner({ banner_image: "", banner_alt: "", banner_link: "" });
    setInitialBanner({ banner_image: "", banner_alt: "", banner_link: "" });
    setBannerFile(null);
    setBannerPreview("");
    setRemoveBanner(false);
  };

  useEffect(() => {
    load();
  }, [scope]);

  useEffect(() => () => stopDragAutoScroll(), []);

  const setBadge = async (index, badge) => {
    const current = items[index];
    if (!current) return;
    if ((badge === "Most Popular" || badge === "Best Value") && items.some((it, i) => i !== index && it.badge_label === badge)) {
      const previous = items.find((it, i) => i !== index && it.badge_label === badge);
      const confirmText = `This will remove the '${badge}' badge from ${previous?.pname || "another package"}. Continue?`;
      const ok = await confirm(confirmText);
      if (!ok) return;
    }
    const updated = items.map((it, i) => {
      if (i === index) return { ...it, badge_label: badge };
      if ((badge === "Most Popular" || badge === "Best Value") && it.badge_label === badge) return { ...it, badge_label: "None" };
      return it;
    });
    setItems(updated);
  };

  const save = async () => {
    setSaving(true);
    try {
      await adminDashboardApi.savePricingSequencer({
        scope,
        items: items.map((item) => ({
          id: item.id,
          pname: item.pname,
          visible: item.visible,
          badge: item.badge_label
        }))
      });
      toast.success("Pricing page order updated successfully.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update pricing sequencer.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const ok = await confirm("Reset sequence to alphabetical order?");
    if (!ok) return;
    try {
      await adminDashboardApi.resetPricingSequencer({ scope });
      toast.success("Sequence reset completed.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not reset sequence.");
    }
  };

  const openPreview = async () => {
    try {
      const res = await adminDashboardApi.getPricingPreview({ scope });
      const tab = window.open("", "_blank");
      if (!tab) return;
      const body = (res.data?.data || [])
        .map((item) => `<tr><td>${item.pname}</td><td>${item.category}</td><td>$${item.price}</td><td>${item.badge_label}</td></tr>`)
        .join("");
      tab.document.write(`
        <html><head><title>Pricing Preview</title></head>
        <body style="font-family: Arial; padding: 20px;">
          <h3>Pricing Preview (Read-only)</h3>
          <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <thead><tr><th>Package Name</th><th>Category</th><th>Price</th><th>Badge</th></tr></thead>
            <tbody>${body}</tbody>
          </table>
        </body></html>
      `);
      tab.document.close();
    } catch {
      toast.error("Could not load preview.");
    }
  };

  const onBannerChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Unsupported file type. Please upload a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Banner file size exceeds 5MB. Please upload a smaller image.");
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setRemoveBanner(false);
  };

  const saveBanner = async () => {
    const hasTextChange =
      String(banner.banner_alt || "").trim() !== String(initialBanner.banner_alt || "").trim() ||
      String(banner.banner_link || "").trim() !== String(initialBanner.banner_link || "").trim();
    const hasImageChange = Boolean(bannerFile) || removeBanner;

    if (!hasTextChange && !hasImageChange) {
      toast.info("No changes to update.");
      return;
    }

    try {
      const payload = new FormData();
      payload.append("banner_alt", banner.banner_alt || "");
      payload.append("banner_link", banner.banner_link || "");
      payload.append("remove_banner", removeBanner ? "1" : "0");
      if (bannerFile) payload.append("banner_image", bannerFile);
      await adminDashboardApi.updatePricingBanner(payload);
      toast.success("Pricing page banner updated successfully.");
      setBannerFile(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Image upload failed. Please try again.");
    }
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview("");
    setRemoveBanner(true);
  };

  const moveRow = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    setItems((prev) => reorder(prev, fromIndex, toIndex));
  };

  const stopDragAutoScroll = () => {
    if (dragScrollRafRef.current) {
      cancelAnimationFrame(dragScrollRafRef.current);
      dragScrollRafRef.current = null;
    }
  };

  const handleDragOverAutoScroll = (event) => {
    const edgeSize = 110;
    const maxStep = 24;
    const y = event.clientY;
    const viewportHeight = window.innerHeight;
    let delta = 0;

    if (y < edgeSize) {
      const ratio = (edgeSize - y) / edgeSize;
      delta = -Math.ceil(maxStep * Math.max(ratio, 0.25));
    } else if (y > viewportHeight - edgeSize) {
      const ratio = (y - (viewportHeight - edgeSize)) / edgeSize;
      delta = Math.ceil(maxStep * Math.max(ratio, 0.25));
    }

    if (!delta) {
      stopDragAutoScroll();
      return;
    }

    if (dragScrollRafRef.current) return;
    dragScrollRafRef.current = requestAnimationFrame(() => {
      window.scrollBy(0, delta);
      dragScrollRafRef.current = null;
    });
  };

  return (
    <div className="container-fluid pricing-sequencer-page">
      {scope === "global" && (
        <div className="admin-card mb-3">
          <h5 className="mb-3">Header Banner</h5>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Pricing Page Banner</label>
              <input type="file" accept=".jpg,.jpeg,.png,.webp" className="form-control" onChange={onBannerChange} />
              <small className="text-muted">Accepted formats: JPG, PNG, WebP. Max size: 5MB.</small>
            </div>
            <div className="col-md-6">
              <label className="form-label">Banner Alt Text</label>
              <input className="form-control" value={banner.banner_alt || ""} onChange={(e) => setBanner((prev) => ({ ...prev, banner_alt: e.target.value }))} />
              <label className="form-label mt-2">Banner Link (optional)</label>
              <input className="form-control" value={banner.banner_link || ""} onChange={(e) => setBanner((prev) => ({ ...prev, banner_link: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3 package-image-preview-box banner-preview-box">
            {bannerPreview ? <img src={bannerPreview} alt="Pricing banner preview" className="package-image-preview" /> : <div className="package-image-placeholder">No banner uploaded</div>}
          </div>
          <div className="mt-2 d-flex gap-2">
            <button type="button" className="btn btn-outline-danger" onClick={clearBanner}>Clear Banner</button>
            <button type="button" className="btn btn-primary" onClick={saveBanner}>Update Banner</button>
          </div>
        </div>
      )}

      <div className="page-head manage-user1 d-flex justify-content-between align-items-center pricing-sequencer-head">
        <h4 className="mt-2 mb-2">Pricing Page Sequencer</h4>
        <div className="d-flex gap-2 pricing-sequencer-actions">
          <button type="button" className="btn refresh-icon-btn" onClick={() => window.location.reload()} aria-label="Refresh page" title="Refresh">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M12 5a7 7 0 0 1 6.65 4.8H16v2h6V6h-2v2.28A9 9 0 1 0 21 12h-2a7 7 0 1 1-7-7Z" />
            </svg>
          </button>
          <select
            className="form-select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ minWidth: 220 }}
          >
            {SEQUENCER_SCOPES.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
          <button type="button" className="btn btn-outline-secondary" onClick={openPreview}>Live Preview</button>
          <button type="button" className="btn btn-outline-danger" onClick={reset}>Reset to Default</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Order"}</button>
        </div>
      </div>

      {!items.length ? (
        <div className="admin-card text-muted">You haven't created any packages yet. Go to Packages - Create New Package to get started.</div>
      ) : (
        <div className="admin-card pricing-sequencer-table-card">
          <table className="table table-bordered mb-0">
            <thead>
              <tr>
                <th>⠿</th>
                <th>Move</th>
                <th>Package Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Visibility</th>
                <th>Badge</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  draggable
                  className={`${dragIndex === index ? "pricing-row-dragging" : ""} ${dragOverIndex === index && dragIndex !== index ? "pricing-row-drop-target" : ""}`}
                  onDragStart={() => {
                    setDragIndex(index);
                    setDragOverIndex(index);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setDragOverIndex(null);
                    stopDragAutoScroll();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    handleDragOverAutoScroll(e);
                    if (dragOverIndex !== index) setDragOverIndex(index);
                  }}
                  onDrop={() => {
                    if (dragIndex === null || dragIndex === index) return;
                    setItems((prev) => reorder(prev, dragIndex, index));
                    setDragIndex(null);
                    setDragOverIndex(null);
                    stopDragAutoScroll();
                  }}
                >
                  <td style={{ cursor: "grab" }}>⠿</td>
                  <td>
                    <div className="pricing-move-actions">
                      <button
                        type="button"
                        className="pricing-move-btn pricing-move-btn-up"
                        onClick={() => moveRow(index, index - 1)}
                        disabled={index === 0}
                        title="Move up"
                        aria-label={`Move ${item.pname} up`}
                      >
                        <span aria-hidden="true">▴</span>
                      </button>
                      <button
                        type="button"
                        className="pricing-move-btn pricing-move-btn-down"
                        onClick={() => moveRow(index, index + 1)}
                        disabled={index === items.length - 1}
                        title="Move down"
                        aria-label={`Move ${item.pname} down`}
                      >
                        <span aria-hidden="true">▾</span>
                      </button>
                    </div>
                  </td>
                  <td>{item.pname}</td>
                  <td>{item.reseller_normal === 1 ? "Reseller" : item.reseller_normal === 2 ? "Crypto" : item.reseller_normal === 3 ? "Indian PR" : item.reseller_normal === 4 ? "White Label" : "Normal"}</td>
                  <td>${item.price}</td>
                  <td>
                    <label className="d-inline-flex align-items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(item.visible)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setItems((prev) => prev.map((row, i) => (i === index ? { ...row, visible: checked } : row)));
                        }}
                      />
                      <span>{item.visible ? "Visible" : "Hidden"}</span>
                    </label>
                  </td>
                  <td>
                    <Select
                      classNamePrefix="package-distribution-select"
                      options={BADGE_SELECT_OPTIONS}
                      value={BADGE_SELECT_OPTIONS.find((opt) => opt.value === item.badge_label) || BADGE_SELECT_OPTIONS[0]}
                      onChange={(selected) => setBadge(index, selected?.value || "None")}
                      menuPlacement="auto"
                      menuPosition="fixed"
                      maxMenuHeight={220}
                      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        control: (base) => ({ ...base, minHeight: 31, height: 31 }),
                        valueContainer: (base) => ({ ...base, paddingTop: 0, paddingBottom: 0 }),
                        indicatorsContainer: (base) => ({ ...base, height: 31 })
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PricingSequencerPage;
