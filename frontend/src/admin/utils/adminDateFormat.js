/**
 * Legacy admin date display (matches PHP view_user_history):
 * - Date only: YYYY-MM-DD
 * - DateTime (Last Login): YYYY-MM-DD HH:MM:SS
 * - Date Time / Date & Time: date on first line, time on second line
 */

function parseAdminDate(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}\/\d{2}\/\d{2}/.test(raw)) {
    const d = new Date(raw.replace(/\//g, "-").replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD */
export function formatAdminDate(value) {
  const d = parseAdminDate(value);
  if (!d) return value ? String(value) : "—";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** YYYY-MM-DD HH:MM:SS (local) — Last Login */
export function formatAdminDateTime(value) {
  const d = parseAdminDate(value);
  if (!d) return value ? String(value) : "—";
  return `${formatAdminDate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/** { date, time } for stacked cells */
export function formatAdminDateTimeParts(value) {
  const d = parseAdminDate(value);
  if (!d) {
    return { date: value ? String(value) : "—", time: "" };
  }
  return {
    date: formatAdminDate(d),
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  };
}

/** Editorial room list — legacy `YYYY/MM/DD HH:MM` */
export function formatEditorialSubmissionDate(value) {
  const d = parseAdminDate(value);
  if (!d) return value ? String(value) : "—";
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
