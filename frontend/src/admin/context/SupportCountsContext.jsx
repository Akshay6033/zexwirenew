import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { adminDashboardApi } from "../services/adminDashboardApi";
import { SUPPORT_COUNTS_REFRESH } from "../utils/supportCountsRefresh";

const POLL_MS = 30000;

const SupportCountsContext = createContext({
  totalUnread: 0,
  tickets: [],
  loading: false,
  refresh: () => {}
});

export function SupportCountsProvider({ children }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await adminDashboardApi.getSupportNotifications();
      const data = res.data?.data || {};
      setTotalUnread(data.total_unread ?? 0);
      setTickets(data.tickets || []);
    } catch {
      /* keep last counts */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!cancelled) setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    };
    load();
    const id = setInterval(refresh, POLL_MS);
    const onRefresh = () => refresh();
    window.addEventListener(SUPPORT_COUNTS_REFRESH, onRefresh);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener(SUPPORT_COUNTS_REFRESH, onRefresh);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ totalUnread, tickets, loading, refresh }),
    [totalUnread, tickets, loading, refresh]
  );

  return <SupportCountsContext.Provider value={value}>{children}</SupportCountsContext.Provider>;
}

export function useSupportCounts() {
  return useContext(SupportCountsContext);
}
