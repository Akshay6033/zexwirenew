import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEditorialCounts } from "../../context/EditorialCountsContext";
import { useSupportCounts } from "../../context/SupportCountsContext";

const EDITORIAL_ITEMS = [
  { tab: "action", label: "Action Required", badgeKey: "actionRequired", tone: "warning" },
  { tab: "pending", label: "Pending Review", badgeKey: "pending", tone: "primary" },
  { tab: "draft", label: "Draft", badgeKey: "draft", tone: "muted" },
  { tab: "published", label: "Published", badgeKey: "published", tone: "success" },
  { tab: "rejected", label: "Rejected", badgeKey: "rejected", tone: "danger" }
];

function RightSlidebar({ open, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("editorial");
  const { badges, summary, clearTabBadge, refresh: refreshEditorial } = useEditorialCounts();
  const { totalUnread, tickets, refresh: refreshSupport } = useSupportCounts();

  const editorialUnread = badges.newTotal || 0;
  const supportUnread = totalUnread || 0;

  useEffect(() => {
    if (!open) return;
    refreshEditorial();
    refreshSupport();
  }, [open, refreshEditorial, refreshSupport]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(supportUnread > 0 && editorialUnread === 0 ? "support" : "editorial");
  }, [open, supportUnread, editorialUnread]);

  const goEditorial = (tab) => {
    clearTabBadge(tab);
    onClose();
    navigate(`/admindashboard/manage_editorial?tab=${tab}`);
  };

  const goSupport = (ticketId) => {
    onClose();
    navigate(ticketId ? `/admindashboard/manage_support?ticket=${ticketId}` : "/admindashboard/manage_support");
  };

  return (
    <>
      {open ? <button type="button" className="admin-quick-panel-backdrop" onClick={onClose} aria-label="Close panel" /> : null}
      <aside className={`sb-slidebar admin-quick-panel ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="admin-quick-panel-inner">
          <div className="admin-quick-panel-head">
            <h5 className="admin-quick-panel-title">Notifications</h5>
            <button type="button" className="admin-quick-panel-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="admin-quick-panel-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "editorial"}
              className={`admin-quick-panel-tab${activeTab === "editorial" ? " is-active" : ""}`}
              onClick={() => setActiveTab("editorial")}
            >
              Editorial
              {editorialUnread > 0 ? <span className="admin-quick-panel-tab-badge">{editorialUnread}</span> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "support"}
              className={`admin-quick-panel-tab${activeTab === "support" ? " is-active" : ""}`}
              onClick={() => setActiveTab("support")}
            >
              Support
              {supportUnread > 0 ? <span className="admin-quick-panel-tab-badge">{supportUnread}</span> : null}
            </button>
          </div>

          <div className="admin-quick-panel-body">
            {activeTab === "editorial" && (
              <div className="admin-quick-panel-section">
                <p className="admin-quick-panel-section-label">Unread by status</p>
                {EDITORIAL_ITEMS.map((item) => {
                  const unread = badges[item.badgeKey] || 0;
                  const total = summary[item.badgeKey] || 0;
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      className={`admin-quick-panel-row admin-quick-panel-row--${item.tone}`}
                      onClick={() => goEditorial(item.tab)}
                    >
                      <span className="admin-quick-panel-row-label">{item.label}</span>
                      <span className="admin-quick-panel-row-meta">
                        {unread > 0 ? (
                          <span className="admin-quick-panel-pill admin-quick-panel-pill--alert">{unread} new</span>
                        ) : (
                          <span className="admin-quick-panel-pill admin-quick-panel-pill--muted">0 new</span>
                        )}
                        <span className="admin-quick-panel-total">{total} total</span>
                      </span>
                    </button>
                  );
                })}
                <button type="button" className="admin-quick-panel-link-btn" onClick={() => goEditorial("room")}>
                  Open Editorial Room →
                </button>
              </div>
            )}

            {activeTab === "support" && (
              <div className="admin-quick-panel-section">
                <p className="admin-quick-panel-section-label">
                  {supportUnread > 0 ? `${supportUnread} unread message${supportUnread === 1 ? "" : "s"}` : "No unread messages"}
                </p>
                {tickets.length === 0 ? (
                  <div className="admin-quick-panel-empty">All caught up — no tickets need attention.</div>
                ) : (
                  <ul className="admin-quick-panel-list">
                    {tickets.map((t) => (
                      <li key={t.id}>
                        <button type="button" className="admin-quick-panel-row" onClick={() => goSupport(t.id)}>
                          <span className="admin-quick-panel-row-label">Ticket #{t.id}</span>
                          <span className="admin-quick-panel-pill admin-quick-panel-pill--alert">
                            {t.count} unread
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" className="admin-quick-panel-link-btn" onClick={() => goSupport()}>
                  Open Support →
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default RightSlidebar;
