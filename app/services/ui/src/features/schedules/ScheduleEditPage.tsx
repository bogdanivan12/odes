/**
 * ScheduleEditPage — drag-and-drop schedule editor.
 *
 * Architecture
 * ────────────
 * • DndContext wraps the entire page.
 * • pendingChanges: Map<recordId, PendingChange> accumulates all edits.
 * • effectiveEntries: scheduledEntries with pending changes applied.
 * • After each change the conflict-check API is called with all pending changes.
 * • conflictingRecordIds is derived from the response and passed to the grid.
 * • Sticky bottom bar: change count · conflict count · Force save · Cancel · Save.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
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
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
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
  checkScheduleConflicts,
  batchUpdateScheduleRecords,
} from '../../api/institutions';
import type {
  InstitutionSchedule,
  InstitutionGroup,
  InstitutionUser,
  InstitutionRoom,
  InstitutionCourse,
  InstitutionActivity,
  ScheduledActivityRecord,
  RecordConflicts,
} from '../../api/institutions';
import type { TimeGridConfig } from '../../types/institution';
import { scheduleRoute } from '../../config/routes';
import { toTitleLabel, compareAlphabetical } from '../../utils/text';
import { getCurrentUserData } from '../../utils/institutionAdmin';
import { useInstitutionSync } from '../../utils/useInstitutionSync';
import { getActivityTypeColor, SLOT_W, DAY_H } from './CalendarGrid';
import type { ScheduledEntry } from './CalendarGrid';
import EditableCalendarGrid from './EditableCalendarGrid';

// ─── Pending change ───────────────────────────────────────────────────────────

interface PendingChange {
  newStartTimeslot: number;
  newRoomId: string;
  originalStartTimeslot: number;
  originalRoomId: string;
}

// ─── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({
  children,
  value,
  index,
}: {
  children: React.ReactNode;
  value: number;
  index: number;
}) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

// ─── Drag overlay card ────────────────────────────────────────────────────────

function OverlayCard({
  entry,
  courseName,
}: {
  entry: ScheduledEntry;
  courseName: string;
}) {
  const theme = useTheme();
  const typeColor = getActivityTypeColor(entry.activityType);
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        bgcolor: alpha(typeColor, 0.18),
        borderLeft: '3px solid',
        borderLeftColor: typeColor,
        p: '4px 8px',
        width: entry.durationSlots * SLOT_W - 4,
        height: DAY_H - 4,
        boxShadow: theme.shadows[8],
        opacity: 0.92,
        cursor: 'grabbing',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, display: 'block', lineHeight: 1.25, fontSize: '0.68rem', mb: 0.25 }}
      >
        {courseName}
      </Typography>
      <Typography
        variant="caption"
        sx={{ display: 'block', fontSize: '0.60rem', color: 'text.secondary', lineHeight: 1.3 }}
      >
        {toTitleLabel(entry.activityType)}
      </Typography>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScheduleEditPage() {
  const theme = useTheme();
  const { scheduleId } = useParams();
  const navigate = useNavigate();

  // ── Entity state ──────────────────────────────────────────────────────────

  const [schedule, setSchedule] = useState<InstitutionSchedule | null>(null);
  const [schedRecords, setSchedRecords] = useState<ScheduledActivityRecord[]>([]);
  const [activities, setActivities] = useState<InstitutionActivity[]>([]);
  const [groups, setGroups] = useState<InstitutionGroup[]>([]);
  const [users, setUsers] = useState<InstitutionUser[]>([]);
  const [rooms, setRooms] = useState<InstitutionRoom[]>([]);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [timeGrid, setTimeGrid] = useState<TimeGridConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState(0);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedWeekByGroup, setSelectedWeekByGroup] = useState(1);
  const [selectedWeekByProfessor, setSelectedWeekByProfessor] = useState(1);
  const [selectedWeekByRoom, setSelectedWeekByRoom] = useState(1);

  // ── Edit state ────────────────────────────────────────────────────────────

  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [conflictResults, setConflictResults] = useState<RecordConflicts[]>([]);
  const [conflictChecking, setConflictChecking] = useState(false);
  const [forceConflicts, setForceConflicts] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Drag state ────────────────────────────────────────────────────────────

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDropId, setActiveDropId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ── Data loading ──────────────────────────────────────────────────────────

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
          getCurrentUserData().catch(() => null),
        ]);
        if (!mounted) return;

        setSchedule(sched);
        setSchedRecords(schedActs);
        setTimeGrid(inst.time_grid_config);
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

  useInstitutionSync(schedule?.institution_id);

  // ── Lookup maps ───────────────────────────────────────────────────────────

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
    map.forEach((ids) =>
      ids.sort((a, b) =>
        compareAlphabetical(groupsById.get(a)?.name ?? a, groupsById.get(b)?.name ?? b),
      ),
    );
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

  // ── Time grid ─────────────────────────────────────────────────────────────

  const weeks = timeGrid?.weeks ?? 1;
  const days = timeGrid?.days ?? 5;
  const timeslotsPerDay = timeGrid?.timeslots_per_day ?? 10;
  const weekNumbers = useMemo(() => Array.from({ length: weeks }, (_, i) => i + 1), [weeks]);

  // ── Base scheduled entries ────────────────────────────────────────────────

  const scheduledEntries = useMemo<ScheduledEntry[]>(() => {
    const allWeeks = Array.from({ length: weeks }, (_, i) => i + 1);
    return schedRecords
      .map((rec) => {
        const act = activitiesById.get(String(rec.activity_id ?? ''));
        if (!act) return null;
        const freq = (act.frequency ?? '').toLowerCase();
        const activeWeeks =
          freq === 'weekly'
            ? allWeeks
            : (rec.active_weeks ?? []).map((w) => w + 1);
        return {
          schedRecId: String(rec.id ?? rec._id ?? ''),
          scheduleId: rec.schedule_id,
          activityId: String(rec.activity_id),
          roomId: String(rec.room_id),
          startTimeslot: rec.start_timeslot,
          activeWeeks,
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
  }, [schedRecords, activitiesById, weeks]);

  // ── Effective entries: pending changes applied ────────────────────────────

  const effectiveEntries = useMemo<ScheduledEntry[]>(
    () =>
      scheduledEntries.map((e) => {
        const change = pendingChanges.get(e.schedRecId);
        if (!change) return e;
        return { ...e, startTimeslot: change.newStartTimeslot, roomId: change.newRoomId };
      }),
    [scheduledEntries, pendingChanges],
  );

  // ── Professors ────────────────────────────────────────────────────────────

  const professors = useMemo(() => {
    const ids = new Set(
      scheduledEntries.filter((e) => e.professorId !== null).map((e) => e.professorId as string),
    );
    return users.filter((u) => ids.has(String(u.id ?? u._id ?? '')));
  }, [users, scheduledEntries]);

  // ── Group ancestor helper ─────────────────────────────────────────────────

  const getGroupAndAncestorIds = useCallback(
    (groupId: string): Set<string> => {
      const result = new Set<string>();
      let current: string | null | undefined = groupId;
      while (current) {
        result.add(current);
        current = groupsById.get(current)?.parent_group_id;
      }
      return result;
    },
    [groupsById],
  );

  // ── Filtered entries per tab ──────────────────────────────────────────────

  const byGroupEntries = useMemo(() => {
    if (!selectedGroupId) return [];
    const gIds = getGroupAndAncestorIds(selectedGroupId);
    return effectiveEntries.filter((e) => gIds.has(e.groupId));
  }, [effectiveEntries, selectedGroupId, getGroupAndAncestorIds]);

  const byProfessorEntries = useMemo(
    () =>
      selectedProfessorId
        ? effectiveEntries.filter((e) => e.professorId === selectedProfessorId)
        : [],
    [effectiveEntries, selectedProfessorId],
  );

  const byRoomEntries = useMemo(
    () =>
      selectedRoomId ? effectiveEntries.filter((e) => e.roomId === selectedRoomId) : [],
    [effectiveEntries, selectedRoomId],
  );

  // ── Group options (hierarchical, DFS) ────────────────────────────────────

  const groupOptions = useMemo(() => {
    const result: { id: string; label: string; depth: number; childCount: number }[] = [];
    const walk = (groupId: string, depth: number) => {
      const g = groupsById.get(groupId);
      if (!g) return;
      const children = childrenByParent.get(groupId) ?? [];
      result.push({ id: groupId, label: g.name, depth, childCount: children.length });
      children.forEach((cId) => walk(cId, depth + 1));
    };
    rootGroupIds.forEach((id) => walk(id, 0));
    return result;
  }, [groupsById, childrenByParent, rootGroupIds]);

  // ── Pending record IDs ────────────────────────────────────────────────────

  const pendingRecordIds = useMemo(() => new Set(pendingChanges.keys()), [pendingChanges]);

  // ── Conflict check (runs whenever pendingChanges changes) ─────────────────

  useEffect(() => {
    if (pendingChanges.size === 0 || !scheduleId) {
      setConflictResults([]);
      return;
    }
    const changes = Array.from(pendingChanges.entries()).map(([recordId, change]) => ({
      record_id: recordId,
      new_start_timeslot: change.newStartTimeslot,
      new_room_id: change.newRoomId,
    }));

    let cancelled = false;
    setConflictChecking(true);
    checkScheduleConflicts(scheduleId, changes)
      .then((results) => {
        if (!cancelled) {
          setConflictResults(results);
          setConflictChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) setConflictChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pendingChanges, scheduleId]);

  // ── Conflict IDs ──────────────────────────────────────────────────────────

  const conflictingRecordIds = useMemo(() => {
    const ids = new Set<string>();
    conflictResults.forEach((r) => {
      if (r.conflicts.length > 0) {
        ids.add(r.record_id);
        r.conflicts.forEach((c) => ids.add(c.conflicting_record_id));
      }
    });
    return ids;
  }, [conflictResults]);

  const totalConflicts = useMemo(
    () => conflictResults.filter((r) => r.conflicts.length > 0).length,
    [conflictResults],
  );

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    setActiveDropId(event.over ? String(event.over.id) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActiveDropId(null);

    const { active, over } = event;
    if (!over) return;

    const recordId = String(active.id);
    const match = String(over.id).match(/^drop-(\d+)-(\d+)$/);
    if (!match) return;

    const dayIdx = parseInt(match[1], 10);
    const slotIdx = parseInt(match[2], 10);
    const newStartTimeslot = dayIdx * timeslotsPerDay + slotIdx;

    const original = scheduledEntries.find((e) => e.schedRecId === recordId);
    if (!original) return;

    setPendingChanges((prev) => {
      const next = new Map(prev);
      const existing = next.get(recordId);
      const newRoomId = existing?.newRoomId ?? original.roomId;

      // Remove from pending if the result is identical to original
      if (newStartTimeslot === original.startTimeslot && newRoomId === original.roomId) {
        next.delete(recordId);
      } else {
        next.set(recordId, {
          newStartTimeslot,
          newRoomId,
          originalStartTimeslot: original.startTimeslot,
          originalRoomId: original.roomId,
        });
      }
      return next;
    });
  };

  // ── Room change handler ───────────────────────────────────────────────────

  const handleRoomChange = useCallback(
    (recordId: string, newRoomId: string) => {
      const original = scheduledEntries.find((e) => e.schedRecId === recordId);
      if (!original) return;
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(recordId);
        const newStart = existing?.newStartTimeslot ?? original.startTimeslot;

        if (newStart === original.startTimeslot && newRoomId === original.roomId) {
          next.delete(recordId);
        } else {
          next.set(recordId, {
            newStartTimeslot: newStart,
            newRoomId,
            originalStartTimeslot: original.startTimeslot,
            originalRoomId: original.roomId,
          });
        }
        return next;
      });
    },
    [scheduledEntries],
  );

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!scheduleId) return;
    const changes = Array.from(pendingChanges.entries()).map(([recordId, change]) => ({
      record_id: recordId,
      new_start_timeslot: change.newStartTimeslot,
      new_room_id: change.newRoomId,
    }));
    setSaveLoading(true);
    setSaveError(null);
    try {
      await batchUpdateScheduleRecords(scheduleId, changes, forceConflicts);
      navigate(scheduleRoute(scheduleId));
    } catch (err) {
      setSaveError((err as Error).message || 'Failed to save changes.');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Reset pending changes ─────────────────────────────────────────────────

  const handleCancel = () => {
    setPendingChanges(new Map());
    setConflictResults([]);
    setForceConflicts(false);
    setSaveError(null);
  };

  // ── Week selector ─────────────────────────────────────────────────────────

  const WeekSelector = ({
    selectedWeek,
    onSelect,
  }: {
    selectedWeek: number;
    onSelect: (w: number) => void;
  }) => (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
      {weekNumbers.map((w) => (
        <Chip
          key={w}
          label={`W${w}`}
          size="small"
          onClick={() => onSelect(w)}
          color={w === selectedWeek ? 'primary' : 'default'}
          sx={{
            borderRadius: 1.5,
            fontWeight: w === selectedWeek ? 700 : 400,
            cursor: 'pointer',
          }}
        />
      ))}
    </Stack>
  );

  // ── Entry label for conflict display ─────────────────────────────────────

  const getEntryLabel = useCallback(
    (schedRecId: string): string => {
      const entry = effectiveEntries.find((e) => e.schedRecId === schedRecId);
      if (!entry) return schedRecId;
      const course = coursesById.get(entry.courseId)?.name ?? '—';
      const group = groupsById.get(entry.groupId)?.name ?? '—';
      return `${course} (${group})`;
    },
    [effectiveEntries, coursesById, groupsById],
  );

  // ── Flat conflict rows for display ────────────────────────────────────────

  const conflictRows = useMemo(() => {
    const seen = new Set<string>();
    const rows: { key: string; movedLabel: string; type: string; description: string }[] = [];

    conflictResults.forEach((r) => {
      r.conflicts.forEach((c) => {
        const key = `${r.record_id}::${c.conflicting_record_id}::${c.type}`;
        if (seen.has(key)) return;
        seen.add(key);

        const movedLabel = getEntryLabel(r.record_id);

        // Build a specific description from the conflicting entry's data.
        const other = effectiveEntries.find((e) => e.schedRecId === c.conflicting_record_id);
        let description = c.description; // fallback to backend text
        if (other) {
          const course = coursesById.get(other.courseId)?.name ?? '—';
          const group = groupsById.get(other.groupId)?.name ?? '—';
          const room = roomsById.get(other.roomId)?.name ?? '—';
          const prof = other.professorId
            ? (usersById.get(other.professorId)?.name ??
               usersById.get(other.professorId)?.email ??
               null)
            : null;

          if (c.type === 'room') {
            description = `Room ${room} is already occupied by "${course}" (${group})`;
          } else if (c.type === 'professor') {
            description = prof
              ? `${prof} already has "${course}" (${group})`
              : `The professor already has "${course}" (${group})`;
          } else if (c.type === 'group') {
            description = `Group ${group} already has "${course}"`;
          }
        }

        rows.push({ key, movedLabel, type: c.type, description });
      });
    });
    return rows;
  }, [conflictResults, getEntryLabel, effectiveEntries, coursesById, groupsById, roomsById, usersById]);

  // ── Active drag entry ─────────────────────────────────────────────────────

  const activeEntry = useMemo(
    () => (activeId ? effectiveEntries.find((e) => e.schedRecId === activeId) ?? null : null),
    [activeId, effectiveEntries],
  );

  // ── Loading / error ───────────────────────────────────────────────────────

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
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        </Box>
      </PageContainer>
    );
  }

  const backPath = scheduleId ? scheduleRoute(scheduleId) : '/institutions';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <PageContainer alignItems="flex-start">
        {/* Extra bottom padding so content isn't hidden by sticky bar */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 960,
            mx: 'auto',
            pb: pendingChanges.size > 0 ? 22 : 4,
          }}
        >
          <Stack spacing={3}>
            {/* Back button */}
            <Box>
              <Button
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => navigate(backPath)}
                sx={{ borderRadius: 2, color: 'text.secondary', textTransform: 'none' }}
              >
                Back to schedule
              </Button>
            </Box>

            {/* Header card */}
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
              <Box
                sx={{
                  height: 3,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 2.5,
                  py: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    flexShrink: 0,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EditCalendarRoundedIcon sx={{ fontSize: '1.6rem' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Edit Schedule
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Drag activities to new timeslots · click a room name to change it.
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Tabs */}
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
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 260 }}
                    options={groupOptions}
                    getOptionLabel={(opt) => opt.label}
                    value={groupOptions.find((o) => o.id === selectedGroupId) ?? null}
                    onChange={(_, newVal) => {
                      setSelectedGroupId(newVal?.id ?? '');
                      setSelectedWeekByGroup(1);
                    }}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select a group"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <li
                        {...props}
                        key={option.id}
                        style={{ paddingLeft: 12 + option.depth * 16, fontSize: '0.875rem' }}
                      >
                        {option.depth > 0 && (
                          <Box
                            component="span"
                            sx={{
                              mr: 0.75,
                              color: 'text.disabled',
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            {'└'}
                          </Box>
                        )}
                        {option.label}
                        {option.childCount > 0 && (
                          <Box
                            component="span"
                            sx={{ ml: 0.75, color: 'text.disabled', fontSize: '0.7rem' }}
                          >
                            ({option.childCount})
                          </Box>
                        )}
                      </li>
                    )}
                  />

                  {selectedGroupId ? (
                    <>
                      <WeekSelector
                        selectedWeek={selectedWeekByGroup}
                        onSelect={setSelectedWeekByGroup}
                      />
                      <EditableCalendarGrid
                        entries={byGroupEntries}
                        days={days}
                        timeslotsPerDay={timeslotsPerDay}
                        selectedWeek={selectedWeekByGroup}
                        coursesById={coursesById}
                        groupsById={groupsById}
                        usersById={usersById}
                        roomsById={roomsById}
                        rooms={rooms}
                        pendingRecordIds={pendingRecordIds}
                        conflictingRecordIds={conflictingRecordIds}
                        activeDropId={activeDropId}
                        onRoomChange={handleRoomChange}
                        isDragActive={activeId !== null}
                        startHour={timeGrid?.start_hour ?? 8}
                        startMinute={timeGrid?.start_minute ?? 0}
                        timeslotDurationMinutes={timeGrid?.timeslot_duration_minutes ?? 60}
                        startDay={timeGrid?.start_day ?? 0}
                      />
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Select a group to edit the schedule.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </TabPanel>

              {/* ── By Professor ── */}
              <TabPanel value={activeTab} index={1}>
                <Stack spacing={2}>
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 260 }}
                    options={professors}
                    getOptionLabel={(u) =>
                      u.name ?? u.email ?? String(u.id ?? u._id ?? '')
                    }
                    value={
                      professors.find(
                        (u) => String(u.id ?? u._id ?? '') === selectedProfessorId,
                      ) ?? null
                    }
                    onChange={(_, newVal) => {
                      setSelectedProfessorId(
                        newVal ? String(newVal.id ?? newVal._id ?? '') : '',
                      );
                      setSelectedWeekByProfessor(1);
                    }}
                    isOptionEqualToValue={(opt, val) =>
                      String(opt.id ?? opt._id) === String(val.id ?? val._id)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select a professor"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />

                  {selectedProfessorId ? (
                    <>
                      <WeekSelector
                        selectedWeek={selectedWeekByProfessor}
                        onSelect={setSelectedWeekByProfessor}
                      />
                      <EditableCalendarGrid
                        entries={byProfessorEntries}
                        days={days}
                        timeslotsPerDay={timeslotsPerDay}
                        selectedWeek={selectedWeekByProfessor}
                        coursesById={coursesById}
                        groupsById={groupsById}
                        usersById={usersById}
                        roomsById={roomsById}
                        rooms={rooms}
                        pendingRecordIds={pendingRecordIds}
                        conflictingRecordIds={conflictingRecordIds}
                        activeDropId={activeDropId}
                        onRoomChange={handleRoomChange}
                        isDragActive={activeId !== null}
                        startHour={timeGrid?.start_hour ?? 8}
                        startMinute={timeGrid?.start_minute ?? 0}
                        timeslotDurationMinutes={timeGrid?.timeslot_duration_minutes ?? 60}
                        startDay={timeGrid?.start_day ?? 0}
                      />
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Select a professor to edit the schedule.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </TabPanel>

              {/* ── By Room ── */}
              <TabPanel value={activeTab} index={2}>
                <Stack spacing={2}>
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 260 }}
                    options={rooms}
                    getOptionLabel={(r) => r.name}
                    value={
                      rooms.find((r) => String(r.id ?? r._id ?? '') === selectedRoomId) ??
                      null
                    }
                    onChange={(_, newVal) => {
                      setSelectedRoomId(
                        newVal ? String(newVal.id ?? newVal._id ?? '') : '',
                      );
                      setSelectedWeekByRoom(1);
                    }}
                    isOptionEqualToValue={(opt, val) =>
                      String(opt.id ?? opt._id) === String(val.id ?? val._id)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select a room"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />

                  {selectedRoomId ? (
                    <>
                      <WeekSelector
                        selectedWeek={selectedWeekByRoom}
                        onSelect={setSelectedWeekByRoom}
                      />
                      <EditableCalendarGrid
                        entries={byRoomEntries}
                        days={days}
                        timeslotsPerDay={timeslotsPerDay}
                        selectedWeek={selectedWeekByRoom}
                        coursesById={coursesById}
                        groupsById={groupsById}
                        usersById={usersById}
                        roomsById={roomsById}
                        rooms={rooms}
                        pendingRecordIds={pendingRecordIds}
                        conflictingRecordIds={conflictingRecordIds}
                        activeDropId={activeDropId}
                        onRoomChange={handleRoomChange}
                        isDragActive={activeId !== null}
                        startHour={timeGrid?.start_hour ?? 8}
                        startMinute={timeGrid?.start_minute ?? 0}
                        timeslotDurationMinutes={timeGrid?.timeslot_duration_minutes ?? 60}
                        startDay={timeGrid?.start_day ?? 0}
                      />
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        Select a room to edit the schedule.
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </TabPanel>
            </Box>
          </Stack>
        </Box>

        {/* ── Sticky action bar ── */}
        {pendingChanges.size > 0 && (
          <Paper
            elevation={8}
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1200,
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ maxWidth: 960, mx: 'auto', px: 3, pt: 1.5, pb: conflictRows.length > 0 ? 1 : 1.5 }}>

              {/* ── Button row ── */}
              <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
                {/* Summary chips */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                  <Chip
                    size="small"
                    label={`${pendingChanges.size} change${pendingChanges.size !== 1 ? 's' : ''}`}
                    color="primary"
                    variant="outlined"
                    sx={{ borderRadius: 1.5 }}
                  />
                  {conflictChecking && <CircularProgress size={14} />}
                  {!conflictChecking && totalConflicts > 0 && (
                    <Chip
                      size="small"
                      icon={<WarningAmberRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                      label={`${totalConflicts} conflict${totalConflicts !== 1 ? 's' : ''}`}
                      color="error"
                      variant="outlined"
                      sx={{ borderRadius: 1.5 }}
                    />
                  )}
                  {!conflictChecking && totalConflicts === 0 && (
                    <Chip
                      size="small"
                      icon={<CheckCircleOutlineRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                      label="No conflicts"
                      color="success"
                      variant="outlined"
                      sx={{ borderRadius: 1.5 }}
                    />
                  )}
                </Stack>

                {/* Force save checkbox (only when conflicts exist) */}
                {!conflictChecking && totalConflicts > 0 && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={forceConflicts}
                        onChange={(e) => setForceConflicts(e.target.checked)}
                        color="warning"
                      />
                    }
                    label={
                      <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600 }}>
                        Force save (ignore conflicts)
                      </Typography>
                    }
                    sx={{ m: 0 }}
                  />
                )}

                {/* Save error */}
                {saveError && (
                  <Typography variant="caption" color="error.main" sx={{ maxWidth: 240, lineHeight: 1.3 }}>
                    {saveError}
                  </Typography>
                )}

                {/* Cancel */}
                <Button
                  size="small"
                  onClick={handleCancel}
                  disabled={saveLoading}
                  sx={{ borderRadius: 2, color: 'text.secondary', textTransform: 'none' }}
                >
                  Cancel changes
                </Button>

                {/* Save */}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={
                    saveLoading
                      ? <CircularProgress size={14} color="inherit" />
                      : <SaveRoundedIcon />
                  }
                  onClick={handleSave}
                  disabled={saveLoading || conflictChecking || (totalConflicts > 0 && !forceConflicts)}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Save
                </Button>
              </Stack>

              {/* ── Conflict list ── */}
              {!conflictChecking && conflictRows.length > 0 && (
                <Box
                  sx={{
                    mt: 1.25,
                    pt: 1.25,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    maxHeight: 140,
                    overflowY: 'auto',
                  }}
                >
                  <Stack spacing={0.75}>
                    {conflictRows.map((row) => (
                      <Stack key={row.key} direction="row" spacing={1} alignItems="flex-start">
                        <WarningAmberRoundedIcon
                          sx={{ fontSize: '0.8rem', color: 'error.main', mt: '2px', flexShrink: 0 }}
                        />
                        <Typography variant="caption" sx={{ lineHeight: 1.4, color: 'text.primary' }}>
                          <Box component="span" sx={{ fontWeight: 700, color: 'error.main' }}>
                            {row.movedLabel}
                          </Box>
                          {' — '}
                          <Box component="span" sx={{ color: 'text.secondary' }}>
                            {row.description}
                          </Box>
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

            </Box>
          </Paper>
        )}
      </PageContainer>

      {/* Drag overlay (rendered as a portal at document.body) */}
      <DragOverlay>
        {activeEntry && (
          <OverlayCard
            entry={activeEntry}
            courseName={coursesById.get(activeEntry.courseId)?.name ?? '—'}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
