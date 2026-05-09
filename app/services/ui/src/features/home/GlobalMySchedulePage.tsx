import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import PageContainer from '../layout/PageContainer';
import CalendarGrid, { getActivityTypeColor } from '../schedules/CalendarGrid';
import type { ScheduledEntry } from '../schedules/CalendarGrid';
import {
  getInstitutions,
  getInstitutionActivities,
  getInstitutionGroups,
  getInstitutionUsers,
  getInstitutionRooms,
  getInstitutionCourses,
  getScheduleActivities,
} from '../../api/institutions';
import type {
  InstitutionGroup,
  InstitutionUser,
  InstitutionRoom,
  InstitutionCourse,
  InstitutionActivity,
  ScheduledActivityRecord,
} from '../../api/institutions';
import type { Institution as InstitutionClass } from '../../types/institution';
import { institutionRoute, scheduleRoute } from '../../config/routes';
import { getCurrentUserData } from '../../utils/institutionAdmin';
import { compareAlphabetical } from '../../utils/text';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PerInstitutionData {
  institution: InstitutionClass;
  schedRecords: ScheduledActivityRecord[];
  activities: InstitutionActivity[];
  groups: InstitutionGroup[];
  users: InstitutionUser[];
  rooms: InstitutionRoom[];
  courses: InstitutionCourse[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function WeekSelector({
  weekNumbers,
  selectedWeek,
  onSelect,
}: {
  weekNumbers: number[];
  selectedWeek: number;
  onSelect: (w: number) => void;
}) {
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

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GlobalMySchedulePage() {
  const theme = useTheme();
  const navigate = useNavigate();

  const [institutions, setInstitutions] = useState<InstitutionClass[]>([]);
  const [dataMap, setDataMap] = useState<Map<string, PerInstitutionData>>(new Map());
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterInstitutionId, setFilterInstitutionId] = useState<string | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [studentWeek, setStudentWeek] = useState(1);
  const [professorWeek, setProfessorWeek] = useState(1);

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [allInstitutions, me] = await Promise.all([
          getInstitutions(),
          getCurrentUserData().catch(() => null),
        ]);
        if (!mounted) return;

        setInstitutions(allInstitutions);
        if (me) setCurrentUser(me);

        const withSchedule = allInstitutions.filter((inst) => inst.active_schedule_id);
        if (withSchedule.length === 0) {
          setLoading(false);
          return;
        }

        const loadedEntries = await Promise.all(
          withSchedule.map(async (inst) => {
            const instId = String(inst.id ?? (inst as any)._id ?? '');
            const schedId = inst.active_schedule_id!;
            const [schedActs, acts, grps, usrs, rms, crs] = await Promise.all([
              getScheduleActivities(schedId),
              getInstitutionActivities(instId),
              getInstitutionGroups(instId),
              getInstitutionUsers(instId),
              getInstitutionRooms(instId),
              getInstitutionCourses(instId),
            ]);
            return { instId, inst, schedActs, acts, grps, usrs, rms, crs };
          }),
        );
        if (!mounted) return;

        const newMap = new Map<string, PerInstitutionData>();
        loadedEntries.forEach(({ instId, inst, schedActs, acts, grps, usrs, rms, crs }) => {
          newMap.set(instId, {
            institution: inst,
            schedRecords: schedActs,
            activities: [...acts],
            groups: [...grps].sort((a, b) => compareAlphabetical(a.name, b.name)),
            users: [...usrs].sort((a, b) => compareAlphabetical(a.name ?? '', b.name ?? '')),
            rooms: [...rms].sort((a, b) => compareAlphabetical(a.name, b.name)),
            courses: [...crs].sort((a, b) => compareAlphabetical(a.name, b.name)),
          });
        });
        setDataMap(newMap);
      } catch (err) {
        if (!mounted) return;
        setError((err as Error).message || 'Failed to load schedule data.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  // Institutions that have an active schedule loaded
  const activeInstIds = useMemo(() => [...dataMap.keys()], [dataMap]);

  // Which institution data to show (filtered or all)
  const selectedData = useMemo((): PerInstitutionData[] => {
    if (filterInstitutionId) {
      const d = dataMap.get(filterInstitutionId);
      return d ? [d] : [];
    }
    return [...dataMap.values()];
  }, [dataMap, filterInstitutionId]);

  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }

  // Global time range derived from all selected institutions
  const globalStartMinutes = useMemo(
    () => selectedData.length === 0 ? 8 * 60 : Math.min(
      ...selectedData.map((d) => (d.institution.time_grid_config?.start_hour ?? 8) * 60 + (d.institution.time_grid_config?.start_minute ?? 0)),
    ),
    [selectedData],
  );
  const globalEndMinutes = useMemo(
    () => selectedData.length === 0 ? 20 * 60 : Math.max(
      ...selectedData.map((d) => {
        const tgc = d.institution.time_grid_config;
        return (tgc?.start_hour ?? 8) * 60 + (tgc?.timeslots_per_day ?? 8) * (tgc?.timeslot_duration_minutes ?? 60);
      }),
    ),
    [selectedData],
  );
  const globalSlotDuration = useMemo(
    () => selectedData.length === 0 ? 60 : selectedData.reduce(
      (acc, d) => gcd(acc, d.institution.time_grid_config?.timeslot_duration_minutes ?? 60),
      selectedData[0].institution.time_grid_config?.timeslot_duration_minutes ?? 60,
    ),
    [selectedData],
  );
  const currentTimeslotsPerDay = useMemo(
    () => Math.max(1, Math.round((globalEndMinutes - globalStartMinutes) / globalSlotDuration)),
    [globalStartMinutes, globalEndMinutes, globalSlotDuration],
  );
  // Global day range: from earliest start_day to latest end_day across institutions
  const globalStartDay = useMemo(
    () => selectedData.length === 0 ? 0 : Math.min(
      ...selectedData.map((d) => d.institution.time_grid_config?.start_day ?? 0),
    ),
    [selectedData],
  );
  const currentDays = useMemo(
    () => selectedData.length === 0 ? 5 : Math.max(
      ...selectedData.map((d) => {
        const tgc = d.institution.time_grid_config;
        return (tgc?.start_day ?? 0) + (tgc?.days ?? 5) - globalStartDay;
      }),
    ),
    [selectedData, globalStartDay],
  );
  const currentWeeks = useMemo(
    () => Math.max(1, ...selectedData.map((d) => d.institution.time_grid_config?.weeks ?? 1)),
    [selectedData],
  );
  const weekNumbers = useMemo(
    () => Array.from({ length: currentWeeks }, (_, i) => i + 1),
    [currentWeeks],
  );

  // Reset group filter when institution filter changes
  useEffect(() => { setFilterGroupId(null); }, [filterInstitutionId]);

  // Reset week when it's out of range for the newly selected institution
  useEffect(() => {
    if (studentWeek > currentWeeks) setStudentWeek(1);
    if (professorWeek > currentWeeks) setProfessorWeek(1);
  }, [currentWeeks, studentWeek, professorWeek]);

  // Merged lookup maps across selected institutions
  const combinedCoursesById = useMemo(() => {
    const map = new Map<string, InstitutionCourse>();
    selectedData.forEach((d) =>
      d.courses.forEach((c) => { const id = String(c.id ?? c._id ?? ''); if (id) map.set(id, c); }),
    );
    return map;
  }, [selectedData]);

  const combinedGroupsById = useMemo(() => {
    const map = new Map<string, InstitutionGroup>();
    selectedData.forEach((d) =>
      d.groups.forEach((g) => { const id = String(g.id ?? g._id ?? ''); if (id) map.set(id, g); }),
    );
    return map;
  }, [selectedData]);

  const combinedUsersById = useMemo(() => {
    const map = new Map<string, InstitutionUser>();
    selectedData.forEach((d) =>
      d.users.forEach((u) => { const id = String(u.id ?? u._id ?? ''); if (id) map.set(id, u); }),
    );
    return map;
  }, [selectedData]);

  const combinedRoomsById = useMemo(() => {
    const map = new Map<string, InstitutionRoom>();
    selectedData.forEach((d) =>
      d.rooms.forEach((r) => { const id = String(r.id ?? r._id ?? ''); if (id) map.set(id, r); }),
    );
    return map;
  }, [selectedData]);

  // Build ScheduledEntry[] for all selected institutions using time-based normalisation.
  // Each activity's absolute start time (minutes from midnight) is mapped to a global slot index.
  const scheduledEntries = useMemo((): ScheduledEntry[] => {
    return selectedData.flatMap((d) => {
      const instId = String(d.institution.id ?? (d.institution as any)._id ?? '');
      const tgc = d.institution.time_grid_config;
      const tpd = tgc?.timeslots_per_day ?? 8;
      const instStartMinutes = (tgc?.start_hour ?? 8) * 60 + (tgc?.start_minute ?? 0);
      const instSlotDuration = tgc?.timeslot_duration_minutes ?? 60;
      const instWeeks = tgc?.weeks ?? 1;
      const allInstWeeks = Array.from({ length: instWeeks }, (_, i) => i + 1);

      const activitiesById = new Map<string, InstitutionActivity>();
      d.activities.forEach((a) => {
        const id = String(a.id ?? a._id ?? '');
        if (id) activitiesById.set(id, a);
      });

      return d.schedRecords.flatMap((rec) => {
        const actId = String(rec.activity_id ?? '');
        const activity = activitiesById.get(actId);
        if (!activity) return [];

        const freq = (activity.frequency ?? '').toLowerCase();
        const activeWeeks =
          freq === 'weekly'
            ? allInstWeeks
            : (rec.active_weeks ?? []).map((w) => w + 1);

        // Convert institution-relative slot to global slot index
        const localDayIdx = Math.floor(rec.start_timeslot / tpd);
        const slotIdx = rec.start_timeslot % tpd;
        const absDay = (tgc?.start_day ?? 0) + localDayIdx - globalStartDay;
        const absMinutes = instStartMinutes + slotIdx * instSlotDuration;
        const globalSlotIdx = Math.round((absMinutes - globalStartMinutes) / globalSlotDuration);
        const normalizedStart = absDay * currentTimeslotsPerDay + globalSlotIdx;
        const normalizedDuration = Math.max(1, Math.round((activity.duration_slots * instSlotDuration) / globalSlotDuration));

        return [{
          schedRecId: `${instId}-${String(rec.id ?? rec._id ?? '')}`,
          scheduleId: String(rec.schedule_id ?? ''),
          activityId: String(activity.id ?? activity._id ?? actId),
          roomId: String(rec.room_id ?? ''),
          startTimeslot: normalizedStart,
          activeWeeks,
          activityType: activity.activity_type,
          courseId: String(activity.course_id ?? ''),
          groupId: String(activity.group_id ?? ''),
          professorId: activity.professor_id ? String(activity.professor_id) : null,
          durationSlots: normalizedDuration,
          requiredRoomFeatures: activity.required_room_features ?? [],
          frequency: activity.frequency,
          institutionId: instId,
        }] as ScheduledEntry[];
      });
    });
  }, [selectedData, globalStartMinutes, globalSlotDuration, globalStartDay, currentTimeslotsPerDay]);

  // User's groups (direct + ancestors) across all selected institutions
  const myGroupIds = useMemo((): Set<string> => {
    const userGroupIds = new Set(currentUser?.group_ids ?? []);
    const allGroups = selectedData.flatMap((d) => d.groups);

    const directIds = new Set<string>();
    allGroups.forEach((g) => {
      const gId = String(g.id ?? g._id ?? '');
      if (gId && userGroupIds.has(gId)) directIds.add(gId);
    });

    const expanded = new Set<string>(directIds);
    const walkUp = (groupId: string) => {
      const g = combinedGroupsById.get(groupId);
      if (!g || !g.parent_group_id) return;
      const parentId = String(g.parent_group_id);
      if (!expanded.has(parentId)) { expanded.add(parentId); walkUp(parentId); }
    };
    directIds.forEach((gId) => walkUp(gId));
    return expanded;
  }, [currentUser, selectedData, combinedGroupsById]);

  const myUserId = useMemo(
    () => String(currentUser?.id ?? (currentUser as any)?._id ?? ''),
    [currentUser],
  );

  const isStudent = useMemo(
    () => selectedData.some((d) => {
      const instId = String(d.institution.id ?? (d.institution as any)._id ?? '');
      const roles = (currentUser?.user_roles?.[instId] as string[] | undefined) ?? [];
      return roles.includes('student');
    }),
    [currentUser, selectedData],
  );

  const isProfessor = useMemo(
    () => selectedData.some((d) => {
      const instId = String(d.institution.id ?? (d.institution as any)._id ?? '');
      const roles = (currentUser?.user_roles?.[instId] as string[] | undefined) ?? [];
      return roles.includes('professor');
    }),
    [currentUser, selectedData],
  );

  // Jump to first available tab when roles change
  useEffect(() => {
    if (isStudent) setActiveTab(0);
    else if (isProfessor) setActiveTab(1);
  }, [isStudent, isProfessor]);

  const studentEntries = useMemo(
    () => scheduledEntries.filter((e) => myGroupIds.has(e.groupId)),
    [scheduledEntries, myGroupIds],
  );

  // Direct group IDs the user belongs to, limited to the selected institution (for the group filter chips)
  const myDirectGroupIds = useMemo((): Set<string> => {
    const userGroupIds = new Set(currentUser?.group_ids ?? []);
    const sourceGroups = filterInstitutionId
      ? (dataMap.get(filterInstitutionId)?.groups ?? [])
      : selectedData.flatMap((d) => d.groups);
    const direct = new Set<string>();
    sourceGroups.forEach((g) => {
      const gId = String(g.id ?? g._id ?? '');
      if (gId && userGroupIds.has(gId)) direct.add(gId);
    });
    return direct;
  }, [currentUser, filterInstitutionId, dataMap, selectedData]);

  // Group filter: expand selected group to include all ancestor groups
  const filterGroupIds = useMemo((): Set<string> | null => {
    if (!filterGroupId) return null;
    const ids = new Set<string>([filterGroupId]);
    const walkUp = (gId: string) => {
      const g = combinedGroupsById.get(gId);
      if (!g || !g.parent_group_id) return;
      const parentId = String(g.parent_group_id);
      if (!ids.has(parentId)) { ids.add(parentId); walkUp(parentId); }
    };
    walkUp(filterGroupId);
    return ids;
  }, [filterGroupId, combinedGroupsById]);

  const filteredStudentEntries = useMemo(
    () => filterGroupIds ? studentEntries.filter((e) => filterGroupIds.has(e.groupId)) : studentEntries,
    [studentEntries, filterGroupIds],
  );

  const professorEntries = useMemo(
    () => scheduledEntries.filter((e) => e.professorId === myUserId),
    [scheduledEntries, myUserId],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer alignItems="center">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={22} />
          <Typography color="text.secondary">Loading your schedule…</Typography>
        </Stack>
      </PageContainer>
    );
  }

  const hasActiveSchedules = activeInstIds.length > 0;
  const hasRoles = isStudent || isProfessor;

  return (
    <PageContainer alignItems="flex-start">
      <Box sx={{ width: '100%', maxWidth: 1060, mx: 'auto' }}>
        <Stack spacing={3}>

          {/* ── Header ── */}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>My Schedule</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Your personal timetable across all institutions
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

          {/* ── No active schedule anywhere ── */}
          {!error && !hasActiveSchedules && (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Box sx={{
                display: 'inline-flex', p: 2, borderRadius: 4,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main', mb: 2,
              }}>
                <CalendarMonthRoundedIcon sx={{ fontSize: '2.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>No active schedules</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {institutions.length === 0
                  ? 'You are not a member of any institution yet.'
                  : 'None of your institutions have an active schedule. Ask an admin to activate one.'}
              </Typography>
              {institutions.length === 0 && (
                <Button variant="contained" onClick={() => navigate('/institutions')} sx={{ borderRadius: 2 }}>
                  Browse institutions
                </Button>
              )}
            </Box>
          )}

          {/* ── Institution chips + calendar ── */}
          {!error && hasActiveSchedules && (
            <Stack spacing={2.5}>

              {/* Institution filter chips */}
              {activeInstIds.length > 1 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <AccountBalanceRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Institution:
                  </Typography>
                  {activeInstIds.map((instId) => {
                    const inst = dataMap.get(instId)?.institution;
                    const isSelected = filterInstitutionId === instId;
                    return (
                      <Chip
                        key={instId}
                        label={inst?.name ?? instId}
                        size="small"
                        color={isSelected ? 'primary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        onClick={() => setFilterInstitutionId(isSelected ? null : instId)}
                        sx={{ borderRadius: 1.5, fontSize: '0.72rem', height: 24, cursor: 'pointer' }}
                      />
                    );
                  })}
                </Stack>
              )}

              {/* Group filter chips — shown when an institution is selected and user has direct groups */}
              {filterInstitutionId && myDirectGroupIds.size > 0 && isStudent && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <SchoolRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Group:
                  </Typography>
                  {[...myDirectGroupIds].map((gId) => {
                    const isSelected = filterGroupId === gId;
                    return (
                      <Chip
                        key={gId}
                        label={combinedGroupsById.get(gId)?.name ?? gId}
                        size="small"
                        color={isSelected ? 'secondary' : 'default'}
                        variant={isSelected ? 'filled' : 'outlined'}
                        onClick={() => setFilterGroupId(isSelected ? null : gId)}
                        sx={{ borderRadius: 1.5, fontSize: '0.72rem', height: 24, cursor: 'pointer' }}
                      />
                    );
                  })}
                </Stack>
              )}

              {/* Link to the selected institution's full schedule (when filtered) */}
              {filterInstitutionId && (() => {
                const d = dataMap.get(filterInstitutionId);
                if (!d) return null;
                const instId = String(d.institution.id ?? (d.institution as any)._id ?? '');
                const schedId = d.institution.active_schedule_id;
                return (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<AccountBalanceRoundedIcon sx={{ fontSize: '0.9rem' }} />}
                      onClick={() => navigate(institutionRoute(instId))}
                      sx={{ borderRadius: 2, textTransform: 'none', color: 'text.secondary', fontSize: '0.78rem' }}
                    >
                      {d.institution.name}
                    </Button>
                    {schedId && (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<CalendarMonthRoundedIcon sx={{ fontSize: '0.9rem' }} />}
                        onClick={() => navigate(scheduleRoute(schedId))}
                        sx={{ borderRadius: 2, textTransform: 'none', color: 'text.secondary', fontSize: '0.78rem' }}
                      >
                        Full schedule
                      </Button>
                    )}
                  </Stack>
                );
              })()}

              {/* No roles in selected institutions */}
              {!hasRoles && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  You don't have a student or professor role in{' '}
                  {filterInstitutionId ? 'this institution' : 'any of your institutions'}.
                  Ask an admin to assign you a role.
                </Alert>
              )}

              {/* Tabs */}
              {hasRoles && (
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
                    {/* Student tab */}
                    <TabPanel value={activeTab} index={0}>
                      <Stack spacing={2}>
                        <WeekSelector weekNumbers={weekNumbers} selectedWeek={studentWeek} onSelect={setStudentWeek} />
                        <CalendarGrid
                          entries={filteredStudentEntries}
                          days={currentDays}
                          timeslotsPerDay={currentTimeslotsPerDay}
                          selectedWeek={studentWeek}
                          coursesById={combinedCoursesById}
                          groupsById={combinedGroupsById}
                          usersById={combinedUsersById}
                          roomsById={combinedRoomsById}
                          getTypeColor={getActivityTypeColor}
                          entityLabel="your groups"
                          startHour={Math.floor(globalStartMinutes / 60)}
                          startMinute={globalStartMinutes % 60}
                          timeslotDurationMinutes={globalSlotDuration}
                          startDay={globalStartDay}
                        />
                      </Stack>
                    </TabPanel>

                    {/* Professor tab */}
                    <TabPanel value={activeTab} index={1}>
                      <Stack spacing={2}>
                        <WeekSelector weekNumbers={weekNumbers} selectedWeek={professorWeek} onSelect={setProfessorWeek} />
                        <CalendarGrid
                          entries={professorEntries}
                          days={currentDays}
                          timeslotsPerDay={currentTimeslotsPerDay}
                          selectedWeek={professorWeek}
                          coursesById={combinedCoursesById}
                          groupsById={combinedGroupsById}
                          usersById={combinedUsersById}
                          roomsById={combinedRoomsById}
                          getTypeColor={getActivityTypeColor}
                          entityLabel="you"
                          startHour={Math.floor(globalStartMinutes / 60)}
                          startMinute={globalStartMinutes % 60}
                          timeslotDurationMinutes={globalSlotDuration}
                          startDay={globalStartDay}
                        />
                      </Stack>
                    </TabPanel>
                  </Box>
                </Paper>
              )}
            </Stack>
          )}
        </Stack>
      </Box>
    </PageContainer>
  );
}
