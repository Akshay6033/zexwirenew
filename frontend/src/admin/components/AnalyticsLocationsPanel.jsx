import AnalyticsWorldMap from "./AnalyticsWorldMap";
import { isUnknownCountry } from "../utils/countryGeo";

function formatTotal(value, format) {
  const n = Number(value || 0);
  if (format === "currency") return `$ ${n.toLocaleString()}`;
  return n.toLocaleString();
}

/**
 * Map + country list (Overview sales, PR counts, Users, etc.)
 */
export default function AnalyticsLocationsPanel({
  title,
  locations = [],
  locationTotal = 0,
  countKey = "user_count",
  markerFormat = "number",
  emptyMessage = "No data by country in this date range.",
  renderListValue
}) {
  const unknownRow = locations.find((r) => isUnknownCountry(r.country_name));
  const unknownAmount = unknownRow ? Number(unknownRow[countKey] || 0) : 0;

  return (
    <div className="card m-b-30 analytics-panel">
      <div className="card-body">
        <h5 className="mb-3">{title}</h5>
        <div className="analytics-locations analytics-locations--with-map">
          <div className="analytics-locations__map-col">
            <AnalyticsWorldMap
              locations={locations}
              countKey={countKey}
              markerFormat={markerFormat}
            />
            <div className="analytics-locations__total">
              <span className="text-muted">Total</span>
              <strong>{formatTotal(locationTotal, markerFormat)}</strong>
              {unknownAmount > 0 && (
                <span className="analytics-locations__unknown-note text-muted">
                  Includes {formatTotal(unknownAmount, markerFormat)} unknown location
                </span>
              )}
            </div>
          </div>
          <ul className="analytics-locations__list">
            {locations.length === 0 && emptyMessage ? (
              <li className="text-muted">{emptyMessage}</li>
            ) : null}
            {locations.map((row) => {
              const value = Number(row[countKey] || 0);
              const pct = locationTotal ? Math.round((value / locationTotal) * 100) : 0;
              return (
                <li key={row.country_name} className="analytics-locations__item">
                  <div className="analytics-locations__row">
                    <span>{row.country_name}</span>
                    {renderListValue ? (
                      renderListValue(row, value)
                    ) : (
                      <span className="analytics-locations__badge">{value.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="analytics-locations__bar">
                    <span style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
