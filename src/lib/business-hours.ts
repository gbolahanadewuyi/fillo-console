/** Trading hours as the company sets them: the everyday hours, and optionally each weekday's own (null = closed that day). Mirrors the API's `business.hours`. */
export const WEEKDAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

export type WeekdayKey = (typeof WEEKDAYS)[number]["key"];
export type DayHours = { open: string; close: string } | null;
export type BusinessHours = { open: string; close: string; days?: Record<WeekdayKey, DayHours> };

/** Every day's hours, from the saved setting: the day's own when it has one, otherwise the everyday hours. */
export function weekOf(hours: BusinessHours): Record<WeekdayKey, DayHours> {
  const week = {} as Record<WeekdayKey, DayHours>;
  for (const d of WEEKDAYS) week[d.key] = hours.days ? hours.days[d.key] : { open: hours.open, close: hours.close };
  return week;
}

/** What to save: the week, plus the first open day's hours as the everyday `open`/`close`, so anything reading only those still sees real hours. */
export function hoursFromWeek(week: Record<WeekdayKey, DayHours>): BusinessHours {
  const first = WEEKDAYS.map((d) => week[d.key]).find((h) => h !== null);
  return { open: first?.open ?? "08:00", close: first?.close ?? "18:00", days: week };
}

/** "Mon to Fri 07:00 to 18:00, Sat 07:00 to 17:00, Sun closed": runs of days with the same hours are joined. */
export function summariseWeek(week: Record<WeekdayKey, DayHours>): string {
  const label = (h: DayHours) => (h ? `${h.open} to ${h.close}` : "closed");
  const short = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" } as const;
  const runs: { from: WeekdayKey; to: WeekdayKey; text: string }[] = [];
  for (const d of WEEKDAYS) {
    const text = label(week[d.key]);
    const last = runs[runs.length - 1];
    if (last && last.text === text) last.to = d.key;
    else runs.push({ from: d.key, to: d.key, text });
  }
  return runs.map((r) => `${r.from === r.to ? short[r.from] : `${short[r.from]} to ${short[r.to]}`} ${r.text}`).join(", ");
}
