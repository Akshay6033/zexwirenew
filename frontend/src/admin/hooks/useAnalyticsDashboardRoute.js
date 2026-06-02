import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  analyticsOverviewPath,
  defaultAnalyticsRange,
  defaultUsersRange,
  overviewDashboardPath,
  parseRouteDates,
  prDashboardPath,
  userDashboardPath
} from "../utils/analyticsDateRoute";

const LEGACY_PATHS = {
  overview: overviewDashboardPath,
  pr: prDashboardPath,
  users: userDashboardPath
};

/**
 * Syncs analytics date range + chart mode with URL (legacy overviewdashboard / prdashboard pattern).
 */
export function useAnalyticsDashboardRoute(options = {}) {
  const {
    basePath = "/admindashboard/analytics/overview",
    legacyDashboard = "overview",
    defaultRange
  } = options;

  const navigate = useNavigate();
  const params = useParams();
  const fallback = useMemo(
    () =>
      defaultRange ||
      (legacyDashboard === "pr" || legacyDashboard === "users"
        ? defaultUsersRange()
        : defaultAnalyticsRange()),
    [defaultRange, legacyDashboard]
  );

  const { start: startDate, end: endDate, mode } = parseRouteDates(
    params.startDate,
    params.endDate,
    params.mode,
    fallback
  );

  const buildPath = (start, end, chartMode) => {
    const legacyFn = LEGACY_PATHS[legacyDashboard];
    if (legacyFn) return legacyFn(start, end, chartMode);
    return `${basePath}/${start}/${end}/${chartMode}`;
  };

  const goToDashboard = (start, end, chartMode = mode) => {
    navigate(buildPath(start, end, chartMode), { replace: true });
  };

  const setChartMode = (chartMode) => {
    goToDashboard(startDate, endDate, chartMode);
  };

  useEffect(() => {
    const parsed = parseRouteDates(params.startDate, params.endDate, params.mode, fallback);
    const canonical = buildPath(parsed.start, parsed.end, parsed.mode);
    const missingSegment = !params.startDate || !params.endDate || !params.mode;
    const invalidSegment =
      (params.startDate && params.startDate !== parsed.start) ||
      (params.endDate && params.endDate !== parsed.end) ||
      (params.mode && params.mode !== "year" && params.mode !== "month");
    if (missingSegment || invalidSegment) {
      navigate(canonical, { replace: true });
    }
  }, [
    params.startDate,
    params.endDate,
    params.mode,
    navigate,
    fallback,
    legacyDashboard,
    basePath
  ]);

  return {
    startDate,
    endDate,
    mode,
    goToDashboard,
    setChartMode
  };
}
