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
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarOutlineRoundedIcon from '@mui/icons-material/StarOutlineRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  deleteSchedule,
  setActiveSchedule,
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
import { institutionSchedulesRoute, scheduleEditRoute } from '../../config/routes';
import { toTitleLabel, compareAlphabetical } from '../../utils/text';
import { getCurrentUserData, isInstitutionAdmin } from '../../utils/institutionAdmin';
import { useInstitutionSync } from '../../utils/useInstitutionSync';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import CalendarGrid, { getActivityTypeColor, getDayName } from './CalendarGrid';
import type { ScheduledEntry } from './CalendarGrid';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfMode, setPdfMode] = useState<'groups' | 'professors' | 'rooms'>('groups');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeToggleLoading, setActiveToggleLoading] = useState(false);
  const [activeToggleError, setActiveToggleError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<InstitutionUser | null>(null);

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

        const [inst, acts, grps, usrs, rms, crs, me] = await Promise.all([
          getInstitutionById(institutionId),
          getInstitutionActivities(institutionId),
          getInstitutionGroups(institutionId),
          getInstitutionUsers(institutionId),
          getInstitutionRooms(institutionId),
          getInstitutionCourses(institutionId),
          getCurrentUserData().catch(() => null),
        ]);
        if (!mounted) return;

        if (me) setCurrentUser(me);
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

  const canManage = useMemo(
    () => isInstitutionAdmin(currentUser, schedule?.institution_id),
    [currentUser, schedule?.institution_id],
  );
  useInstitutionSync(schedule?.institution_id);

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
    const totalWeeks = institution?.time_grid_config?.weeks ?? 1;
    const allWeeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
    return schedRecords
      .map((rec) => {
        const act = activitiesById.get(String(rec.activity_id ?? ''));
        if (!act) return null;
        const freq = (act.frequency ?? '').toLowerCase();
        const activeWeeks = freq === 'weekly'
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
  }, [schedRecords, activitiesById, institution]);

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

  const getTypeColor = getActivityTypeColor;

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

  // ── Hierarchical group options (DFS order) ────────────────────────────────

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

  // ── Schedule deletion ──────────────────────────────────────────────────────

  const handleDeleteSchedule = async () => {
    if (!scheduleId) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteSchedule(scheduleId);
      setDeleteDialogOpen(false);
      navigate(schedule?.institution_id ? institutionSchedulesRoute(schedule.institution_id) : '/institutions');
    } catch (err) {
      setDeleteError((err as Error).message || 'Failed to delete schedule.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Active schedule toggle ─────────────────────────────────────────────────

  const isActive = institution?.active_schedule_id === scheduleId;
  const isCompleted = schedule?.status?.toLowerCase() === 'completed';

  const handleToggleActive = async () => {
    if (!schedule?.institution_id || !scheduleId) return;
    setActiveToggleLoading(true);
    setActiveToggleError(null);
    try {
      const updated = await setActiveSchedule(schedule.institution_id, isActive ? null : scheduleId);
      setInstitution(updated);
    } catch (err) {
      setActiveToggleError((err as Error).message || 'Failed to update active schedule.');
    } finally {
      setActiveToggleLoading(false);
    }
  };

  // ── PDF download ───────────────────────────────────────────────────────────

  const handleDownloadPdf = async () => {
    setPdfGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageH = doc.internal.pageSize.getHeight();
      const headerColor: [number, number, number] = [99, 102, 241]; // indigo header

      // Activity type → [fill, text] colors matching the web calendar
      const activityColors: Record<string, { fill: [number,number,number]; text: [number,number,number] }> = {
        course:     { fill: [220, 221, 255], text: [72,  73,  174] }, // indigo
        seminar:    { fill: [200, 240, 252], text: [5,   138, 162] }, // cyan
        laboratory: { fill: [255, 237, 213], text: [180, 108,  10] }, // amber/orange
      };
      const defaultActivityColor = { fill: [235, 235, 235] as [number,number,number], text: [90, 90, 90] as [number,number,number] };

      const getActivityColor = (type: string) =>
        activityColors[type.toLowerCase()] ?? defaultActivityColor;

      // ── Build entity list ──────────────────────────────────────────────────
      type PdfEntity = { id: string; name: string; depth: number };
      let entities: PdfEntity[] = [];

      if (pdfMode === 'groups') {
        const orderedGroups: PdfEntity[] = [];
        const walkGroups = (gId: string, depth: number) => {
          const g = groupsById.get(gId);
          if (!g) return;
          orderedGroups.push({ id: gId, name: g.name, depth });
          (childrenByParent.get(gId) ?? []).forEach((cId) => walkGroups(cId, depth + 1));
        };
        rootGroupIds.forEach((id) => walkGroups(id, 0));
        entities = orderedGroups;
      } else if (pdfMode === 'professors') {
        entities = professors.map((u) => ({ id: String(u.id ?? u._id ?? ''), name: u.name ?? u.email ?? 'Unknown', depth: 0 }));
      } else {
        entities = rooms.map((r) => ({ id: String(r.id ?? r._id ?? ''), name: r.name, depth: 0 }));
      }

      // ── Build one table's data (days = rows, slots = columns) ────────────────
      const buildTable = (entityEntries: ScheduledEntry[], week: number) => {
        const weekEntries = entityEntries.filter((e) => e.activeWeeks.includes(week));

        // Header: empty corner + one column per slot
        const head = [[
          { content: '', styles: { fillColor: headerColor } },
          ...Array.from({ length: timeslotsPerDay }, (_, i) => ({
            content: String(i + 1),
            styles: { halign: 'center' as const, fillColor: headerColor, textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const, fontSize: 8 },
          })),
        ]];

        // Body: one row per day, one cell per slot (with colSpan for multi-slot activities)
        const body: any[][] = [];
        for (let day = 0; day < days; day++) {
          const row: any[] = [{
            content: getDayName(day),
            styles: { halign: 'center', fontStyle: 'bold', textColor: [120,120,120], fontSize: 7, fillColor: [245,245,250] },
          }];
          const occupied = new Set<number>(); // occupied slot indices in this day row
          for (let slot = 0; slot < timeslotsPerDay; slot++) {
            if (occupied.has(slot)) continue;
            const absSlot = day * timeslotsPerDay + slot;
            const entry = weekEntries.find((e) => e.startTimeslot === absSlot);
            if (entry) {
              const span = Math.max(1, entry.durationSlots);
              for (let s = 1; s < span; s++) occupied.add(slot + s);
              const { fill, text } = getActivityColor(entry.activityType);
              const courseName = coursesById.get(entry.courseId)?.name ?? '';
              const typeName = toTitleLabel(entry.activityType);
              const extraLines: string[] = [];
              if (pdfMode === 'groups') {
                if (entry.professorId) extraLines.push(usersById.get(entry.professorId)?.name ?? '');
                extraLines.push(roomsById.get(entry.roomId)?.name ?? '');
              } else if (pdfMode === 'professors') {
                extraLines.push(groupsById.get(entry.groupId)?.name ?? '');
                extraLines.push(roomsById.get(entry.roomId)?.name ?? '');
              } else {
                extraLines.push(groupsById.get(entry.groupId)?.name ?? '');
                if (entry.professorId) extraLines.push(usersById.get(entry.professorId)?.name ?? '');
              }
              const lines = [courseName, typeName, ...extraLines.filter(Boolean)].join('\n');
              row.push({
                content: lines,
                colSpan: span,
                styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak', valign: 'top', fillColor: fill, textColor: text },
              });
            } else {
              row.push({ content: '', styles: { fillColor: [255,255,255] } });
            }
          }
          body.push(row);
        }
        return { head, body };
      };

      // Estimated height (mm) of one table: header row + day rows
      const estTableH = 8 + days * 9;

      // ── Render entities ────────────────────────────────────────────────────
      entities.forEach((entity, entityIndex) => {
        if (entityIndex > 0) doc.addPage();

        let entityEntries: ScheduledEntry[];
        if (pdfMode === 'groups') {
          const groupIds = getGroupAndAncestorIds(entity.id);
          entityEntries = scheduledEntries.filter((e) => groupIds.has(e.groupId));
        } else if (pdfMode === 'professors') {
          entityEntries = scheduledEntries.filter((e) => e.professorId === entity.id);
        } else {
          entityEntries = scheduledEntries.filter((e) => e.roomId === entity.id);
        }

        const drawEntityHeader = (y: number) => {
          const prefix = '  '.repeat(entity.depth);
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(40, 40, 40);
          doc.text(`${prefix}${entity.name}`, 14, y);
          return y + 9;
        };

        // Decide layout: can all weeks fit on one page?
        const totalNeeded = 15 + 9 + weekNumbers.length * (estTableH + (weekNumbers.length > 1 ? 12 : 4));
        const allFitOnOnePage = totalNeeded <= pageH - 10;

        if (allFitOnOnePage) {
          // All weeks on one page
          let currentY = drawEntityHeader(15);
          weekNumbers.forEach((week) => {
            if (weekNumbers.length > 1) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(100, 100, 100);
              doc.text(`Week ${week}`, 14, currentY);
              currentY += 5;
            }
            const { head, body } = buildTable(entityEntries, week);
            autoTable(doc, {
              head, body,
              startY: currentY,
              theme: 'grid',
              headStyles: { fillColor: headerColor, textColor: [255,255,255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
              bodyStyles: { fontSize: 6.5, minCellHeight: 7 },
              columnStyles: { 0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' } },
              margin: { left: 14, right: 14 },
            });
            currentY = (doc as any).lastAutoTable.finalY + 8;
          });
        } else {
          // Each week on its own page
          weekNumbers.forEach((week, weekIndex) => {
            if (weekIndex > 0) doc.addPage();
            let currentY = drawEntityHeader(15);
            if (weekNumbers.length > 1) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(100, 100, 100);
              doc.text(`Week ${week}`, 14, currentY);
              currentY += 5;
            }
            const { head, body } = buildTable(entityEntries, week);
            autoTable(doc, {
              head, body,
              startY: currentY,
              theme: 'grid',
              headStyles: { fillColor: headerColor, textColor: [255,255,255], fontSize: 8, fontStyle: 'bold', halign: 'center' },
              bodyStyles: { fontSize: 6.5, minCellHeight: 7 },
              columnStyles: { 0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' } },
              margin: { left: 14, right: 14 },
            });
          });
        }
      });

      const modeLabel = pdfMode === 'groups' ? 'groups' : pdfMode === 'professors' ? 'professors' : 'rooms';
      doc.save(`schedule-by-${modeLabel}.pdf`);
      setPdfDialogOpen(false);
    } finally {
      setPdfGenerating(false);
    }
  };

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
              {/* Right side of header */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                {schedule?.status && (
                  <Chip label={schedule.status} color={scheduleStatusColor(schedule.status)} sx={{ borderRadius: 1.5 }} />
                )}
                {isActive && (
                  <Chip label="Active" color="primary" size="small" sx={{ borderRadius: 1.5 }} />
                )}
                {canManage && isCompleted && (
                  <Tooltip title={isActive ? 'Unset as active schedule' : 'Set as active schedule'}>
                    <span>
                      <IconButton
                        size="small"
                        color={isActive ? 'primary' : 'default'}
                        disabled={activeToggleLoading}
                        onClick={handleToggleActive}
                        sx={{ borderRadius: 1.5 }}
                      >
                        {activeToggleLoading
                          ? <CircularProgress size={16} />
                          : isActive
                            ? <StarRoundedIcon fontSize="small" />
                            : <StarOutlineRoundedIcon fontSize="small" />
                        }
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                {canManage && isCompleted && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditCalendarRoundedIcon />}
                    onClick={() => navigate(scheduleEditRoute(scheduleId!))}
                    sx={{ borderRadius: 2 }}
                  >
                    Edit
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadRoundedIcon />}
                  onClick={() => setPdfDialogOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  Download PDF
                </Button>
                {canManage && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlineRoundedIcon />}
                    onClick={() => { setDeleteError(null); setDeleteDialogOpen(true); }}
                    sx={{ borderRadius: 2 }}
                  >
                    Delete
                  </Button>
                )}
              </Stack>
            </Box>
          </Paper>

          {activeToggleError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>{activeToggleError}</Alert>
          )}

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
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 260 }}
                    options={groupOptions}
                    getOptionLabel={(opt) => opt.label}
                    value={groupOptions.find((o) => o.id === selectedGroupId) ?? null}
                    onChange={(_, newVal) => { setSelectedGroupId(newVal?.id ?? ''); setSelectedWeekByGroup(1); }}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    renderInput={(params) => (
                      <TextField {...params} label="Select a group" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id} style={{ paddingLeft: 12 + option.depth * 16, fontSize: '0.875rem' }}>
                        {option.depth > 0 && (
                          <Box component="span" sx={{ mr: 0.75, color: 'text.disabled', fontSize: '0.75rem', fontFamily: 'monospace' }}>{'└'}</Box>
                        )}
                        {option.label}
                        {option.childCount > 0 && (
                          <Box component="span" sx={{ ml: 0.75, color: 'text.disabled', fontSize: '0.7rem' }}>({option.childCount})</Box>
                        )}
                      </li>
                    )}
                  />

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
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 260 }}
                    options={professors}
                    getOptionLabel={(u) => u.name ?? u.email ?? String(u.id ?? u._id ?? '')}
                    value={professors.find((u) => String(u.id ?? u._id ?? '') === selectedProfessorId) ?? null}
                    onChange={(_, newVal) => { setSelectedProfessorId(newVal ? String(newVal.id ?? newVal._id ?? '') : ''); setSelectedWeekByProfessor(1); }}
                    isOptionEqualToValue={(opt, val) => String(opt.id ?? opt._id) === String(val.id ?? val._id)}
                    renderInput={(params) => (
                      <TextField {...params} label="Select a professor" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )}
                  />

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
                  <Autocomplete
                    size="small"
                    sx={{ minWidth: 260 }}
                    options={rooms}
                    getOptionLabel={(r) => r.name}
                    value={rooms.find((r) => String(r.id ?? r._id ?? '') === selectedRoomId) ?? null}
                    onChange={(_, newVal) => { setSelectedRoomId(newVal ? String(newVal.id ?? newVal._id ?? '') : ''); setSelectedWeekByRoom(1); }}
                    isOptionEqualToValue={(opt, val) => String(opt.id ?? opt._id) === String(val.id ?? val._id)}
                    renderInput={(params) => (
                      <TextField {...params} label="Select a room" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )}
                  />

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

      {/* ── Delete schedule dialog ── */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleteLoading && setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete schedule?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this schedule? This action cannot be undone.
          </DialogContentText>
          {deleteError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{deleteError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDeleteSchedule} color="error" variant="contained" disabled={deleteLoading} sx={{ borderRadius: 2 }}>
            {deleteLoading ? <CircularProgress size={18} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pdfDialogOpen} onClose={() => !pdfGenerating && setPdfDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Download schedule as PDF</DialogTitle>
        <DialogContent>
          <RadioGroup value={pdfMode} onChange={(e) => setPdfMode(e.target.value as 'groups' | 'professors' | 'rooms')}>
            <FormControlLabel value="groups" control={<Radio />} label="By Groups" disabled={pdfGenerating} />
            <FormControlLabel value="professors" control={<Radio />} label="By Professors" disabled={pdfGenerating} />
            <FormControlLabel value="rooms" control={<Radio />} label="By Rooms" disabled={pdfGenerating} />
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPdfDialogOpen(false)} disabled={pdfGenerating} sx={{ borderRadius: 2 }}>Cancel</Button>
          <Button onClick={handleDownloadPdf} variant="contained" disabled={pdfGenerating} sx={{ borderRadius: 2 }}>
            {pdfGenerating ? <CircularProgress size={18} color="inherit" /> : 'Generate & Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
