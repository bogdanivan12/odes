import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { activityRoute } from '../../config/routes';
import { toTitleLabel } from '../../utils/text';
import type {
  InstitutionCourse,
  InstitutionGroup,
  InstitutionUser,
  InstitutionRoom,
} from '../../api/institutions';

// ─── Constants ────────────────────────────────────────────────────────────────

export const SLOT_W = 80;       // px per timeslot column
export const DAY_H = 72;        // px per day row
export const DAY_LABEL_W = 56;  // px for the day-name column
export const HDR_H = 32;        // px for the slot-number header row

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getDayName(dayIndex: number): string {
  return dayIndex < DAY_NAMES.length ? DAY_NAMES[dayIndex] : `Day ${dayIndex + 1}`;
}

export function slotToTime(slotIndex: number, startHour: number, durationMinutes: number, startMinute = 0): string {
  const totalMinutes = startHour * 60 + startMinute + slotIndex * durationMinutes;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getActivityTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t === 'course') return '#6366F1';    // indigo
  if (t === 'seminar') return '#06B6D4';   // cyan
  if (t === 'laboratory') return '#F59E0B'; // amber
  return '#8B5CF6';
}

// ─── Lane assignment for overlapping activities ───────────────────────────────

interface LanedEntry {
  entry: ScheduledEntry;
  lane: number;
  laneCount: number;
}

function assignLanes(dayEntries: ScheduledEntry[], timeslotsPerDay: number): LanedEntry[] {
  if (dayEntries.length === 0) return [];

  // Normalise each entry to [start, end] slot indices within the day
  const items = dayEntries
    .map((e) => ({
      entry: e,
      start: e.startTimeslot % timeslotsPerDay,
      end: (e.startTimeslot % timeslotsPerDay) + e.durationSlots - 1,
    }))
    .sort((a, b) => (a.start !== b.start ? a.start - b.start : b.end - a.end));

  const result: LanedEntry[] = [];
  let i = 0;

  while (i < items.length) {
    // Collect a collision cluster: all items that touch the current sweep end
    let sweepEnd = items[i].end;
    let j = i;
    while (j < items.length && items[j].start <= sweepEnd) {
      sweepEnd = Math.max(sweepEnd, items[j].end);
      j++;
    }
    const group = items.slice(i, j);

    // Assign each item in the cluster to the earliest free lane
    const laneEnd: number[] = [];
    const groupLanes: number[] = [];
    for (const item of group) {
      let lane = laneEnd.findIndex((end) => end <= item.start);
      if (lane === -1) {
        lane = laneEnd.length;
        laneEnd.push(0);
      }
      laneEnd[lane] = item.end + 1;
      groupLanes.push(lane);
    }

    const laneCount = laneEnd.length;
    group.forEach((item, k) =>
      result.push({ entry: item.entry, lane: groupLanes[k], laneCount }),
    );
    i = j;
  }

  return result;
}

// ─── Shared entry type ────────────────────────────────────────────────────────

