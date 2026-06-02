import { useEffect, useMemo, useRef, useState } from "react";

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "custom", label: "Custom Range" }
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromYmd(ymd) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getPresetRange(id) {
  const today = startOfDay(new Date());
  switch (id) {
    case "today":
      return { start: toYmd(today), end: toYmd(today) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { start: toYmd(y), end: toYmd(y) };
    }
    case "last7":
      return { start: toYmd(addDays(today, -6)), end: toYmd(today) };
    case "last30":
      return { start: toYmd(addDays(today, -29)), end: toYmd(today) };
    case "thisMonth": {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toYmd(start), end: toYmd(today) };
    }
    case "lastMonth": {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toYmd(start), end: toYmd(end) };
    }
    default:
      return null;
  }
}

export function detectPreset(start, end) {
  for (const p of PRESETS) {
    if (p.id === "custom") continue;
    const range = getPresetRange(p.id);
    if (range && range.start === start && range.end === end) return p.id;
  }
  return "custom";
}

export function formatUsDate(ymd) {
  const d = fromYmd(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function formatRangeLabel(start, end) {
  return `${formatUsDate(start)} - ${formatUsDate(end)}`;
}

function isValidYmd(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const d = fromYmd(ymd);
  return !Number.isNaN(d.getTime()) && toYmd(d) === ymd;
}

function parseDatePart(value) {
  const s = String(value || "").trim();
  if (!s) return null;

  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const month = Number(us[1]);
    const day = Number(us[2]);
    const year = Number(us[3]);
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return toYmd(d);
  }

  if (isValidYmd(s)) return s;
  return null;
}

/** Parse "MM/DD/YYYY - MM/DD/YYYY" or ISO dates typed in the field. */
export function parseDateRangeInput(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (!match) return null;

  const start = parseDatePart(match[1]);
  const end = parseDatePart(match[2]);
  if (!start || !end) return null;

  return start <= end ? { start, end } : { start: end, end: start };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isoWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function buildMonthGrid(viewMonth) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  const prevMonthLast = new Date(year, month, 0).getDate();
  for (let i = startPad - 1; i >= 0; i -= 1) {
    const day = prevMonthLast - i;
    const date = new Date(year, month - 1, day);
    cells.push({ date, inMonth: false, ymd: toYmd(date) });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, inMonth: true, ymd: toYmd(date) });
  }
  let day = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month + 1, day);
    cells.push({ date, inMonth: false, ymd: toYmd(date) });
    day += 1;
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    const slice = cells.slice(i, i + 7);
    weeks.push({ week: isoWeekNumber(slice[0].date), days: slice });
  }
  return weeks;
}

function isInRange(ymd, start, end) {
  if (!start || !end) return false;
  const s = start <= end ? start : end;
  const e = start <= end ? end : start;
  return ymd >= s && ymd <= e;
}

