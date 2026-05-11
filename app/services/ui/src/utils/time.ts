/**
 * Parse a timestamp string emitted by the API as UTC.
 *
 * The backend uses ``datetime.now(timezone.utc)`` and serializes via Pydantic.
 * Depending on the storage round-trip (MongoDB → Pydantic) the JSON string
 * may or may not carry a trailing ``Z`` / ``+00:00``.  JavaScript's
 * ``new Date(...)`` parses an ISO string **without a timezone marker as
 * local time**, which silently shifts the displayed time by the user's
 * UTC offset — breaking ETA countdowns and "started X ago" labels.
 *
 * Strategy: if the string has no timezone marker, append "Z" so JS treats
 * it as UTC.  Otherwise use the string as-is.
 *
 * Returns epoch milliseconds (UTC).  Returns ``NaN`` for unparseable input.
 */
export function parseServerTimestampMs(ts: string | null | undefined): number {
  if (!ts) return NaN;
  // ISO-8601 timezone markers: trailing Z, or ±HH:MM / ±HHMM at the end.
  const hasTz = /[zZ]$/.test(ts) || /[+-]\d{2}:?\d{2}$/.test(ts);
  const normalized = hasTz ? ts : `${ts}Z`;
  return new Date(normalized).getTime();
}

/** Convenience: returns a Date object, parsed UTC-aware. */
export function parseServerTimestamp(ts: string | null | undefined): Date | null {
  const ms = parseServerTimestampMs(ts);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/** Format seconds as a compact duration string (e.g. "1h 23m", "4m 12s", "45s"). */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm === 0 ? `${h}h` : `${h}h ${mm}m`;
}
