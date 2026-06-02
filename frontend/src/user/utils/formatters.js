const STATUS_LABELS = {
  0: "PR Draft",
  1: "PR Pending",
  2: "PR Published",
  3: "PR Action Required",
  5: "PR Rejected"
};

export function prStatusLabel(status) {
  return STATUS_LABELS[Number(status)] || "PR Update";
}

export function formatPrDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr.replace(/\//g, "-"));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

export function formatPackageExpiry(dateStr) {
  if (!dateStr) return "";
  const d = new Date(String(dateStr).slice(0, 10));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function daysUntil(dateStr) {
  if (!dateStr) return 0;
  const end = new Date(String(dateStr).slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (Number.isNaN(end.getTime())) return 0;
  const diff = Math.ceil((today - end) / (1000 * 60 * 60 * 24));
  return Math.abs(diff);
}

export function hoursAgo(dateTime) {
  if (!dateTime) return "";
  const then = new Date(dateTime);
  if (Number.isNaN(then.getTime())) return "";
  const now = new Date();
  const seconds = Math.floor((now - then) / 1000);
  const intervals = [
    { label: "year", secs: 31536000 },
    { label: "month", secs: 2592000 },
    { label: "week", secs: 604800 },
    { label: "day", secs: 86400 },
    { label: "hour", secs: 3600 },
    { label: "minute", secs: 60 },
    { label: "second", secs: 1 }
  ];
  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) {
      return `${count} ${label}${count > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
}