function MonthCalendar({ viewMonth, draftStart, draftEnd, onPickDay, onPrev, onNext, showPrev, showNext }) {
  const weeks = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  return (
    <div className="analytics-drp-calendar">
      <div className="analytics-drp-calendar__head">
        {showPrev ? (
          <button type="button" className="analytics-drp-nav" onClick={onPrev} aria-label="Previous month">
            ‹
          </button>
        ) : (
          <span className="analytics-drp-nav analytics-drp-nav--spacer" />
        )}
        <span className="analytics-drp-calendar__title">
          {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        {showNext ? (
          <button type="button" className="analytics-drp-nav" onClick={onNext} aria-label="Next month">
            ›
          </button>
        ) : (
          <span className="analytics-drp-nav analytics-drp-nav--spacer" />
        )}
      </div>
      <div className="analytics-drp-weekdays">
        <span className="analytics-drp-weeknum-h" />
        {WEEKDAYS.map((d) => (
          <span key={d} className="analytics-drp-weekday">
            {d}
          </span>
        ))}
      </div>
      {weeks.map((row) => (
        <div key={`${viewMonth.getMonth()}-${row.week}`} className="analytics-drp-week">
          <span className="analytics-drp-weeknum">{row.week}</span>
          {row.days.map((cell) => {
            const isStart = cell.ymd === draftStart;
            const isEnd = cell.ymd === draftEnd;
            const inRange = isInRange(cell.ymd, draftStart, draftEnd);
            const classes = [
              "analytics-drp-day",
              !cell.inMonth && "analytics-drp-day--muted",
              inRange && "analytics-drp-day--in-range",
              (isStart || isEnd) && "analytics-drp-day--edge"
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={cell.ymd}
                type="button"
                className={classes}
                onClick={() => onPickDay(cell.ymd)}
              >
                {cell.date.getDate()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDateRangePicker({ startDate, endDate, onApply }) {
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [activePreset, setActivePreset] = useState("custom");
  const [leftMonth, setLeftMonth] = useState(() => fromYmd(startDate));
  const [inputValue, setInputValue] = useState(() => formatRangeLabel(startDate, endDate));
  const [editing, setEditing] = useState(false);

  const rightMonth = useMemo(() => addMonths(leftMonth, 1), [leftMonth]);
  const displayLabel = formatRangeLabel(startDate, endDate);
  const draftLabel = formatRangeLabel(draftStart, draftEnd);

  useEffect(() => {
    if (!editing) setInputValue(displayLabel);
  }, [displayLabel, editing]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setDraftStart(startDate);
        setDraftEnd(endDate);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, startDate, endDate]);

  const commitInput = () => {
    const parsed = parseDateRangeInput(inputValue);
    if (parsed) {
      if (parsed.start !== startDate || parsed.end !== endDate) {
        onApply(parsed.start, parsed.end);
      }
      setInputValue(formatRangeLabel(parsed.start, parsed.end));
    } else {
      setInputValue(displayLabel);
    }
    setEditing(false);
  };

  const openPicker = () => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setLeftMonth(fromYmd(startDate));
    setActivePreset(detectPreset(startDate, endDate));
    setOpen(true);
  };

  const handleInputFocus = () => {
    setEditing(true);
    setInputValue(displayLabel);
  };

  const handleInputBlur = () => {
    commitInput();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setInputValue(displayLabel);
      setEditing(false);
      inputRef.current?.blur();
    }
  };

  const pickDay = (ymd) => {
    setActivePreset("custom");
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(ymd);
      setDraftEnd("");
      return;
    }
    if (ymd < draftStart) {
      setDraftEnd(draftStart);
      setDraftStart(ymd);
    } else {
      setDraftEnd(ymd);
    }
  };

  const applyPreset = (id) => {
    setActivePreset(id);
    if (id === "custom") return;
    const range = getPresetRange(id);
    if (!range) return;
    setDraftStart(range.start);
    setDraftEnd(range.end);
    setLeftMonth(fromYmd(range.start));
    // Legacy: preset click immediately runs overviewdashboard (redirect with dates)
    onApply(range.start, range.end);
    setOpen(false);
  };

  const handleApply = () => {
    if (!draftStart || !draftEnd) return;
    const start = draftStart <= draftEnd ? draftStart : draftEnd;
    const end = draftStart <= draftEnd ? draftEnd : draftStart;
    onApply(start, end);
    setOpen(false);
  };

  const handleCancel = () => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setOpen(false);
  };

  return (
    <div className="analytics-drp" ref={wrapRef}>
      <div className="analytics-drp-input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="analytics-drp-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          aria-label="Date range (MM/DD/YYYY - MM/DD/YYYY)"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="button"
          className="analytics-drp-calendar-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={openPicker}
          aria-label="Open date range calendar"
          title="Open calendar"
        >
          <span aria-hidden="true">📅</span>
        </button>
      </div>

      {open && (
        <div className="analytics-drp-popover">
          <div className="analytics-drp-body">
            <div className="analytics-drp-calendars">
              <MonthCalendar
                viewMonth={leftMonth}
                draftStart={draftStart}
                draftEnd={draftEnd}
                onPickDay={pickDay}
                showPrev
                showNext={false}
                onPrev={() => setLeftMonth((m) => addMonths(m, -1))}
              />
              <MonthCalendar
                viewMonth={rightMonth}
                draftStart={draftStart}
                draftEnd={draftEnd}
                onPickDay={pickDay}
                showPrev={false}
                showNext
                onNext={() => setLeftMonth((m) => addMonths(m, 1))}
              />
            </div>
            <ul className="analytics-drp-presets">
              {PRESETS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`analytics-drp-preset${activePreset === p.id ? " is-active" : ""}`}
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="analytics-drp-footer">
            <span className="analytics-drp-footer-range">{draftLabel}</span>
            <div className="analytics-drp-footer-actions">
              <button type="button" className="btn btn-sm analytics-drp-btn-cancel" onClick={handleCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm analytics-drp-btn-apply"
                onClick={handleApply}
                disabled={!draftStart || !draftEnd}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
