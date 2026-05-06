import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PageContainer from '../layout/PageContainer';
import {
  getInstitutionById,
  getInstitutionActivities,
  getInstitutionGroups,
  getInstitutionUsers,
  getInstitutionRooms,
  getInstitutionCourses,
  getScheduleById,
  getScheduleActivities,
} from '../../api/institutions';
import type {
  InstitutionSchedule,
  InstitutionGroup,
  InstitutionUser,
  InstitutionRoom,
  InstitutionCourse,
  InstitutionActivity,
  ScheduledActivityRecord,
} from '../../api/institutions';
import type { Institution as InstitutionClass } from '../../types/institution';
import type { TimeGridConfig } from '../../types/institution';
import { institutionSchedulesRoute, activityRoute } from '../../config/routes';
import { toTitleLabel, compareAlphabetical } from '../../utils/text';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// ─── Combined view type ───────────────────────────────────────────────────────

interface ScheduledEntry {
  // from ScheduledActivityRecord
  schedRecId: string;
  scheduleId: string;
  activityId: string;
  roomId: string;
  startTimeslot: number;
  activeWeeks: number[];
  // from InstitutionActivity
  activityType: string;
  courseId: string;
  groupId: string;
  professorId: string | null;
  durationSlots: number;
  requiredRoomFeatures: string[];
  frequency: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDayName(dayIndex: number): string {
  return dayIndex < DAY_NAMES.length ? DAY_NAMES[dayIndex] : `Day ${dayIndex + 1}`;
}

function scheduleStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'running') return 'warning';
  if (s === 'failed') return 'error';
  return 'default';
}

