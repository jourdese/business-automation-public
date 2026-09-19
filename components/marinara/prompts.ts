export function manilaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((key) => parts.find((part) => part.type === key)!.value)
    .join("-");
}

export function reservationPrompt(
  date: string,
  time: string,
  people: string,
  today = manilaToday(),
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) return null;
  const calendarDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== date)
    return null;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const group = Number(people);
  if (!Number.isInteger(group) || group < 1 || group > 40) return null;
  const [hour, minute] = time.split(":").map(Number);
  const label = `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  return `I’d like to ask about a table for ${group} ${group === 1 ? "person" : "people"} on ${date} at ${label} (Philippine time). Please help me check availability. I understand this is a demo, not a confirmed reservation.`;
}
