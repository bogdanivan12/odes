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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import PageContainer from '../layout/PageContainer';
import CalendarGrid, { getActivityTypeColor } from './CalendarGrid';
import type { ScheduledEntry } from './CalendarGrid';
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
import { institutionRoute, scheduleRoute } from '../../config/routes';
import { compareAlphabetical } from '../../utils/text';
import { getCurrentUserData } from '../../utils/institutionAdmin';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(ts?: string): string {
  if (!ts) return '';
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function scheduleStatusColor(status?: string): 'success' | 'warning' | 'error' | 'default' {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'completed') return 'success';
  if (s === 'running') return 'warning';
  if (s === 'failed') return 'error';
  return 'default';
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

// ─── Week selector ────────────────────────────────────────────────────────────

function WeekSelector({ weekNumbers, selectedWeek, onSelect }: { weekNumbers: number[]; selectedWeek: number; onSelect: (w: number) => void }) {
  return (
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
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MySchedulePage() {
  const theme = useTheme();
  const { institutionId } = useParams();
  const navigate = useNavigate();

  const [institution, setInstitution] = useState<InstitutionClass | null>(null);
  const [schedule, setSchedule] = useState<InstitutionSchedule | null>(null);
  const [schedRecords, setSchedRecords] = useState<ScheduledActivityRecord[]>([]);
  const [activities, setActivities] = useState<InstitutionActivity[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [rooms, setRooms] = useState<InstitutionRoom[]>([]);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState(0);
  const [studentWeek, setStudentWeek] = useState(1);
  const [professorWeek, setProfessorWeek] = useState(1);
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!institutionId) {
        setError('Missing institution id in route.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // First load institution + current user in parallel
        const [inst, me] = await Promise.all([
          getInstitutionById(institutionId),
          getCurrentUserData().catch(() => null),
        ]);
        if (!mounted) return;

        setInstitution(inst);
        if (me) setCurrentUser(me);

        const activeScheduleId = inst.active_schedule_id;
        if (!activeScheduleId) {
          // No active schedule — stop here, show the "no active schedule" state
          setLoading(false);
          return;
        }

        // Load schedule data + all institution entities in parallel
        const [sched, schedActs, acts, grps, usrs, rms, crs] = await Promise.all([
          getScheduleById(activeScheduleId),
          getScheduleActivities(activeScheduleId),
          getInstitutionActivities(institutionId),
          getInstitutionGroups(institutionId),
          getInstitutionUsers(institutionId),
          getInstitutionRooms(institutionId),
          getInstitutionCourses(institutionId),
        ]);
        if (!mounted) return;

        setSchedule(sched);
        setSchedRecords(schedActs);
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
  }, [institutionId]);

  // ── Role detection ─────────────────────────────────────────────────────────

  const userRoles = useMemo((): string[] => {
    if (!currentUser || !institutionId) return [];
    return (currentUser.user_roles?.[institutionId] as string[] | undefined) ?? [];
  }, [currentUser, institutionId]);

  const isStudent = userRoles.includes('student');
  const isProfessor = userRoles.includes('professor');

  // Set the initial tab to the first available role
  useEffect(() => {
    if (isStudent) setActiveTab(0);
    else if (isProfessor) setActiveTab(1);
  }, [isStudent, isProfessor]);

  // ── Lookup maps ────────────────────────────────────────────────────────────

  const activitiesById = useMemo(() => {
    const map = new Map<string, InstitutionActivity>();
    activities.forEach((a) => { const id = String(a.id ?? a._id ?? ''); if (id) map.set(id, a); });
    return map;
  }, [activities]);

  const coursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    courses.forEach((c) => { const id = String(c.id ?? c._id ?? ''); if (id) map.set(id, c); });
    return map;
  }, [courses]);

  const groupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    groups.forEach((g) => { const id = String(g.id ?? g._id ?? ''); if (id) map.set(id, g); });
    return map;
  }, [groups]);

  const usersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    users.forEach((u) => { const id = String(u.id ?? u._id ?? ''); if (id) map.set(id, u); });
    return map;
  }, [users]);

  const roomsById = useMemo(() => {
    const map = new Map<string, InstitutionRoom>();
    rooms.forEach((r) => { const id = String(r.id ?? r._id ?? ''); if (id) map.set(id, r); });
    return map;
  }, [rooms]);

  // ── Time grid (must come before scheduledEntries) ─────────────────────────

  const timeGrid = institution?.time_grid_config;
  const days = timeGrid?.days ?? 5;
  const timeslotsPerDay = timeGrid?.timeslots_per_day ?? 8;
  const weeks = timeGrid?.weeks ?? 1;
  const weekNumbers = useMemo(() => Array.from({ length: weeks }, (_, i) => i + 1), [weeks]);

  // ── Build combined entries from scheduled activities ───────────────────────
  // Backend stores active_weeks as 0-indexed → convert to 1-indexed.
  // Weekly activities repeat every week: expand activeWeeks to all weeks.

  const scheduledEntries = useMemo((): ScheduledEntry[] => {
    const allWeeks = Array.from({ length: weeks }, (_, i) => i + 1);
    return schedRecords.flatMap((rec) => {
      const recId = String(rec.id ?? rec._id ?? '');
      const actId = String(rec.activity_id ?? '');
      const activity = activitiesById.get(actId);
      if (!activity) return [];
      const freq = (activity.frequency ?? '').toLowerCase();
      const activeWeeks = freq === 'weekly'
        ? allWeeks
        : (rec.active_weeks ?? []).map((w) => w + 1);
      return [{
        schedRecId: recId,
        scheduleId: String(rec.schedule_id ?? ''),
        activityId: actId,
        roomId: String(rec.room_id ?? ''),
        startTimeslot: rec.start_timeslot,
        activeWeeks,
        activityType: activity.activity_type,
        courseId: String(activity.course_id ?? ''),
        groupId: String(activity.group_id ?? ''),
        professorId: activity.professor_id ? String(activity.professor_id) : null,
        durationSlots: activity.duration_slots,
        requiredRoomFeatures: activity.required_room_features ?? [],
        frequency: activity.frequency,
      }];
    });
  }, [schedRecords, activitiesById, weeks]);

  // ── Student entries: user's groups + all ancestor groups ──────────────────
  // Activities are often scheduled at the parent-group level (e.g. "Year 1"),
  // so students in a sub-group must inherit those activities.

  const myGroupIds = useMemo((): Set<string> => {
    // Direct groups this user belongs to, filtered to this institution
    const userGroupIds = new Set(currentUser?.group_ids ?? []);
    const directIds = new Set<string>();
    groups.forEach((g) => {
      const gId = String(g.id ?? g._id ?? '');
      if (gId && userGroupIds.has(gId)) directIds.add(gId);
    });

    // Walk up the parent chain for each direct group, collecting all ancestors
    const expanded = new Set<string>(directIds);
    const walkUp = (groupId: string) => {
      const g = groupsById.get(groupId);
      if (!g || !g.parent_group_id) return;
      const parentId = String(g.parent_group_id);
      if (!expanded.has(parentId)) {
        expanded.add(parentId);
        walkUp(parentId);
      }
    };
    directIds.forEach((gId) => walkUp(gId));

    return expanded;
  }, [currentUser, groups, groupsById]);

  // The "direct" group IDs (without ancestors) shown as chips in the UI
  const myDirectGroupIds = useMemo((): Set<string> => {
    const userGroupIds = new Set(currentUser?.group_ids ?? []);
    const direct = new Set<string>();
    groups.forEach((g) => {
      const gId = String(g.id ?? g._id ?? '');
      if (gId && userGroupIds.has(gId)) direct.add(gId);
    });
    return direct;
  }, [currentUser, groups]);

  const studentEntries = useMemo(
    () => scheduledEntries.filter((e) => myGroupIds.has(e.groupId)),
    [scheduledEntries, myGroupIds],
  );

  // When a chip filter is selected, compute that group + all its ancestors
  const filterGroupIds = useMemo((): Set<string> | null => {
    if (!filterGroupId) return null;
    const ids = new Set<string>([filterGroupId]);
    const walkUp = (gId: string) => {
      const g = groupsById.get(gId);
      if (!g || !g.parent_group_id) return;
      const parentId = String(g.parent_group_id);
      if (!ids.has(parentId)) { ids.add(parentId); walkUp(parentId); }
    };
    walkUp(filterGroupId);
    return ids;
  }, [filterGroupId, groupsById]);

  const filteredStudentEntries = useMemo(
    () => filterGroupIds ? studentEntries.filter((e) => filterGroupIds.has(e.groupId)) : studentEntries,
    [studentEntries, filterGroupIds],
  );

  // ── Professor entries: activities where this user is the professor ─────────

  const myUserId = useMemo(
    () => String(currentUser?.id ?? currentUser?._id ?? ''),
    [currentUser],
  );

  const professorEntries = useMemo(
    () => scheduledEntries.filter((e) => e.professorId === myUserId),
    [scheduledEntries, myUserId],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading your schedule...</Typography>
        </Stack>
      </PageContainer>
    );
  }

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
        <Stack spacing={3}>
          {/* Back */}
          <Box>
            <Button
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => navigate(institutionRoute(institutionId ?? ''))}
              sx={{ borderRadius: 2, color: 'text.secondary', textTransform: 'none' }}
            >
              Back to institution
            </Button>
          </Box>

          {/* Header card */}
          <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
            <Box sx={{ height: 3, background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})` }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2, flexWrap: 'wrap' }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, flexShrink: 0, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: '1.6rem' }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>My Schedule</Typography>
                {institution?.name && (
                  <Typography variant="body2" color="text.secondary">{institution.name}</Typography>
                )}
                {schedule?.timestamp && (
                  <Typography variant="caption" color="text.secondary">
                    Active schedule · {formatTimestamp(schedule.timestamp)}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                {schedule?.status && (
                  <Chip label={schedule.status} color={scheduleStatusColor(schedule.status)} sx={{ borderRadius: 1.5 }} />
                )}
                {schedule && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<CalendarMonthRoundedIcon />}
                    onClick={() => navigate(scheduleRoute(String(schedule.id ?? schedule._id ?? '')))}
                    sx={{ borderRadius: 2 }}
                  >
                    Full schedule
                  </Button>
                )}
              </Stack>
            </Box>
          </Paper>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* No active schedule */}
          {!error && !institution?.active_schedule_id && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Box sx={{ display: 'inline-flex', p: 2, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', mb: 2 }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: '2.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No active schedule</Typography>
              <Typography variant="body2" color="text.secondary">
                An administrator needs to mark a schedule as active before it appears here.
              </Typography>
            </Box>
          )}

          {/* No matching roles */}
          {!error && institution?.active_schedule_id && !isStudent && !isProfessor && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              You don't have a student or professor role in this institution. Ask an admin to assign you a role.
            </Alert>
          )}

          {/* Tabs — shown when schedule is active and user has at least one role */}
          {!error && institution?.active_schedule_id && (isStudent || isProfessor) && (
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Tab
                  icon={<SchoolRoundedIcon sx={{ fontSize: '1rem' }} />}
                  iconPosition="start"
                  label="Student"
                  disabled={!isStudent}
                  sx={{ minHeight: 48, textTransform: 'none', opacity: isStudent ? 1 : 0.4 }}
                />
                <Tab
                  icon={<PersonRoundedIcon sx={{ fontSize: '1rem' }} />}
                  iconPosition="start"
                  label="Professor"
                  disabled={!isProfessor}
                  sx={{ minHeight: 48, textTransform: 'none', opacity: isProfessor ? 1 : 0.4 }}
                />
              </Tabs>

              <Box sx={{ p: 2 }}>
                {/* ── Student tab ── */}
                <TabPanel value={activeTab} index={0}>
                  <Stack spacing={2}>
                    {myDirectGroupIds.size === 0 ? (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        You are not assigned to any group in this institution.
                      </Alert>
                    ) : (
                      <>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            Your groups:
                          </Typography>
                          {[...myDirectGroupIds].map((gId) => {
                            const isSelected = filterGroupId === gId;
                            return (
                              <Chip
                                key={gId}
                                label={groupsById.get(gId)?.name ?? gId}
                                size="small"
                                color={isSelected ? 'primary' : 'default'}
                                variant={isSelected ? 'filled' : 'outlined'}
                                onClick={() => setFilterGroupId(isSelected ? null : gId)}
                                sx={{ borderRadius: 1.5, fontSize: '0.72rem', height: 22, cursor: 'pointer' }}
                              />
                            );
                          })}
                        </Stack>
                        <WeekSelector weekNumbers={weekNumbers} selectedWeek={studentWeek} onSelect={setStudentWeek} />
                        <CalendarGrid
                          entries={filteredStudentEntries}
                          days={days}
                          timeslotsPerDay={timeslotsPerDay}
                          selectedWeek={studentWeek}
                          coursesById={coursesById}
                          groupsById={groupsById}
                          usersById={usersById}
                          roomsById={roomsById}
                          getTypeColor={getActivityTypeColor}
                          entityLabel="your groups"
                          startHour={timeGrid?.start_hour ?? 8}
                          startMinute={timeGrid?.start_minute ?? 0}
                          timeslotDurationMinutes={timeGrid?.timeslot_duration_minutes ?? 60}
                          startDay={timeGrid?.start_day ?? 0}
                        />
                      </>
                    )}
                  </Stack>
                </TabPanel>

                {/* ── Professor tab ── */}
                <TabPanel value={activeTab} index={1}>
                  <Stack spacing={2}>
                    <WeekSelector weekNumbers={weekNumbers} selectedWeek={professorWeek} onSelect={setProfessorWeek} />
                    <CalendarGrid
                      entries={professorEntries}
                      days={days}
                      timeslotsPerDay={timeslotsPerDay}
                      selectedWeek={professorWeek}
                      coursesById={coursesById}
                      groupsById={groupsById}
                      usersById={usersById}
                      roomsById={roomsById}
                      getTypeColor={getActivityTypeColor}
                      entityLabel="you"
                      startHour={timeGrid?.start_hour ?? 8}
                      timeslotDurationMinutes={timeGrid?.timeslot_duration_minutes ?? 60}
                    />
                  </Stack>
                </TabPanel>
              </Box>
            </Paper>
          )}
        </Stack>
      </Box>
    </PageContainer>
  );
}
