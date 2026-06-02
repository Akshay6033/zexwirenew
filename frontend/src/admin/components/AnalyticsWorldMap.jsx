import { useMemo } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldTopo from "world-atlas/countries-110m.json";
import { getCountryCoords, isUnknownCountry } from "../utils/countryGeo";

const WIDTH = 800;
const HEIGHT = 420;
const PAD = 14;

function markerRadius(count, maxCount) {
  if (!maxCount) return 12;
  const ratio = count / maxCount;
  return Math.max(11, Math.min(26, 9 + ratio * 17));
}

function formatMarkerLabel(value, format) {
  const n = Number(value || 0);
  if (format === "currency") {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${Math.round(n)}`;
  }
  return String(Math.round(n));
}

function formatTooltipLabel(value, format) {
  const n = Number(value || 0);
  if (format === "currency") return `$ ${n.toLocaleString()}`;
  return n.toLocaleString();
}

/**
 * Real world map (Natural Earth) with count markers per country.
 * @param {Array<{ country_name: string }>} locations
 * @param {string} countKey
 */
export default function AnalyticsWorldMap({
  locations = [],
  countKey = "user_count",
  markerFormat = "number"
}) {
  const countries = useMemo(
    () => feature(worldTopo, worldTopo.objects.countries).features,
    []
  );

  const { path, projection } = useMemo(() => {
    const proj = geoEqualEarth().fitExtent(
      [
        [PAD, PAD],
        [WIDTH - PAD, HEIGHT - PAD]
      ],
      { type: "Sphere" }
    );
    return { path: geoPath(proj), projection: proj };
  }, []);

  const markers = useMemo(() => {
    const mapped = [];
    for (const row of locations) {
      const name = row.country_name;
      if (isUnknownCountry(name)) continue;
      const coords = getCountryCoords(name);
      if (!coords) continue;
      const count = Number(row[countKey] || 0);
      if (count <= 0) continue;
      const projected = projection([coords.lng, coords.lat]);
      if (!projected || Number.isNaN(projected[0])) continue;
      mapped.push({ name, count, x: projected[0], y: projected[1] });
    }
    return mapped;
  }, [locations, countKey, projection]);

  const maxCount = useMemo(() => Math.max(...markers.map((m) => m.count), 1), [markers]);

  return (
    <div className="analytics-world-map" role="img" aria-label="World map with user counts by country">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="analytics-world-map__svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect width={WIDTH} height={HEIGHT} fill="#dce8f8" rx="6" />
        <g className="analytics-world-map__land">
          {countries.map((geo) => (
            <path
              key={geo.id || geo.properties?.name}
              d={path(geo) || ""}
              fill="#b4c5e4"
              stroke="#fff"
              strokeWidth={0.4}
            />
          ))}
        </g>
        <g className="analytics-world-map__markers">
          {markers.map((m) => {
            const r = markerRadius(m.count, maxCount);
            const label = formatMarkerLabel(m.count, markerFormat);
            const fontSize = label.length > 4 ? 8 : r >= 16 ? 11 : 9;
            return (
              <g key={m.name} className="analytics-world-map__marker">
                <circle
                  cx={m.x}
                  cy={m.y}
                  r={r}
                  fill="#4f6ef7"
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text
                  x={m.x}
                  y={m.y + fontSize * 0.35}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={fontSize}
                  fontWeight="700"
                  style={{ pointerEvents: "none" }}
                >
                  {label}
                </text>
                <title>
                  {m.name}: {formatTooltipLabel(m.count, markerFormat)}
                </title>
              </g>
            );
          })}
        </g>
      </svg>
      {markers.length === 0 && (
        <p className="analytics-world-map__empty text-muted">No mapped countries in this range.</p>
      )}
    </div>
  );
}
