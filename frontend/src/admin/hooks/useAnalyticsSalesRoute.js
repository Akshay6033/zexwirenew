import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  defaultSalesRange,
  indexToTab,
  parseSalesRoute,
  saleDashboardPath,
  tabToIndex
} from "../utils/analyticsDateRoute";

export function useAnalyticsSalesRoute() {
  const navigate = useNavigate();
  const params = useParams();
  const fallback = useMemo(() => defaultSalesRange(), []);

  const { start: startDate, end: endDate, filter, tab } = parseSalesRoute(
    params.startDate,
    params.endDate,
    params.filter,
    params.tab,
    fallback
  );

  const tabIndex = tabToIndex(tab);

  const goToDashboard = (start, end, nextFilter = filter, nextTab = tab) => {
    navigate(saleDashboardPath(start, end, nextFilter, tabToIndex(nextTab)), { replace: true });
  };

  const setTab = (nextTab) => {
    goToDashboard(startDate, endDate, filter, nextTab);
  };

  const setPaymentFilter = (nextFilter) => {
    goToDashboard(startDate, endDate, nextFilter, "payment");
  };

  useEffect(() => {
    const parsed = parseSalesRoute(
      params.startDate,
      params.endDate,
      params.filter,
      params.tab,
      fallback
    );
    const canonical = saleDashboardPath(
      parsed.start,
      parsed.end,
      parsed.filter,
      tabToIndex(parsed.tab)
    );
    const missingSegment =
      !params.startDate ||
      !params.endDate ||
      params.filter === undefined ||
      params.tab === undefined;
    if (missingSegment) {
      navigate(canonical, { replace: true });
    }
  }, [params.startDate, params.endDate, params.filter, params.tab, navigate, fallback]);

  return {
    startDate,
    endDate,
    filter,
    tab,
    tabIndex,
    goToDashboard,
    setTab,
    setPaymentFilter
  };
}

export { indexToTab };
