import type { TimeGridConfig } from '../types/institution';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Weekday name for a day index, offset by the institution's start day. */
export function dayLabel(dayIndex: number, tg: TimeGridConfig): string {
  return DAY_NAMES[(tg.start_day + dayIndex) % 7] ?? `Day ${dayIndex + 1}`;
}

/** Clock time (HH:MM) at which a given slot-in-day begins. */
export function slotTimeLabel(slotInDay: number, tg: TimeGridConfig): string {
  const totalMin = tg.start_hour * 60 + tg.start_minute + slotInDay * tg.timeslot_duration_minutes;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Start-of-day slots where an activity of `durationSlots` still fits the day. */
export function validStartSlots(tg: TimeGridConfig, durationSlots: number): number[] {
  const dur = Math.max(1, durationSlots || 1);
  const out: number[] = [];
  for (let s = 0; s + dur <= tg.timeslots_per_day; s += 1) out.push(s);
  return out;
}

/**
 * Human-readable label for an absolute start timeslot, e.g. "Monday 12:00 – 14:00".
 * The pattern repeats every week, so weeks are intentionally not shown.
 */
export function formatPinnedTimeslot(
  startTimeslot: number,
  durationSlots: number,
  tg: TimeGridConfig,
): string {
  const tpd = tg.timeslots_per_day;
  const day = Math.floor(startTimeslot / tpd);
  const slot = startTimeslot % tpd;
  const dur = Math.max(1, durationSlots || 1);
  return `${dayLabel(day, tg)} ${slotTimeLabel(slot, tg)} – ${slotTimeLabel(slot + dur, tg)}`;
}
