// Minimal RFC 5545 (.ics) builder.  Events use floating local time (no TZID),
// so each calendar app shows them in the viewer's local timezone - correct for
// a single-location institution and free of VTIMEZONE complexity.

export interface CalendarEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Fold long content lines to ≤75 chars with CRLF + leading space continuation.
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    out.push((i === 0 ? '' : ' ') + line.slice(i, i + 74));
    i += 74;
  }
  return out.join('\r\n');
}

const p2 = (n: number) => String(n).padStart(2, '0');

function fmtUtc(d: Date): string {
  return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;
}

export function buildIcs(events: CalendarEvent[], calendarName: string): string {
  const stamp = fmtUtc(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ODES//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${escapeText(calendarName)}`),
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    // Emit as UTC instants (…Z).  The start/end Dates are built in the user's
    // local timezone, so each calendar app converts the UTC time back to that
    // same local wall-clock - 8:00 at the institution shows as 8:00 locally.
    // (Floating, un-zoned times get misread as UTC by some apps and shift.)
    lines.push(`DTSTART:${fmtUtc(e.start)}`);
    lines.push(`DTEND:${fmtUtc(e.end)}`);
    lines.push(fold(`SUMMARY:${escapeText(e.title)}`));
    if (e.description) lines.push(fold(`DESCRIPTION:${escapeText(e.description)}`));
    if (e.location) lines.push(fold(`LOCATION:${escapeText(e.location)}`));
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
