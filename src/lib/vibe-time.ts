/**
 * Eldoret runs on East Africa Time (UTC+3, no daylight saving). Vibes are stored as one UTC
 * timestamp (`starts_at`); everything the screens show is worked out in Nairobi time here.
 */
const EAT_OFFSET_HOURS = 3;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Shifts an instant so its UTC fields read as Nairobi wall-clock time. */
function eat(date: Date): Date {
  return new Date(date.getTime() + EAT_OFFSET_HOURS * HOUR_MS);
}

/** Whole days since 1970 on the Nairobi calendar. */
function eatDayNumber(date: Date): number {
  return Math.floor(eat(date).getTime() / DAY_MS);
}

/**
 * Turns the form's calendar day + "HH:mm" time into the ISO string the database stores,
 * read as Nairobi time. Returns null when the time isn't usable.
 */
export function toStartsAt(day: Date, time: string): string | null {
  const [hour, minute] = time.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const date = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  return `${date}T${pad(hour)}:${pad(minute)}:00+03:00`;
}

export function isInFuture(startsAt: string, now = new Date()): boolean {
  return new Date(startsAt).getTime() > now.getTime();
}

/** "Today", "Tomorrow", "Yesterday", a weekday within the week, otherwise "Sat, 28 Nov". */
export function formatVibeDate(startsAt: string, now = new Date()): string {
  const start = new Date(startsAt);
  const diff = eatDayNumber(start) - eatDayNumber(now);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  const local = eat(start);
  const weekday = WEEKDAYS[local.getUTCDay()];
  if (diff > 1 && diff < 7) return weekday;
  return `${weekday.slice(0, 3)}, ${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}`;
}

/** "7:00 pm" */
export function formatVibeTime(startsAt: string): string {
  const local = eat(new Date(startsAt));
  const hour = local.getUTCHours();
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${pad(local.getUTCMinutes())} ${hour < 12 ? "am" : "pm"}`;
}

/** The home screen's time filter: "All vibes", "Tonight" (today) or "This weekend" (Fri–Sun). */
export function matchesTimeFilter(startsAt: string, filter: string, now = new Date()): boolean {
  const start = new Date(startsAt);
  if (filter === "Tonight") return eatDayNumber(start) === eatDayNumber(now);
  if (filter === "This weekend") {
    const today = eatDayNumber(now);
    const lastDay = today + ((7 - eat(now).getUTCDay()) % 7); // the coming Sunday (today if Sunday)
    const weekday = eat(start).getUTCDay();
    return eatDayNumber(start) <= lastDay && (weekday === 0 || weekday >= 5);
  }
  return true;
}