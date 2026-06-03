// Helpers for mapping real calendar weeks to the time-grid's week rotation.
// Dates are handled as local "YYYY-MM-DD" strings to avoid timezone drift.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Parse "YYYY-MM-DD" into a Date at local midnight (no UTC shift). */
export function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Format a Date as a local "YYYY-MM-DD" string. */
export function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Day index with Monday = 0 ... Sunday = 6 (matches the institution start_day). */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Add `n` days to an ISO date, returning a new ISO date. */
export function addDaysIso(iso: string, n: number): string {
  const d = isoToLocalDate(iso);
  d.setDate(d.getDate() + n);
  return localDateToIso(d);
}

/**
 * Snap an arbitrary picked date back to the start of its real week - i.e. the
 * most recent `startDay` weekday on or before the date.  Selecting any day thus
 * selects the whole week.
 */
export function snapToWeekStart(iso: string, startDay: number): string {
  const date = isoToLocalDate(iso);
  const offset = (mondayIndex(date) - startDay + 7) % 7;
  return addDaysIso(iso, -offset);
}

/** "1 Jun 2026" - day, 3-letter month, year. */
export function formatDayMonthYear(iso: string): string {
  if (!iso) return '';
  const d = isoToLocalDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mon 1 Jun – Fri 5 Jun 2026" style label for a week of `days` length. */
export function weekRangeLabel(startIso: string, days: number): string {
  const start = isoToLocalDate(startIso);
  const end = isoToLocalDate(addDaysIso(startIso, Math.max(0, days - 1)));
  const startStr = `${WEEKDAYS[mondayIndex(start)]} ${start.getDate()} ${MONTHS[start.getMonth()]}`;
  const endStr = `${WEEKDAYS[mondayIndex(end)]} ${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  return `${startStr} – ${endStr}`;
}

/**
 * Generate `count` consecutive real weeks starting at `firstIso` (snapped),
 * cycling the rotation pattern 1..weeks.  Used by the "auto-fill" helper.
 */
export function generateWeeks(
  firstIso: string,
  count: number,
  weeks: number,
  startDay: number,
): { start_date: string; week_number: number }[] {
  const first = snapToWeekStart(firstIso, startDay);
  const out: { start_date: string; week_number: number }[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      start_date: addDaysIso(first, i * 7),
      week_number: (i % Math.max(1, weeks)) + 1,
    });
  }
  return out;
}
