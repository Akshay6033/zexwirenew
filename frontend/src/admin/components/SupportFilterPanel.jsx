import { useMemo, useState } from "react";

const WEEKDAYS = ["S", "M", "T", "W", "TH", "F", "S"];
const MONTHS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromYmd(ymd) {
  if (!ymd) return null;
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateField(ymd) {
  const d = fromYmd(ymd);
  if (!d || Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
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
    cells.push({ date: new Date(year, month - 1, day), inMonth: false, ymd: toYmd(new Date(year, month - 1, day)) });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({ date, inMonth: true, ymd: toYmd(date) });
  }
  let day = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, day), inMonth: false, ymd: toYmd(new Date(year, month + 1, day)) });
    day += 1;
  }
  return cells;
}

function isInRange(ymd, start, end) {
  if (!start || !end) return false;
  const s = start <= end ? start : end;
  const e = start <= end ? end : start;
  return ymd >= s && ymd <= e;
}

function FilterAccordionRow({ label, expanded, selectedCount, showSelectedCount = true, onToggle }) {
  return (
    <button type="button" className="support-filter-accordion-btn" onClick={onToggle} aria-expanded={expanded}>
      <span className="support-filter-accordion-label">{label}</span>
      <span className="support-filter-accordion-meta">
        {expanded && showSelectedCount && selectedCount > 0 ? (
          <span className="support-filter-selected-count">{selectedCount} selected</span>
        ) : null}
        <span className={`support-filter-chevron${expanded ? " is-open" : ""}`} aria-hidden="true" />
      </span>
    </button>
  );
}