function formatTimestamp(ts?: string): string {
  if (!ts) return '';
  const date = new Date(ts);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Tab panel ───────────────────────────────────────────────────────────────

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

const SLOT_H = 58; // px per timeslot row
const HDR_H = 34;  // px for the day header row

interface CalendarGridProps {
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
}

function CalendarGrid({
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

  const gridH = timeslotsPerDay * SLOT_H;

  return (
    <Box sx={{ overflowX: 'auto', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          minWidth: days * 130 + 72,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Slot-label column */}
        <Box sx={{ width: 72, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ height: HDR_H, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: '1px solid', borderColor: 'divider' }} />
          {Array.from({ length: timeslotsPerDay }, (_, i) => (
            <Box
              key={i}
              sx={{
                height: SLOT_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                borderBottom: i < timeslotsPerDay - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" sx={{ fontSize: '0.63rem', color: 'text.disabled' }}>
                Slot {i + 1}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Day columns */}
        {Array.from({ length: days }, (_, dayIdx) => {
          const dayEntries = activeEntries.filter(
            (e) => Math.floor(e.startTimeslot / timeslotsPerDay) === dayIdx,
          );
          return (
            <Box
              key={dayIdx}
              sx={{
                flex: 1,
                borderRight: dayIdx < days - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              {/* Day header */}
              <Box
                sx={{
                  height: HDR_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                  {getDayName(dayIdx)}
                </Typography>
              </Box>

              {/* Slot rows (background) + activity cards (absolute) */}
              <Box sx={{ position: 'relative', height: gridH }}>
                {/* Horizontal slot dividers */}
                {Array.from({ length: timeslotsPerDay }, (_, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      top: i * SLOT_H,
                      left: 0,
                      right: 0,
                      height: SLOT_H,
                      borderBottom: i < timeslotsPerDay - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  />
                ))}

                {/* Activity cards */}
                {dayEntries.map((e) => {
                  const slotIdx = e.startTimeslot % timeslotsPerDay;
                  const typeColor = getTypeColor(e.activityType);
                  const courseName = coursesById.get(e.courseId)?.name ?? '—';
                  const groupName = groupsById.get(e.groupId)?.name ?? '—';
                  const profName = e.professorId
                    ? (usersById.get(e.professorId)?.name ?? usersById.get(e.professorId)?.email ?? '—')
                    : null;
                  const roomName = roomsById.get(e.roomId)?.name ?? '—';
                  return (
                    <Box
                      key={e.schedRecId}
                      onClick={() => navigate(activityRoute(e.activityId))}
                      sx={{
                        position: 'absolute',
                        top: slotIdx * SLOT_H + 2,
                        left: 3,
                        right: 3,
                        height: e.durationSlots * SLOT_H - 4,
                        borderRadius: 1.5,
                        bgcolor: alpha(typeColor, 0.1),
                        borderLeft: '3px solid',
                        borderLeftColor: typeColor,
                        p: '4px 6px',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        '&:hover': { bgcolor: alpha(typeColor, 0.2) },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, display: 'block', lineHeight: 1.25, fontSize: '0.68rem', mb: 0.25 }}
                      >
                        {courseName}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}>
                        {toTitleLabel(e.activityType)}
                      </Typography>
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScheduleViewPage() {
  const theme = useTheme();
  const { scheduleId } = useParams();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<InstitutionClass | null>(null);
  const [schedule, setSchedule] = useState<InstitutionSchedule | null>(null);
  const [schedRecords, setSchedRecords] = useState<ScheduledActivityRecord[]>([]);
  const [activities, setActivities] = useState<InstitutionActivity[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [rooms, setRooms] = useState<InstitutionRoom[]>([]);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedWeekByGroup, setSelectedWeekByGroup] = useState(1);
  const [selectedWeekByProfessor, setSelectedWeekByProfessor] = useState(1);
  const [selectedWeekByRoom, setSelectedWeekByRoom] = useState(1);

  // ── Data loading ───────────────────────────────────────────────────────────
  // Fetch the schedule first to get institution_id, then load institution data.
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!scheduleId) {
        setError('Missing schedule id in route.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [sched, schedActs] = await Promise.all([
          getScheduleById(scheduleId),
          getScheduleActivities(scheduleId),
        ]);
        if (!mounted) return;

        const institutionId = sched.institution_id;
        if (!institutionId) throw new Error('Schedule has no institution_id.');

        const [inst, acts, grps, usrs, rms, crs] = await Promise.all([
          getInstitutionById(institutionId),
          getInstitutionActivities(institutionId),
          getInstitutionGroups(institutionId),
          getInstitutionUsers(institutionId),
          getInstitutionRooms(institutionId),
          getInstitutionCourses(institutionId),
        ]);
        if (!mounted) return;

        setSchedule(sched);
        setSchedRecords(schedActs);
        setInstitution(inst);
        setActivities(acts);
        setGroups([...grps].sort((a, b) => compareAlphabetical(a.name, b.name)));
        setUsers([...usrs].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? '')));
        setRooms([...rms].sort((a, b) => compareAlphabetical(a.name, b.name)));
        setCourses([...crs].sort((a, b) => compareAlphabetical(a.name, b.name)));
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load schedule data.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [scheduleId]);

  // ── Build lookup maps ──────────────────────────────────────────────────────

  const activitiesById = useMemo(() => {
    const map = new Map<string, InstitutionActivity>();
    activities.forEach((a) => {
      const id = String(a.id ?? a._id ?? '');
      if (id) map.set(id, a);
    });
    return map;
  }, [activities]);

  const coursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    courses.forEach((c) => {
      const id = String(c.id ?? c._id ?? '');
      if (id) map.set(id, c);
    });
    return map;
  }, [courses]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((g) => {
      const id = String(g.id ?? g._id ?? '');
      if (id) map.set(id, g);
    });
    return map;
  }, [groups]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, string[]>();
    groups.forEach((g) => {
      const gId = String(g.id ?? g._id ?? '');
      if (!gId) return;
      const parentId = g.parent_group_id ? String(g.parent_group_id) : null;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId)!.push(gId);
    });
    map.forEach((ids) => ids.sort((a, b) => compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b)));
    return map;
  }, [groups, groupsById]);

  const rootGroupIds = useMemo(() => childrenByParent.get(null) ?? [], [childrenByParent]);

  const usersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    users.forEach((u) => {
      const id = String(u.id ?? u._id ?? '');
      if (id) map.set(id, u);
    });
    return map;
  }, [users]);

  const roomsById = useMemo(() => {
    const map = new Map<string, InstitutionRoom>();
    rooms.forEach((r) => {
      const id = String(r.id ?? r._id ?? '');
      if (id) map.set(id, r);
    });
    return map;
  }, [rooms]);

  // ── Join scheduled records with activity metadata ──────────────────────────
  // Backend stores active_weeks as 0-indexed; convert to 1-indexed to match the week selector.

  const scheduledEntries = useMemo<ScheduledEntry[]>(() => {
    return schedRecords
      .map((rec) => {
        const act = activitiesById.get(String(rec.activity_id ?? ''));
        if (!act) return null;
        return {
          schedRecId: String(rec.id ?? rec._id ?? ''),
          scheduleId: rec.schedule_id,
          activityId: String(rec.activity_id),
          roomId: String(rec.room_id),
          startTimeslot: rec.start_timeslot,
          activeWeeks: (rec.active_weeks ?? []).map((w) => w + 1),
          activityType: act.activity_type,
          courseId: String(act.course_id),
          groupId: String(act.group_id),
          professorId: act.professor_id ? String(act.professor_id) : null,
          durationSlots: act.duration_slots,
          requiredRoomFeatures: act.required_room_features ?? [],
          frequency: act.frequency,
        } satisfies ScheduledEntry;
      })
      .filter((e): e is ScheduledEntry => e !== null);
  }, [schedRecords, activitiesById]);

  // ── Time grid ──────────────────────────────────────────────────────────────

  const timeGrid: TimeGridConfig | null = institution ? institution.time_grid_config : null;
  const weeks = timeGrid?.weeks ?? 1;
  const days = timeGrid?.days ?? 5;
  const timeslotsPerDay = timeGrid?.timeslots_per_day ?? 10;
  const weekNumbers = useMemo(() => Array.from({ length: weeks }, (_, i) => i + 1), [weeks]);

  // ── Professors: only those who appear in scheduled entries ─────────────────

  const professors = useMemo(() => {
    const professorIds = new Set(
      scheduledEntries
        .filter((e) => e.professorId !== null)
        .map((e) => e.professorId as string),
    );
    return users.filter((u) => professorIds.has(String(u.id ?? u._id ?? '')));
  }, [users, scheduledEntries]);

  // ── Type colour ────────────────────────────────────────────────────────────

  const getTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'course': return theme.palette.primary.main;
      case 'seminar': return theme.palette.secondary.main;
      case 'laboratory': return theme.palette.warning.main;
      default: return theme.palette.text.secondary;
    }
  };

  // ── Group ancestor lookup ──────────────────────────────────────────────────
  // Activities assigned to a parent group apply to all child groups.

  const getGroupAndAncestorIds = (groupId: string): Set<string> => {
    const result = new Set<string>();
    let current: string | null | undefined = groupId;
    while (current) {
      result.add(current);
      current = groupsById.get(current)?.parent_group_id;
    }
    return result;
  };

  // ── Filtered entries per tab ───────────────────────────────────────────────

  const byGroupEntries = useMemo(() => {
    if (!selectedGroupId) return [];
    const groupIds = getGroupAndAncestorIds(selectedGroupId);
    return scheduledEntries.filter((e) => groupIds.has(e.groupId));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduledEntries, selectedGroupId, groupsById]);

  const byProfessorEntries = useMemo(
    () => selectedProfessorId ? scheduledEntries.filter((e) => e.professorId === selectedProfessorId) : [],
    [scheduledEntries, selectedProfessorId],
  );

  const byRoomEntries = useMemo(
    () => selectedRoomId ? scheduledEntries.filter((e) => e.roomId === selectedRoomId) : [],
    [scheduledEntries, selectedRoomId],
  );

  // ── Hierarchical group menu items ──────────────────────────────────────────

  const renderGroupMenuItems = (groupId: string, depth = 0): React.ReactNode[] => {
    const group = groupsById.get(groupId);
    if (!group) return [];
    const id = String(group.id ?? group._id ?? '');
    const children = childrenByParent.get(groupId) ?? [];
    return [
      <MenuItem key={id} value={id} sx={{ pl: 2 + depth * 2, fontSize: '0.875rem' }}>
        {depth > 0 && (
          <Box component="span" sx={{ mr: 0.75, color: 'text.disabled', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            {'└'}
          </Box>
        )}
        {group.name}
        {children.length > 0 && (
          <Box component="span" sx={{ ml: 0.75, color: 'text.disabled', fontSize: '0.7rem' }}>
            ({children.length})
          </Box>
        )}
      </MenuItem>,
      ...children.flatMap((cId) => renderGroupMenuItems(cId, depth + 1)),
    ];
  };

  // ── Week selector ──────────────────────────────────────────────────────────

  const WeekSelector = ({ selectedWeek, onSelect }: { selectedWeek: number; onSelect: (w: number) => void }) => (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {weekNumbers.map((w) => (
        <Chip
          key={w}
          label={`W${w}`}
          size="small"
          onClick={() => onSelect(w)}
          color={w === selectedWeek ? 'primary' : 'default'}
          sx={{ borderRadius: 1.5, fontWeight: w === selectedWeek ? 700 : 400, cursor: 'pointer' }}
        />
      ))}
    </Stack>
  );

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading schedule...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer alignItems="flex-start">
        <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        </Box>
      </PageContainer>
    );
  }

  const backPath = schedule?.institution_id
    ? institutionSchedulesRoute(schedule.institution_id)
    : '/institutions';

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
        <Stack spacing={3}>
          {/* Back button */}
          <Box>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate(backPath)}
              sx={{ borderRadius: 2, color: 'text.secondary', textTransform: 'none' }}
            >
              Back to schedules
            </Button>
          </Box>

          {/* Header card */}
          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2, flexWrap: 'wrap' }}>
              <Box
                sx={{
                  width: 48, height: 48, borderRadius: 2, flexShrink: 0,
                  bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <CalendarMonthRoundedIcon sx={{ fontSize: '1.6rem' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Schedule</Typography>
                {schedule?.timestamp && (
                  <Typography variant="body2" color="text.secondary">
                    {formatTimestamp(schedule.timestamp)}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {scheduledEntries.length} scheduled activit{scheduledEntries.length !== 1 ? 'ies' : 'y'}
                </Typography>
              </Box>
              {schedule?.status && (
                <Chip label={schedule.status} color={scheduleStatusColor(schedule.status)} sx={{ borderRadius: 1.5 }} />
              )}
            </Box>
          </Paper>

          {!schedule && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>Schedule not found.</Alert>
          )}

          {schedule && (
            <Box>
              <Tabs
                value={activeTab}
                onChange={(_, v: number) => setActiveTab(v)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="By Group" />
                <Tab label="By Professor" />
                <Tab label="By Room" />
              </Tabs>

              {/* ── By Group ── */}
              <TabPanel value={activeTab} index={0}>
                <Stack spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Select a group</InputLabel>
                    <Select
                      value={selectedGroupId}
                      label="Select a group"
                      onChange={(e) => { setSelectedGroupId(e.target.value); setSelectedWeekByGroup(1); }}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value=""><em>Select a group</em></MenuItem>
                      {rootGroupIds.flatMap((id) => renderGroupMenuItems(id))}
                    </Select>
                  </FormControl>

                  {selectedGroupId ? (
                    <>
                      <WeekSelector selectedWeek={selectedWeekByGroup} onSelect={setSelectedWeekByGroup} />
                      <CalendarGrid
                        entries={byGroupEntries}
                        days={days}
                        timeslotsPerDay={timeslotsPerDay}
                        selectedWeek={selectedWeekByGroup}
                        coursesById={coursesById}
                        groupsById={groupsById}
                        usersById={usersById}
                        roomsById={roomsById}
                        getTypeColor={getTypeColor}
                        entityLabel={groupsById.get(selectedGroupId)?.name ?? 'group'}
                      />
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography variant="body2" color="text.secondary">Select a group to view the schedule.</Typography>
                    </Box>
                  )}
                </Stack>
              </TabPanel>

              {/* ── By Professor ── */}
              <TabPanel value={activeTab} index={1}>
                <Stack spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Select a professor</InputLabel>
                    <Select
                      value={selectedProfessorId}
                      label="Select a professor"
                      onChange={(e) => { setSelectedProfessorId(e.target.value); setSelectedWeekByProfessor(1); }}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value=""><em>Select a professor</em></MenuItem>
                      {professors.map((u) => {
                        const id = String(u.id ?? u._id ?? '');
                        return <MenuItem key={id} value={id}>{u.name ?? u.email ?? id}</MenuItem>;
                      })}
                    </Select>
                  </FormControl>

                  {selectedProfessorId ? (
                    <>
                      <WeekSelector selectedWeek={selectedWeekByProfessor} onSelect={setSelectedWeekByProfessor} />
                      <CalendarGrid
                        entries={byProfessorEntries}
                        days={days}
                        timeslotsPerDay={timeslotsPerDay}
                        selectedWeek={selectedWeekByProfessor}
                        coursesById={coursesById}
                        groupsById={groupsById}
                        usersById={usersById}
                        roomsById={roomsById}
                        getTypeColor={getTypeColor}
                        entityLabel={usersById.get(selectedProfessorId)?.name ?? 'professor'}
                      />
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography variant="body2" color="text.secondary">Select a professor to view the schedule.</Typography>
                    </Box>
                  )}
                </Stack>
              </TabPanel>

              {/* ── By Room ── */}
              <TabPanel value={activeTab} index={2}>
                <Stack spacing={2}>
                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <InputLabel>Select a room</InputLabel>
                    <Select
                      value={selectedRoomId}
                      label="Select a room"
                      onChange={(e) => { setSelectedRoomId(e.target.value); setSelectedWeekByRoom(1); }}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value=""><em>Select a room</em></MenuItem>
                      {rooms.map((r) => {
                        const id = String(r.id ?? r._id ?? '');
                        return <MenuItem key={id} value={id}>{r.name}</MenuItem>;
                      })}
                    </Select>
                  </FormControl>

                  {selectedRoomId ? (
                    <>
                      <WeekSelector selectedWeek={selectedWeekByRoom} onSelect={setSelectedWeekByRoom} />
                      <CalendarGrid
                        entries={byRoomEntries}
                        days={days}
                        timeslotsPerDay={timeslotsPerDay}
                        selectedWeek={selectedWeekByRoom}
                        coursesById={coursesById}
                        groupsById={groupsById}
                        usersById={usersById}
                        roomsById={roomsById}
                        getTypeColor={getTypeColor}
                        entityLabel={rooms.find((r) => String(r.id ?? r._id ?? '') === selectedRoomId)?.name ?? 'room'}
                      />
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography variant="body2" color="text.secondary">Select a room to view the schedule.</Typography>
                    </Box>
                  )}
                </Stack>
              </TabPanel>
            </Box>
          )}
        </Stack>
      </Box>
    </PageContainer>
  );
}
