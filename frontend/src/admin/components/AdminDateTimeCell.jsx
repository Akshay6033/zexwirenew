import { formatAdminDateTimeParts } from "../utils/adminDateFormat";

/** Payment / PR / Press — date on first line, time on second (legacy). */
export default function AdminDateTimeCell({ value }) {
  const { date, time } = formatAdminDateTimeParts(value);
  if (!time || date === "—") return <span>{date}</span>;
  return (
    <span className="admin-datetime-stacked">
      {date}
      <br />
      {time}
    </span>
  );
}