function FilterCheckbox({ checked, label, onChange }) {
  return (
    <label className="support-filter-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="support-filter-check-box" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

function SupportFilterCalendar({ dateFrom, dateTo, onChange }) {
  const [viewMonth, setViewMonth] = useState(() => fromYmd(dateFrom) || fromYmd(dateTo) || new Date());
  const [pickStart, setPickStart] = useState(true);
  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  const onPickDay = (ymd) => {
    if (pickStart || !dateFrom) {
      onChange(ymd, "");
      setPickStart(false);
      return;
    }
    if (ymd < dateFrom) {
      onChange(ymd, dateFrom);
    } else {
      onChange(dateFrom, ymd);
    }
    setPickStart(true);
  };

  const prevMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  return (
    <div className="support-filter-calendar">
      <div className="support-filter-calendar-head">
        <button type="button" className="support-filter-calendar-nav" onClick={prevMonth} aria-label="Previous month">
          ‹
        </button>
        <span className="support-filter-calendar-title">
          {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button type="button" className="support-filter-calendar-nav" onClick={nextMonth} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="support-filter-calendar-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="support-filter-calendar-grid">
        {cells.map((cell) => {
          const isStart = cell.ymd === dateFrom;
          const isEnd = cell.ymd === dateTo;
          const inRange = isInRange(cell.ymd, dateFrom, dateTo);
          const classes = [
            "support-filter-calendar-day",
            !cell.inMonth && "is-muted",
            inRange && "is-in-range",
            (isStart || isEnd) && "is-edge"
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button key={cell.ymd} type="button" className={classes} onClick={() => onPickDay(cell.ymd)}>
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SupportFilterPanel({
  appliedCount,
  draftFilters,
  setDraftFilters,
  onApply,
  onClear
}) {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (key) => {
    setOpenSection((prev) => (prev === key ? null : key));
  };

  const statusSelectedCount = [draftFilters.statusOpen, draftFilters.statusClosed].filter(Boolean).length;
  const statusAll = draftFilters.statusOpen && draftFilters.statusClosed;

  const readSelectedCount = [draftFilters.readRead, draftFilters.readUnread, draftFilters.readNotReplied].filter(
    Boolean
  ).length;
  const readAll = draftFilters.readRead && draftFilters.readUnread && draftFilters.readNotReplied;

  const setDateRange = (dateFrom, dateTo) => {
    setDraftFilters((f) => ({ ...f, dateFrom, dateTo }));
  };

  return (
    <div className="support-filter-panel">
      <p className="support-filter-applied">
        {appliedCount ? `${appliedCount} filter${appliedCount > 1 ? "s" : ""} applied` : "No filters applied"}
      </p>

      <div className="support-filter-sections">
        <section className="support-filter-section">
          <FilterAccordionRow
            label="Date Range"
            expanded={openSection === "date"}
            showSelectedCount={false}
            selectedCount={0}
            onToggle={() => toggleSection("date")}
          />
          {openSection === "date" && (
            <div className="support-filter-section-body">
              <label className="support-filter-date-field">
                <input
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(e) => setDateRange(e.target.value, draftFilters.dateTo)}
                  className="support-filter-date-input-native"
                />
                <span className="support-filter-date-display">
                  <span
                    className={`support-filter-date-text${draftFilters.dateFrom ? "" : " is-placeholder"}`}
                  >
                    {formatDateField(draftFilters.dateFrom) || "dd-----yyyy"}
                  </span>
                  <span className="support-filter-date-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path
                        fill="currentColor"
                        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10ZM5 8V6h14v2H5Z"
                      />
                    </svg>
                  </span>
                </span>
              </label>
              <label className="support-filter-date-field">
                <input
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(e) => setDateRange(draftFilters.dateFrom, e.target.value)}
                  className="support-filter-date-input-native"
                />
                <span className="support-filter-date-display">
                  <span
                    className={`support-filter-date-text${draftFilters.dateTo ? "" : " is-placeholder"}`}
                  >
                    {formatDateField(draftFilters.dateTo) || "dd-----yyyy"}
                  </span>
                  <span className="support-filter-date-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path
                        fill="currentColor"
                        d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10ZM5 8V6h14v2H5Z"
                      />
                    </svg>
                  </span>
                </span>
              </label>
              <SupportFilterCalendar
                dateFrom={draftFilters.dateFrom}
                dateTo={draftFilters.dateTo}
                onChange={setDateRange}
              />
            </div>
          )}
        </section>

        <section className="support-filter-section">
          <FilterAccordionRow
            label="Status"
            expanded={openSection === "status"}
            selectedCount={statusSelectedCount}
            onToggle={() => toggleSection("status")}
          />
          {openSection === "status" && (
            <div className="support-filter-section-body">
              <FilterCheckbox
                checked={statusAll}
                label="All"
                onChange={(checked) =>
                  setDraftFilters((f) => ({ ...f, statusOpen: checked, statusClosed: checked }))
                }
              />
              <FilterCheckbox
                checked={draftFilters.statusOpen}
                label="Open"
                onChange={(checked) => setDraftFilters((f) => ({ ...f, statusOpen: checked }))}
              />
              <FilterCheckbox
                checked={draftFilters.statusClosed}
                label="Closed"
                onChange={(checked) => setDraftFilters((f) => ({ ...f, statusClosed: checked }))}
              />
            </div>
          )}
        </section>

        <section className="support-filter-section">
          <FilterAccordionRow
            label="Read / unread"
            expanded={openSection === "read"}
            selectedCount={readSelectedCount}
            onToggle={() => toggleSection("read")}
          />
          {openSection === "read" && (
            <div className="support-filter-section-body">
              <FilterCheckbox
                checked={readAll}
                label="All"
                onChange={(checked) =>
                  setDraftFilters((f) => ({
                    ...f,
                    readRead: checked,
                    readUnread: checked,
                    readNotReplied: checked
                  }))
                }
              />
              <FilterCheckbox
                checked={draftFilters.readRead}
                label="Read"
                onChange={(checked) => setDraftFilters((f) => ({ ...f, readRead: checked }))}
              />
              <FilterCheckbox
                checked={draftFilters.readUnread}
                label="Unread"
                onChange={(checked) => setDraftFilters((f) => ({ ...f, readUnread: checked }))}
              />
              <FilterCheckbox
                checked={draftFilters.readNotReplied}
                label="Read but not replied"
                onChange={(checked) => setDraftFilters((f) => ({ ...f, readNotReplied: checked }))}
              />
            </div>
          )}
        </section>
      </div>

      <div className="support-filter-footer">
        <button type="button" className="support-filter-btn support-filter-btn-clear" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="support-filter-btn support-filter-btn-apply" onClick={onApply}>
          Apply
        </button>
      </div>
    </div>
  );
}
