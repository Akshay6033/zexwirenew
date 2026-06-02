import { useCallback, useMemo, useState } from "react";

export const OVERVIEW_CHART_SERIES = [
  { key: "sales", label: "Sales", color: "#4f7cff" },
  { key: "prSubmitted", label: "PR Submitted", color: "#f06292" },
  { key: "newUsers", label: "New Users", color: "#ffb300" },
  { key: "activeUsers", label: "Active", color: "#66bb6a" }
];

export const PR_CHART_SERIES = [
  { key: "totalPr", label: "Total PR", color: "#4f7cff" },
  { key: "pending", label: "Pending", color: "#ff9800" },
  { key: "actionRequired", label: "Action Required", color: "#ffc107" },
  { key: "rejected", label: "Rejected", color: "#66bb6a" },
  { key: "published", label: "Published", color: "#ab47bc" }
];

export const USERS_CHART_SERIES = [
  { key: "totalAccount", label: "Total Account", color: "#4f7cff" },
  { key: "newSignup", label: "New Signups", color: "#f06292" },
  { key: "activeAccount", label: "Active Account", color: "#ffb300" },
  { key: "deletedAccount", label: "Deleted Account", color: "#66bb6a" }
];

const HIT_STROKE_WIDTH = 18;

function buildSeriesGeometry(points, width, height, yMax, padding) {
  if (!points.length) return { path: "", nodes: [] };
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;
  const safeMax = yMax > 0 ? yMax : 1;

  const nodes = points.map((val, i) => {
    const x = padding + i * step;
    const y = padding + innerH - (Number(val) / safeMax) * innerH;
    return { x, y, value: Number(val) };
  });

  const path = nodes
    .map((node, i) => `${i === 0 ? "M" : "L"}${node.x.toFixed(1)},${node.y.toFixed(1)}`)
    .join(" ");

  return { path, nodes };
}

export default function AnalyticsLineChart({
  chart,
  series = OVERVIEW_CHART_SERIES,
  onSeriesClick
}) {
  const width = 900;
  const height = 320;
  const padding = 36;
  const yTicks = 6;

  const [hiddenKeys, setHiddenKeys] = useState(() => new Set());
  const [activeKey, setActiveKey] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);

  const labels = chart?.labels || [];

  const seriesData = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        points: (chart?.[s.key] || []).map((d) => Number(d.value || 0))
      })),
    [chart, series]
  );

  const { yMax, tickStep } = useMemo(() => {
    const visible = seriesData.filter((s) => !hiddenKeys.has(s.key));
    const allValues = (visible.length ? visible : seriesData).flatMap((s) => s.points);
    const dataMax = Math.max(...allValues, 0);
    let step =
      dataMax > 0
        ? Math.ceil(dataMax / yTicks / 100) * 100 || Math.ceil(dataMax / yTicks)
        : 1;
    if (step <= 0) step = 1;
    return { yMax: step * yTicks, tickStep: step };
  }, [seriesData, hiddenKeys, yTicks]);

  const geometries = useMemo(
    () =>
      seriesData.map((s) => ({
        ...s,
        ...buildSeriesGeometry(s.points, width, height, yMax, padding)
      })),
    [seriesData, yMax]
  );

  const toggleSeries = useCallback(
    (key) => {
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
      setActiveKey(key);
      onSeriesClick?.(key);
    },
    [onSeriesClick]
  );

  const focusSeries = useCallback((key) => {
    setActiveKey(key);
    setHoveredKey(key);
  }, []);

  const lineOpacity = (key) => {
    if (hiddenKeys.has(key)) return 0.12;
    if (activeKey && activeKey !== key) return 0.35;
    if (hoveredKey && hoveredKey !== key) return 0.45;
    return 1;
  };

  return (
    <div className="analytics-line-chart">
      <div className="analytics-line-chart__legend">
        {series.map((s) => {
          const off = hiddenKeys.has(s.key);
          const on = activeKey === s.key;
          return (
            <button
              key={s.key}
              type="button"
              className={`analytics-line-chart__legend-item${off ? " is-off" : ""}${on ? " is-active" : ""}`}
              onClick={() => toggleSeries(s.key)}
              aria-pressed={!off}
            >
              <span className="analytics-line-chart__dot" style={{ background: s.color }} />
              {s.label}
            </button>
          );
        })}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="analytics-line-chart__svg"
        role="img"
        aria-label="Analytics line chart. Click a line or legend to highlight."
      >
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const y = padding + ((height - padding * 2) / yTicks) * i;
          const val = yMax - tickStep * i;
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e8ecf4" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" className="analytics-line-chart__axis-label">
                {val.toLocaleString()}
              </text>
            </g>
          );
        })}
        {labels.map((label, i) => {
          const innerW = width - padding * 2;
          const step = labels.length > 1 ? innerW / (labels.length - 1) : 0;
          const x = padding + i * step;
          return (
            <text
              key={label + i}
              x={x}
              y={height - 10}
              textAnchor="middle"
              className="analytics-line-chart__axis-label"
            >
              {label}
            </text>
          );
        })}
        {geometries.map((s) => {
          if (!s.path) return null;
          const opacity = lineOpacity(s.key);
          const title = `${s.label} — click to ${hiddenKeys.has(s.key) ? "show" : "hide"}`;
          return (
            <g
              key={s.key}
              className="analytics-line-chart__series"
              style={{ opacity }}
              onMouseEnter={() => focusSeries(s.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <path
                d={s.path}
                fill="none"
                stroke="transparent"
                strokeWidth={HIT_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="analytics-line-chart__hit"
                onClick={() => toggleSeries(s.key)}
              >
                <title>{title}</title>
              </path>
              <path
                d={s.path}
                fill="none"
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
              {s.nodes.map((node, i) => (
                <circle
                  key={`${s.key}-${i}`}
                  cx={node.x}
                  cy={node.y}
                  r={8}
                  fill="transparent"
                  className="analytics-line-chart__hit"
                  onClick={() => toggleSeries(s.key)}
                >
                  <title>
                    {labels[i] || ""}: {node.value.toLocaleString()} ({s.label})
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
