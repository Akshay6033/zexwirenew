import { Navigate, useParams } from "react-router-dom";
import {
  analyticsOverviewPath,
  analyticsSalesPath,
  analyticsUsersPath,
  defaultAnalyticsRange,
  defaultPrRange,
  defaultSalesRange,
  overviewDashboardPath,
  parseRouteDates,
  parseSalesRoute,
  prDashboardPath,
  saleDashboardPath,
  tabToIndex,
  userDashboardPath
} from "../utils/analyticsDateRoute";

/** Fills missing/invalid analytics URL segments instead of falling through to login. */
export function OverviewDashboardRedirect() {
  const params = useParams();
  const parsed = parseRouteDates(params.startDate, params.endDate, params.mode, defaultAnalyticsRange());
  return <Navigate to={overviewDashboardPath(parsed.start, parsed.end, parsed.mode)} replace />;
}

export function AnalyticsOverviewRedirect() {
  const params = useParams();
  const parsed = parseRouteDates(params.startDate, params.endDate, params.mode, defaultAnalyticsRange());
  return <Navigate to={analyticsOverviewPath(parsed.start, parsed.end, parsed.mode)} replace />;
}

export function PrDashboardRedirect() {
  const params = useParams();
  const parsed = parseRouteDates(params.startDate, params.endDate, params.mode, defaultPrRange());
  return <Navigate to={prDashboardPath(parsed.start, parsed.end, parsed.mode)} replace />;
}

export function AnalyticsPrRedirect() {
  const params = useParams();
  const parsed = parseRouteDates(params.startDate, params.endDate, params.mode, defaultPrRange());
  return <Navigate to={`/admindashboard/analytics/pr/${parsed.start}/${parsed.end}/${parsed.mode}`} replace />;
}

export function UserDashboardRedirect() {
  const params = useParams();
  const parsed = parseRouteDates(params.startDate, params.endDate, params.mode, defaultPrRange());
  return <Navigate to={userDashboardPath(parsed.start, parsed.end, parsed.mode)} replace />;
}

export function AnalyticsUsersRedirect() {
  const params = useParams();
  const parsed = parseRouteDates(params.startDate, params.endDate, params.mode, defaultPrRange());
  return <Navigate to={analyticsUsersPath(parsed.start, parsed.end, parsed.mode)} replace />;
}

export function SaleDashboardRedirect() {
  const params = useParams();
  const parsed = parseSalesRoute(
    params.startDate,
    params.endDate,
    params.filter,
    params.tab,
    defaultSalesRange()
  );
  return (
    <Navigate
      to={saleDashboardPath(parsed.start, parsed.end, parsed.filter, tabToIndex(parsed.tab))}
      replace
    />
  );
}

export function AnalyticsSalesRedirect() {
  const params = useParams();
  const parsed = parseSalesRoute(
    params.startDate,
    params.endDate,
    params.filter,
    params.tab,
    defaultSalesRange()
  );
  return (
    <Navigate
      to={analyticsSalesPath(parsed.start, parsed.end, parsed.filter, parsed.tab)}
      replace
    />
  );
}