export interface ScheduledEntry {
  schedRecId: string;
  scheduleId: string;
  activityId: string;
  roomId: string;
  startTimeslot: number;
  activeWeeks: number[];
  activityType: string;
  courseId: string;
  groupId: string;
  professorId: string | null;
  durationSlots: number;
  requiredRoomFeatures: string[];
  frequency: string;
  institutionId?: string; // used for global cross-institution filtering
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CalendarGridProps {
  entries: ScheduledEntry[];
  days: number;
  timeslotsPerDay: number;
  selectedWeek: number;
  coursesById: Map<string, InstitutionCourse>;
  groupsById: Map<string, InstitutionGroup>;
  usersById: Map<string, InstitutionUser>;
  roomsById: Map<string, InstitutionRoom>;
  getTypeColor: (type: string) => string;
  entityLabel: string;
  startHour?: number;
  startMinute?: number;
  timeslotDurationMinutes?: number;
  startDay?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarGrid({
  entries,
  days,
  timeslotsPerDay,
  selectedWeek,
  coursesById,
  groupsById,
  usersById,
  roomsById,
  getTypeColor,
  entityLabel,
  startHour = 8,
  startMinute = 0,
  timeslotDurationMinutes = 60,
  startDay = 0,
}: CalendarGridProps) {
  const theme = useTheme();
  const navigate = useNavigate();

  const activeEntries = useMemo(
    () => entries.filter((e) => e.activeWeeks.includes(selectedWeek)),
    [entries, selectedWeek],
  );

  if (activeEntries.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No activities scheduled for {entityLabel} in week {selectedWeek}.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: DAY_LABEL_W + timeslotsPerDay * SLOT_W,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* ── Header row: slot numbers ── */}
        <Box sx={{ display: 'flex', flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: DAY_LABEL_W, flexShrink: 0, height: HDR_H, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRight: '1px solid', borderColor: 'divider' }} />
          {Array.from({ length: timeslotsPerDay }, (_, i) => (
            <Box
              key={i}
              sx={{
                width: SLOT_W, flexShrink: 0, height: HDR_H,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRight: i < timeslotsPerDay - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.70rem' }}>
                {slotToTime(i, startHour, timeslotDurationMinutes, startMinute)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ── Day rows ── */}
        {Array.from({ length: days }, (_, dayIdx) => {
          const dayEntries = activeEntries.filter(
            (e) => Math.floor(e.startTimeslot / timeslotsPerDay) === dayIdx,
          );
          return (
            <Box
              key={dayIdx}
              sx={{
                display: 'flex', flexShrink: 0,
                borderBottom: dayIdx < days - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              {/* Day label */}
              <Box
                sx={{
                  width: DAY_LABEL_W, flexShrink: 0, height: DAY_H,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                  borderRight: '1px solid', borderColor: 'divider',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                  {getDayName(startDay + dayIdx)}
                </Typography>
              </Box>

              {/* Slots area — relative container for absolute activity cards */}
              <Box sx={{ position: 'relative', width: timeslotsPerDay * SLOT_W, height: DAY_H, flexShrink: 0 }}>
                {/* Vertical slot dividers */}
                {Array.from({ length: timeslotsPerDay }, (_, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      left: i * SLOT_W, top: 0, width: SLOT_W, height: DAY_H,
                      borderRight: i < timeslotsPerDay - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  />
                ))}

                {/* Activity cards — span horizontally, stacked vertically when overlapping */}
                {assignLanes(dayEntries, timeslotsPerDay).map(({ entry: e, lane, laneCount }) => {
                  const slotIdx = e.startTimeslot % timeslotsPerDay;
                  const typeColor = getTypeColor(e.activityType);
                  const courseName = coursesById.get(e.courseId)?.name ?? '—';
                  const groupName = groupsById.get(e.groupId)?.name ?? '—';
                  const profName = e.professorId
                    ? (usersById.get(e.professorId)?.name ?? usersById.get(e.professorId)?.email ?? '—')
                    : null;
                  const roomName = roomsById.get(e.roomId)?.name ?? '—';
                  const laneH = DAY_H / laneCount;
                  return (
                    <Box
                      key={e.schedRecId}
                      onClick={() => navigate(activityRoute(e.activityId))}
                      sx={{
                        position: 'absolute',
                        top: lane * laneH + 1,
                        height: laneH - 2,
                        left: slotIdx * SLOT_W + 2,
                        width: e.durationSlots * SLOT_W - 4,
                        borderRadius: 1.5,
                        bgcolor: alpha(typeColor, 0.1),
                        borderLeft: '3px solid',
                        borderLeftColor: typeColor,
                        p: '3px 6px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        '&:hover': { bgcolor: alpha(typeColor, 0.2) },
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.25, fontSize: '0.68rem', mb: 0.25 }}>
                        {courseName}
                      </Typography>
                      {laneH > 30 && (
                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}>
                          {toTitleLabel(e.activityType)}
                        </Typography>
                      )}
                      {laneH > 44 && (
                        <>
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}>
                            {groupName}
                          </Typography>
                          {profName && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}>
                              {profName}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}>
                            {roomName}
                          </Typography>
                        </>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
