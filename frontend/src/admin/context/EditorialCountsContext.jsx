import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { adminDashboardApi } from "../services/adminDashboardApi";
import { EDITORIAL_COUNTS_REFRESH } from "../utils/editorialCountsRefresh";

const NOTIFICATION_POLL_MS = 1000;

const defaultCounts = {
  summary: {
    editorialRoom: 0,
    published: 0,
    pending: 0,
    draft: 0,
    actionRequired: 0,
    rejected: 0,
    deleted: 0
  },
  badges: {
    newTotal: 0,
    draft: 0,
    pending: 0,
    actionRequired: 0,
    published: 0,
    rejected: 0
  }
};

const EditorialCountsContext = createContext({
  ...defaultCounts,
  loading: false,
  refresh: () => {},
  clearTabBadge: async () => {}
});

const STATUS_TABS = new Set(["draft", "pending", "published", "action", "rejected"]);

/**
 * Sidebar badges = unread PRs per status (view_flag=1), same as legacy notification_pr_*.
 * Polls every 1s. Clears when admin opens that status tab (mark-viewed).
 */
export function EditorialCountsProvider({ children }) {
  const [data, setData] = useState(defaultCounts);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await adminDashboardApi.getEditorialSummary();
      const payload = res.data?.data || {};
      setData({
        summary: {
          editorialRoom: payload.editorialRoom ?? 0,
          published: payload.published ?? 0,
          pending: payload.pending ?? 0,
          draft: payload.draft ?? 0,
          actionRequired: payload.actionRequired ?? 0,
          rejected: payload.rejected ?? 0,
          deleted: payload.deleted ?? 0
        },
        badges: {
          newTotal: payload.badges?.newTotal ?? 0,
          draft: payload.badges?.draft ?? 0,
          pending: payload.badges?.pending ?? 0,
          actionRequired: payload.badges?.actionRequired ?? 0,
          published: payload.badges?.published ?? 0,
          rejected: payload.badges?.rejected ?? 0
        }
      });
    } catch {
      /* keep last known counts */
    }
  }, []);

  const pollBadges = useCallback(async () => {
    try {
      const res = await adminDashboardApi.getEditorialNotifications();
      const b = res.data?.data || {};
      setData((prev) => ({
        ...prev,
        badges: {
          newTotal: b.newTotal ?? 0,
          draft: b.draft ?? 0,
          pending: b.pending ?? 0,
          actionRequired: b.actionRequired ?? 0,
          published: b.published ?? 0,
          rejected: b.rejected ?? 0
        }
      }));
    } catch {
      /* keep last badge counts */
    }
  }, []);

  const clearTabBadge = useCallback(
    async (tab) => {
      const t = String(tab || "").toLowerCase();
      if (!STATUS_TABS.has(t)) return;

      try {
        await adminDashboardApi.postEditorialMarkViewed(t);
        await pollBadges();
      } catch {
        await pollBadges();
      }
    },
    [pollBadges]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => pollBadges(), NOTIFICATION_POLL_MS);
    return () => clearInterval(id);
  }, [pollBadges]);

  useEffect(() => {
    const onRefresh = () => {
      refresh();
      pollBadges();
    };
    window.addEventListener(EDITORIAL_COUNTS_REFRESH, onRefresh);
    return () => window.removeEventListener(EDITORIAL_COUNTS_REFRESH, onRefresh);
  }, [refresh, pollBadges]);

  const value = useMemo(
    () => ({
      summary: data.summary,
      badges: data.badges,
      loading,
      refresh,
      clearTabBadge
    }),
    [data, loading, refresh, clearTabBadge]
  );

  return <EditorialCountsContext.Provider value={value}>{children}</EditorialCountsContext.Provider>;
}

export function useEditorialCounts() {
  return useContext(EditorialCountsContext);
}
